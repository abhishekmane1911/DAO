import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { toast } from "react-hot-toast";
import { useWeb3 } from "../context/Web3Context";
import { useNavigate, Link } from "react-router-dom";

/* ─── Inject shared font + keyframes (idempotent) ─── */
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
      @keyframes shimmer {
        0%   { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
      .dgt-fade-up { animation: fadeUp 0.55s ease forwards; }
      .dgt-fade-up-d1 { animation: fadeUp 0.55s 0.08s ease forwards; opacity: 0; }
      .dgt-fade-up-d2 { animation: fadeUp 0.55s 0.16s ease forwards; opacity: 0; }
      .dgt-fade-up-d3 { animation: fadeUp 0.55s 0.24s ease forwards; opacity: 0; }
    `;
    document.head.appendChild(style);
  }, []);
}

/* ─── Field wrapper ─── */
function Field({ label, required, hint, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <label style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: "10px",
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "#666",
        display: "flex",
        alignItems: "center",
        gap: "6px",
      }}>
        {label}
        {required && (
          <span style={{ color: "var(--color-primary, #F59E0B)", fontSize: "14px", lineHeight: 1 }}>*</span>
        )}
      </label>
      {children}
      {hint && (
        <p style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: "10px",
          color: "#444",
          margin: 0,
          lineHeight: 1.7,
        }}>{hint}</p>
      )}
    </div>
  );
}

/* ─── Styled input ─── */
const fieldBase = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  color: "var(--color-text)",
  borderRadius: "8px",
  padding: "12px 16px",
  fontSize: "13px",
  width: "100%",
  outline: "none",
  transition: "border-color 0.2s ease, background 0.2s ease",
  boxSizing: "border-box",
  fontFamily: "'Space Mono', monospace",
};

function StyledInput({ mono = true, ...props }) {
  return (
    <input
      {...props}
      style={{ ...fieldBase, fontFamily: mono ? "'Space Mono', monospace" : "inherit", ...props.style }}
      onFocus={e => { e.currentTarget.style.borderColor = "rgba(245,158,11,0.4)"; e.currentTarget.style.background = "rgba(245,158,11,0.03)"; }}
      onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
    />
  );
}

function StyledTextarea(props) {
  return (
    <textarea
      {...props}
      style={{ ...fieldBase, resize: "none", fontFamily: "inherit", fontSize: "13.5px", lineHeight: 1.7, ...props.style }}
      onFocus={e => { e.currentTarget.style.borderColor = "rgba(245,158,11,0.4)"; e.currentTarget.style.background = "rgba(245,158,11,0.03)"; }}
      onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
    />
  );
}

/* ─── Summary row ─── */
function SummaryRow({ label, value, mono = false }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "flex-start",
      padding: "10px 0",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
      gap: "16px",
    }}>
      <span style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: "10px",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: "#555",
        flexShrink: 0,
      }}>{label}</span>
      <span style={{
        fontFamily: mono ? "'Space Mono', monospace" : "inherit",
        fontSize: mono ? "11px" : "13px",
        color: "#aaa",
        textAlign: "right",
        wordBreak: "break-all",
      }}>{value}</span>
    </div>
  );
}

export default function CreateProposal() {
  useSharedFonts();

  const { account, daoContract } = useWeb3();
  const navigate = useNavigate();

  const [target, setTarget] = useState("");
  const [calldata, setCalldata] = useState("0x");
  const [votingDelay, setVotingDelay] = useState(0);
  const [votingPeriod, setVotingPeriod] = useState(86400);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!account) return toast.error("Connect wallet first");
    if (!daoContract) return toast.error("Contract not loaded");
    if (!ethers.isAddress(target)) return toast.error("Invalid target address");
    if (!calldata.startsWith("0x")) return toast.error("Calldata must start with 0x");
    if (Number(votingPeriod) <= 0) return toast.error("Voting period must be > 0");

    setLoading(true);
    try {
      const tx = await daoContract.createProposal(
        target,
        calldata,
        Number(votingDelay),
        Number(votingPeriod)
      );

      toast.loading("Creating proposal…", { id: "create" });
      const receipt = await tx.wait();

      const event = receipt.logs
        .map(log => {
          try { return daoContract.interface.parseLog(log); }
          catch { return null; }
        })
        .find(e => e?.name === "ProposalCreated");

      const proposalId = event ? event.args.id.toString() : "?";
      toast.success(`Proposal #${proposalId} created!`, { id: "create" });
      navigate("/");
    } catch (err) {
      toast.error(err?.reason || err?.message || "Failed to create proposal", { id: "create" });
    } finally {
      setLoading(false);
    }
  };

  const periodPresets = [
    { label: "5 min", val: 300 },
    { label: "1 hour", val: 3600 },
    { label: "1 day", val: 86400 },
    { label: "3 days", val: 259200 },
  ];

  const formatPeriod = (s) => {
    if (s === 0 || s === "0") return "Immediate start";
    const n = Number(s);
    if (n < 60) return `${n}s`;
    if (n < 3600) return `${Math.round(n / 60)}m`;
    if (n < 86400) return `${Math.round(n / 3600)}h`;
    return `${Math.round(n / 86400)}d`;
  };

  return (
    <div style={{
      maxWidth: "640px",
      margin: "80px auto 64px",
      padding: "0 clamp(16px, 4vw, 32px)",
      position: "relative",
    }}>

      {/* Ambient glow */}
      <div style={{
        position: "fixed", top: "20%", right: "-10%",
        width: "300px", height: "300px", borderRadius: "50%",
        background: "rgba(245,158,11,0.06)", filter: "blur(80px)",
        pointerEvents: "none", zIndex: 0,
      }} />

      {/* Back link */}
      <div className="dgt-fade-up">
        <Link
          to="/"
          style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            fontFamily: "'Space Mono', monospace", fontSize: "10px",
            letterSpacing: "0.1em", textTransform: "uppercase",
            color: "#444", textDecoration: "none", marginBottom: "40px",
            transition: "color 0.2s ease",
          }}
          onMouseEnter={e => e.currentTarget.style.color = "#888"}
          onMouseLeave={e => e.currentTarget.style.color = "#444"}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      {/* Header */}
      <div className="dgt-fade-up-d1" style={{ marginBottom: "40px" }}>
        <span style={{
          fontFamily: "'Space Mono', monospace", fontSize: "10px",
          letterSpacing: "0.18em", textTransform: "uppercase",
          color: "var(--color-primary, #F59E0B)", display: "block", marginBottom: "10px",
        }}>Governance</span>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "clamp(2rem, 5vw, 3rem)",
          fontWeight: 600,
          letterSpacing: "-0.02em",
          margin: "0 0 10px",
          lineHeight: 1.1,
        }}>
          Create <em style={{ fontStyle: "italic", color: "var(--color-primary, #F59E0B)" }}>Proposal</em>
        </h1>
        <p style={{ fontSize: "14px", color: "#555", margin: 0, lineHeight: 1.7 }}>
          Submit a governance proposal for the DAO to review and vote on.
        </p>
      </div>

      {/* Step indicator */}
      <div className="dgt-fade-up-d2" style={{
        display: "flex", alignItems: "stretch", gap: "0",
        marginBottom: "48px",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "10px", overflow: "hidden",
      }}>
        {[
          { n: 1, label: "Details" },
          { n: 2, label: "Configuration" },
        ].map(({ n, label }, i) => (
          <div key={n} style={{
            flex: 1,
            display: "flex", alignItems: "center", gap: "10px",
            padding: "14px 20px",
            background: step >= n ? "rgba(245,158,11,0.06)" : "rgba(0,0,0,0.2)",
            borderRight: i === 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
            transition: "background 0.3s ease",
          }}>
            <div style={{
              width: "24px", height: "24px", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontFamily: "'Space Mono', monospace", fontSize: "10px",
              background: step >= n ? "var(--color-primary, #F59E0B)" : "rgba(255,255,255,0.06)",
              color: step >= n ? "#000" : "#444",
              fontWeight: 700, flexShrink: 0,
              transition: "background 0.3s ease, color 0.3s ease",
            }}>{n}</div>
            <span style={{
              fontFamily: "'Space Mono', monospace", fontSize: "10px",
              letterSpacing: "0.1em", textTransform: "uppercase",
              color: step >= n ? "#ccc" : "#444",
              transition: "color 0.3s ease",
            }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {step === 1 ? (
          <div className="dgt-fade-up-d2" style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

            <Field label="Target Address" required hint="The contract address this proposal will call on execution.">
              <StyledInput
                type="text"
                value={target}
                onChange={e => setTarget(e.target.value)}
                placeholder="0x0000000000000000000000000000000000000000"
              />
            </Field>

            <Field label="Calldata" hint="Encoded function call data. Use 0x for no calldata.">
              <StyledInput
                type="text"
                value={calldata}
                onChange={e => setCalldata(e.target.value)}
                placeholder="0x"
              />
            </Field>

            <Field label="Description" hint="Optional. Stored locally for display — not sent on-chain.">
              <StyledTextarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                placeholder="Describe what this proposal does, why it matters, and what the expected outcome is…"
              />
            </Field>

            {/* Divider */}
            <div style={{ height: "1px", background: "rgba(255,255,255,0.05)" }} />

            <button
              type="button"
              onClick={() => {
                if (!ethers.isAddress(target)) return toast.error("Invalid target address");
                if (!calldata.startsWith("0x")) return toast.error("Calldata must start with 0x");
                setStep(2);
              }}
              style={{
                padding: "15px 32px",
                borderRadius: "8px", border: "none",
                background: "var(--color-primary, #F59E0B)",
                color: "#000",
                fontFamily: "'Space Mono', monospace",
                fontSize: "11px", fontWeight: 700,
                letterSpacing: "0.1em", textTransform: "uppercase",
                cursor: "pointer",
                transition: "opacity 0.2s, transform 0.2s",
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              Continue to Configuration →
            </button>
          </div>

        ) : (
          <div className="dgt-fade-up" style={{ display: "flex", flexDirection: "column", gap: "28px" }}>

            <Field label="Voting Delay" hint="Seconds before voting opens. Use 0 for an immediate start.">
              <StyledInput
                type="number"
                min={0}
                value={votingDelay}
                onChange={e => setVotingDelay(e.target.value)}
              />
            </Field>

            <Field label="Voting Period" required hint="Duration the vote is open, in seconds.">
              <StyledInput
                type="number"
                min={1}
                value={votingPeriod}
                onChange={e => setVotingPeriod(e.target.value)}
              />
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
                {periodPresets.map(({ label, val }) => {
                  const active = Number(votingPeriod) === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setVotingPeriod(val)}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "6px",
                        border: active ? "1px solid rgba(245,158,11,0.4)" : "1px solid rgba(255,255,255,0.07)",
                        background: active ? "rgba(245,158,11,0.08)" : "transparent",
                        color: active ? "var(--color-primary, #F59E0B)" : "#555",
                        fontFamily: "'Space Mono', monospace",
                        fontSize: "10px", letterSpacing: "0.08em",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={e => { if (!active) e.currentTarget.style.color = "#aaa"; }}
                      onMouseLeave={e => { if (!active) e.currentTarget.style.color = "#555"; }}
                    >{label}</button>
                  );
                })}
              </div>
            </Field>

            {/* Summary panel */}
            <div style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "10px",
              padding: "20px 24px",
            }}>
              <span style={{
                fontFamily: "'Space Mono', monospace", fontSize: "9px",
                letterSpacing: "0.18em", textTransform: "uppercase",
                color: "#444", display: "block", marginBottom: "4px",
              }}>Proposal Summary</span>

              <SummaryRow label="Target" value={target || "—"} mono />
              <SummaryRow label="Calldata" value={calldata.length > 20 ? calldata.slice(0, 20) + "…" : calldata} mono />
              <SummaryRow
                label="Voting Starts"
                value={votingDelay === 0 || votingDelay === "0" ? "Immediately" : `After ${formatPeriod(votingDelay)}`}
              />
              <SummaryRow
                label="Voting Duration"
                value={`${Number(votingPeriod).toLocaleString()}s (${formatPeriod(votingPeriod)})`}
              />
              <div style={{ padding: "10px 0 0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#555" }}>Quorum Required</span>
                  <span style={{
                    fontFamily: "'Space Mono', monospace", fontSize: "10px",
                    color: "var(--color-primary, #F59E0B)",
                    padding: "3px 10px", borderRadius: "100px",
                    background: "rgba(245,158,11,0.08)",
                    border: "1px solid rgba(245,158,11,0.2)",
                  }}>30% of snapshot supply</span>
                </div>
              </div>
            </div>

            {!account && (
              <div style={{
                padding: "12px 16px", borderRadius: "8px",
                background: "rgba(245,158,11,0.06)",
                border: "1px solid rgba(245,158,11,0.15)",
                fontFamily: "'Space Mono', monospace", fontSize: "11px",
                color: "var(--color-primary, #F59E0B)", textAlign: "center",
              }}>
                Connect your wallet to submit a proposal
              </div>
            )}

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  flex: "0 0 auto", padding: "15px 24px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "transparent",
                  color: "#666",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "11px", letterSpacing: "0.08em",
                  textTransform: "uppercase", cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.16)"; e.currentTarget.style.color = "#aaa"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#666"; }}
              >← Back</button>

              <button
                type="submit"
                disabled={loading || !account}
                style={{
                  flex: 1, padding: "15px 32px",
                  borderRadius: "8px", border: "none",
                  background: loading || !account ? "rgba(245,158,11,0.3)" : "var(--color-primary, #F59E0B)",
                  color: loading || !account ? "rgba(0,0,0,0.5)" : "#000",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "11px", fontWeight: 700,
                  letterSpacing: "0.1em", textTransform: "uppercase",
                  cursor: loading || !account ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                }}
                onMouseEnter={e => { if (!loading && account) { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "translateY(-2px)"; } }}
                onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                {loading ? (
                  <>
                    <span style={{
                      width: "14px", height: "14px",
                      border: "2px solid rgba(0,0,0,0.2)",
                      borderTopColor: "#000",
                      borderRadius: "50%",
                      animation: "spin 0.7s linear infinite",
                      display: "inline-block",
                    }} />
                    Submitting…
                  </>
                ) : "Submit Proposal"}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}