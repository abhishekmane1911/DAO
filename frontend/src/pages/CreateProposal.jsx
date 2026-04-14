import { useState } from "react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

export default function CreateProposal({ proposals, setProposals }) {
  const [cid, setCid] = useState("");
  const [target, setTarget] = useState("");
  const [calldata, setCalldata] = useState("");

  const navigate = useNavigate();

  const handleSubmit = () => {
    if (!cid || !target || !calldata) {
      toast.error("Fill all fields");
      return;
    }

    const newProposal = {
      id: proposals.length + 1,
      cid,
      target,
      yes: 0,
      no: 0,
      deadline: Date.now() + 10000000,
      executed: false,
      hasVoted: false,
    };

    setProposals([newProposal, ...proposals]);

    toast.success("Proposal Created 🚀");

    navigate("/");
  };

  return (
    <div className="p-8">

      <button
        onClick={() => navigate("/")}
        className="mb-4 text-cyan-400"
      >
        ← Back
      </button>

      <h1 className="text-2xl mb-4">Create Proposal</h1>

      <div className="flex flex-col gap-4 max-w-md">
        <input
          placeholder="IPFS CID"
          className="p-2 bg-gray-800 rounded"
          onChange={(e) => setCid(e.target.value)}
        />

        <input
          placeholder="Target Address"
          className="p-2 bg-gray-800 rounded"
          onChange={(e) => setTarget(e.target.value)}
        />

        <input
          placeholder="Calldata"
          className="p-2 bg-gray-800 rounded"
          onChange={(e) => setCalldata(e.target.value)}
        />

        <button
          onClick={handleSubmit}
          className="bg-cyan-500 text-black py-2 rounded hover:cursor-pointer"
        >
          Create Proposal
        </button>
      </div>
    </div>
  );
}