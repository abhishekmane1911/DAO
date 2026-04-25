import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import CreateProposal from "./pages/CreateProposal";
import ProposalDetail from "./pages/ProposalDetail";
import { Toaster } from "react-hot-toast";

function App() {
  return (
    <div className="min-h-screen" style={{ background: "var(--color-bg)" }}>
      <Navbar />

      <main className="w-full">
        <Routes>
          <Route path="/"                  element={<Landing />} />
          <Route path="/dashboard"         element={<Dashboard />} />
          <Route path="/create"            element={<CreateProposal />} />
          <Route path="/proposal/:id"      element={<ProposalDetail />} />
        </Routes>
      </main>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: "rgba(255, 255, 255, 0.03)",
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            color: "var(--color-text)",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            fontSize: "14px",
            boxShadow: "0 4px 30px rgba(0, 0, 0, 0.1)",
          },
          success: { iconTheme: { primary: "var(--color-primary)", secondary: "#0a0a0a" } },
          error:   { iconTheme: { primary: "var(--color-danger)", secondary: "#0a0a0a" } },
        }}
      />
    </div>
  );
}

export default App;