export default function Navbar({ user, setUser }) {

  const connectWallet = () => {
    const mockUser = {
      name: "John Doe",
      address: "0x12ab...89cd",
      balance: 1200,
    };

    setUser(mockUser);
    localStorage.setItem("daoUser", JSON.stringify(mockUser));
  };

  const disconnectWallet = () => {
    setUser(null);
    localStorage.removeItem("daoUser");
  };

  return (
    <div className="flex justify-between items-center px-8 py-4 border-b border-gray-800">
      
      <h1 className="text-cyan-400 font-semibold text-4xl">
        DAO Governance
      </h1>

      {user ? (
        <div className="flex gap-3 items-center">
          <span className="bg-gray-800 px-3 py-1 rounded">
            {user.name}
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