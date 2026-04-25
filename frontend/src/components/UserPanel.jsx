import { useWeb3 } from "../context/Web3Context";

export default function UserPanel() {
  const { account, tokenBalance } = useWeb3();

  if (!account) {
    return (
      <div className="w-80 bg-[#020617] border border-gray-800 rounded-2xl p-6 text-center">
        <div className="w-12 h-12 bg-gray-800 rounded-full mx-auto mb-3"></div>
        <p className="text-gray-400">
          Connect your wallet to view governance details
        </p>
      </div>
    );
  }

  return (
    <div className="w-80 bg-[#020617] border border-gray-800 rounded-2xl p-6">
      <div className="text-center mb-4">
        <div className="w-12 h-12 bg-cyan-500 rounded-full mx-auto mb-2"></div>
        <h2 className="text-lg font-semibold">
          {account.slice(0, 6)}...{account.slice(-4)}
        </h2>
      </div>

      <div className="space-y-3 text-sm">

        <div>
          <p className="text-gray-400">Wallet Address</p>
          <p className="text-cyan-400 break-all">{account}</p>
        </div>

        <div>
          <p className="text-gray-400">Token Balance</p>
          <p>{parseFloat(tokenBalance).toFixed(2)} DGT</p>
        </div>

        <div>
          <p className="text-gray-400">Voting Power</p>
          <p>{parseFloat(tokenBalance).toFixed(2)}</p>
        </div>

      </div>
    </div>
  );
}