import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { toast } from "react-hot-toast";
import { useWeb3 } from "../context/Web3Context";

export default function ProposalCard({ proposal, onRefresh }) {
  const { account, daoContract, tokenContract } = useWeb3();

  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [snapshotSupply, setSnapshotSupply] = useState(0n); // Use BigInt
  const [currentTime, setCurrentTime] = useState(Math.floor(Date.now() / 1000));

  // Live Timer: This forces the component to check the time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Derived State
  const yesVotesNum = parseFloat(ethers.formatEther(proposal.yesVotes));
  const noVotesNum = parseFloat(ethers.formatEther(proposal.noVotes));
  const totalVotesNum = yesVotesNum + noVotesNum;

  const yesPercent =
    totalVotesNum === 0 ? 0 : (yesVotesNum / totalVotesNum) * 100;
  const noPercent =
    totalVotesNum === 0 ? 0 : (noVotesNum / totalVotesNum) * 100;

  const isExpired = currentTime > proposal.endTime;
  const isActive =
    currentTime >= proposal.startTime && currentTime <= proposal.endTime;
  const isPending = currentTime < proposal.startTime;

  // Quorum Math (BigInt safe)
  const totalVotesBI = proposal.yesVotes + proposal.noVotes;
  const quorumThreshold = (snapshotSupply * 35n) / 100n; // 35%
  const quorumMet = snapshotSupply > 0n && totalVotesBI >= quorumThreshold;

  // Fetch snapshot supply
  useEffect(() => {
    if (!tokenContract || !proposal.snapshotId) return;
    tokenContract
      .totalSupplyAt(proposal.snapshotId)
      .then(setSnapshotSupply)
      .catch((err) => {
        console.error("Snapshot fetch failed:", err);
        // Fallback: If snapshot fails, use current supply for demo
        tokenContract.totalSupply().then(setSnapshotSupply);
      });
  }, [tokenContract, proposal.snapshotId]);

  // Check if user voted
  useEffect(() => {
    if (!daoContract || !account) return;
    daoContract.hasVoted(proposal.id, account).then(setHasVoted);
  }, [daoContract, account, proposal.id]);

  const handleVote = async (isYes) => {
    setLoading(true);
    try {
      const tx = await daoContract.vote(proposal.id, isYes);
      const loadToast = toast.loading("Confirming vote...");
      await tx.wait();
      toast.dismiss(loadToast);
      toast.success("Vote recorded!");
      onRefresh();
    } catch (err) {
      toast.error(err?.reason || "Vote failed");
    } finally {
      setLoading(false);
    }
  };

  const handleExecute = async () => {
    setLoading(true);
    try {
      const tx = await daoContract.executeProposal(proposal.id);
      const loadToast = toast.loading("Executing transaction...");
      await tx.wait();
      toast.dismiss(loadToast);
      toast.success("Proposal Executed!");
      onRefresh();
    } catch (err) {
      console.error(err);
      toast.error(err?.reason || "Execution failed. Check Treasury balance.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#0d1117] border border-gray-800 rounded-2xl p-6 shadow-xl">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <span className="bg-cyan-950 text-cyan-400 px-3 py-1 rounded-md text-xs font-bold border border-cyan-800">
          ID: {proposal.id}
        </span>
        <span
          className={`text-xs font-bold px-2 py-1 rounded ${
            proposal.executed
              ? "bg-green-900/30 text-green-400"
              : isExpired
                ? "bg-red-900/30 text-red-400"
                : "bg-cyan-900/30 text-cyan-400 animate-pulse"
          }`}
        >
          {proposal.executed
            ? "COMPLETED"
            : isPending
              ? "PENDING"
              : isActive
                ? "VOTING OPEN"
                : "VOTING ENDED"}
        </span>
      </div>

      {/* Target Info */}
      <div className="mb-4">
        <label className="text-xs text-gray-500 uppercase tracking-widest">
          Target Contract
        </label>
        <p className="text-cyan-200 font-mono text-xs truncate bg-black/40 p-2 rounded mt-1 border border-gray-800">
          {proposal.target}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-xs">
          <span className="text-green-400 font-bold">
            YES {yesPercent.toFixed(1)}%
          </span>
          <span className="text-red-400 font-bold">
            NO {noPercent.toFixed(1)}%
          </span>
        </div>
        <div className="h-3 bg-gray-900 rounded-full overflow-hidden flex border border-gray-800">
          <div
            className="h-full bg-green-500 transition-all duration-500"
            style={{ width: `${yesPercent}%` }}
          />
          <div
            className="h-full bg-red-500 transition-all duration-500"
            style={{ width: `${noPercent}%` }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-gray-500">
          <span>{yesVotesNum.toLocaleString()} DGT</span>
          <span>{noVotesNum.toLocaleString()} DGT</span>
        </div>
      </div>

      {/* Quorum and Time Info */}
      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div
          className={`p-2 rounded border ${quorumMet ? "bg-green-950/20 border-green-800" : "bg-red-950/20 border-red-900"}`}
        >
          <p className="text-[10px] text-gray-500 uppercase">Quorum (35%)</p>
          <p
            className={`font-bold ${quorumMet ? "text-green-400" : "text-red-400"}`}
          >
            {quorumMet ? "Reached" : "Needed"}
          </p>
        </div>
        <div className="p-2 rounded border border-gray-800 bg-gray-900/30">
          <p className="text-[10px] text-gray-500 uppercase">Time Remaining</p>
          <p className="font-bold text-gray-300">
            {isExpired
              ? "Expired"
              : `${Math.max(0, proposal.endTime - currentTime)}s`}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      {isActive && !hasVoted ? (
        <div className="flex gap-3">
          <button
            onClick={() => handleVote(true)}
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-500 text-black font-bold py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            VOTE YES
          </button>
          <button
            onClick={() => handleVote(false)}
            disabled={loading}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            VOTE NO
          </button>
        </div>
      ) : isExpired && !proposal.executed ? (
        <button
          onClick={handleExecute}
          disabled={loading || !quorumMet || yesVotesNum <= noVotesNum}
          className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:bg-gray-800 disabled:text-gray-500 text-black font-bold py-3 rounded-lg transition-all"
        >
          {!quorumMet
            ? "QUORUM NOT MET"
            : yesVotesNum <= noVotesNum
              ? "PROPOSAL REJECTED"
              : "EXECUTE ON-CHAIN"}
        </button>
      ) : proposal.executed ? (
        <div className="w-full text-center py-3 bg-green-900/20 border border-green-900 text-green-400 rounded-lg font-bold text-sm">
          ✓ SUCCESSFULLY EXECUTED
        </div>
      ) : hasVoted ? (
        <div className="w-full text-center py-3 bg-cyan-900/20 border border-cyan-900 text-cyan-400 rounded-lg font-bold text-sm">
          WAITING FOR VOTING TO END...
        </div>
      ) : null}
    </div>
  );
}
