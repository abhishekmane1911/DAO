import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import CreateProposal from "./pages/CreateProposal";
import { Toaster } from "react-hot-toast";

function App() {
  return (
    <div className="bg-[#020617] min-h-screen text-white">
      <Navbar />

      <Routes>
        <Route path="/"       element={<Dashboard />} />
        <Route path="/create" element={<CreateProposal />} />
      </Routes>

      <Toaster />
    </div>
  );
}

export default App;