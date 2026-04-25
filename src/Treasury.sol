// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Treasury
/// @notice Holds funds and executes actions controlled by DAOGovernance
contract Treasury {
    address public dao;
    uint256 public value;

    event ValueChanged(uint256 oldValue, uint256 newValue);
    event EthReceived(address sender, uint256 amount);
    event DAOUpdated(address oldDao, address newDao);
    event EthWithdrawn(address to, uint256 amount);

    // OPTIMIZATION: custom errors instead of require strings
    error NotDAO();
    error InvalidAddress();
    error InsufficientBalance();
    error TransferFailed();

    modifier onlyDao() {
        _onlyDao();
        _;
    }

    // OPTIMIZATION: extracted to internal function
    // reduces bytecode duplication when modifier used on multiple functions
    function _onlyDao() internal view {
        if (msg.sender != dao) revert NotDAO();
    }

    constructor(address _dao) {
        if (_dao == address(0)) revert InvalidAddress();
        dao = _dao;
    }

    /// @notice Changes stored value — called via DAO executeProposal
    /// @param _value New value to store
    function setValue(uint256 _value) external onlyDao {
        emit ValueChanged(value, _value);
        value = _value;
    }

    /// @notice Updates DAO address — only callable by current DAO via proposal
    /// @param _newDao New DAO contract address
    function setDao(address _newDao) external onlyDao {
        if (_newDao == address(0)) revert InvalidAddress();
        emit DAOUpdated(dao, _newDao);
        dao = _newDao;
    }

    /// @notice Withdraw ETH to an address — controlled by DAO vote
    /// @param to Recipient address
    /// @param amount Amount in wei to withdraw
    function withdraw(address payable to, uint256 amount) external onlyDao {
        if (to == address(0))                revert InvalidAddress();
        if (address(this).balance < amount)  revert InsufficientBalance();

        (bool success, ) = to.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit EthWithdrawn(to, amount);
    }

    /// @notice Accept ETH deposits
    receive() external payable {
        emit EthReceived(msg.sender, msg.value);
    }

    /// @notice Returns current ETH balance of treasury
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}