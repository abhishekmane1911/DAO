import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { toast } from "react-hot-toast";
import DAOGovernanceArtifact from "../../abi/DAOGovernance.json";
import MintableTokenArtifact from "../../abi/MintableToken.json";
import { CONTRACTS, NETWORK } from "../config";

const Web3Context = createContext(null);
const DAOGovernanceABI = DAOGovernanceArtifact.abi;
const MintableTokenABI = MintableTokenArtifact.abi;

const STORAGE_KEY = "dao_wallet_connected";

export function Web3Provider({ children }) {
  const [account, setAccount]             = useState(null);
  const [tokenBalance, setTokenBalance]   = useState("0");
  const [daoContract, setDaoContract]     = useState(null);
  const [tokenContract, setTokenContract] = useState(null);
  const [connecting, setConnecting]       = useState(false);

  // track listeners so we can clean them up
  const listenersAttached = useRef(false);

  /** Core connect logic — shared by manual connect and auto-reconnect */
  const performConnect = useCallback(async (silent = false) => {
    if (!window.ethereum) {
      if (!silent) toast.error("MetaMask not found. Please install it.");
      return;
    }

    setConnecting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);

      // check & auto-switch network
      const network = await provider.getNetwork();
      const targetHex = "0x" + NETWORK.chainId.toString(16);

      if (Number(network.chainId) !== NETWORK.chainId) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: targetHex }],
          });
        } catch (switchErr) {
          if (switchErr.code === 4902) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [{
                chainId: targetHex,
                chainName: NETWORK.name,
                rpcUrls: [NETWORK.rpcUrl],
                nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
              }],
            });
          } else {
            if (!silent) toast.error(`Please switch to ${NETWORK.name} (chain ${NETWORK.chainId})`);
            return;
          }
        }
        // after switch, re-create provider
        const newProvider = new ethers.BrowserProvider(window.ethereum);
        const signer  = await newProvider.getSigner();
        const address = await signer.getAddress();
        setupContracts(signer, address, silent);
        return;
      }

      const signer  = await provider.getSigner();
      const address = await signer.getAddress();
      setupContracts(signer, address, silent);
    } catch (err) {
      if (!silent) toast.error(err?.message || "Connection failed");
      console.error(err);
    } finally {
      setConnecting(false);
    }
  }, []);

  /** Create contract instances, read balance, store state */
  const setupContracts = useCallback((signer, address, silent) => {
    const token = new ethers.Contract(CONTRACTS.MintableToken, MintableTokenABI, signer);
    const dao   = new ethers.Contract(CONTRACTS.DAOGovernance,  DAOGovernanceABI,  signer);

    token.balanceOf(address).then(bal => {
      setTokenBalance(ethers.formatEther(bal));
    }).catch(console.error);

    setAccount(address);
    setTokenContract(token);
    setDaoContract(dao);

    localStorage.setItem(STORAGE_KEY, "true");
    if (!silent) toast.success("Wallet connected!");
  }, []);

  /** Public connect handler */
  const connectWallet = useCallback(() => performConnect(false), [performConnect]);

  /** Disconnect — clear state + localStorage */
  const disconnectWallet = useCallback(() => {
    setAccount(null);
    setTokenBalance("0");
    setDaoContract(null);
    setTokenContract(null);
    localStorage.removeItem(STORAGE_KEY);
    toast.success("Wallet disconnected");
  }, []);

  /** Refresh token balance */
  const refreshBalance = useCallback(async () => {
    if (!tokenContract || !account) return;
    try {
      const balance = await tokenContract.balanceOf(account);
      setTokenBalance(ethers.formatEther(balance));
    } catch (err) {
      console.error("Failed to refresh balance:", err);
    }
  }, [tokenContract, account]);

  // Auto-reconnect on page load if previously connected
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY) === "true") {
      performConnect(true);
    }
  }, [performConnect]);

  // Attach MetaMask event listeners (once)
  useEffect(() => {
    if (!window.ethereum || listenersAttached.current) return;

    const handleAccountsChanged = (accounts) => {
      if (accounts.length === 0) {
        disconnectWallet();
      } else {
        performConnect(true);
      }
    };

    const handleChainChanged = () => {
      performConnect(true);
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);
    listenersAttached.current = true;

    return () => {
      window.ethereum.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum.removeListener("chainChanged", handleChainChanged);
      listenersAttached.current = false;
    };
  }, [performConnect, disconnectWallet]);

  return (
    <Web3Context.Provider value={{
      account,
      tokenBalance,
      daoContract,
      tokenContract,
      connecting,
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