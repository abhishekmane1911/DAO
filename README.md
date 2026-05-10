# CS218 Project 3 — DAO Governance Contract

## Team Members

| Name | Roll Number |
|------|-------------|
| Mane Abhishek Ganesh | 240001043 |
| Dhoke Vinod Eknath | 240001025 |
| Patil Rajvardhan Umesh | 240001051 |
| Chetan Verma | 240001022 |
| Sahil | 240041032 |
| Veer Doria | 240041039 |

---

## Project Overview

A fully decentralised on-chain governance system where **DGT (DAO Governance Token)** holders can create, vote on, and execute proposals that interact with the **Treasury** contract. All proposal metadata (title, description, cover image) is stored on **IPFS** via Pinata; only the IPFS CID is stored on-chain to minimise gas costs.

### Contracts

| Contract | Description |
|----------|-------------|
| `src/DAOGovernance.sol` | Core governance logic — create, vote, execute, cancel proposals |
| `src/MintableToken.sol` | ERC-20 governance token with snapshot and minting roles |
| `src/Treasury.sol` | ETH treasury that only the governance contract can withdraw from |

### Key Features
- **Snapshot-based voting** — voter power is locked at proposal creation, preventing flash-loan attacks
- **Quorum enforcement** — 30% of snapshot supply must participate for a valid result
- **Struct packing** — `bool executed` and `bool canceled` packed with `address creator` in one 32-byte storage slot
- **IPFS metadata** — title, description, and cover image stored off-chain; CID stored on-chain
- **ReentrancyGuard** on `executeProposal` to prevent reentrancy during external calls
- **AccessControl** — `ADMIN_ROLE` for governance parameter updates

---

# DAO Governance DApp

A decentralized governance platform built on Ethereum Sepolia where users can create proposals, vote using DAO tokens, and execute proposals once the quorum is reached.

---

# Tech Stack

- Solidity
- Foundry
- React + Vite
- Ethers.js
- MetaMask
- Pinata (IPFS)

---

# Prerequisites

Before running the project, make sure you have the following installed:

## Install Foundry (Smart Contracts)

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

Verify installation:

```bash
forge --version
```

---

## Install Node.js

Frontend requires **Node.js v18+**

Check your version:

```bash
node --version
```

---

# Project Setup

## Clone the Repository

```bash
git clone <REPO LINK> .
```

---

# Smart Contracts

> Smart contracts are already deployed on the Sepolia testnet.  
> No backend or contract deployment changes are required.

---

# Frontend Setup

## 1. Navigate to Frontend Directory

```bash
cd frontend
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Create Environment File

Copy the example environment file:

```bash
cp .env.example .env
```

Now update the `.env` file with your Pinata credentials:

```env
VITE_PINATA_JWT=your_pinata_jwt
VITE_PINATA_GATEWAY=https://your-gateway.mypinata.cloud
```

---

## 4. Start Development Server

```bash
npm run dev
```

Frontend will start on:

```txt
http://localhost:5173
```

---

# MetaMask Setup

## Connect to Sepolia Testnet

Open MetaMask and switch your network to:

```txt
Sepolia Test Network
```

---

# Important Testing Requirement

To fully test proposal execution and voting flow:

- Create **7 dummy MetaMask accounts**
- Fund each account with at least:

```txt
0.005 Sepolia ETH
```

You can use a Sepolia faucet to get test ETH.

---

# Buy DAO Tokens

Each account must:

1. Connect wallet
2. Buy DAO tokens from the DApp
3. Use tokens for governance voting

---

# Governance Flow

## 1. Create Proposal

Any eligible wallet can create a governance proposal.

Example proposals:

- Treasury spending
- Parameter updates
- DAO decisions

---

## 2. Vote on Proposal

Use your DAO tokens to vote:

- YES
- NO

Voting power depends on token holdings.
After each vote wait for till transaction completes (on sepolia) then move forward, we suggest to set time for voting at least 10 min
---

## 3. Execute Proposal

Once enough votes are collected and quorum is reached:

- Proposal becomes executable
- Execute proposal directly from the frontend

---

# Development Notes

- Frontend changes only
- Do not modify backend/contracts
- Contracts are already deployed on Sepolia

---

# Wallet Requirements

- MetaMask extension installed
- Sepolia ETH for gas fees
- DAO tokens for voting

---

# Common Issues

## MetaMask Not Connecting

- Refresh browser
- Reconnect wallet
- Ensure MetaMask is unlocked

---

## Wrong Network

Switch to:

```txt
Sepolia Testnet
```

---

## Transaction Failing

Make sure the wallet has:

- Enough Sepolia ETH
- DAO tokens
- Correct network selected

---

## Running Tests

```bash
# Run all tests
forge test

