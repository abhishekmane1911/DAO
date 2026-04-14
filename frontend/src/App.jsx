import { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import { Toaster } from "react-hot-toast";

function App() {
  const [user, setUser] = useState(null);

  // 🔥 Load from localStorage on refresh
  useEffect(() => {
    const savedUser = localStorage.getItem("daoUser");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  return (
    <div className="bg-[#020617] min-h-screen text-white">
      <Navbar user={user} setUser={setUser} />
      <Dashboard user={user} />
      <Toaster />
    </div>
  );
}

export default App;