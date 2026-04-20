import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { toast } from "react-hot-toast";
import { useWeb3 } from "../context/Web3Context";

export default function ProposalCard({ proposal, onRefresh }) {
    const { account, daoContract, tokenContract } = useWeb3();

    const [hasVoted, setHasVoted]           = useState(false);
    const [loading, setLoading]             = useState(false);
    const [snapshotSupply, setSnapshotSupply] = useState(0);
    
    const yesVotes  = parseFloat(proposal.yesVotes);
    const noVotes   = parseFloat(proposal.noVotes);
    const total     = yesVotes + noVotes;

    const yesPercent = total === 0 ? 0 : (yesVotes / total) * 100;
    const noPercent  = total === 0 ? 0 : (noVotes  / total) * 100;

    const now       = Math.floor(Date.now() / 1000);
    const isExpired = now > Number(proposal.endTime);
    const isActive  = now >= Number(proposal.startTime) && now <= Number(proposal.endTime);

    const quorumMet = snapshotSupply > 0 && total >= (snapshotSupply * 0.30);

    // fetch snapshot total supply
    useEffect(() => {
      if (!tokenContract || !proposal.snapshotId) return;
      tokenContract.totalSupplyAt(proposal.snapshotId)
        .then(s => setSnapshotSupply(parseFloat(ethers.formatEther(s))))
        .catch(console.error);
    }, [tokenContract, proposal.snapshotId]);

    // check if wallet already voted
    useEffect(() => {
      if (!daoContract || !account) return;
      daoContract.hasVoted(proposal.id, account)
        .then(setHasVoted)
        .catch(console.error);
    }, [daoContract, account, proposal.id]);

    const handleVote = async (type) => {
        if (!account)  return toast.error("Connect wallet first");
        if (hasVoted)  return toast.error("Already voted");
        if (!isActive) return toast.error("Voting closed");

        setLoading(true);
        try {
          const tx = await daoContract.vote(proposal.id, type === "YES");
          toast.loading("Submitting vote...", { id: "vote" });
          await tx.wait();
          toast.success(`Voted ${type}`, { id: "vote" });
          setHasVoted(true);
          onRefresh();
        } catch (err) {
          toast.error(err?.reason || err?.message || "Vote failed", { id: "vote" });
        } finally {
          setLoading(false);
        }
    };

    const handleExecute = async () => {
        if (!account) return toast.error("Connect wallet first");

        setLoading(true);
        try {
          const tx = await daoContract.executeProposal(proposal.id);
          toast.loading("Executing...", { id: "exec" });
          await tx.wait();
          toast.success("Proposal Executed Successfully", { id: "exec" });
          onRefresh();
        } catch (err) {
          toast.error(err?.reason || err?.message || "Execution failed", { id: "exec" });
        } finally {
          setLoading(false);
        }
    };

    return (
        <div className="bg-[#020617] border border-gray-800 rounded-2xl p-5">

            <div className="flex justify-between mb-3">
                <span className="bg-cyan-900 text-cyan-400 px-3 py-1 rounded-full text-sm">
                    #{proposal.id.toString()}
                </span>
                <span className="text-yellow-400 text-sm">
                    {proposal.executed ? "Executed" : isExpired ? "Ended" : "Active"}
                </span>
            </div>

            <p className="text-gray-400 text-sm">Target</p>
            <p className="text-cyan-400 mb-2 font-mono text-sm truncate">{proposal.target}</p>

            <div className="flex justify-between text-sm mb-1">
                <span className="text-green-400">YES {yesPercent.toFixed(0)}%</span>
                <span className="text-red-400">NO {noPercent.toFixed(0)}%</span>
            </div>

            <div className="h-2 bg-red-400 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-green-500" style={{ width: `${yesPercent}%` }} />
            </div>

            <div className="flex justify-between text-xs text-gray-400">
                <span>{yesVotes.toFixed(2)} DGT</span>
                <span>{noVotes.toFixed(2)} DGT</span>
            </div>

            <p className={`mt-2 text-sm ${quorumMet ? "text-green-400" : "text-red-400"}`}>
                {quorumMet ? "✔ Quorum Met" : "✖ Quorum Not Met"}
            </p>

            <p className="text-xs text-gray-500 mt-1">
                {total.toFixed(0)} / {(snapshotSupply * 0.30).toFixed(0)} DGT needed
            </p>

            {hasVoted && (
              <p className="text-cyan-400 text-xs mt-1">✔ You have voted</p>
            )}

            <div className="flex gap-3 mt-4">
                <button
                    onClick={() => handleVote("YES")}
                    disabled={hasVoted || !isActive || loading || !account}
                    className="flex-1 bg-green-900 text-green-400 py-2 rounded disabled:opacity-40 hover:cursor-pointer"
                >
                    Vote YES
                </button>

                <button
                    onClick={() => handleVote("NO")}
                    disabled={hasVoted || !isActive || loading || !account}
                    className="flex-1 bg-red-900 text-red-400 py-2 rounded disabled:opacity-40 hover:cursor-pointer"
                >
                    Vote NO
                </button>
            </div>

            <button
                onClick={handleExecute}
                disabled={!isExpired || !quorumMet || proposal.executed || proposal.canceled || yesVotes <= noVotes || loading || !account}
                className="mt-4 w-full bg-cyan-900 text-cyan-400 py-2 rounded disabled:opacity-40 hover:cursor-pointer"
            >
                {proposal.executed ? "Executed" : "Execute Proposal"}
            </button>
        </div>
    );
}