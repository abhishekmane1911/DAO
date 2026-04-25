import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { toast } from "react-hot-toast";
import { useWeb3 } from "../context/Web3Context";
import confetti from "canvas-confetti";
import { resolveIPFS } from "../utils/pinata";
import { Link } from "react-router-dom";

/** Status badge configs */
const STATUS = {
  active:   { label: "Active",   bg: "rgba(52, 211, 153, 0.1)",  color: "var(--color-success)",  dot: "var(--color-success)" },
  pending:  { label: "Pending",  bg: "rgba(251, 191, 36, 0.1)",  color: "var(--color-warning)",  dot: "var(--color-warning)" },
  ended:    { label: "Ended",    bg: "rgba(148, 163, 184, 0.1)", color: "var(--color-text-sec)", dot: "var(--color-text-muted)" },
  executed: { label: "Executed", bg: "rgba(245, 158, 11, 0.15)",  color: "var(--color-primary-lt)", dot: "var(--color-primary)" },
  canceled: { label: "Canceled", bg: "rgba(248, 113, 113, 0.1)", color: "var(--color-danger)",  dot: "var(--color-danger)" },
};

function getStatus(proposal) {
  if (proposal.canceled) return STATUS.canceled;
  if (proposal.executed) return STATUS.executed;
  const now = Math.floor(Date.now() / 1000);
  if (now < Number(proposal.startTime)) return STATUS.pending;
  if (now <= Number(proposal.endTime))  return STATUS.active;
  return STATUS.ended;
}

function getStatusKey(proposal) {
  if (proposal.canceled) return "canceled";
  if (proposal.executed) return "executed";
  const now = Math.floor(Date.now() / 1000);
  if (now < Number(proposal.startTime)) return "pending";
  if (now <= Number(proposal.endTime))  return "active";
  return "ended";
}

