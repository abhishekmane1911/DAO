export default function UserPanel({ user }) {
  if (!user) {
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
        <h2 className="text-lg font-semibold">{user.name}</h2>
      </div>

      <div className="space-y-3 text-sm">

        <div>
          <p className="text-gray-400">Wallet Address</p>
          <p className="text-cyan-400">{user.address}</p>
        </div>

        <div>
          <p className="text-gray-400">Token Balance</p>
          <p>{user.balance} GOV</p>
        </div>

        <div>
          <p className="text-gray-400">Voting Power</p>
          <p>{user.balance}</p>
        </div>

      </div>
    </div>
  );
}