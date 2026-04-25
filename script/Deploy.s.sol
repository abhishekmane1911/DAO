// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "../lib/forge-std/src/Script.sol";
import {MintableToken} from "../src/MintableToken.sol";
import {DAOGovernance} from "../src/DAOGovernance.sol";
import {Treasury} from "../src/Treasury.sol";

contract Deploy is Script {
    function run() external returns (MintableToken, DAOGovernance, Treasury) {
        // We use the Private Key 0 for deployment
        vm.startBroadcast();

        // 1. Deploy the core contracts
        MintableToken token = new MintableToken();
        DAOGovernance governance = new DAOGovernance(address(token));
        Treasury treasury = new Treasury(address(governance));

        // 2. Link the Snapshot Role so Governance can see historical balances
        token.grantRole(token.SNAPSHOT_ROLE(), address(governance));
        console.log("System deployed at:", address(governance));

        // --- GENESIS DISTRIBUTION ---
        // Total Supply Target: 1,000,000 DGT

        // Admin (msg.sender / Account 0) gets 30%
        token.mint(msg.sender, 300_000 ether);

        // Treasury (The DAO Vault) gets 20%
        token.mint(address(treasury), 200_000 ether);

        // The "Public" (Your specific Anvil Accounts 1-9) get 50%
        // Math: 500,000 / 9 ≈ 55,555.55
        uint256 amountPerUser = 55_555 ether;

        address[] memory publicUsers = new address[](9);
        publicUsers[0] = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8; // (1)
        publicUsers[1] = 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC; // (2)
        publicUsers[2] = 0x90F79bf6EB2c4f870365E785982E1f101E93b906; // (3)
        publicUsers[3] = 0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65; // (4)
        publicUsers[4] = 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc; // (5)
        publicUsers[5] = 0x976EA74026E726554dB657fA54763abd0C3a0aa9; // (6)
        publicUsers[6] = 0x14dC79964da2C08b23698B3D3cc7Ca32193d9955; // (7)
        publicUsers[7] = 0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f; // (8)
        publicUsers[8] = 0xa0Ee7A142d267C1f36714E4a8F75612F20a79720; // (9)

        for (uint256 i = 0; i < publicUsers.length; i++) {
            token.mint(publicUsers[i], amountPerUser);
        }

        console.log(
            "Genesis seeding complete. 10 accounts now have voting power."
        );

        vm.stopBroadcast();
        return (token, governance, treasury);
    }
}
