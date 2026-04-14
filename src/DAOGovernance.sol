// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {
    ERC20Snapshot
} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Snapshot.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {
    ReentrancyGuard
} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract GovernanceToken is ERC20, ERC20Snapshot, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant SNAPSHOT_ROLE = keccak256("SNAPSHOT_ROLE");

    constructor() ERC20("DAOGovToken", "DGT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function snapshot() external onlyRole(SNAPSHOT_ROLE) returns (uint256) {
        return _snapshot();
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Snapshot) {
        super._beforeTokenTransfer(from, to, amount);
    }
}

contract DAOGovernance is AccessControl, ReentrancyGuard {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");

    GovernanceToken public token;
    uint256 public quorumPercentage = 30;

    struct Proposal {
        uint256 id;
        address creator;
        address target;
        bytes data;
        uint256 snapshotId;
        uint256 startTime;
        uint256 endTime;
        uint256 yesVotes;
        uint256 noVotes;
        bool executed;
        bool canceled;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event ProposalCreated(
        uint256 indexed id,
        address indexed creator,
        address target,
        uint256 startTime,
        uint256 endTime
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
        require(_tokenAddress != address(0), "Invalid token address");

        token = GovernanceToken(_tokenAddress);

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
    }

    function updateQuorum(uint256 _newQuorum) external onlyRole(ADMIN_ROLE) {
        require(_newQuorum > 0 && _newQuorum <= 100, "Invalid quorum");

        emit QuorumUpdated(quorumPercentage, _newQuorum);
        quorumPercentage = _newQuorum;
    }

    function createProposal(
        address target,
        bytes calldata data,
        uint256 votingDelay,
        uint256 votingPeriod
    ) external returns (uint256) {
        require(target != address(0), "Invalid target");
        require(votingPeriod > 0, "Invalid voting period");

        uint256 snapshotId = token.snapshot();

        proposalCount++;

        uint256 startTime = block.timestamp + votingDelay;
        uint256 endTime = startTime + votingPeriod;

        proposals[proposalCount] = Proposal({
            id: proposalCount,
            creator: msg.sender,
            target: target,
            data: data,
            snapshotId: snapshotId,
            startTime: startTime,
            endTime: endTime,
            yesVotes: 0,
            noVotes: 0,
            executed: false,
            canceled: false
        });

        emit ProposalCreated(
            proposalCount,
            msg.sender,
            target,
            startTime,
            endTime
        );

        return proposalCount;
    }

    function vote(uint256 proposalId, bool support) external {
        Proposal storage p = proposals[proposalId];

        require(block.timestamp >= p.startTime, "Voting not started");
        require(block.timestamp <= p.endTime, "Voting ended");
        require(!p.canceled, "Proposal canceled");
        require(!hasVoted[proposalId][msg.sender], "Already voted");

        uint256 weight = token.balanceOfAt(msg.sender, p.snapshotId);
        require(weight > 0, "No voting power");

        hasVoted[proposalId][msg.sender] = true;

        if (support) {
            p.yesVotes += weight;
        } else {
            p.noVotes += weight;
        }

        emit Voted(proposalId, msg.sender, support, weight);
    }

    function executeProposal(uint256 proposalId) external nonReentrant {
        Proposal storage p = proposals[proposalId];

        require(block.timestamp > p.endTime, "Voting not ended");
        require(!p.executed, "Already executed");
        require(!p.canceled, "Proposal canceled");

        uint256 totalVotes = p.yesVotes + p.noVotes;
        uint256 totalSupplyAtSnapshot = token.totalSupplyAt(p.snapshotId);

        uint256 quorumRequired = (totalSupplyAtSnapshot * quorumPercentage) /
            100;

        require(totalVotes >= quorumRequired, "Quorum not met");
        require(p.yesVotes > p.noVotes, "Majority not reached");

        p.executed = true;

        (bool success, ) = p.target.call(p.data);
        require(success, "Transaction failed");

        emit ProposalExecuted(proposalId);
    }

    function cancelProposal(uint256 proposalId) external {
        Proposal storage p = proposals[proposalId];

        require(msg.sender == p.creator, "Not creator");
        require(block.timestamp < p.startTime, "Voting already started");
        require(!p.canceled, "Already canceled");

        p.canceled = true;

        emit ProposalCanceled(proposalId);
    }
}
