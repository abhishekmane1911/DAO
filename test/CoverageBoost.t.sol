// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test} from "forge-std/Test.sol";
import {MintableToken} from "../src/MintableToken.sol";
import {DAOGovernance} from "../src/DAOGovernance.sol";
import {Treasury} from "../src/Treasury.sol";

contract CoverageBoostTest is Test {
    MintableToken token;
    DAOGovernance dao;
    Treasury treasury;

    address admin  = address(1);
    address voter1 = address(2);

    function setUp() public {
        vm.startPrank(admin);
        token = new MintableToken();
        dao   = new DAOGovernance(address(token));
        treasury = new Treasury(address(dao));
        token.grantRole(token.SNAPSHOT_ROLE(), address(dao));
        token.mint(voter1, 100e18);
        vm.stopPrank();
    }

    function test_DAOCons_Revert_ZeroAddress() public {
        vm.expectRevert(DAOGovernance.InvalidTokenAddress.selector);
        new DAOGovernance(address(0));
    }

    function test_TreasuryCons_Revert_ZeroAddress() public {
        vm.expectRevert(Treasury.InvalidAddress.selector);
        new Treasury(address(0));
    }

    function test_CreateProposal_Revert_ZeroTarget() public {
        vm.prank(voter1);
        vm.expectRevert(DAOGovernance.InvalidTarget.selector);
        dao.createProposal(address(0), "", 0, 1 days, "desc");
    }

    function test_CreateProposal_Revert_ZeroPeriod() public {
        vm.prank(voter1);
        vm.expectRevert(DAOGovernance.InvalidVotingPeriod.selector);
        dao.createProposal(address(3), "", 0, 0, "desc");
    }

    function test_ExecuteProposal_Revert_TransactionFailed() public {
        bytes memory data = abi.encodeWithSignature("nonExistentFunction()");
        vm.prank(voter1);
        uint256 id = dao.createProposal(address(treasury), data, 0, 1 days, "desc");

        vm.prank(voter1);
        dao.vote(id, true);

        vm.warp(block.timestamp + 2 days);
        
        vm.expectRevert(DAOGovernance.TransactionFailed.selector);
        dao.executeProposal(id);
    }

    function test_Treasury_Withdraw_Revert_ZeroTo() public {
        bytes memory data = abi.encodeWithSignature("withdraw(address,uint256)", address(0), 1 ether);
        vm.prank(voter1);
        uint256 id = dao.createProposal(address(treasury), data, 0, 1 days, "desc");
        vm.prank(voter1);
        dao.vote(id, true);
        vm.warp(block.timestamp + 2 days);
        
        vm.expectRevert(DAOGovernance.TransactionFailed.selector);
        dao.executeProposal(id);
    }

    function test_Treasury_Withdraw_Revert_InsufficientBalance() public {
        bytes memory data = abi.encodeWithSignature("withdraw(address,uint256)", voter1, 100 ether);
        vm.prank(voter1);
        uint256 id = dao.createProposal(address(treasury), data, 0, 1 days, "desc");
        vm.prank(voter1);
        dao.vote(id, true);
        vm.warp(block.timestamp + 2 days);
        
        vm.expectRevert(DAOGovernance.TransactionFailed.selector);
        dao.executeProposal(id);
    }
}
