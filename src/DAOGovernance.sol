// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {AccessControl} from "../lib/openzeppelin-contracts/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "../lib/openzeppelin-contracts/contracts/security/ReentrancyGuard.sol";
import {MintableToken} from "./MintableToken.sol";

/**
 * @title DAOGovernance
 * @author DAO Team
 * @notice A governance contract that allows token holders to create, vote on, and execute proposals.
 * @dev This contract uses OpenZeppelin's AccessControl and ReentrancyGuard. 
 * It relies on an ERC20Snapshot token for voting power.
 */
contract DAOGovernance is AccessControl, ReentrancyGuard {
    /// @notice Role for contract administrators
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    /// @notice The governance token used for voting
    MintableToken public token;

    /// @notice Percentage of total supply required to reach quorum (0-100)
    uint256 public quorumPercentage = 30;

    /**
     * @dev Proposal structure containing all relevant details for a governance proposal.
     * OPTIMIZATION 1: Struct packing
     * bools packed with address into same 32-byte slot → saves storage slots.
     */
    struct Proposal {
        uint256 id;
        uint256 snapshotId;
        uint256 yesVotes;
        uint256 noVotes;
        address target;
        address creator;  // Slot X (20 bytes)
        uint32 startTime; // Slot X (4 bytes)
        uint32 endTime;   // Slot X (4 bytes)
        bool executed;    // Slot X (1 byte)
        bool canceled;    // Slot X (1 byte)
        bytes data;       // Slot X+1...
    }

    /// @notice Total number of proposals created
    uint256 public proposalCount;

    /// @notice Mapping from proposal ID to Proposal details
    mapping(uint256 => Proposal) public proposals;

    /// @notice Mapping from proposal ID to voter address to voting status
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    /**
     * @dev Custom errors for gas efficiency.
     * OPTIMIZATION 2: Custom errors cost ~50-200 gas less per revert than require strings.
     */
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

    /**
     * @notice Emitted when a new proposal is created
     * @param id The unique identifier of the proposal
     * @param creator The address that created the proposal
     * @param target The target contract for execution
     * @param startTime The timestamp when voting begins
     * @param endTime The timestamp when voting ends
     * @param description A brief description of the proposal
     */
    event ProposalCreated(
        uint256 indexed id,
        address indexed creator,
        address target,
        uint256 startTime,
        uint256 endTime,
        string description
    );

    /**
     * @notice Emitted when a vote is cast
     * @param id The ID of the proposal
     * @param voter The address of the voter
     * @param support True if voted YES, false if voted NO
     * @param weight The voting power used (token balance at snapshot)
     */
    event Voted(
        uint256 indexed id,
        address indexed voter,
        bool support,
        uint256 weight
    );

    /// @notice Emitted when a proposal is executed
    event ProposalExecuted(uint256 indexed id);

    /// @notice Emitted when a proposal is canceled
    event ProposalCanceled(uint256 indexed id);

    /// @notice Emitted when the quorum percentage is updated
    event QuorumUpdated(uint256 oldQuorum, uint256 newQuorum);

    /**
     * @notice Initializes the governance contract
     * @param _tokenAddress The address of the MintableToken used for voting
     */
    constructor(address _tokenAddress) {
        if (_tokenAddress == address(0)) revert InvalidTokenAddress();

        token = MintableToken(_tokenAddress);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    /**
     * @notice Updates the quorum percentage required for proposals to pass
     * @dev Only callable by accounts with ADMIN_ROLE
     * @param _newQuorum The new quorum percentage (1-100)
     */
    function updateQuorum(uint256 _newQuorum) external onlyRole(ADMIN_ROLE) {
        if (_newQuorum == 0 || _newQuorum > 100) revert InvalidQuorum();

        emit QuorumUpdated(quorumPercentage, _newQuorum);
        quorumPercentage = _newQuorum;
    }

    /**
     * @notice Creates a new governance proposal
     * @param target The address of the contract to be called if the proposal passes
     * @param data The calldata to be executed on the target contract
     * @param votingDelay The delay (in seconds) before voting starts
     * @param votingPeriod The duration (in seconds) that voting remains open
     * @param description A human-readable description of the proposal
     * @return The unique ID of the newly created proposal
     * @dev OPTIMIZATION 3: description in event not storage saves ~20k gas
     * @dev OPTIMIZATION 4: calldata instead of memory for parameters saves ~200 gas
     */
    function createProposal(
        address target,
        bytes calldata data,
        uint256 votingDelay,
        uint256 votingPeriod,
        string calldata description
    ) external returns (uint256) {
        if (target == address(0)) revert InvalidTarget();
        if (votingPeriod == 0)    revert InvalidVotingPeriod();

        uint256 snapshotId = token.snapshot();

        // OPTIMIZATION: unchecked increment for gas efficiency (overflow impossible in realistic DAO lifetime)
        uint256 currentId;
        unchecked {
            proposalCount++;
            currentId = proposalCount;
        }

        uint256 startTime = block.timestamp + votingDelay;
        uint256 endTime   = startTime + votingPeriod;

        proposals[currentId] = Proposal({
            id:         currentId,
            snapshotId: snapshotId,
            yesVotes:   0,
            noVotes:    0,
            target:     target,
            creator:    msg.sender,
            startTime:  uint32(startTime),
            endTime:    uint32(endTime),
            executed:   false,
            canceled:   false,
            data:       data
        });

        emit ProposalCreated(
            currentId,
            msg.sender,
            target,
            startTime,
            endTime,
            description
        );

        return currentId;
    }

    /**
     * @notice Casts a vote on an active proposal
     * @param proposalId The ID of the proposal to vote on
     * @param support Set to true for YES, false for NO
     * @dev Voting power is determined by the token balance at the proposal's snapshot ID
     */
    function vote(uint256 proposalId, bool support) external {
        Proposal storage p = proposals[proposalId];

        /**
         * OPTIMIZATION 5: Cache storage reads into memory
         * Reading p.startTime twice costs 200 gas (SLOAD). 
         * Caching into memory costs 100 gas for first read and 3 gas for subsequent reads.
         */
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

    /**
     * @notice Executes a passed proposal
     * @param proposalId The ID of the proposal to execute
     * @dev Requirements: voting must be ended, quorum must be met, YES votes must exceed NO votes.
     * Uses nonReentrant modifier to prevent reentrancy during the external call.
     */
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

    /**
     * @notice Cancels a proposal before voting has started
     * @param proposalId The ID of the proposal to cancel
     * @dev Only the proposal creator can cancel it, and only before the start time.
     */
    function cancelProposal(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];

        if (msg.sender != p.creator)         revert NotCreator();
        if (block.timestamp >= p.startTime)  revert VotingAlreadyStarted();
        if (p.canceled)                      revert AlreadyCanceled();

        p.canceled = true;

        emit ProposalCanceled(proposalId);
    }
}