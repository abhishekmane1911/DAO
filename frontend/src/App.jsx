import { useState, useEffect } from "react";
import { Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import CreateProposal from "./pages/CreateProposal";
import { Toaster } from "react-hot-toast";
import { proposals as initialProposals } from "./mock/data";

function App() {
  const [user, setUser] = useState(null);
  const [proposals, setProposals] = useState([]);

  useEffect(() => {
    const savedUser = localStorage.getItem("daoUser");
    if (savedUser) setUser(JSON.parse(savedUser));
  }, []);

  useEffect(() => {
    const savedProposals = localStorage.getItem("daoProposals");

    if (savedProposals) {
      setProposals(JSON.parse(savedProposals));
    } else {
      setProposals(initialProposals);
    }
  }, []);

  useEffect(() => {
    if (proposals.length > 0) {
      localStorage.setItem("daoProposals", JSON.stringify(proposals));
    }
  }, [proposals]);

  return (
    <div className="bg-[#020617] min-h-screen text-white">
      <Navbar user={user} setUser={setUser} />

      <Routes>
        <Route
          path="/"
          element={<Dashboard user={user} proposals={proposals} />}
        />
        <Route
          path="/create"
          element={
            <CreateProposal
              proposals={proposals}
              setProposals={setProposals}
            />
          }
        />
      </Routes>

      <Toaster />
    </div>
  );
}

export default App;