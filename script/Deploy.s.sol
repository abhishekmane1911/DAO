// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "forge-std/Script.sol";
import {MintableToken} from "../src/MintableToken.sol";
import {DAOGovernance} from "../src/DAOGovernance.sol";
import {Treasury} from "../src/Treasury.sol";

contract Deploy is Script {
    function run() external returns (MintableToken, DAOGovernance, Treasury) {
        // Load your real MetaMask Private Key from the .env file
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");

        vm.startBroadcast(deployerPrivateKey);

        console.log("Deploying contracts...");

        // 1. Deploy the core contracts
        MintableToken token = new MintableToken();
        DAOGovernance governance = new DAOGovernance(address(token));
        Treasury treasury = new Treasury(address(governance));

        // 2. Link Token & Treasury for the 0.05 ETH "Join DAO" feature
        token.setTreasury(payable(address(treasury)));

        token.mint(address(treasury), 950_000 ether);

        // 3. Grant Roles
        // Allow the Governance contract to take voting snapshots
        token.grantRole(token.SNAPSHOT_ROLE(), address(governance));

        // Grant the DAO the ability to govern itself (Change quorum/threshold)
        governance.grantRole(governance.ADMIN_ROLE(), address(governance));

        /*
         * NOTE: You (msg.sender) currently still have the ADMIN_ROLE too.
         * For your school project demo, it is safer to keep it so you don't
         * lock yourself out. If this were a real mainnet launch, you would
         * remove your own power right now by uncommenting the line below:
         *
         * governance.renounceRole(governance.ADMIN_ROLE(), msg.sender);
         */

        vm.stopBroadcast();

        // 4. Output addresses so you can easily copy them into your React config.js!
        console.log("=== DEPLOYMENT SUCCESSFUL ===");
        console.log("MintableToken:", address(token));
        console.log("DAOGovernance:", address(governance));
        console.log("Treasury:     ", address(treasury));

        return (token, governance, treasury);
    }
}