# Run with verbose output (shows individual test names)
forge test -v

# Run a specific test file
forge test --match-path test/DAOGovernance.t.sol -v
```

### Test Coverage

```bash
# Generate coverage report (must be >= 70%)
forge coverage
```

**Current Coverage:**

| File | % Lines | % Statements | % Branches | % Functions |
|------|---------|--------------|------------|-------------|
| `src/DAOGovernance.sol` | 98.31% (58/59) | 97.33% (73/75) | 90.00% (18/20) | 100.00% (6/6) |
| `src/MintableToken.sol` | 100.00% (9/9) | 100.00% (6/6) | 100.00% (0/0) | 100.00% (4/4) |
| `src/Treasury.sol` | 83.33% (20/24) | 78.26% (18/23) | 66.67% (4/6) | 87.50% (7/8) |
| **Total** | **75.00% (90/120)** | **72.79% (99/136)** | **84.62% (22/26)** | **90.00% (18/20)** |

---

## Gas Report

```bash
# Generate gas usage report
forge test --gas-report
```

**Gas Report Output (After Optimisation — `report/gas_after.txt`):**

| Function | Min | Avg | Median | Max | # Calls |
|----------|-----|-----|--------|-----|---------|
| `createProposal` | 254,250 | 287,944 | 288,450 | 310,862 | 23 |
| `vote` | 30,660 | 75,908 | 74,284 | 91,384 | 30 |
| `executeProposal` | 28,981 | 74,496 | 81,108 | 111,658 | 11 |
| `cancelProposal` | 23,987 | 28,364 | 30,574 | 30,574 | 5 |
| `updateQuorum` | 24,179 | 34,640 | 27,466 | 59,451 | 4 |

### Gas Optimisation — Struct Packing

**Target function:** `createProposal` (most expensive function)

**Optimisation applied:** Struct field reordering to enable EVM storage slot packing.

**Before (unoptimised struct layout — `report/gas_before.txt`):**
```solidity
struct Proposal {
    uint256 id;
    address creator;      // 20 bytes — leaves 12 bytes wasted in slot
    address target;       // 20 bytes — leaves 12 bytes wasted in slot
    uint256 yesVotes;
    uint256 noVotes;
    uint256 startTime;    // full uint256 slot for a timestamp
    uint256 endTime;      // full uint256 slot for a timestamp
    bool executed;        // 1 byte — wastes 31 bytes in its own slot
    bool canceled;        // 1 byte — wastes 31 bytes in its own slot
    bytes data;
}
```

**After (optimised struct layout):**
```solidity
struct Proposal {
    uint256 id;           // slot 0
    uint256 snapshotId;   // slot 1
    uint256 yesVotes;     // slot 2
    uint256 noVotes;      // slot 3
    address target;       // slot 4 — 20 bytes
    address creator;      // ─┐ packed together into slot 5
    uint32 startTime;     //  │ (20 + 20 + 4 + 4 + 1 + 1 = 50 bytes > 32, so creator+bools share slot 5)
    uint32 endTime;       //  │
    bool executed;        //  │
    bool canceled;        // ─┘
    bytes data;           // slot 6+
}
```

**Before vs. After (measured from `report/gas_before.txt` and `report/gas_after.txt`):**

| Function | Before Avg | After Avg | Gas Saved | Change |
|----------|-----------|-----------|-----------|--------|
| `createProposal` | 307,620 | 287,944 | **−19,676** | **−6.4%** |
| `cancelProposal` | 28,112 | 28,364 | +252 | marginal |
| `executeProposal` | 72,439 | 74,496 | −2,057 | read tradeoff |
| `vote` | 73,865 | 75,908 | −1,943 | read tradeoff |

**Explanation:** Struct packing reduces the number of SSTORE operations on proposal creation. Each cold SSTORE costs 20,000 gas. The optimised layout saves approximately 1 storage slot on every new proposal, resulting in a measured saving of **19,676 gas per `createProposal` call (6.4% reduction)**. The slight increase in `vote` and `executeProposal` is an acceptable tradeoff — those functions only read the struct (SLOAD = 2,100 gas), so the impact is small.

---

## Deployment

### Local Anvil (Development)

```bash
# Terminal 1 — start local blockchain
anvil

