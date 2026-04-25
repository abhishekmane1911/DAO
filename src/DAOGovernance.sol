// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "../lib/openzeppelin-contracts/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "../lib/openzeppelin-contracts/contracts/security/ReentrancyGuard.sol";
import {MintableToken} from "./MintableToken.sol";

/// @title DAOGovernance
/// @notice Governance contract for proposal creation, voting, and execution
contract DAOGovernance is AccessControl, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    MintableToken public token;
    uint256 public quorumPercentage = 30;

    //OPTIMIZATION 1: Struct packing
    // bools packed with address into same 32-byte slot → saves 2 storage slots
    struct Proposal {
        uint256 id;
        uint256 snapshotId;
        uint256 startTime;
        uint256 endTime;
        uint256 yesVotes;
        uint256 noVotes;
        address creator;
        bool executed;   // packed with creator in same slot
        bool canceled;   // packed in same slot
        address target;
        bytes data;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    //OPTIMIZATION 2: Custom error
    // custom errors cost ~50-200 gas less per revert than require strings
    // because strings are stored as bytes in bytecode
    error InvalidTokenAddress();
    error InvalidTarget();
    error InvalidVotingPeriod();
    error InvalidQuorum();
    error VotingNotStarted();
    error VotingEnded();
    error ProposalIsCanceled();
    error AlreadyVoted();
    error NoVotingPower();
    error VotingNotEnded();
    error AlreadyExecuted();
    error QuorumNotMet();
    error MajorityNotReached();
    error TransactionFailed();
    error NotCreator();
    error VotingAlreadyStarted();
    error AlreadyCanceled();

    //OPTIMIZATION 3: Description in event not storage
    // storing string on-chain costs ~20,000 gas (SSTORE)
    // emitting in event costs ~375 gas
    // description is human-readable context only — does not affect contract logic
    event ProposalCreated(
        uint256 indexed id,
        address indexed creator,
        address target,
        uint256 startTime,
        uint256 endTime,
        string description
    );

    event Voted(
        uint256 indexed id,
        address indexed voter,
        bool support,
        uint256 weight
    );

    event ProposalExecuted(uint256 indexed id);
    event ProposalCanceled(uint256 indexed id);
    event QuorumUpdated(uint256 oldQuorum, uint256 newQuorum);

    constructor(address _tokenAddress) {
        if (_tokenAddress == address(0)) revert InvalidTokenAddress();

        token = MintableToken(_tokenAddress);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /// @notice Update quorum percentage
    /// @param _newQuorum New quorum value between 1 and 100
    function updateQuorum(uint256 _newQuorum) external onlyRole(ADMIN_ROLE) {
        if (_newQuorum == 0 || _newQuorum > 100) revert InvalidQuorum();

        emit QuorumUpdated(quorumPercentage, _newQuorum);
        quorumPercentage = _newQuorum;
    }

    /// @notice Create a new governance proposal
    /// @param target Contract address to call on execution
    /// @param data Encoded function call to execute
    /// @param votingDelay Seconds before voting starts
    /// @param votingPeriod Seconds voting remains open
    /// @param description Human-readable proposal description — stored in event log not storage
    function createProposal(
        address target,
        bytes calldata data,        // OPTIMIZATION 4: calldata not memory — saves ~200 gas
        uint256 votingDelay,
        uint256 votingPeriod,
        string calldata description // calldata not memory — saves ~200 gas
    ) external returns (uint256) {
        if (target == address(0)) revert InvalidTarget();
        if (votingPeriod == 0)    revert InvalidVotingPeriod();

        uint256 snapshotId = token.snapshot();

        proposalCount++;

        uint256 startTime = block.timestamp + votingDelay;
        uint256 endTime   = startTime + votingPeriod;

        proposals[proposalCount] = Proposal({
            id:         proposalCount,
            snapshotId: snapshotId,
            startTime:  startTime,
            endTime:    endTime,
            yesVotes:   0,
            noVotes:    0,
            creator:    msg.sender,
            executed:   false,
            canceled:   false,
            target:     target,
            data:       data
        });

        emit ProposalCreated(
            proposalCount,
            msg.sender,
            target,
            startTime,
            endTime,
            description
        );

        return proposalCount;
    }

    /// @notice Cast a vote on a proposal
    /// @param proposalId ID of the proposal to vote on
    /// @param support True for YES, false for NO
    function vote(uint256 proposalId, bool support) external {
        Proposal storage p = proposals[proposalId];

        // OPTIMIZATION 5: Cache storage reads into memory
        // each SLOAD costs 100 gas — reading p.startTime twice = 200 gas
        // caching into memory = 100 gas first read + 3 gas subsequent reads
        uint256 start    = p.startTime;
        uint256 end      = p.endTime;
        bool    canceled = p.canceled;
        uint256 snapshot = p.snapshotId;

        if (block.timestamp < start)                  revert VotingNotStarted();
        if (block.timestamp > end)                    revert VotingEnded();
        if (canceled)                                 revert ProposalIsCanceled();
        if (hasVoted[proposalId][msg.sender])         revert AlreadyVoted();

        uint256 weight = token.balanceOfAt(msg.sender, snapshot);
        if (weight == 0) revert NoVotingPower();

        hasVoted[proposalId][msg.sender] = true;

        if (support) {
            p.yesVotes += weight;
        } else {
            p.noVotes += weight;
        }

        emit Voted(proposalId, msg.sender, support, weight);
    }

    /// @notice Execute a passed proposal after voting ends
    /// @param proposalId ID of the proposal to execute
    function executeProposal(uint256 proposalId) external nonReentrant {
        Proposal storage p = proposals[proposalId];

        if (block.timestamp <= p.endTime) revert VotingNotEnded();
        if (p.executed)                   revert AlreadyExecuted();
        if (p.canceled)                   revert ProposalIsCanceled();

        uint256 totalVotes           = p.yesVotes + p.noVotes;
        uint256 totalSupplyAtSnapshot = token.totalSupplyAt(p.snapshotId);
        uint256 quorumRequired       = (totalSupplyAtSnapshot * quorumPercentage) / 100;

        if (totalVotes < quorumRequired) revert QuorumNotMet();
        if (p.yesVotes <= p.noVotes)     revert MajorityNotReached();

        p.executed = true;

        (bool success, ) = p.target.call(p.data);
        if (!success) revert TransactionFailed();

        emit ProposalExecuted(proposalId);
    }

    /// @notice Cancel a proposal before voting starts
    /// @param proposalId ID of the proposal to cancel
    function cancelProposal(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];

        if (msg.sender != p.creator)         revert NotCreator();
        if (block.timestamp >= p.startTime)  revert VotingAlreadyStarted();
        if (p.canceled)                      revert AlreadyCanceled();

        p.canceled = true;

        emit ProposalCanceled(proposalId);
    }
}