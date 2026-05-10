// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {
    ERC20
} from "../lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";
import {
    ERC20Snapshot
} from "../lib/openzeppelin-contracts/contracts/token/ERC20/extensions/ERC20Snapshot.sol";
import {
    AccessControl
} from "../lib/openzeppelin-contracts/contracts/access/AccessControl.sol";

contract MintableToken is ERC20, ERC20Snapshot, AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant SNAPSHOT_ROLE = keccak256("SNAPSHOT_ROLE");

    // ─── SALE CONFIGURATION ───
    uint256 public constant TOKEN_PRICE = 0.005 ether;
    uint256 public constant TOKENS_PER_BUY = 80000 * 10 ** 18;
    address payable public treasuryAddress;

    event TokensPurchased(
        address indexed buyer,
        uint256 ethSpent,
        uint256 tokensReceived
    );

    constructor() ERC20("DAOGovToken", "DGT") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);

        // Mint initial 000 tokens to Admin
        _mint(msg.sender, 100000 * 10 ** 18);
    }

    /**
     * @notice Allows the Admin to set the Treasury address after deployment
     */
    function setTreasury(
        address payable _treasury
    ) external onlyRole(DEFAULT_ADMIN_ROLE) {
        treasuryAddress = _treasury;
    }

    /**
     * @notice Purchase 100,000 DGT for 0.05 Sepolia ETH
     * @dev The ETH is automatically forwarded to the DAO Treasury
     */
    function buyTokens() external payable {
        require(msg.value == TOKEN_PRICE, "Must send exactly 0.05 Sepolia ETH");
        require(treasuryAddress != address(0), "Treasury not set yet");

        // Mint tokens to the buyer
        _mint(msg.sender, TOKENS_PER_BUY);

        // Forward the ETH to the Treasury so the DAO has a budget
        (bool success, ) = treasuryAddress.call{value: msg.value}("");
        require(success, "Failed to send ETH to Treasury");

        emit TokensPurchased(msg.sender, msg.value, TOKENS_PER_BUY);
    }

    // ... (rest of your standard snapshot/mint functions) ...
    function snapshot() external onlyRole(SNAPSHOT_ROLE) returns (uint256) {
        return _snapshot();
    }

    // Add this function inside MintableToken.sol
    /**
     * @notice Allows an address with MINTER_ROLE to mint new tokens
     * @param to The address receiving the tokens
     * @param amount The amount of tokens to mint (remember the 18 decimals!)
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override(ERC20, ERC20Snapshot) {
        super._beforeTokenTransfer(from, to, amount);
    }
}
