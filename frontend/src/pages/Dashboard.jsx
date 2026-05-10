import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";
import ProposalCard from "../components/ProposalCard";
import UserPanel from "../components/UserPanel";
import { fetchProposalMetadata } from "../utils/pinata";

// 🔥 IMPORT YOUR CONFIG HERE
import { CONTRACTS } from "../config";

/* ─── Inject shared fonts (idempotent) ─── */
function useSharedFonts() {
  useEffect(() => {
    if (document.getElementById("dgt-fonts")) return;
    const style = document.createElement("style");
    style.id = "dgt-fonts";
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400;1,600&family=Space+Mono:wght@400;700&display=swap');
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(20px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes skeletonPulse {
        0%, 100% { opacity: 0.3; }
        50%       { opacity: 0.6; }
      }
      .dgt-fade-up   { animation: fadeUp 0.55s ease forwards; }
      .dgt-fade-up-d1 { animation: fadeUp 0.55s 0.08s ease forwards; opacity: 0; }
      .dgt-fade-up-d2 { animation: fadeUp 0.55s 0.16s ease forwards; opacity: 0; }
      .dgt-fade-up-d3 { animation: fadeUp 0.55s 0.24s ease forwards; opacity: 0; }
      .dgt-skeleton { animation: skeletonPulse 1.6s ease-in-out infinite; background: rgba(255,255,255,0.05); border-radius: 6px; }
    `;
    document.head.appendChild(style);
  }, []);
}

const FILTERS = ["All", "Pending", "Active", "Ended", "Executed"];

/* ─── Skeleton card ─── */
function SkeletonCard() {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "12px",
        padding: "24px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <div
          className="dgt-skeleton"
          style={{ width: "48px", height: "20px" }}
        />
        <div
          className="dgt-skeleton"
          style={{ width: "80px", height: "20px", borderRadius: "100px" }}
        />
      </div>
      <div
        className="dgt-skeleton"
        style={{ width: "60%", height: "14px", marginBottom: "10px" }}
      />
      <div
        className="dgt-skeleton"
        style={{
          width: "100%",
          height: "6px",
          borderRadius: "100px",
          marginBottom: "20px",
        }}
      />
      <div style={{ display: "flex", gap: "10px" }}>
        <div
          className="dgt-skeleton"
          style={{ flex: 1, height: "38px", borderRadius: "8px" }}
        />
        <div
          className="dgt-skeleton"
          style={{ flex: 1, height: "38px", borderRadius: "8px" }}
        />
      </div>
    </div>
  );
}

/* ─── Stat card ─── */
function StatCard({ label, value, valueColor }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "10px",
        padding: "20px 24px",
        flex: "1 1 0",
        minWidth: 0,
        transition: "border-color 0.2s ease",
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)")
      }
    >
      <span
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: "9px",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: "#444",
          display: "block",
          marginBottom: "8px",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "2.2rem",
          fontWeight: 600,
          lineHeight: 1,
          letterSpacing: "-0.01em",
          color: valueColor || "var(--color-text)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

/* ─── Icon button ─── */
function IconBtn({ onClick, disabled, children, variant = "ghost" }) {
  const isPrimary = variant === "primary";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "7px",
        padding: "10px 18px",
        borderRadius: "8px",
        border: isPrimary ? "none" : "1px solid rgba(255,255,255,0.08)",
        background: isPrimary ? "var(--color-primary, #F59E0B)" : "transparent",
        color: isPrimary ? "#000" : "#666",
        fontFamily: "'Space Mono', monospace",
        fontSize: "10px",
        fontWeight: isPrimary ? 700 : 400,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        transition: "all 0.2s ease",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = "translateY(-2px)";
          if (!isPrimary)
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.16)";
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        if (!isPrimary)
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
      }}
    >
      {children}
    </button>
  );
}

/* ─── Filter pill ─── */
function FilterPill({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px",
        borderRadius: "6px",
        border: active
          ? "1px solid rgba(245,158,11,0.35)"
          : "1px solid rgba(255,255,255,0.06)",
        background: active ? "rgba(245,158,11,0.08)" : "transparent",
        color: active ? "var(--color-primary, #F59E0B)" : "#555",
        fontFamily: "'Space Mono', monospace",
        fontSize: "10px",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        cursor: "pointer",
        transition: "all 0.2s ease",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.color = "#999";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.color = "#555";
      }}
    >
      {label}
    </button>
  );
}

/* ─── Search input ─── */
function SearchInput({ value, onChange }) {
  return (
    <div style={{ position: "relative", width: "200px" }}>
      {/* <svg
        style={{
          position: "absolute",
          left: "10px",
          top: "50%",
          transform: "translateY(-50%)",
          color: "#444",
          pointerEvents: "none",
        }}
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg> */}
      {/* <input
        type="text"
        placeholder="Search…"
        value={value}
        onChange={onChange}
        style={{
          width: "100%",
          padding: "8px 12px 8px 32px",
          borderRadius: "7px",
          border: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(255,255,255,0.02)",
          color: "var(--color-text)",
          fontFamily: "'Space Mono', monospace",
          fontSize: "10px",
          outline: "none",
          transition: "border-color 0.2s, background 0.2s",
          boxSizing: "border-box",
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = "rgba(245,158,11,0.35)";
          e.currentTarget.style.background = "rgba(245,158,11,0.02)";
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)";
          e.currentTarget.style.background = "rgba(255,255,255,0.02)";
        }}
      /> */}
    </div>
  );
}

/* ─── Sort select ─── */
function SortSelect({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{
        padding: "8px 12px",
        borderRadius: "7px",
        border: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(255,255,255,0.02)",
        color: "#666",
        fontFamily: "'Space Mono', monospace",
        fontSize: "10px",
        outline: "none",
        cursor: "pointer",
        appearance: "none",
        transition: "border-color 0.2s",
      }}
      onFocus={(e) =>
        (e.currentTarget.style.borderColor = "rgba(245,158,11,0.35)")
      }
      onBlur={(e) =>
        (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")
      }
    >
      <option value="Newest">Newest</option>
      <option value="Ending Soonest">Ending Soonest</option>
      <option value="Most Votes">Most Votes</option>
    </select>
  );
}

/* ─── Empty state ─── */
function EmptyState({ icon, title, subtitle, action }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.015)",
        border: "1px solid rgba(255,255,255,0.05)",
        borderRadius: "12px",
        padding: "56px 32px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: "12px",
      }}
    >
      <div
        style={{
          width: "52px",
          height: "52px",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.04)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "4px",
          border: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {icon}
      </div>
      <p
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "1.2rem",
          fontWeight: 500,
          color: "#777",
          margin: 0,
        }}
      >
        {title}
      </p>
      {subtitle && (
        <p
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "10px",
            color: "#444",
            margin: 0,
            letterSpacing: "0.05em",
          }}
        >
          {subtitle}
        </p>
      )}
      {action}
    </div>
  );
}

/* ─── System Contracts Card ─── */
function SystemContractsCard() {
  const copyToClipboard = (addr, name) => {
    navigator.clipboard.writeText(addr);
    toast.success(`${name} copied!`, { id: "copy" });
  };

  const formatAddress = (addr) => {
    if (!addr) return "Not Configured";
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "12px",
        padding: "24px",
        marginTop: "20px",
      }}
    >
      <span
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: "10px",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#666",
          display: "block",
          marginBottom: "16px",
        }}
      >
        Deployed Contracts
      </span>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {Object.entries(CONTRACTS).map(([name, address]) => (
          <div
            key={name}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "11px",
                color: "#aaa",
              }}
            >
              {name.replace(/([A-Z])/g, " $1").trim()}{" "}
              {/* Adds spaces to CamelCase names */}
            </span>
            <button
              onClick={() => copyToClipboard(address, name)}
              style={{
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.2)",
                color: "var(--color-primary, #F59E0B)",
                borderRadius: "6px",
                padding: "4px 8px",
                fontFamily: "'Space Mono', monospace",
                fontSize: "10px",
                cursor: "pointer",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.background = "rgba(245,158,11,0.15)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.background = "rgba(245,158,11,0.08)")
              }
            >
              {formatAddress(address)} ⎘
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Hairline divider ─── */
const HR = () => (
  <div
    style={{
      height: "1px",
      background: "rgba(255,255,255,0.04)",
      margin: "4px 0",
    }}
  />
);

export default function Dashboard() {
  useSharedFonts();

  const { account, daoContract } = useWeb3();
  const navigate = useNavigate();
  const [proposals, setProposals] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("Newest");

  const fetchProposals = useCallback(async () => {
    if (!daoContract) return;
    setLoading(true);
    try {
      const count = await daoContract.proposalCount();
      const total = Number(count);
      const fetched = [];

      // ── Fetch ProposalCreated events to get the description (IPFS CID) ──
      const filter = daoContract.filters.ProposalCreated();
      const events = await daoContract.queryFilter(filter, 0, "latest");
      // Build a map: proposalId -> description string
      const descMap = {};
      for (const ev of events) {
        descMap[Number(ev.args.id)] = ev.args.description || "";
      }

      for (let i = 1; i <= total; i++) {
        const p = await daoContract.proposals(i);
        const descCid = descMap[i] || "";

        // Fetch IPFS metadata (non-blocking — fallback to null if unavailable)
        const ipfsMeta = await fetchProposalMetadata(descCid).catch(() => null);

        fetched.push({
          id: Number(p.id),
          creator: p.creator,
          target: p.target,
          snapshotId: Number(p.snapshotId),
          startTime: Number(p.startTime),
          endTime: Number(p.endTime),
          yesVotes: ethers.formatEther(p.yesVotes),
          noVotes: ethers.formatEther(p.noVotes),
          executed: p.executed,
          canceled: p.canceled,
          // IPFS enrichment
          ipfsTitle: ipfsMeta?.title || null,
          ipfsDescription: ipfsMeta?.description || null,
          ipfsImage: ipfsMeta?.image || null,
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

  const now = Math.floor(Date.now() / 1000);
  const activeCount = proposals.filter(
    (p) => now >= p.startTime && now <= p.endTime && !p.canceled,
  ).length;
  const executedCount = proposals.filter((p) => p.executed).length;

  let filtered = proposals.filter((p) => {
    if (filter !== "All") {
      const now = Math.floor(Date.now() / 1000);
      if (
        filter === "Pending" &&
        (p.executed || p.canceled || now >= p.startTime)
      )
        return false;
      if (
        filter === "Active" &&
        (p.executed || p.canceled || now < p.startTime || now > p.endTime)
      )
        return false;
      if (filter === "Ended" && (p.executed || p.canceled || now <= p.endTime))
        return false;
      if (filter === "Executed" && !p.executed) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!p.id.toString().includes(q) && !p.target.toLowerCase().includes(q))
        return false;
    }
    return true;
  });

  filtered.sort((a, b) => {
    if (sortBy === "Ending Soonest") return a.endTime - b.endTime;
    if (sortBy === "Most Votes") {
      return (
        parseFloat(b.yesVotes) +
        parseFloat(b.noVotes) -
        (parseFloat(a.yesVotes) + parseFloat(a.noVotes))
      );
    }
    return b.id - a.id;
  });

  return (
    <div
      style={{
        maxWidth: "1400px",
        margin: "0 auto",
        padding: "clamp(72px, 8vw, 96px) clamp(16px, 4vw, 48px) 64px",
        position: "relative",
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: "fixed",
          top: "10%",
          left: "-5%",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: "rgba(245,158,11,0.05)",
          filter: "blur(100px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* ─── Page header ─── */}
      <div
        className="dgt-fade-up"
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "20px",
          marginBottom: "40px",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div>
          {/* <span
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--color-primary, #F59E0B)",
              display: "block",
              marginBottom: "8px",
            }}
          >
            Protocol
          </span> */}
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(2rem, 4vw, 3rem)",
              fontWeight: 600,
              letterSpacing: "-0.02em",
              margin: "0 0 6px",
              lineHeight: 1.1,
            }}
          >
            Governance{" "}
            <em
              style={{
                fontStyle: "italic",
                color: "var(--color-primary, #F59E0B)",
              }}
            >
              Dashboard
            </em>
          </h1>
          <p
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "11px",
              color: "#444",
              margin: 0,
              letterSpacing: "0.05em",
            }}
          >
            Participate in decentralized decision making
          </p>
        </div>

        {account && (
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <IconBtn
              onClick={fetchProposals}
              disabled={loading}
              variant="ghost"
            >
              {loading ? (
                <>
                  <span
                    style={{
                      width: "12px",
                      height: "12px",
                      border: "1.5px solid rgba(102,102,102,0.3)",
                      borderTopColor: "#666",
                      borderRadius: "50%",
                      animation: "spin 0.7s linear infinite",
                      display: "inline-block",
                    }}
                  />
                  Loading
                </>
              ) : (
                <>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                  Refresh
                </>
              )}
            </IconBtn>
            <IconBtn onClick={() => navigate("/create")} variant="primary">
              <svg
                width="11"
                height="11"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New Proposal
            </IconBtn>
          </div>
        )}
      </div>

      {/* ─── Stats row ─── */}
      {account && proposals.length > 0 && (
        <div
          className="dgt-fade-up-d1"
          style={{
            display: "flex",
            gap: "12px",
            flexWrap: "wrap",
            marginBottom: "36px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <StatCard label="Total Proposals" value={proposals.length} />
          <StatCard
            label="Active"
            value={activeCount}
            valueColor="var(--color-success, #4ade80)"
          />
          <StatCard
            label="Executed"
            value={executedCount}
            valueColor="var(--color-primary, #F59E0B)"
          />
        </div>
      )}

      {/* Hairline separator */}
      {account && proposals.length > 0 && <HR />}

      {/* ─── Main grid ─── */}
      <div
        className="dgt-fade-up-d2"
        style={{
          display: "flex",
          gap: "28px",
          flexDirection: "row",
          flexWrap: "wrap", // <-- Wrapped so it naturally stacks on mobile
          alignItems: "flex-start",
          position: "relative",
          zIndex: 1,
          marginTop: "28px",
        }}
      >
        {/* Proposals column */}
        <div style={{ flex: "1 1 600px", minWidth: 0 }}>
          {/* Controls */}
          {account && proposals.length > 0 && (
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              {/* Filter pills */}
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {FILTERS.map((f) => (
                  <FilterPill
                    key={f}
                    label={f}
                    active={filter === f}
                    onClick={() => setFilter(f)}
                  />
                ))}
              </div>

              {/* Search + Sort */}
              <div
                style={{ display: "flex", gap: "8px", alignItems: "center" }}
              >
                <SearchInput
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <SortSelect
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Results header */}
          {account && proposals.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <span
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "9px",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#444",
                }}
              >
                {filtered.length} proposal{filtered.length !== 1 ? "s" : ""} ·{" "}
                {filter} · sorted by {sortBy}
              </span>
            </div>
          )}

          {/* List */}
          <div
            style={{ display: "flex", flexDirection: "column", gap: "14px" }}
          >
            {!account ? (
              <EmptyState
                icon={
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#444"
                    strokeWidth="1.5"
                  >
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                }
                title="Wallet not connected"
                subtitle="Connect your wallet to view and participate in governance"
              />
            ) : loading ? (
              <>
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </>
            ) : filtered.length === 0 ? (
              <EmptyState
                icon={
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#444"
                    strokeWidth="1.5"
                  >
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                    <polyline points="14 2 14 8 20 8" />
                    <line x1="12" y1="18" x2="12" y2="12" />
                    <line x1="9" y1="15" x2="15" y2="15" />
                  </svg>
                }
                title={
                  filter === "All"
                    ? "No proposals yet"
                    : `No ${filter.toLowerCase()} proposals`
                }
                subtitle={
                  filter === "All"
                    ? "Be the first to create a governance proposal"
                    : "Try a different filter"
                }
                action={
                  filter === "All" && (
                    <button
                      onClick={() => navigate("/create")}
                      style={{
                        marginTop: "8px",
                        padding: "10px 24px",
                        borderRadius: "8px",
                        border: "none",
                        background: "var(--color-primary, #F59E0B)",
                        color: "#000",
                        fontFamily: "'Space Mono', monospace",
                        fontSize: "10px",
                        fontWeight: 700,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.opacity = "0.85")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.opacity = "1")
                      }
                    >
                      Create First Proposal
                    </button>
                  )
                }
              />
            ) : (
              filtered.map((p) => (
                <ProposalCard
                  key={p.id}
                  proposal={p}
                  onRefresh={fetchProposals}
                />
              ))
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div
          style={{ flex: "1 1 300px", maxWidth: "100%" }}
          className="lg-sidebar"
        >
          <UserPanel />
          <SystemContractsCard />
        </div>
      </div>

      {/* Sidebar responsive style injection */}
      <style>{`
        @media (min-width: 1024px) {
          .lg-sidebar { max-width: 300px !important; }
        }
      `}</style>
    </div>
  );
}