# Terminal 2 — deploy contracts
forge script script/Deploy.s.sol --rpc-url http://127.0.0.1:8545 --broadcast --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
```

Deployed addresses will appear in `broadcast/Deploy.s.sol/31337/run-latest.json`. Update `frontend/src/config.js` with these addresses.

### Testnet / Mainnet

```bash
# Set your private key as an environment variable (never hardcode it)
export PRIVATE_KEY=<your_private_key>

forge script script/Deploy.s.sol \
  --rpc-url <RPC_URL> \
  --broadcast \
  --private-key $PRIVATE_KEY \
  --verify  # optional: verifies on Etherscan
```

---

## Frontend — DApp Usage

1. Start Anvil and deploy contracts (see above)
2. Import Anvil Account #0 into MetaMask (`0xac09...ff80`)
3. Add the Anvil network to MetaMask:
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
4. Run `npm run dev` in the `frontend/` directory
5. Open `http://localhost:5173`

### UI Features
- **Landing page** — project overview and stats
- **Dashboard** — all proposals with status (Pending / Active / Ended / Executed / Canceled), live countdown timers, quorum ring chart
- **Create Proposal** — title, description, cover image (uploaded to IPFS), target contract, calldata, voting delay & period
- **Proposal Detail** — full metadata from IPFS, vote yes/no, execute, cancel buttons

---

## Local Development & Troubleshooting

When developing locally with Anvil and MetaMask, you may encounter a few common blockchain state issues. Follow these instructions to resolve them:

### 1. Fast-Forwarding Time (To test Proposal Execution)
Anvil's block time only advances when a transaction is mined. If your frontend says a proposal has "Ended" but the smart contract throws a `VotingNotEnded()` error, you need to manually advance the blockchain time.
Run this command in a new terminal to warp time forward by 1 day (86400 seconds) and mine a block:
```bash
cast rpc evm_increaseTime 86400 && cast rpc evm_mine
```
You can then click "Execute" in the frontend successfully.

### 2. "BAD_DATA" or "CALL_EXCEPTION" in Frontend
If you restart your Anvil node, the blockchain is wiped clean. If you run the deploy script again, your contracts will have **new addresses**.
If your frontend throws a `BAD_DATA` error, it is trying to read from the old dead addresses.
**Fix:**
1. Check the terminal where you ran `forge script` for the new deployed addresses.
2. Open `frontend/src/config.js` and update `MintableToken`, `DAOGovernance`, and `Treasury` with the new addresses.
3. Save the file and refresh your browser.

### 3. Transactions Failing Silently in MetaMask (Nonce Error)
If you restart Anvil, MetaMask's internal transaction count (nonce) gets out of sync with the fresh blockchain. 
**Fix:**
1. Open MetaMask.
2. Go to **Settings > Advanced**.
3. Click **Clear activity tab data** (or "Reset Account").
4. This safely resets the nonce for the local network.

---

## Architecture

```
DAOGovernance
    │
    ├── uses ──► MintableToken (ERC-20 + ERC20Snapshot)
    │                └── balanceOfAt(account, snapshotId) → voting weight
    │                └── totalSupplyAt(snapshotId)        → quorum calculation
    │
    └── calls ──► Treasury (on executeProposal)
                     └── any function encoded in proposal.data
```

---

## Security

| Threat | Mitigation |
|--------|-----------|
| Flash loan vote manipulation | Snapshot taken at proposal creation — past balances cannot be changed |
| Reentrancy on execute | `ReentrancyGuard` + CEI pattern (state updated before external call) |
| Unauthorised quorum change | `ADMIN_ROLE` via OpenZeppelin `AccessControl` |
| Double voting | `hasVoted[proposalId][voter]` mapping checked before each vote |
| Executing failed proposals | `MajorityNotReached` and `QuorumNotMet` custom errors revert execution |
| Executing before deadline | `VotingNotEnded` error reverts if `block.timestamp <= endTime` |

---

## On-Chain vs Off-Chain Data

| Store On-Chain | Keep Off-Chain |
|----------------|---------------|
| Proposal ID, target address, calldata (bytes) | Full proposal text and rationale → IPFS (CID stored on-chain) |
| Voting deadline timestamp, yes/no vote counts | Cover images and supporting documents → IPFS |
| `hasVoted[proposalId][voter]` mapping | Forum discussions and governance deliberations |
| Snapshot ID and quorum percentage | User KYC / identity information |

> **Privacy warning:** All votes and voter addresses are publicly visible on-chain. Wallet addresses are pseudonymous but can be de-anonymised via on-chain analytics. Never associate wallet addresses with real-world voter identities.
