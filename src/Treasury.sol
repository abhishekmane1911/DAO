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
    event DAOUpdated(address oldDAO, address newDAO);
    event EthWithdrawn(address to, uint256 amount);

    modifier onlyDAO() {
        require(msg.sender == dao, "Not DAO");
        _;
    }

    constructor(address _dao) {
        require(_dao != address(0), "Invalid DAO");
        dao = _dao;
    }

    /// @notice Changes stored value — called via DAO executeProposal
    function setValue(uint256 _value) external onlyDAO {
        emit ValueChanged(value, _value);
        value = _value;
        lastCaller = msg.sender;
    }

    /// @notice Updates DAO address
    function setDAO(address _newDAO) external onlyDAO {
        require(_newDAO != address(0), "Invalid address");

        emit DAOUpdated(dao, _newDAO);
        dao = _newDAO;
    }

    /// @notice Withdraw ETH (controlled by DAO)
    function withdraw(address payable to, uint256 amount) external onlyDAO {
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