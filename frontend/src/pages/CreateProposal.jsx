import { useState } from "react";
import { ethers } from "ethers";
import { toast } from "react-hot-toast";
import { useWeb3 } from "../context/Web3Context";
import { useNavigate } from "react-router-dom";

export default function CreateProposal() {
    const { account, daoContract } = useWeb3();
    const navigate = useNavigate();

    const [target, setTarget]           = useState("");
    const [calldata, setCalldata]       = useState("0x");
    const [votingDelay, setVotingDelay] = useState(0);       // seconds
    const [votingPeriod, setVotingPeriod] = useState(86400); // 1 day default
    const [description, setDescription] = useState("");
    const [loading, setLoading]         = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!account)      return toast.error("Connect wallet first");
        if (!daoContract)  return toast.error("Contract not loaded");

        // validate target address
        if (!ethers.isAddress(target))
            return toast.error("Invalid target address");

        // validate calldata hex
        if (!calldata.startsWith("0x"))
            return toast.error("Calldata must start with 0x");

        if (Number(votingPeriod) <= 0)
            return toast.error("Voting period must be > 0");

        setLoading(true);
        try {
            const tx = await daoContract.createProposal(
                target,
                calldata,          // bytes — "0x" for no calldata
                Number(votingDelay),
                Number(votingPeriod)
            );

            toast.loading("Creating proposal...", { id: "create" });
            const receipt = await tx.wait();

            // pull proposalId from ProposalCreated event
            const event = receipt.logs
                .map(log => {
                    try { return daoContract.interface.parseLog(log); }
                    catch { return null; }
                })
                .find(e => e?.name === "ProposalCreated");

            const proposalId = event ? event.args.id.toString() : "?";

            toast.success(`Proposal #${proposalId} created!`, { id: "create" });
            navigate("/proposals");

        } catch (err) {
            toast.error(err?.reason || err?.message || "Failed to create proposal", { id: "create" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#020617] text-white px-4 py-10">
            <div className="max-w-xl mx-auto">

                <h1 className="text-2xl font-bold text-cyan-400 mb-2">Create Proposal</h1>
                <p className="text-gray-400 text-sm mb-8">
                    Submit a new governance proposal for the DAO to vote on.
                </p>

                <form onSubmit={handleSubmit} className="space-y-6">

                    {/* Target Address */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">
                            Target Address <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={target}
                            onChange={e => setTarget(e.target.value)}
                            placeholder="0x..."
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            The contract address this proposal will call on execution.
                        </p>
                    </div>

                    {/* Calldata */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">
                            Calldata (bytes)
                        </label>
                        <input
                            type="text"
                            value={calldata}
                            onChange={e => setCalldata(e.target.value)}
                            placeholder="0x"
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Encoded function call. Use <code className="text-cyan-500">0x</code> for no calldata (e.g. plain ETH transfer).
                        </p>
                    </div>

                    {/* Description (off-chain, just for UI display) */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">
                            Description
                        </label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            rows={3}
                            placeholder="What does this proposal do?"
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500 resize-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Optional. Stored locally for display only — not sent on-chain.
                        </p>
                    </div>

                    {/* Voting Delay */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">
                            Voting Delay (seconds)
                        </label>
                        <input
                            type="number"
                            min={0}
                            value={votingDelay}
                            onChange={e => setVotingDelay(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            Time before voting starts. Use <code className="text-cyan-500">0</code> for immediate start.
                        </p>
                    </div>

                    {/* Voting Period */}
                    <div>
                        <label className="block text-sm text-gray-400 mb-1">
                            Voting Period (seconds) <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="number"
                            min={1}
                            value={votingPeriod}
                            onChange={e => setVotingPeriod(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
                        />
                        <div className="flex gap-3 mt-2">
                            {[
                                { label: "5 min",  val: 300    },
                                { label: "1 hour", val: 3600   },
                                { label: "1 day",  val: 86400  },
                                { label: "3 days", val: 259200 },
                            ].map(({ label, val }) => (
                                <button
                                    key={val}
                                    type="button"
                                    onClick={() => setVotingPeriod(val)}
                                    className={`text-xs px-3 py-1 rounded-full border ${
                                        Number(votingPeriod) === val
                                            ? "bg-cyan-900 border-cyan-500 text-cyan-400"
                                            : "border-gray-700 text-gray-400 hover:border-gray-500"
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-xs text-gray-400 space-y-1">
                        <p><span className="text-gray-500">Target:</span> <span className="font-mono text-cyan-400">{target || "—"}</span></p>
                        <p><span className="text-gray-500">Voting starts:</span> {votingDelay === 0 || votingDelay === "0" ? "immediately" : `after ${votingDelay}s`}</p>
                        <p><span className="text-gray-500">Voting ends:</span> {votingPeriod}s after start</p>
                        <p><span className="text-gray-500">Quorum required:</span> 30% of snapshot supply</p>
                    </div>

                    {/* Submit */}
                    <button
                        type="submit"
                        disabled={loading || !account}
                        className="w-full bg-cyan-700 hover:bg-cyan-600 disabled:opacity-40 text-white font-semibold py-3 rounded-lg transition-colors"
                    >
                        {loading ? "Submitting..." : "Create Proposal"}
                    </button>

                    {!account && (
                        <p className="text-center text-yellow-400 text-sm">
                            Connect your wallet to create a proposal.
                        </p>
                    )}

                </form>
            </div>
        </div>
    );
}