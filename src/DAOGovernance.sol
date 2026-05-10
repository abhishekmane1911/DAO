// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {
    AccessControl
} from "../lib/openzeppelin-contracts/contracts/access/AccessControl.sol";
import {
    ReentrancyGuard
} from "../lib/openzeppelin-contracts/contracts/security/ReentrancyGuard.sol";
import {MintableToken} from "./MintableToken.sol";

contract DAOGovernance is AccessControl, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    MintableToken public token;
    uint256 public quorumPercentage = 30;

    // 🔥 Changed: Now adjustable so you can combat spam on Sepolia
    uint256 public proposalThreshold = 10 * 10 ** 18;

    struct Proposal {
        uint256 id;
        uint256 snapshotId;
        uint256 yesVotes;
        uint256 noVotes;
        address target;
        address creator;
        uint32 startTime;
        uint32 endTime;
        bool executed;
        bool canceled;
        bytes data;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    // 🔥 Added: Consistency with your other custom errors
    error InsufficientTokensToPropose(uint256 held, uint256 required);
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

    // 🔥 Added: Track when threshold changes
    event ProposalThresholdUpdated(uint256 oldThreshold, uint256 newThreshold);

    constructor(address _tokenAddress) {
        if (_tokenAddress == address(0)) revert InvalidTokenAddress();
        token = MintableToken(_tokenAddress);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    function updateQuorum(uint256 _newQuorum) external onlyRole(ADMIN_ROLE) {
        if (_newQuorum == 0 || _newQuorum > 100) revert InvalidQuorum();
        emit QuorumUpdated(quorumPercentage, _newQuorum);
        quorumPercentage = _newQuorum;
    }

    // 🔥 Added: Allows the DAO to evolve its anti-spam measures
    function updateProposalThreshold(
        uint256 _newThreshold
    ) external onlyRole(ADMIN_ROLE) {
        emit ProposalThresholdUpdated(proposalThreshold, _newThreshold);
        proposalThreshold = _newThreshold;
    }

    function createProposal(
        address target,
        bytes calldata data,
        uint256 votingDelay,
        uint256 votingPeriod,
        string calldata description
    ) external returns (uint256) {
        if (target == address(0)) revert InvalidTarget();
        if (votingPeriod == 0) revert InvalidVotingPeriod();

        // 🔥 Improved: Using Custom Error for gas efficiency
        uint256 senderBalance = token.balanceOf(msg.sender);
        if (senderBalance < proposalThreshold) {
            revert InsufficientTokensToPropose(
                senderBalance,
                proposalThreshold
            );
        }

        uint256 snapshotId = token.snapshot();

        uint256 currentId;
        unchecked {
            proposalCount++;
            currentId = proposalCount;
        }

        uint256 startTime = block.timestamp + votingDelay;
        uint256 endTime = startTime + votingPeriod;

        proposals[currentId] = Proposal({
            id: currentId,
            snapshotId: snapshotId,
            yesVotes: 0,
            noVotes: 0,
            target: target,
            creator: msg.sender,
            startTime: uint32(startTime),
            endTime: uint32(endTime),
            executed: false,
            canceled: false,
            data: data
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

    // ... (rest of your functions vote, executeProposal, cancelProposal remain the same)

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

        uint256 start = p.startTime;

        uint256 end = p.endTime;

        bool canceled = p.canceled;

        uint256 snapshot = p.snapshotId;

        if (block.timestamp < start) revert VotingNotStarted();

        if (block.timestamp > end) revert VotingEnded();

        if (canceled) revert ProposalIsCanceled();

        if (hasVoted[proposalId][msg.sender]) revert AlreadyVoted();

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

        if (p.executed) revert AlreadyExecuted();

        if (p.canceled) revert ProposalIsCanceled();

        uint256 totalVotes = p.yesVotes + p.noVotes;

        uint256 totalSupplyAtSnapshot = token.totalSupplyAt(p.snapshotId);

        uint256 quorumRequired = (totalSupplyAtSnapshot * quorumPercentage) /
            100;

        if (totalVotes < quorumRequired) revert QuorumNotMet();

        if (p.yesVotes <= p.noVotes) revert MajorityNotReached();

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

        if (msg.sender != p.creator) revert NotCreator();

        if (block.timestamp >= p.startTime) revert VotingAlreadyStarted();

        if (p.canceled) revert AlreadyCanceled();

        p.canceled = true;

        emit ProposalCanceled(proposalId);
    }
}
