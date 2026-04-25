import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { toast } from "react-hot-toast";
import confetti from "canvas-confetti";
import { useWeb3 } from "../context/Web3Context";
import { fetchProposalMetadata, resolveIPFS } from "../utils/pinata";

/* ─── Font injection (idempotent) ─── */
function useSharedFonts() {
  useEffect(() => {
    if (document.getElementById("dgt-fonts")) return;
    const s = document.createElement("style");
    s.id = "dgt-fonts";
    s.innerHTML = `@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;0,700;1,400&family=Space+Mono:wght@400;700&display=swap');
    @keyframes fadeUp { from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)} }
    .du{animation:fadeUp .5s ease forwards} .du1{animation:fadeUp .5s .08s ease forwards;opacity:0} .du2{animation:fadeUp .5s .16s ease forwards;opacity:0} .du3{animation:fadeUp .5s .24s ease forwards;opacity:0}`;
    document.head.appendChild(s);
  }, []);
}

/* ─── Status helpers ─── */
const STATUS_CFG = {
  pending: { label: "Pending", bg: "rgba(251,191,36,.1)", color: "#fbbf24", dot: "#fbbf24" },
  active: { label: "Active", bg: "rgba(52,211,153,.1)", color: "#34d399", dot: "#34d399" },
  ended: { label: "Ended", bg: "rgba(148,163,184,.1)", color: "#a3a3a3", dot: "#737373" },
  executed: { label: "Executed", bg: "rgba(245,158,11,.15)", color: "#fbbf24", dot: "#f59e0b" },
  canceled: { label: "Canceled", bg: "rgba(248,113,113,.1)", color: "#f87171", dot: "#f87171" },
};
function getStatusKey(p) {
  if (p.canceled) return "canceled";
  if (p.executed) return "executed";
  const now = Math.floor(Date.now() / 1000);
  if (now < Number(p.startTime)) return "pending";
  if (now <= Number(p.endTime)) return "active";
  return "ended";
}

