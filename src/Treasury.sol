// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Treasury
 * @author DAO Team
 * @notice Holds funds and executes actions as directed by the DAOGovernance contract.
 * @dev The treasury is controlled by the DAO contract. Only proposals that pass can trigger actions here.
 */
contract Treasury {
    /// @notice The address of the governing DAO contract
    address public dao;

    /// @notice A simple stored value that can be changed by the DAO
    uint256 public value;

    /// @notice Emitted when the stored value is changed
    event ValueChanged(uint256 oldValue, uint256 newValue);

    /// @notice Emitted when ETH is received by the treasury
    event EthReceived(address sender, uint256 amount);

    /// @notice Emitted when the DAO address is updated
    event DAOUpdated(address oldDao, address newDao);

    /// @notice Emitted when ETH is withdrawn from the treasury
    event EthWithdrawn(address to, uint256 amount);

    event ERC20Withdrawn(
        address indexed token,
        address indexed to,
        uint256 amount
    );
    /**
     * @dev Custom errors for gas efficiency.
     */
    error NotDAO();
    error InvalidAddress();
    error InsufficientBalance();
    error TransferFailed();

    /**
     * @dev Modifier to restrict function access to the DAO contract.
     */
    modifier onlyDao() {
        _onlyDao();
        _;
    }

    /**
     * @dev Internal function used by onlyDao modifier to reduce bytecode size.
     */
    function _onlyDao() internal view {
        if (msg.sender != dao) revert NotDAO();
    }

    /**
     * @notice Initializes the treasury with a DAO address
     * @param _dao The address of the DAOGovernance contract
     */
    constructor(address _dao) {
        if (_dao == address(0)) revert InvalidAddress();
        dao = _dao;
    }

    /**
     * @notice Changes the stored value
     * @param _value The new value to store
     * @dev Only callable by the DAO contract via a successful proposal.
     */
    function setValue(uint256 _value) external onlyDao {
        emit ValueChanged(value, _value);
        value = _value;
    }

    /**
     * @notice Updates the DAO contract address
     * @param _newDao The address of the new DAO contract
     * @dev Only callable by the current DAO contract via a successful proposal.
     */
    function setDao(address _newDao) external onlyDao {
        if (_newDao == address(0)) revert InvalidAddress();
        emit DAOUpdated(dao, _newDao);
        dao = _newDao;
    }

    /**
     * @notice Withdraws ETH from the treasury
     * @param to The recipient address (must be payable)
     * @param amount The amount of ETH to withdraw (in wei)
     * @dev Only callable by the DAO contract via a successful proposal.
     */
    function withdraw(address payable to, uint256 amount) external onlyDao {
        if (to == address(0)) revert InvalidAddress();
        if (address(this).balance < amount) revert InsufficientBalance();

        (bool success, ) = to.call{value: amount}("");
        if (!success) revert TransferFailed();

        emit EthWithdrawn(to, amount);
    }

    // this one is for token above for eth
    function withdrawERC20(
        address token,
        address to,
        uint256 amount
    ) external onlyDao {
        (bool success, bytes memory data) = token.call(
            abi.encodeWithSignature("transfer(address,uint256)", to, amount)
        );

        // Ensures tokens that return 'false' instead of reverting are caught
        bool result = success && (data.length == 0 || abi.decode(data, (bool)));
        if (!result) revert TransferFailed();

        emit ERC20Withdrawn(token, to, amount); // Frontend can now see this!
    }

    /**
     * @notice Fallback function to accept ETH deposits
     */
    receive() external payable {
        emit EthReceived(msg.sender, msg.value);
    }

    /**
     * @notice Returns the current ETH balance of the treasury
     * @return The balance in wei
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
