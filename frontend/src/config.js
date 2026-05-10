// Replace the old Anvil addresses with your new Sepolia addresses from the terminal!
export const CONTRACTS = {
 MintableToken : '0xBC7fc8E6c167848BB500ff122a2Dc8dE8eA0bAA6',
 DAOGovernance : '0xaee5042Df32469fb36F978987461E12d05AC8Af3',
 Treasury :  '0xCb483489eCf38A60394D8CF89830085720B6CA77'
};

// Switch from Anvil to Sepolia
export const NETWORK = {
  chainId: 11155111, // The official Chain ID for Sepolia
  name: "Sepolia",
  rpcUrl: "https://rpc.sepolia.org", // Standard public RPC for frontend wallets
  currency: "ETH",
  blockExplorer: "https://sepolia.etherscan.io",
};