/* ─── Countdown hook ─── */
function useCountdown(ts) {
  const [rem, setRem] = useState("");
  useEffect(() => {
    const tick = () => {
      const d = Number(ts) - Math.floor(Date.now() / 1000);
      if (d <= 0) { setRem(""); return; }
      const hh = Math.floor(d / 3600), mm = Math.floor((d % 3600) / 60), ss = d % 60;
      const dd = Math.floor(d / 86400);
      if (dd > 0) setRem(`${dd}d ${hh % 24}h`);
      else if (hh > 0) setRem(`${hh}h ${mm}m`);
      else setRem(`${mm}m ${ss}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [ts]);
  return rem;
}

/* ─── Small section card ─── */
function Section({ title, children }) {
  return (
    <div style={{
      background: "rgba(255,255,255,0.02)",
      border: "1px solid rgba(255,255,255,0.06)",
      borderRadius: "12px", padding: "20px 24px", marginBottom: "16px"
    }}>
      {title && <p style={{ fontFamily: "'Space Mono',monospace", fontSize: "9px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#444", margin: "0 0 14px" }}>{title}</p>}
      {children}
    </div>
  );
}

/* ─── Stat row ─── */
function StatRow({ label, value, mono = false, valueStyle }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#555" }}>{label}</span>
      <span style={{ fontFamily: mono ? "'Space Mono',monospace" : "inherit", fontSize: mono ? "11px" : "13px", color: "#aaa", wordBreak: "break-all", textAlign: "right", maxWidth: "60%", ...valueStyle }}>{value}</span>
    </div>
  );
}

export default function ProposalDetail() {
  useSharedFonts();
  const { id } = useParams();
  const navigate = useNavigate();
  const { account, daoContract, tokenContract } = useWeb3();

  const [proposal, setProposal] = useState(null);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [snapshotSupply, setSnapshotSupply] = useState(0);
  const [quorumPct, setQuorumPct] = useState(35); // default 35%
  const [hasVoted, setHasVoted] = useState(false);
  const [txLoading, setTxLoading] = useState(false);

  // ⚠️ useCountdown must be called unconditionally (Rules of Hooks)
  // When proposal is null, pass 0 — the countdown will just return ""
  const statusKey = proposal ? getStatusKey(proposal) : "pending";
  const targetTime = proposal
    ? (statusKey === "pending" ? proposal.startTime : proposal.endTime)
    : 0;
  const countdown = useCountdown(targetTime);

  /* fetch proposal + IPFS meta */
  useEffect(() => {
    if (!daoContract) return;
    (async () => {
      try {
        const p = await daoContract.proposals(Number(id));
        const obj = {
          id: Number(p.id), creator: p.creator, target: p.target,
          snapshotId: Number(p.snapshotId),
          startTime: Number(p.startTime), endTime: Number(p.endTime),
          yesVotes: ethers.formatEther(p.yesVotes),
          noVotes: ethers.formatEther(p.noVotes),
          executed: p.executed, canceled: p.canceled,
        };
        setProposal(obj);

        /* get description CID from event */
        const evs = await daoContract.queryFilter(daoContract.filters.ProposalCreated(), 0, "latest");
        const ev = evs.find(e => Number(e.args.id) === Number(id));
        if (ev?.args?.description) {
          const m = await fetchProposalMetadata(ev.args.description).catch(() => null);
          setMeta(m);
        }
      } catch { toast.error("Failed to load proposal"); }
      finally { setLoading(false); }
    })();
  }, [daoContract, id]);

  /* snapshot supply */
  useEffect(() => {
    if (!tokenContract || !proposal?.snapshotId) return;
    tokenContract.totalSupplyAt(proposal.snapshotId)
      .then(s => setSnapshotSupply(parseFloat(ethers.formatEther(s))))
      .catch(console.error);
  }, [tokenContract, proposal?.snapshotId]);

  /* has voted */
  useEffect(() => {
    if (!daoContract || !account || !proposal) return;
    daoContract.hasVoted(proposal.id, account).then(setHasVoted).catch(console.error);
    daoContract.quorumPercentage().then(q => setQuorumPct(Number(q))).catch(console.error);
  }, [daoContract, account, proposal]);

  const vote = async (support) => {
    if (!account) return toast.error("Connect wallet first");
    if (hasVoted) return toast.error("Already voted");
    setTxLoading(true);
    try {
      const tx = await daoContract.vote(proposal.id, support);
      toast.loading("Submitting vote…", { id: "vote" });
      await tx.wait();
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ["#f59e0b", "#fbbf24", "#fff"] });
      toast.success(`Voted ${support ? "YES" : "NO"}`, { id: "vote" });
      setHasVoted(true);
      const p = await daoContract.proposals(Number(id));
      setProposal(prev => ({ ...prev, yesVotes: ethers.formatEther(p.yesVotes), noVotes: ethers.formatEther(p.noVotes) }));
    } catch (err) { toast.error(err?.reason || err?.message || "Vote failed", { id: "vote" }); }
    finally { setTxLoading(false); }
  };

  const execute = async () => {
    if (!account) return toast.error("Connect wallet first");
    setTxLoading(true);
    try {
      const tx = await daoContract.executeProposal(proposal.id);
      toast.loading("Executing…", { id: "exec" });
      await tx.wait();
      confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ["#34d399", "#f59e0b", "#fff"] });
      toast.success("Proposal executed!", { id: "exec" });
      setProposal(prev => ({ ...prev, executed: true }));
    } catch (err) { toast.error(err?.reason || err?.message || "Execution failed", { id: "exec" }); }
    finally { setTxLoading(false); }
  };

  const cancel = async () => {
    if (!account) return toast.error("Connect wallet first");
    setTxLoading(true);
    try {
      const tx = await daoContract.cancelProposal(proposal.id);
      toast.loading("Canceling…", { id: "cancel" });
      await tx.wait();
      toast.success("Proposal canceled", { id: "cancel" });
      setProposal(prev => ({ ...prev, canceled: true }));
    } catch (err) { toast.error(err?.reason || err?.message || "Cancel failed", { id: "cancel" }); }
    finally { setTxLoading(false); }
  };

  /* ─── Derived values ─── */
  if (loading) {
    return (
      <div style={{ maxWidth: "800px", margin: "120px auto", padding: "0 24px", textAlign: "center" }}>
        <div style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px", color: "#444", letterSpacing: "0.12em" }}>Loading proposal…</div>
      </div>
    );
  }

  if (!proposal || proposal.id === 0) {
    return (
      <div style={{ maxWidth: "800px", margin: "120px auto", padding: "0 24px", textAlign: "center" }}>
        <p style={{ color: "#555" }}>Proposal not found.</p>
        <Link to="/dashboard" style={{ color: "#f59e0b", fontSize: "13px" }}>← Back to Dashboard</Link>
      </div>
    );
  }

  const yes = parseFloat(proposal.yesVotes);
  const no = parseFloat(proposal.noVotes);
  const total = yes + no;
  const yP = total === 0 ? 0 : (yes / total) * 100;
  const nP = total === 0 ? 0 : (no / total) * 100;
  const quorumNeeded = snapshotSupply * (quorumPct / 100);
  const quorumMet = snapshotSupply > 0 && total >= quorumNeeded;

  const now = Math.floor(Date.now() / 1000);
  const status = STATUS_CFG[statusKey];
  const isActive = statusKey === "active";
  const isExpired = now > proposal.endTime;
  const canExecute = account && isExpired && quorumMet && !proposal.executed && !proposal.canceled && yes > no && !txLoading;
  const canVote = account && isActive && !hasVoted && !txLoading;
  const canCancel = account && account.toLowerCase() === proposal.creator.toLowerCase() && !proposal.executed && !proposal.canceled && !isExpired;

  const fmt = (ts) => new Date(ts * 1000).toLocaleString();

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", padding: "clamp(80px,8vw,96px) clamp(16px,4vw,32px) 80px", position: "relative" }}>

      {/* Ambient glow */}
      <div style={{ position: "fixed", top: "15%", right: "-10%", width: "360px", height: "360px", borderRadius: "50%", background: "rgba(245,158,11,0.05)", filter: "blur(100px)", pointerEvents: "none", zIndex: 0 }} />

      {/* Back link */}
      <div className="du">
        <Link to="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: "8px", fontFamily: "'Space Mono',monospace", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#444", textDecoration: "none", marginBottom: "36px", transition: "color .2s" }}
          onMouseEnter={e => e.currentTarget.style.color = "#888"} onMouseLeave={e => e.currentTarget.style.color = "#444"}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          Back to Dashboard
        </Link>
      </div>

      {/* Header */}
      <div className="du1" style={{ marginBottom: "32px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px", flexWrap: "wrap" }}>
          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", color: "#555", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", padding: "4px 10px" }}>#{proposal.id}</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "11px", fontWeight: 600, padding: "5px 12px", borderRadius: "100px", background: status.bg, color: status.color }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: status.dot, display: "inline-block" }} />
            {status.label}
          </span>
          {(statusKey === "pending" || statusKey === "active") && countdown && (
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "10px", color: "#555" }}>
              {statusKey === "pending" ? "Starts in " : "Ends in "}
              <span style={{ color: status.color }}>{countdown}</span>
            </span>
          )}
        </div>

        <h1 style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(1.8rem,4vw,2.8rem)", fontWeight: 600, letterSpacing: "-0.02em", lineHeight: 1.1, margin: "0 0 10px" }}>
          {meta?.title
            ? <>{meta.title}</>
            : <>Proposal <em style={{ fontStyle: "italic", color: "#f59e0b" }}>#{proposal.id}</em></>}
        </h1>
        {meta?.description && (
          <p style={{ fontSize: "14px", color: "#666", lineHeight: 1.8, margin: 0, maxWidth: "640px" }}>{meta.description}</p>
        )}
      </div>

      {/* Cover image — resolveIPFS checks localStorage base64 cache first, then gateway */}
      {meta?.image && (
        <div className="du2" style={{ marginBottom: "24px", borderRadius: "12px", overflow: "hidden", border: "1px solid rgba(255,255,255,0.06)" }}>
          <img src={resolveIPFS(meta.image)} alt="Proposal cover"
            style={{ width: "100%", maxHeight: "320px", objectFit: "cover", display: "block" }}
            onError={e => { e.currentTarget.parentElement.style.display = "none" }} />
        </div>
      )}

      <div className="du2" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "16px" }}>

        {/* Vote bar */}
        <Section title="Current Votes">
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", fontWeight: 600, marginBottom: "10px" }}>
            <span style={{ color: "#34d399" }}>Yes — {yP.toFixed(1)}% &nbsp;({yes.toLocaleString(undefined, { maximumFractionDigits: 0 })} DGT)</span>
            <span style={{ color: "#f87171" }}>No — {nP.toFixed(1)}% &nbsp;({no.toLocaleString(undefined, { maximumFractionDigits: 0 })} DGT)</span>
          </div>
          <div style={{ height: "10px", borderRadius: "100px", overflow: "hidden", background: total === 0 ? "rgba(255,255,255,0.06)" : "#f87171" }}>
            {total > 0 && <div style={{ width: `${yP}%`, height: "100%", background: "#34d399", borderRadius: "100px", transition: "width .5s ease" }} />}
          </div>

          {/* Quorum */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "14px", padding: "10px 14px", borderRadius: "8px", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <svg viewBox="0 0 36 36" width="20" height="20" style={{ transform: "rotate(-90deg)" }}>
                <path strokeWidth="4" stroke="rgba(255,255,255,0.08)" fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                <path strokeWidth="4" strokeDasharray={`${Math.min(((total / (quorumNeeded || 1)) * 100), 100)},100`} strokeLinecap="round" stroke={quorumMet ? "#34d399" : "#fbbf24"} fill="none" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
              </svg>
              <span style={{ fontSize: "12px", color: quorumMet ? "#34d399" : "#f87171" }}>{quorumMet ? "Quorum met" : "Quorum not met"}</span>
            </div>
            <span style={{ fontFamily: "'Space Mono',monospace", fontSize: "11px", color: "#555" }}>
              {total.toLocaleString(undefined, { maximumFractionDigits: 0 })} / {quorumNeeded.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>

          {hasVoted && (
            <p style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#fbbf24", marginTop: "12px", marginBottom: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5" /></svg>
              You have voted on this proposal
            </p>
          )}
        </Section>

        {/* Actions */}
        {!proposal.executed && !proposal.canceled && (
          <Section title="Actions">
            {isActive && (
              <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
                <button onClick={() => vote(true)} disabled={!canVote}
                  style={{ flex: 1, padding: "14px", borderRadius: "8px", border: "1px solid rgba(52,211,153,0.25)", background: "rgba(52,211,153,0.08)", color: canVote ? "#34d399" : "rgba(52,211,153,0.4)", fontFamily: "'Space Mono',monospace", fontSize: "11px", fontWeight: 700, cursor: canVote ? "pointer" : "not-allowed", transition: "all .2s", letterSpacing: "0.08em" }}
                  onMouseEnter={e => { if (canVote) e.currentTarget.style.background = "rgba(52,211,153,0.18)" }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(52,211,153,0.08)" }}>
                  {txLoading ? "…" : "✓ Vote Yes"}
                </button>
                <button onClick={() => vote(false)} disabled={!canVote}
                  style={{ flex: 1, padding: "14px", borderRadius: "8px", border: "1px solid rgba(248,113,113,0.25)", background: "rgba(248,113,113,0.08)", color: canVote ? "#f87171" : "rgba(248,113,113,0.4)", fontFamily: "'Space Mono',monospace", fontSize: "11px", fontWeight: 700, cursor: canVote ? "pointer" : "not-allowed", transition: "all .2s", letterSpacing: "0.08em" }}
                  onMouseEnter={e => { if (canVote) e.currentTarget.style.background = "rgba(248,113,113,0.18)" }}
                  onMouseLeave={e => { e.currentTarget.style.background = "rgba(248,113,113,0.08)" }}>
                  {txLoading ? "…" : "✗ Vote No"}
                </button>
              </div>
            )}
            <button onClick={execute} disabled={!canExecute}
              style={{ width: "100%", padding: "14px", borderRadius: "8px", border: "1px solid rgba(245,158,11,0.3)", background: canExecute ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.05)", color: canExecute ? "#fbbf24" : "rgba(245,158,11,0.3)", fontFamily: "'Space Mono',monospace", fontSize: "11px", fontWeight: 700, cursor: canExecute ? "pointer" : "not-allowed", transition: "all .2s", letterSpacing: "0.08em", marginBottom: "8px" }}
              onMouseEnter={e => { if (canExecute) e.currentTarget.style.background = "rgba(245,158,11,0.25)" }}
              onMouseLeave={e => { e.currentTarget.style.background = canExecute ? "rgba(245,158,11,0.15)" : "rgba(245,158,11,0.05)" }}>
              {txLoading ? "Executing…" : "⚡ Execute Proposal"}
            </button>
            {canCancel && (
              <button onClick={cancel} disabled={txLoading}
                style={{ width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid rgba(248,113,113,0.2)", background: "transparent", color: "rgba(248,113,113,0.6)", fontFamily: "'Space Mono',monospace", fontSize: "10px", cursor: "pointer", transition: "all .2s", letterSpacing: "0.08em" }}
                onMouseEnter={e => { e.currentTarget.style.background = "rgba(248,113,113,0.06)" }}
                onMouseLeave={e => { e.currentTarget.style.background = "transparent" }}>
                Cancel Proposal
              </button>
            )}
          </Section>
        )}

        {/* Details */}
        <Section title="Proposal Details">
          <StatRow label="Target Contract" value={proposal.target} mono />
          <StatRow label="Creator" value={proposal.creator} mono />
          <StatRow label="Voting Starts" value={fmt(proposal.startTime)} />
          <StatRow label="Voting Ends" value={fmt(proposal.endTime)} />
          <StatRow label="Snapshot ID" value={`#${proposal.snapshotId}`} mono />
          <StatRow label="Quorum Required" value="35% of snapshot supply"
            valueStyle={{ color: "#f59e0b", background: "rgba(245,158,11,0.08)", padding: "2px 10px", borderRadius: "100px", fontSize: "11px", fontFamily: "'Space Mono',monospace" }} />
          {proposal.executed && <StatRow label="Status" value="✓ Executed" valueStyle={{ color: "#34d399" }} />}
          {proposal.canceled && <StatRow label="Status" value="✕ Canceled" valueStyle={{ color: "#f87171" }} />}
        </Section>
      </div>
    </div>
  );
}
