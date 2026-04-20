// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title Treasury
/// @notice Holds funds and executes actions controlled by DAOGovernance
contract Treasury {
    address public dao;
    uint256 public value;
    address public lastCaller;

    event ValueChanged(uint256 oldValue, uint256 newValue);
    event EthReceived(address sender, uint256 amount);
    event DAOUpdated(address oldDao, address newDao);
    event EthWithdrawn(address to, uint256 amount);

    modifier onlyDao() {
        _onlyDao();
        _;
    }

    function _onlyDao() internal view {
        require(msg.sender == dao, "Not DAO");
    }

    constructor(address _dao) {
        require(_dao != address(0), "Invalid DAO");
        dao = _dao;
    }

    /// @notice Changes stored value — called via DAO executeProposal
    function setValue(uint256 _value) external onlyDao {
        emit ValueChanged(value, _value);
        value = _value;
        lastCaller = msg.sender;
    }

    /// @notice Updates DAO address
    function setDao(address _newDao) external onlyDao {
        require(_newDao != address(0), "Invalid address");
        emit DAOUpdated(dao, _newDao);
        dao = _newDao;
    }

    /// @notice Withdraw ETH (controlled by DAO)
    function withdraw(address payable to, uint256 amount) external onlyDao {
        require(address(this).balance >= amount, "Insufficient balance");
        (bool success, ) = to.call{value: amount}("");
        require(success, "Transfer failed");
        emit EthWithdrawn(to, amount);
    }

    /// @notice Accept ETH
    receive() external payable {
        emit EthReceived(msg.sender, msg.value);
    }

    /// @notice Returns ETH balance of treasury
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}