/** Countdown hook */
function useCountdown(endTime) {
  const [remaining, setRemaining] = useState("");

  useEffect(() => {
    const update = () => {
      const diff = Number(endTime) - Math.floor(Date.now() / 1000);
      if (diff <= 0) { setRemaining(""); return; }

      const d = Math.floor(diff / 86400);
      const h = Math.floor((diff % 86400) / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;

      if (d > 0) setRemaining(`${d}d ${h}h`);
      else if (h > 0) setRemaining(`${h}h ${m}m`);
      else setRemaining(`${m}m ${s}s`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  return remaining;
}

export default function ProposalCard({ proposal, onRefresh }) {
  const { account, daoContract, tokenContract } = useWeb3();

  const [hasVoted, setHasVoted]             = useState(false);
  const [loading, setLoading]               = useState(false);
  const [snapshotSupply, setSnapshotSupply] = useState(0);

  const [quorumPct, setQuorumPct]           = useState(35); // default 35%

  const yesVotes  = parseFloat(proposal.yesVotes);
  const noVotes   = parseFloat(proposal.noVotes);
  const total     = yesVotes + noVotes;
  const yesPercent = total === 0 ? 0 : (yesVotes / total) * 100;
  const noPercent  = total === 0 ? 0 : (noVotes  / total) * 100;

  const now       = Math.floor(Date.now() / 1000);
  const isExpired = now > Number(proposal.endTime);
  const isActive  = now >= Number(proposal.startTime) && now <= Number(proposal.endTime);
  const quorumMet = snapshotSupply > 0 && total >= (snapshotSupply * (quorumPct / 100));

  const statusKey = getStatusKey(proposal);
  const status    = STATUS[statusKey];
  
  // Decide which time to countdown to
  const targetTime = statusKey === "pending" ? proposal.startTime : proposal.endTime;
  const countdown  = useCountdown(targetTime);
  const showCountdown = (statusKey === "pending" || statusKey === "active") && countdown;

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
      
    // fetch the actual quorum percentage
    daoContract.quorumPercentage()
      .then(q => setQuorumPct(Number(q)))
      .catch(console.error);
  }, [daoContract, account, proposal.id]);

  const handleVote = async (type) => {
    if (!account)  return toast.error("Connect wallet first");
    if (hasVoted)  return toast.error("Already voted");
    if (!isActive) return toast.error("Voting closed");

    setLoading(true);
    try {
      const tx = await daoContract.vote(proposal.id, type === "YES");
      toast.loading("Submitting vote…", { id: "vote" });
      await tx.wait();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#fbbf24', '#ffffff']
      });
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
      toast.loading("Executing…", { id: "exec" });
      await tx.wait();
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#34d399', '#f59e0b', '#ffffff']
      });
      toast.success("Proposal executed!", { id: "exec" });
      onRefresh();
    } catch (err) {
      toast.error(err?.reason || err?.message || "Execution failed", { id: "exec" });
    } finally {
      setLoading(false);
    }
  };

  const canVote    = account && isActive && !hasVoted && !loading;
  const canExecute = account && isExpired && quorumMet && !proposal.executed && !proposal.canceled && yesVotes > noVotes && !loading;

  return (
    <div
      className="glass-panel rounded-xl p-5 transition-all duration-200 animate-fade-in"
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--color-border-hover)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--color-border)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      {/* Header: ID + Status */}
      <div className="flex items-center justify-between mb-4">
        <span
          className="text-xs font-mono font-medium px-2.5 py-1 rounded-md"
          style={{
            background: "var(--color-surface-alt)",
            color: "var(--color-text-sec)",
          }}
        >
          #{proposal.id.toString()}
        </span>

        <div className="flex items-center gap-2">
          {showCountdown && (
            <span className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
              {statusKey === "pending" ? "Starts in " : "Ends in "}
              <span style={{ color: status.color }}>{countdown}</span>
            </span>
          )}
          <span
            className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ background: status.bg, color: status.color }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full inline-block"
              style={{ background: status.dot }}
            />
            {status.label}
          </span>
        </div>
      </div>

      {/* IPFS Cover Image */}
      {proposal.ipfsImage && (
        <div style={{ marginBottom: "16px", borderRadius: "8px", overflow: "hidden" }}>
          <img
            src={resolveIPFS(proposal.ipfsImage)}
            alt="Proposal cover"
            style={{
              width: "100%", maxHeight: "160px",
              objectFit: "cover", display: "block",
            }}
            onError={e => { e.currentTarget.style.display = "none"; }}
          />
        </div>
      )}

      {/* IPFS Title + Description */}
      {(proposal.ipfsTitle || proposal.ipfsDescription) && (
        <div style={{ marginBottom: "16px" }}>
          {proposal.ipfsTitle && (
            <p style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "16px", fontWeight: 600,
              color: "var(--color-text)",
              margin: "0 0 6px", lineHeight: 1.3,
            }}>
              {proposal.ipfsTitle}
            </p>
          )}
          {proposal.ipfsDescription && (
            <p style={{
              fontSize: "12px", color: "var(--color-text-muted)",
              margin: 0, lineHeight: 1.6,
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}>
              {proposal.ipfsDescription}
            </p>
          )}
        </div>
      )}

      {/* Target */}
      <div className="mb-4">
        <p className="text-xs mb-1 w-fit cursor-help" style={{ color: "var(--color-text-muted)" }} title="The smart contract address this proposal will interact with when executed.">Target Contract</p>
        <p
          className="text-sm font-mono truncate cursor-help"
          style={{ color: "var(--color-text-sec)" }}
          title={proposal.target}
        >
          {proposal.target}
        </p>
      </div>

      {/* Vote progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs font-medium mb-2">
          <span style={{ color: "var(--color-success)" }}>
            Yes {yesPercent.toFixed(0)}%
          </span>
          <span style={{ color: "var(--color-danger)" }}>
            No {noPercent.toFixed(0)}%
          </span>
        </div>

        {/* Progress bar */}
        <div
          className="h-2 rounded-full overflow-hidden flex"
          style={{ background: total === 0 ? "var(--color-surface-alt)" : "var(--color-danger)" }}
        >
          {total > 0 && (
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${yesPercent}%`,
                background: "var(--color-success)",
              }}
            />
          )}
        </div>

        <div className="flex justify-between text-xs mt-1.5" style={{ color: "var(--color-text-muted)" }}>
          <span>{yesVotes.toLocaleString(undefined, { maximumFractionDigits: 0 })} DGT</span>
          <span>{noVotes.toLocaleString(undefined, { maximumFractionDigits: 0 })} DGT</span>
        </div>
      </div>

      {/* Quorum */}
      <div
        className="flex items-center justify-between rounded-lg px-3 py-2 mb-4 cursor-help"
        style={{ background: "var(--color-surface-alt)" }}
        title="Quorum is the minimum number of votes required for a proposal to pass (30% of total supply at snapshot)."
      >
        <div className="flex items-center gap-2">
          {/* Quorum Ring Chart */}
          <div className="relative w-5 h-5">
            <svg viewBox="0 0 36 36" className="w-5 h-5 -rotate-90">
              <path
                strokeWidth="4"
                stroke="var(--color-border)"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                strokeWidth="4"
                strokeDasharray={`${Math.min(((total / (snapshotSupply * 0.30 || 1)) * 100), 100)}, 100`}
                strokeLinecap="round"
                stroke={quorumMet ? "var(--color-success)" : "var(--color-warning)"}
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
          </div>
          <span className="text-xs" style={{ color: quorumMet ? "var(--color-success)" : "var(--color-danger)" }}>
            {quorumMet ? "Quorum met" : "Quorum not met"}
          </span>
        </div>
        <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {total.toLocaleString(undefined, { maximumFractionDigits: 0 })} /{" "}
          {(snapshotSupply * 0.30).toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
      </div>

      {/* Voted indicator */}
      {hasVoted && (
        <p className="flex items-center gap-1 text-xs mb-3" style={{ color: "var(--color-primary-lt)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          You have voted
        </p>
      )}

      {/* Vote buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => handleVote("YES")}
          disabled={!canVote}
          className="flex-1 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: "rgba(52, 211, 153, 0.1)",
            color: "var(--color-success)",
            border: "1px solid rgba(52, 211, 153, 0.2)",
          }}
          onMouseEnter={(e) => {
            if (canVote) e.currentTarget.style.background = "rgba(52, 211, 153, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(52, 211, 153, 0.1)";
          }}
        >
          {loading ? "…" : "Vote Yes"}
        </button>

        <button
          onClick={() => handleVote("NO")}
          disabled={!canVote}
          className="flex-1 py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: "rgba(248, 113, 113, 0.1)",
            color: "var(--color-danger)",
            border: "1px solid rgba(248, 113, 113, 0.2)",
          }}
          onMouseEnter={(e) => {
            if (canVote) e.currentTarget.style.background = "rgba(248, 113, 113, 0.2)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(248, 113, 113, 0.1)";
          }}
        >
          {loading ? "…" : "Vote No"}
        </button>
      </div>

      {/* Execute button */}
      <button
        onClick={handleExecute}
        disabled={!canExecute}
        className="mt-3 w-full py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
        style={{
          background: proposal.executed ? "rgba(245, 158, 11, 0.1)" : "rgba(245, 158, 11, 0.15)",
          color: "var(--color-primary-lt)",
          border: "1px solid rgba(245, 158, 11, 0.3)",
        }}
        onMouseEnter={(e) => {
          if (canExecute) e.currentTarget.style.background = "rgba(245, 158, 11, 0.25)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = proposal.executed
            ? "rgba(245, 158, 11, 0.1)"
            : "rgba(245, 158, 11, 0.15)";
        }}
      >
        {proposal.executed ? "✓ Executed" : loading ? "Executing…" : "Execute Proposal"}
      </button>

      {/* View detail page */}
      <Link
        to={`/proposal/${proposal.id}`}
        style={{
          display: "block", marginTop: "10px", textAlign: "center",
          padding: "9px", borderRadius: "8px",
          border: "1px solid rgba(255,255,255,0.06)",
          fontFamily: "'Space Mono', monospace", fontSize: "10px",
          letterSpacing: "0.1em", textTransform: "uppercase",
          color: "#555", textDecoration: "none",
          transition: "all 0.2s ease",
        }}
        onMouseEnter={e => { e.currentTarget.style.color="#aaa"; e.currentTarget.style.borderColor="rgba(255,255,255,0.14)"; }}
        onMouseLeave={e => { e.currentTarget.style.color="#555"; e.currentTarget.style.borderColor="rgba(255,255,255,0.06)"; }}
      >
        View Details →
      </Link>
    </div>
  );
}