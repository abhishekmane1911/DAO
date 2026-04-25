// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

//this is governance token contract

import {ERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {ERC20Snapshot} from "../lib/openzeppelin-contracts/contracts/token/ERC20/extensions/ERC20Snapshot.sol";
import {AccessControl} from "../lib/openzeppelin-contracts/contracts/access/AccessControl.sol";

contract MintableToken is ERC20, ERC20Snapshot, AccessControl {
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

    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal override(ERC20, ERC20Snapshot) {
        super._beforeTokenTransfer(from, to, amount);
    }
}