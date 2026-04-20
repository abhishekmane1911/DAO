import { useWeb3 } from "../context/Web3Context";

export default function Navbar() {
  const { account, tokenBalance, connectWallet, disconnectWallet } = useWeb3();

  return (
    <div className="flex justify-between items-center px-8 py-4 border-b border-gray-800">
      
      <h1 className="text-cyan-400 font-semibold text-4xl">
        DAO Governance
      </h1>

      {account ? (
        <div className="flex gap-3 items-center">
          <span className="bg-gray-800 px-3 py-1 rounded">
            {account.slice(0, 6)}...{account.slice(-4)}
          </span>

          <span className="bg-gray-800 px-3 py-1 rounded text-sm text-gray-300">
            {parseFloat(tokenBalance).toFixed(2)} DGT
          </span>

          <button
            onClick={disconnectWallet}
            className="bg-red-600 px-3 py-1 rounded text-sm hover:cursor-pointer"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={connectWallet}
          className="bg-cyan-500 px-4 py-2 rounded text-black hover:cursor-pointer"
        >
          Connect Wallet
        </button>
      )}
    </div>
  );
}