import { useState } from "react";
import { toast } from "react-hot-toast";

export default function ProposalCard({ proposal }) {
    const [yesVotes, setYesVotes] = useState(proposal.yes);
    const [noVotes, setNoVotes] = useState(proposal.no);
    const [hasVoted, setHasVoted] = useState(proposal.hasVoted);
    const [executed, setExecuted] = useState(proposal.executed);

    const total = yesVotes + noVotes;

    // const total = yesVotes + noVotes;

    const yesPercent = total === 0 ? 0 : (yesVotes / total) * 100;
    const noPercent = total === 0 ? 0 : (noVotes / total) * 100;
    // const yesPercent = (yesVotes / total) * 100;
    // const noPercent = 100 - yesPercent;

    const isExpired = Date.now() > proposal.deadline;
    const quorumMet = total >= 30000;

    // Vote
    const handleVote = (type) => {
        if (hasVoted) return toast.error("Already voted");
        if (isExpired) return toast.error("Voting closed");

        if (type === "YES") {
            setYesVotes(prev => prev + 1000);
        } else {
            setNoVotes(prev => prev + 1000);
        }

        setHasVoted(true);
        toast.success(`Voted ${type}`);
    };

    const handleExecute = () => {
        if (executed) {
            return toast.error("Already executed");
        }

        if (!isExpired) {
            return toast.error("Voting not ended");
        }

        if (!quorumMet) {
            return toast.error("Quorum not met");
        }

        if (yesVotes <= noVotes) {
            return toast.error("Proposal rejected (majority NO)");
        }

        setExecuted(true);
        toast.success("Proposal Executed Successfully");
    };

    return (
        <div className="bg-[#020617] border border-gray-800 rounded-2xl p-5">

            <div className="flex justify-between mb-3">
                <span className="bg-cyan-900 text-cyan-400 px-3 py-1 rounded-full text-sm">
                    #{proposal.id}
                </span>
                <span className="text-yellow-400 text-sm">
                    {executed ? "Executed" : isExpired ? "Ended" : "Active"}
                </span>
            </div>

            <p className="text-gray-400 text-sm">IPFS CID</p>
            <p className="text-cyan-400 mb-2">{proposal.cid}</p>

            {/* Votes */}
            <div className="flex justify-between text-sm mb-1">
                <span className="text-green-400">YES {yesPercent.toFixed(0)}%</span>
                <span className="text-red-400">NO {noPercent.toFixed(0)}%</span>
            </div>

            <div className="h-2 bg-red-400 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-green-500" style={{ width: `${yesPercent}%` }} />
            </div>

            <div className="flex justify-between text-xs text-gray-400">
                <span>{yesVotes.toLocaleString()}</span>
                <span>{noVotes.toLocaleString()}</span>
            </div>

            {/* Quorum */}
            <p className={`mt-2 text-sm ${quorumMet ? "text-green-400" : "text-red-400"}`}>
                {quorumMet ? "✔ Quorum Met" : "✖ Quorum Not Met"}
            </p>

            {/* Buttons */}
            <div className="flex gap-3 mt-4">
                <button
                    onClick={() => handleVote("YES")}
                    disabled={hasVoted || isExpired}
                    className="flex-1 bg-green-900 text-green-400 py-2 rounded disabled:opacity-40 hover:cursor-pointer"
                >
                    Vote YES
                </button>

                <button
                    onClick={() => handleVote("NO")}
                    disabled={hasVoted || isExpired}
                    className="flex-1 bg-red-900 text-red-400 py-2 rounded disabled:opacity-40 hover:cursor-pointer"
                >
                    Vote NO
                </button>
            </div>

            <button
                onClick={handleExecute}
                disabled={
                    !isExpired ||
                    !quorumMet ||
                    executed ||
                    yesVotes <= noVotes
                }
                className="mt-4 w-full bg-cyan-900 text-cyan-400 py-2 rounded disabled:opacity-40 hover:cursor-pointer"
            >
                {executed ? "Executed" : "Execute Proposal"}
            </button>
        </div>
    );
}