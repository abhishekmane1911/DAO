import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { useWeb3 } from "../context/Web3Context";
import Avatar from "boring-avatars";

export default function UserPanel() {
  const { account, tokenBalance, daoContract } = useWeb3();
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!daoContract || !account) return;

    const fetchHistory = async () => {
      try {
        const filter = daoContract.filters.Voted(null, account);
        const events = await daoContract.queryFilter(filter, 0, "latest");
        
        const recent = events.reverse().slice(0, 3).map((e) => ({
          proposalId: e.args.id.toString(),
          support: e.args.support,
          weight: ethers.formatEther(e.args.weight),
          hash: e.transactionHash
        }));
        setHistory(recent);
      } catch (err) {
        console.error("Failed to fetch history:", err);
      }
    };
    fetchHistory();
  }, [daoContract, account]);

  const copyAddress = () => {
    navigator.clipboard.writeText(account);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!account) {
    return (
      <div className="glass-panel rounded-xl p-6 text-center animate-fade-in">
        {/* Placeholder avatar */}
        <div
          className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center"
          style={{ background: "var(--color-surface-alt)" }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-muted)" strokeWidth="1.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          Connect your wallet to view governance details
        </p>
      </div>
    );
  }

  const balance = parseFloat(tokenBalance);

  return (
    <div className="glass-panel rounded-xl overflow-hidden animate-fade-in">
      {/* Header with gradient accent */}
      <div
        className="h-16 relative"
        style={{
          background: "linear-gradient(135deg, var(--color-primary-dk), var(--color-primary))",
        }}
      >
        {/* Avatar positioned half over the gradient */}
        <div
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 w-12 h-12 rounded-full flex items-center justify-center overflow-hidden"
          style={{
            border: "3px solid var(--color-surface)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.5)",
            background: "var(--color-bg)",
          }}
        >
          <Avatar
            size={42}
            name={account}
            variant="beam"
            colors={["#f59e0b", "#fbbf24", "#d97706", "#34d399", "#f87171"]}
          />
        </div>
      </div>

      <div className="pt-8 pb-5 px-5">
        {/* Address */}
        <div className="text-center mb-5">
          <button
            onClick={copyAddress}
            className="inline-flex items-center gap-1.5 text-sm font-mono cursor-pointer transition-colors duration-200 rounded-md px-2 py-1"
            style={{
              color: "var(--color-text-sec)",
              background: copied ? "rgba(52, 211, 153, 0.1)" : "transparent",
            }}
            title="Click to copy"
          >
            {account.slice(0, 6)}…{account.slice(-4)}
            {copied ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            )}
          </button>
        </div>

        {/* Stats */}
        <div className="space-y-3">
          <div className="glass-panel rounded-lg p-3">
            <p className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>
              Token Balance
            </p>
            <p className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
              {balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}{" "}
              <span className="text-xs font-normal" style={{ color: "var(--color-text-muted)" }}>
                DGT
              </span>
            </p>
          </div>

          <div className="glass-panel rounded-lg p-3">
            <p className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>
              Voting Power
            </p>
            <p className="text-lg font-semibold" style={{ color: "var(--color-text)" }}>
              {balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {/* History */}
        {history.length > 0 && (
          <div className="mt-5">
            <p className="text-xs mb-3 font-medium" style={{ color: "var(--color-text-sec)" }}>Recent Activity</p>
            <div className="space-y-2">
              {history.map((h, i) => (
                <div key={i} className="glass-panel p-2.5 rounded-lg flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: h.support ? "var(--color-success)" : "var(--color-danger)" }} />
                    <span className="text-xs" style={{ color: "var(--color-text)" }}>
                      Voted <span style={{ color: h.support ? "var(--color-success)" : "var(--color-danger)" }}>{h.support ? "Yes" : "No"}</span> on #{h.proposalId}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}