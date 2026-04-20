import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import ProposalCard from "../components/ProposalCard";
import UserPanel from "../components/UserPanel";

export default function Dashboard() {
  const { account, daoContract } = useWeb3();
  const navigate = useNavigate();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading]     = useState(false);

  const fetchProposals = useCallback(async () => {
    if (!daoContract) return;
    setLoading(true);
    try {
      const count = await daoContract.proposalCount();
      const total = Number(count);
      const fetched = [];

      for (let i = 1; i <= total; i++) {
        const p = await daoContract.proposals(i);
        fetched.push({
          id:         Number(p.id),
          creator:    p.creator,
          target:     p.target,
          snapshotId: Number(p.snapshotId),
          startTime:  Number(p.startTime),
          endTime:    Number(p.endTime),
          yesVotes:   ethers.formatEther(p.yesVotes),
          noVotes:    ethers.formatEther(p.noVotes),
          executed:   p.executed,
          canceled:   p.canceled,
        });
      }

      setProposals(fetched.reverse());
    } catch (err) {
      toast.error("Failed to load proposals");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [daoContract]);

  useEffect(() => {
    fetchProposals();
  }, [fetchProposals]);

  return (
    <div className="px-8 py-6">

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-cyan-400">
            Governance Dashboard
          </h1>
          <p className="text-gray-400 mt-1">
            Participate in decentralized decision making
          </p>
        </div>

        {account && (
          <div className="flex gap-3">
            <button
              onClick={fetchProposals}
              className="border border-cyan-700 text-cyan-400 px-4 py-2 rounded-lg hover:cursor-pointer"
            >
              ↻ Refresh
            </button>
            <button
              onClick={() => navigate("/create")}
              className="bg-cyan-500 text-black px-4 py-2 rounded-lg hover:cursor-pointer"
            >
              + Create Proposal
            </button>
          </div>
        )}
      </div>

      <div className="flex gap-6 mt-6">

        <div className="flex-1 space-y-4">
          <h2 className="text-xl">Proposals</h2>

          {!account ? (
            <div className="bg-[#020617] border border-gray-800 rounded-2xl p-6 text-center text-gray-400">
              Connect your wallet to view proposals
            </div>
          ) : loading ? (
            <div className="bg-[#020617] border border-gray-800 rounded-2xl p-6 text-center text-gray-400">
              Loading proposals from chain...
            </div>
          ) : proposals.length === 0 ? (
            <div className="bg-[#020617] border border-gray-800 rounded-2xl p-6 text-center text-gray-400">
              No proposals yet. Create the first one!
            </div>
          ) : (
            proposals.map((p) => (
              <ProposalCard key={p.id} proposal={p} onRefresh={fetchProposals} />
            ))
          )}
        </div>

        <UserPanel />
      </div>
    </div>
  );
}