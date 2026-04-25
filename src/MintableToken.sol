// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "../lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {ERC20Snapshot} from "../lib/openzeppelin-contracts/contracts/token/ERC20/extensions/ERC20Snapshot.sol";
import {AccessControl} from "../lib/openzeppelin-contracts/contracts/access/AccessControl.sol";

/**
 * @title MintableToken
 * @author DAO Team
 * @notice An ERC20 token with snapshot functionality and access control for minting.
 * @dev This token is used as the governance weight in the DAOGovernance contract.
 */
contract MintableToken is ERC20, ERC20Snapshot, AccessControl {
    /// @notice Role for accounts allowed to mint new tokens
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    /// @notice Role for accounts allowed to trigger snapshots
    bytes32 public constant SNAPSHOT_ROLE = keccak256("SNAPSHOT_ROLE");

    /**
     * @notice Initializes the token with a name and symbol
     * @dev Grants the deployer both DEFAULT_ADMIN_ROLE and MINTER_ROLE.
     */
    constructor() ERC20("DAOGovToken", "DGT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    /**
     * @notice Mints new tokens to a specified address
     * @param to The recipient address
     * @param amount The amount of tokens to mint (in wei)
     * @dev Only callable by accounts with MINTER_ROLE.
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    /**
     * @notice Creates a new state snapshot of all token balances
     * @return The ID of the newly created snapshot
     * @dev Only callable by accounts with SNAPSHOT_ROLE.
     */
    function snapshot() external onlyRole(SNAPSHOT_ROLE) returns (uint256) {
        return _snapshot();
    }

    /**
     * @dev Hook that is called before any transfer of tokens.
     * Includes snapshot logic from ERC20Snapshot.
     */
    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal override(ERC20, ERC20Snapshot) {
        super._beforeTokenTransfer(from, to, amount);
    }
}