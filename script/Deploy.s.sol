// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console} from "../lib/forge-std/src/Script.sol";
import {MintableToken} from "../src/MintableToken.sol";
import {DAOGovernance} from "../src/DAOGovernance.sol";
import {Treasury} from "../src/Treasury.sol";

contract Deploy is Script {
    function run() external returns (MintableToken, DAOGovernance, Treasury) {
        vm.startBroadcast();

        // 1. Deploy token
        MintableToken token = new MintableToken();
        console.log("MintableToken:", address(token));

        // 2. Deploy governance
        DAOGovernance governance = new DAOGovernance(address(token));
        console.log("DAOGovernance:", address(governance));

        // 3. Deploy treasury — pass governance address
        Treasury treasury = new Treasury(address(governance));
        console.log("Treasury:     ", address(treasury));

        // 4. Grant governance SNAPSHOT_ROLE so createProposal() can call token.snapshot()
        token.grantRole(token.SNAPSHOT_ROLE(), address(governance));
        console.log("SNAPSHOT_ROLE granted to governance");

        // 5. Mint initial supply to deployer so they can vote
        token.mint(msg.sender, 1_000_000 ether);
        console.log("Minted 1,000,000 DGT to deployer");

        vm.stopBroadcast();

        return (token, governance, treasury);
    }
}