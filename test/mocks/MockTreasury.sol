// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockTreasury {
    uint256 public value;
    address public lastCaller;

    function setValue(uint256 _value) external {
        value = _value;
        lastCaller = msg.sender;
    }
}