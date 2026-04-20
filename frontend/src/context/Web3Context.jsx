import { createContext, useContext, useState, useCallback } from "react";
import { ethers } from "ethers";
import { toast } from "react-hot-toast";
import DAOGovernanceArtifact from "../../abi/DAOGovernance.json";
import MintableTokenArtifact from "../../abi/MintableToken.json";
import { CONTRACTS, NETWORK } from "../config";

const Web3Context = createContext(null);
const DAOGovernanceABI = DAOGovernanceArtifact.abi;
const MintableTokenABI = MintableTokenArtifact.abi;

export function Web3Provider({ children }) {
  const [account, setAccount]             = useState(null);
  const [tokenBalance, setTokenBalance]   = useState("0");
  const [daoContract, setDaoContract]     = useState(null);
  const [tokenContract, setTokenContract] = useState(null);

  const connectWallet = useCallback(async () => {
    try {
      if (!window.ethereum) {
        toast.error("MetaMask not found. Please install it.");
        return;
      }

      // ask MetaMask to connect
      const metamask = window.ethereum.providers?.find(p => p.isMetaMask) || window.ethereum;
      const provider = new ethers.BrowserProvider(metamask);
      await provider.send("eth_requestAccounts", []);

      // check correct network
      const network = await provider.getNetwork();
      if (Number(network.chainId) !== NETWORK.chainId) {
        toast.error(`Wrong network! Switch to ${NETWORK.name} (chainId ${NETWORK.chainId})`);
        return;
      }

      // signer = the connected wallet
      const signer  = await provider.getSigner();
      const address = await signer.getAddress();
      console.log("Connected address:", address);
      console.log("Chain ID:", Number(network.chainId));
      console.log("Token contract address:", CONTRACTS.MintableToken);

      // create contract instances using ABI from abi/ folder and address from config
      const token = new ethers.Contract(CONTRACTS.MintableToken, MintableTokenABI, signer);
      const dao   = new ethers.Contract(CONTRACTS.DAOGovernance,  DAOGovernanceABI,  signer);

      // read token balance
      const balance = await token.balanceOf(address);

      setAccount(address);
      setTokenContract(token);
      setDaoContract(dao);
      setTokenBalance(ethers.formatEther(balance));

      toast.success("Wallet connected!");

      // reload page on account or network switch
      window.ethereum.on("accountsChanged", () => window.location.reload());
      window.ethereum.on("chainChanged",    () => window.location.reload());

    } catch (err) {
      toast.error(err?.message || "Connection failed");
      console.error(err);
    }
  }, []);

  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setTokenBalance("0");
    setDaoContract(null);
    setTokenContract(null);
    window.ethereum?.removeAllListeners?.();
    toast.success("Wallet disconnected");
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!tokenContract || !account) return;
    const balance = await tokenContract.balanceOf(account);
    setTokenBalance(ethers.formatEther(balance));
  }, [tokenContract, account]);

  return (
    <Web3Context.Provider value={{
      account,
      tokenBalance,
      daoContract,
      tokenContract,
      connectWallet,
      disconnectWallet,
      refreshBalance,
    }}>
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const ctx = useContext(Web3Context);
  if (!ctx) throw new Error("useWeb3 must be used inside <Web3Provider>");
  return ctx;
}