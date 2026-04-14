// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {MintableToken} from "../src/MintableToken.sol";
import {DAOGovernance} from "../src/DAOGovernance.sol";
import {Treasury} from "../src/Treasury.sol";
import {MockTreasury} from "./mocks/MockTreasury.sol";

contract DAOGovernanceTest is Test {
    MintableToken token;
    DAOGovernance dao;
    Treasury treasury;
    MockTreasury mockTreasury;

    address admin = address(1);
    address voter1 = address(2);
    address voter2 = address(3);
    address voter3 = address(4);
    address nonHolder = address(5);

    function setUp() public {
        vm.startPrank(admin);

        token = new MintableToken();
        dao = new DAOGovernance(address(token));
        treasury = new Treasury(address(dao));
        mockTreasury = new MockTreasury();

        token.grantRole(token.SNAPSHOT_ROLE(), address(dao));
        token.grantRole(token.MINTER_ROLE(), address(dao));

        token.mint(voter1, 100e18);
        token.mint(voter2, 100e18);
        token.mint(voter3, 100e18);

        vm.stopPrank();
    }

    function _createProposal(address target, bytes memory data) internal returns (uint256) {
        vm.prank(voter1);
        return dao.createProposal(target, data, 0, 1 days);
    }

    function _createSetValueProposal() internal returns (uint256) {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);
        return _createProposal(address(mockTreasury), data);
    }

    function _passAndExecute(uint256 proposalId) internal {
        vm.prank(voter1); dao.vote(proposalId, true);
        vm.prank(voter2); dao.vote(proposalId, true);
        vm.prank(voter3); dao.vote(proposalId, true);
        vm.warp(block.timestamp + 2 days);
        dao.executeProposal(proposalId);
    }

    function test_CreateProposal_StoresCorrectly() public {
        uint256 id = _createSetValueProposal();
        (
            uint256 pid,
            address creator,
            address target,
            ,,,,,,,
        ) = dao.proposals(id);

        assertEq(pid, 1);
        assertEq(creator, voter1);
        assertEq(target, address(mockTreasury));
    }

    function test_Vote_YesWeightRecorded() public {
        uint256 id = _createSetValueProposal();
        vm.prank(voter1);
        dao.vote(id, true);

        (,,,,,,,uint256 yes,,, ) = dao.proposals(id);
        assertEq(yes, 100e18);
    }

    function test_Vote_NoWeightRecorded() public {
        uint256 id = _createSetValueProposal();
        vm.prank(voter1);
        dao.vote(id, false);

        (,,,,,,,,uint256 no,, ) = dao.proposals(id);
        assertEq(no, 100e18);
    }

    function test_HappyPath_ProposalPassesAndExecutes() public {
        uint256 id = _createSetValueProposal();
        _passAndExecute(id);

        assertEq(mockTreasury.value(), 42);
        assertEq(mockTreasury.lastCaller(), address(dao));

        (,,,,,,,,,bool executed, ) = dao.proposals(id);
        assertTrue(executed);
    }

    function test_CancelProposal_BeforeVotingStarts() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);

        vm.prank(voter1);
        uint256 id = dao.createProposal(address(mockTreasury), data, 1 days, 1 days);

        vm.prank(voter1);
        dao.cancelProposal(id);

        (,,,,,,,,,, bool canceled) = dao.proposals(id);
        assertTrue(canceled);
    }

    function test_QuorumExactly30Percent_Executes() public {
        uint256 id = _createSetValueProposal();
        vm.prank(voter1);
        dao.vote(id, true);

        vm.warp(block.timestamp + 2 days);
        dao.executeProposal(id);

        assertEq(mockTreasury.value(), 42);
    }

    function test_AnyoneCanExecute_AfterDeadline() public {
        uint256 id = _createSetValueProposal();
        vm.prank(voter1); dao.vote(id, true);
        vm.prank(voter2); dao.vote(id, true);
        vm.prank(voter3); dao.vote(id, true);

        vm.warp(block.timestamp + 2 days);

        vm.prank(nonHolder);
        dao.executeProposal(id);

        assertEq(mockTreasury.value(), 42);
    }

    function test_UpdateQuorum_ByAdmin() public {
        vm.prank(admin);
        dao.updateQuorum(50);
        assertEq(dao.quorumPercentage(), 50);
    }

    function test_Revert_NonTokenHolderCannotVote() public {
        uint256 id = _createSetValueProposal();
        vm.prank(nonHolder);
        vm.expectRevert("No voting power");
        dao.vote(id, true);
    }

    function test_Revert_DoubleVote() public {
        uint256 id = _createSetValueProposal();
        vm.prank(voter1);
        dao.vote(id, true);

        vm.prank(voter1);
        vm.expectRevert("Already voted");
        dao.vote(id, true);
    }

    function test_Revert_BelowQuorum_CannotExecute() public {
        uint256 id = _createSetValueProposal();
        vm.warp(block.timestamp + 2 days);

        vm.expectRevert("Quorum not met");
        dao.executeProposal(id);
    }

    function test_Revert_ExecuteBeforeDeadline() public {
        uint256 id = _createSetValueProposal();
        vm.prank(voter1); dao.vote(id, true);
        vm.prank(voter2); dao.vote(id, true);
        vm.prank(voter3); dao.vote(id, true);

        vm.expectRevert("Voting not ended");
        dao.executeProposal(id);
    }

    function test_Revert_DefeatedProposal_CannotExecute() public {
        uint256 id = _createSetValueProposal();
        vm.prank(voter1); dao.vote(id, false);
        vm.prank(voter2); dao.vote(id, false);
        vm.prank(voter3); dao.vote(id, false);

        vm.warp(block.timestamp + 2 days);
        vm.expectRevert("Majority not reached");
        dao.executeProposal(id);
    }

    function test_Revert_VoteAfterDeadline() public {
        uint256 id = _createSetValueProposal();
        vm.warp(block.timestamp + 2 days);

        vm.prank(voter1);
        vm.expectRevert("Voting ended");
        dao.vote(id, true);
    }

    function test_Revert_AlreadyExecuted_CannotExecuteAgain() public {
        uint256 id = _createSetValueProposal();
        _passAndExecute(id);

        vm.expectRevert("Already executed");
        dao.executeProposal(id);
    }

    function test_Revert_CanceledProposal_CannotVote() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 1);

        vm.prank(voter1);
        uint256 id = dao.createProposal(address(mockTreasury), data, 1 days, 1 days);

        vm.prank(voter1);
        dao.cancelProposal(id);

        vm.warp(block.timestamp + 2 days);

        vm.prank(voter2);
        vm.expectRevert("Proposal canceled");
        dao.vote(id, true);
    }

    function test_Revert_CanceledProposal_CannotExecute() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 1);

        vm.prank(voter1);
        uint256 id = dao.createProposal(address(mockTreasury), data, 1 days, 1 days);

        vm.prank(voter1);
        dao.cancelProposal(id);

        // move past BOTH delay + voting period
        vm.warp(block.timestamp + 3 days);

        vm.expectRevert("Proposal canceled");
        dao.executeProposal(id);
    }

    function test_Revert_NonCreatorCannotCancel() public {
        uint256 id = _createSetValueProposal();
        vm.prank(voter2);
        vm.expectRevert("Not creator");
        dao.cancelProposal(id);
    }

    function test_Revert_CancelAfterVotingStarted() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 42);
        vm.prank(voter1);
        uint256 id = dao.createProposal(address(mockTreasury), data, 1 days, 1 days);

        vm.warp(block.timestamp + 2 days);

        vm.prank(voter1);
        vm.expectRevert("Voting already started");
        dao.cancelProposal(id);
    }

    function test_Revert_NonAdminCannotUpdateQuorum() public {
        vm.prank(nonHolder);
        vm.expectRevert();
        dao.updateQuorum(50);
    }

    function test_Revert_InvalidQuorum() public {
        vm.prank(admin);
        vm.expectRevert("Invalid quorum");
        dao.updateQuorum(0);

        vm.prank(admin);
        vm.expectRevert("Invalid quorum");
        dao.updateQuorum(101);
    }

    function test_Treasury_SetValue_ViaDAO() public {
        bytes memory data = abi.encodeWithSignature("setValue(uint256)", 99);
        uint256 id = _createProposal(address(treasury), data);

        vm.prank(voter1); dao.vote(id, true);
        vm.prank(voter2); dao.vote(id, true);
        vm.prank(voter3); dao.vote(id, true);

        vm.warp(block.timestamp + 2 days);
        dao.executeProposal(id);

        assertEq(treasury.value(), 99);
    }

    function test_Treasury_Revert_DirectCallNotDAO() public {
        vm.prank(voter1);
        vm.expectRevert("Not DAO");
        treasury.setValue(42);
    }

    function test_Treasury_ReceivesETH() public {
        vm.deal(voter1, 1 ether);
        vm.prank(voter1);
        (bool ok,) = address(treasury).call{value: 1 ether}("");
        assertTrue(ok);
        assertEq(treasury.getBalance(), 1 ether);
    }

    function test_Treasury_Withdraw_ViaDAO() public {
        // Fund treasury
        vm.deal(address(treasury), 1 ether);

        bytes memory data = abi.encodeWithSignature(
            "withdraw(address,uint256)",
            payable(voter1),
            1 ether
        );
        uint256 id = _createProposal(address(treasury), data);

        vm.prank(voter1); dao.vote(id, true);
        vm.prank(voter2); dao.vote(id, true);
        vm.prank(voter3); dao.vote(id, true);

        vm.warp(block.timestamp + 2 days);
        dao.executeProposal(id);

        assertEq(treasury.getBalance(), 0);
    }

    function test_HasVoted_MappingUpdated() public {
        uint256 id = _createSetValueProposal();
        assertFalse(dao.hasVoted(id, voter1));

        vm.prank(voter1);
        dao.vote(id, true);

        assertTrue(dao.hasVoted(id, voter1));
    }

    function test_ProposalCount_Increments() public {
        assertEq(dao.proposalCount(), 0);
        _createSetValueProposal();
        assertEq(dao.proposalCount(), 1);
        _createSetValueProposal();
        assertEq(dao.proposalCount(), 2);
    }
}