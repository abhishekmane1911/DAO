import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";

/* ─── Ticker data ─── */
const TICKER_ROW_1 = [
  { label: "TOTAL SUPPLY", value: "1,000,000 DGT" },
  { label: "QUORUM", value: "30%" },
  { label: "ACTIVE PROPOSALS", value: "7" },
  { label: "VOTES CAST", value: "483,201" },
  { label: "TREASURY", value: "$2.4M" },
  { label: "HOLDERS", value: "12,847" },
  { label: "PROPOSALS EXECUTED", value: "94" },
  { label: "AVG. TURNOUT", value: "41.3%" },
  { label: "PROTOCOL FEES", value: "0%" },
  { label: "NETWORK", value: "ETHEREUM" },
];

const TICKER_ROW_2 = [
  { label: "LAST PROPOSAL", value: "2H AGO" },
  { label: "DGT PRICE", value: "$3.14" },
  { label: "MARKET CAP", value: "$3.14M" },
  { label: "BLOCK HEIGHT", value: "21,904,371" },
  { label: "ON-CHAIN", value: "100%" },
  { label: "SNAPSHOT INTERVAL", value: "7200 BLOCKS" },
  { label: "TIMELOCK DELAY", value: "48H" },
  { label: "FLASH LOAN GUARD", value: "ACTIVE" },
  { label: "MULTISIG SIGNERS", value: "5 / 9" },
  { label: "AUDIT STATUS", value: "VERIFIED" },
];

function TickerItem({ label, value }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "10px",
      padding: "0 40px",
      whiteSpace: "nowrap",
      fontFamily: "'Space Mono', monospace",
      fontSize: "11px",
      letterSpacing: "0.08em",
    }}>
      <span style={{ color: "#5a5a5a", textTransform: "uppercase" }}>{label}</span>
      <span style={{
        color: "var(--color-primary, #F59E0B)",
        fontWeight: 700,
      }}>{value}</span>
      <span style={{ color: "#2a2a2a", fontSize: "16px", fontWeight: 300 }}>·</span>
    </span>
  );
}

function Ticker({ items, reverse = false, speed = 60 }) {
  const doubled = [...items, ...items];
  return (
    <div style={{ overflow: "hidden", width: "100%" }}>
      <div style={{
        display: "flex",
        animation: `ticker${reverse ? "Rev" : "Fwd"} ${speed}s linear infinite`,
      }}>
        {doubled.map((item, i) => <TickerItem key={i} {...item} />)}
      </div>
    </div>
  );
}

/* ─── Stat card ─── */
function StatCard({ value, label }) {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      gap: "6px",
      padding: "24px 16px",
      borderLeft: "1px solid rgba(255,255,255,0.06)",
    }}>
      <span style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: "clamp(2.2rem, 4vw, 3rem)",
        fontWeight: 600,
        color: "var(--color-primary, #F59E0B)",
        lineHeight: 1,
        letterSpacing: "-0.01em",
      }}>{value}</span>
      <span style={{
        fontFamily: "'Space Mono', monospace",
        fontSize: "9px",
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        color: "#5a5a5a",
      }}>{label}</span>
    </div>
  );
}

/* ─── Feature card ─── */
function FeatureCard({ icon, title, description }) {
  return (
    <div className="glass-panel" style={{
      padding: "36px 32px",
      borderRadius: "16px",
      border: "1px solid rgba(255,255,255,0.06)",
      transition: "border-color 0.3s ease, transform 0.3s ease",
      cursor: "default",
    }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = "rgba(245,158,11,0.3)";
        e.currentTarget.style.transform = "translateY(-4px)";
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div style={{
        width: "44px",
        height: "44px",
        borderRadius: "10px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: "24px",
        background: "rgba(245,158,11,0.08)",
        border: "1px solid rgba(245,158,11,0.15)",
        color: "var(--color-primary, #F59E0B)",
      }}>
        {icon}
      </div>
      <h3 style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: "1.4rem",
        fontWeight: 600,
        marginBottom: "12px",
        letterSpacing: "-0.01em",
      }}>{title}</h3>
      <p style={{
        fontSize: "13.5px",
        color: "var(--color-text-sec)",
        lineHeight: 1.75,
        margin: 0,
      }}>{description}</p>
    </div>
  );
}

/* ─── Step ─── */
function Step({ number, title, description }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: "16px" }}>
      <div style={{
        width: "72px",
        height: "72px",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: "1.8rem",
        fontWeight: 700,
        color: "var(--color-primary, #F59E0B)",
        border: "1px solid rgba(245,158,11,0.3)",
        background: "rgba(245,158,11,0.04)",
        position: "relative",
        zIndex: 1,
      }}>{number}</div>
      <h3 style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: "1.25rem",
        fontWeight: 600,
        margin: 0,
        letterSpacing: "-0.01em",
      }}>{title}</h3>
      <p style={{ fontSize: "13.5px", color: "var(--color-text-sec)", lineHeight: 1.75, maxWidth: "240px", margin: 0 }}>
        {description}
      </p>
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const { account, connectWallet } = useWeb3();
  const [scrollY, setScrollY] = useState(0);
  const heroRef = useRef(null);

  /* Inject fonts + keyframes */
  useEffect(() => {
    const style = document.createElement("style");
    style.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500;600;700&family=Space+Mono:wght@400;700&display=swap');

      @keyframes tickerFwd {
        from { transform: translateX(0); }
        to   { transform: translateX(-50%); }
      }
      @keyframes tickerRev {
        from { transform: translateX(-50%); }
        to   { transform: translateX(0); }
      }
      @keyframes heroFloat {
        0%, 100% { transform: translateY(0px) scale(1); }
        50%       { transform: translateY(-12px) scale(1.005); }
      }
      @keyframes fadeUp {
        from { opacity: 0; transform: translateY(24px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes scanline {
        0%   { background-position: 0 0; }
        100% { background-position: 0 100%; }
      }
      .landing-hero-video {
        animation: heroFloat 8s ease-in-out infinite;
      }
      .landing-fade-up { animation: fadeUp 0.7s ease forwards; }
      .landing-fade-up-d1 { animation: fadeUp 0.7s 0.1s ease forwards; opacity: 0; }
      .landing-fade-up-d2 { animation: fadeUp 0.7s 0.2s ease forwards; opacity: 0; }
      .landing-fade-up-d3 { animation: fadeUp 0.7s 0.35s ease forwards; opacity: 0; }
      .landing-fade-up-d4 { animation: fadeUp 0.7s 0.5s ease forwards; opacity: 0; }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  /* Subtle parallax: video drifts gently upward as user scrolls */
  const parallaxY = scrollY * 0.12;

  return (
    <div style={{ position: "relative", overflow: "hidden", minHeight: "calc(100vh - 64px)" }}>

      {/* ─── Ambient glows ─── */}
      <div style={{
        position: "fixed", top: "-15%", left: "-10%",
        width: "45%", height: "45%", borderRadius: "50%",
        opacity: 0.12, filter: "blur(140px)", pointerEvents: "none",
        background: "var(--color-primary, #F59E0B)",
      }} />
      <div style={{
        position: "fixed", bottom: "-20%", right: "-5%",
        width: "30%", height: "30%", borderRadius: "50%",
        opacity: 0.07, filter: "blur(120px)", pointerEvents: "none",
        background: "#38BDF8",
      }} />

      {/* ─── Fine grid overlay ─── */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: `
          linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
          linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
      }} />

      {/* ═══════════════════ HERO ═══════════════════ */}
      <section ref={heroRef} style={{
        maxWidth: "1400px", width: "100%", margin: "0 auto",
        padding: "clamp(64px, 10vw, 128px) clamp(16px, 5vw, 48px)",
        display: "flex", flexDirection: "row", alignItems: "center",
        justifyContent: "space-between", gap: "48px",
        minHeight: "88vh", position: "relative", zIndex: 1,
        flexWrap: "wrap",
      }}>

        {/* Left copy */}
        <div style={{ flex: "1 1 420px", maxWidth: "620px" }}>
          {/* Tag */}
          {/* <div className="landing-fade-up" style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            padding: "5px 14px 5px 10px", borderRadius: "100px",
            border: "1px solid rgba(245,158,11,0.25)",
            background: "rgba(245,158,11,0.05)",
            marginBottom: "32px",
          }}> */}
            {/* <span style={{
              width: "6px", height: "6px", borderRadius: "50%",
              background: "var(--color-primary, #F59E0B)",
              boxShadow: "0 0 8px rgba(245,158,11,0.8)",
            }} /> */}
            {/* <span style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "10px", letterSpacing: "0.12em",
              color: "var(--color-primary, #F59E0B)",
              textTransform: "uppercase",
            }}>DGT Token Governance Protocol</span> */}
          {/* </div> */}

          {/* Headline */}
          <h1 className="landing-fade-up-d1" style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(3rem, 6.5vw, 5.5rem)",
            fontWeight: 600,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            margin: "0 0 28px",
          }}>
            Decentralized<br />
            <em style={{ color: "var(--color-primary, #F59E0B)", fontStyle: "italic" }}>Governance</em><br />
            Protocol
          </h1>

          {/* Divider */}
          <div className="landing-fade-up-d2" style={{
            width: "48px", height: "1px",
            background: "rgba(245,158,11,0.4)",
            marginBottom: "28px",
          }} />

          {/* Body */}
          <p className="landing-fade-up-d2" style={{
            fontSize: "15px",
            lineHeight: 1.85,
            color: "var(--color-text-sec)",
            maxWidth: "480px",
            margin: "0 0 40px",
          }}>
            Empower your community with seamless proposal voting, transparent treasury management,
            and verifiable on-chain execution. The future of decentralized organizations starts here.
          </p>

          {/* CTA */}
          {/* <div className="landing-fade-up-d3" style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            <button
              onClick={() => navigate("/dashboard")}
              style={{
                padding: "14px 32px",
                borderRadius: "8px",
                border: "none",
                background: "var(--color-primary, #F59E0B)",
                color: "#000",
                fontWeight: 700,
                fontFamily: "'Space Mono', monospace",
                fontSize: "11px",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "opacity 0.2s ease, transform 0.2s ease",
              }}
              onMouseEnter={e => { e.currentTarget.style.opacity = "0.88"; e.currentTarget.style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = "1"; e.currentTarget.style.transform = "translateY(0)"; }}
            >
              Launch Dashboard
            </button>

            {!account && (
              <button
                onClick={connectWallet}
                style={{
                  padding: "14px 32px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.12)",
                  background: "transparent",
                  color: "var(--color-text)",
                  fontWeight: 700,
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "11px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  transition: "border-color 0.2s ease, transform 0.2s ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(245,158,11,0.4)"; e.currentTarget.style.transform = "translateY(-2px)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; e.currentTarget.style.transform = "translateY(0)"; }}
              >
                Connect Wallet
              </button>
            )}
          
          </div> */}
        </div>

        {/* Right – video (subtle float + gentle parallax) */}
        <div style={{
          flex: "1 1 360px", maxWidth: "540px",
          display: "flex", justifyContent: "center", alignItems: "center",
          mixBlendMode: "screen", pointerEvents: "none",
        }}>
          <div
            className="landing-hero-video"
            style={{
              transform: `translateY(${parallaxY}px)`,
              transition: "transform 0.15s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
              width: "100%",
            }}
          >
            <video
              autoPlay loop muted playsInline
              style={{ width: "100%", height: "auto", objectFit: "cover", display: "block" }}
            >
              <source src="/v2.webm" type="video/webm" />
            </video>
          </div>
        </div>
      </section>

      {/* ═══════════════════ LIVE STATS BAR ═══════════════════ */}
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.35)",
        position: "relative", zIndex: 1,
      }}>
        <div style={{
          maxWidth: "1400px", margin: "0 auto",
          padding: "0 clamp(16px, 5vw, 48px)",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "0",
        }}>
          <StatCard value="1M+" label="Total Supply" />
          <StatCard value="30%" label="Quorum Target" />
          <StatCard value="100%" label="On-Chain" />
          <StatCard value="$0" label="Protocol Fees" />
        </div>
      </div>

      {/* ═══════════════════ FEATURES ═══════════════════ */}
      <section style={{
        maxWidth: "1400px", margin: "0 auto",
        padding: "clamp(64px, 8vw, 120px) clamp(16px, 5vw, 48px)",
        position: "relative", zIndex: 1,
      }}>
        <div style={{ textAlign: "center", marginBottom: "64px" }}>
          <span style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "10px", letterSpacing: "0.18em",
            textTransform: "uppercase", color: "#555", display: "block",
            marginBottom: "16px",
          }}>Capabilities</span>
          <h2 style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(2rem, 4vw, 3.2rem)",
            fontWeight: 600, letterSpacing: "-0.02em", margin: 0,
          }}>
            Protocol <em style={{ color: "var(--color-primary, #F59E0B)", fontStyle: "italic" }}>Features</em>
          </h2>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
          <FeatureCard
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>}
            title="On-Chain Voting"
            description="Proposals and votes are fully verified and recorded on the blockchain, ensuring immutable consensus without intermediaries."
          />
          <FeatureCard
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="5" width="20" height="14" rx="2" /><line x1="2" y1="10" x2="22" y2="10" /></svg>}
            title="Treasury Management"
            description="Automatically execute financial transactions and manage DAO funds trustlessly once a proposal passes the quorum threshold."
          />
          <FeatureCard
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>}
            title="DGT Tokenomics"
            description="Voting power is dynamically calculated from DGT snapshot balances to prevent flash-loan governance attacks and ensure fair participation."
          />
        </div>
      </section>

      {/* ═══════════════════ HOW IT WORKS ═══════════════════ */}
      <section style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.2)",
        position: "relative", zIndex: 1,
      }}>
        <div style={{
          maxWidth: "1400px", margin: "0 auto",
          padding: "clamp(64px, 8vw, 120px) clamp(16px, 5vw, 48px)",
        }}>
          <div style={{ textAlign: "center", marginBottom: "72px" }}>
            <span style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: "10px", letterSpacing: "0.18em",
              textTransform: "uppercase", color: "#555", display: "block", marginBottom: "16px",
            }}>Process</span>
            <h2 style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(2rem, 4vw, 3.2rem)",
              fontWeight: 600, letterSpacing: "-0.02em", margin: 0,
            }}>
              How It <em style={{ color: "var(--color-primary, #F59E0B)", fontStyle: "italic" }}>Works</em>
            </h2>
          </div>

          <div style={{ position: "relative" }}>
            {/* connector */}
            <div style={{
              position: "absolute", top: "36px",
              left: "calc(16.6% + 36px)", right: "calc(16.6% + 36px)",
              height: "1px",
              background: "linear-gradient(90deg, transparent, rgba(245,158,11,0.2), transparent)",
              display: "block",
            }} />
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "40px",
              position: "relative", zIndex: 1,
            }}>
              <Step number="01" title="Hold DGT Tokens" description="Acquire DGT tokens to gain voting power. Your balance at snapshot determines your influence over protocol decisions." />
              <Step number="02" title="Submit a Proposal" description="Propose changes, fund allocations, or upgrades. Proposals require a description and executable calldata." />
              <Step number="03" title="Vote & Execute" description="Community members cast their votes. If quorum is met, the proposal is automatically executed on-chain." />
            </div>
          </div>
        </div>
      </section>


      {/* ═══════════════════ PREMIUM FOOTER ═══════════════════ */}
      <footer style={{
        width: "100%", position: "relative", zIndex: 1,
        borderTop: "1px solid rgba(255,255,255,0.07)",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(12px)",
      }}>

        {/* Rolling ticker rows */}
        {/* <div style={{
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          padding: "14px 0",
          overflow: "hidden",
        }}>
          <Ticker items={TICKER_ROW_1} reverse={false} speed={55} />
        </div>
        <div style={{
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          padding: "14px 0",
          overflow: "hidden",
          background: "rgba(245,158,11,0.015)",
        }}>
          <Ticker items={TICKER_ROW_2} reverse={true} speed={65} />
        </div> */}

        {/* Main footer body */}
        <div style={{
          maxWidth: "1400px", margin: "0 auto",
          padding: "64px clamp(16px, 5vw, 48px) 48px",
          display: "grid",
          gridTemplateColumns: "1.4fr repeat(3, 1fr)",
          gap: "48px",
        }}>

          {/* Brand column */}
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
              <div style={{
                width: "34px", height: "34px", borderRadius: "8px",
                background: "var(--color-primary, #F59E0B)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 900, color: "#000", fontSize: "15px", fontFamily: "'Space Mono', monospace",
              }}>D</div>
              <span style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "1.35rem", fontWeight: 600, letterSpacing: "-0.01em",
              }}>DGT Governance</span>
            </div>
            <p style={{
              fontSize: "13px", color: "#555", lineHeight: 1.8,
              maxWidth: "260px", margin: "0 0 28px",
            }}>
              A fully on-chain, community-governed protocol built for the decentralized future.
            </p>
            {/* <div style={{ display: "flex", gap: "10px" }}>
              {["GH", "DC", "TW"].map(s => (
                <a key={s} href="#" style={{
                  width: "32px", height: "32px", borderRadius: "6px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "'Space Mono', monospace", fontSize: "9px", color: "#555",
                  textDecoration: "none",
                  transition: "border-color 0.2s, color 0.2s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(245,158,11,0.4)"; e.currentTarget.style.color = "var(--color-primary, #F59E0B)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; e.currentTarget.style.color = "#555"; }}
                >{s}</a>
              ))}
            </div> */}
          </div>

          {/* Nav columns */}
          {[
            // {
            //   title: "Protocol",
            //   links: [
            //     { label: "Dashboard", action: () => navigate("/dashboard") },
            //     { label: "Create Proposal", action: () => navigate("/create") },
            //     { label: "Treasury", action: () => navigate("/dashboard") },
            //     { label: "Analytics", action: () => navigate("/dashboard") },
            //   ],
            // },
            {
              title: "Links",
              links: [
                // { label: "Documentation", href: "#" },
                { label: "GitHub", href: "https://github.com/abhishekmane1911/DAO" },
                // { label: "Audit Reports", href: "#" },
                // { label: "Whitepaper", href: "#" },
              ],
            },
            // {
            //   title: "Community",
            //   links: [
            //     { label: "Discord", href: "#" },
            //     { label: "Twitter / X", href: "#" },
            //     { label: "Forum", href: "#" },
            //     { label: "Snapshot", href: "#" },
            //   ],
            // },
          ].map(col => (
            <div key={col.title}>
              <p style={{
                fontFamily: "'Space Mono', monospace", fontSize: "9px",
                letterSpacing: "0.15em", textTransform: "uppercase",
                color: "#555", marginBottom: "20px", margin: "0 0 20px",
              }}>{col.title}</p>
              <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
                {col.links.map(link => (
                  <li key={link.label}>
                    {link.action ? (
                      <button
                        onClick={link.action}
                        style={{
                          background: "none", border: "none", padding: 0, cursor: "pointer",
                          fontSize: "13.5px", color: "#666", textAlign: "left",
                          transition: "color 0.2s",
                          fontFamily: "inherit",
                        }}
                        onMouseEnter={e => e.currentTarget.style.color = "#fff"}
                        onMouseLeave={e => e.currentTarget.style.color = "#666"}
                      >{link.label}</button>
                    ) : (
                      <a href={link.href} style={{
                        fontSize: "13.5px", color: "#666", textDecoration: "none",
                        transition: "color 0.2s", display: "block",
                      }}
                        onMouseEnter={e => e.currentTarget.style.color = "#fff"}
                        onMouseLeave={e => e.currentTarget.style.color = "#666"}
                      >{link.label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        {/* <div style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          padding: "20px clamp(16px, 5vw, 48px)",
          maxWidth: "1400px", margin: "0 auto",
          display: "flex", justifyContent: "space-between", alignItems: "center",
          flexWrap: "wrap", gap: "12px",
        }}>
          <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "10px", color: "#3a3a3a", letterSpacing: "0.06em" }}>
            © {new Date().getFullYear()} DGT PROTOCOL — ALL RIGHTS RESERVED
          </span>
          <div style={{ display: "flex", gap: "24px" }}>
            {["Privacy Policy", "Terms of Use", "Security"].map(t => (
              <a key={t} href="#" style={{
                fontFamily: "'Space Mono', monospace", fontSize: "10px",
                color: "#3a3a3a", textDecoration: "none", letterSpacing: "0.06em",
                transition: "color 0.2s",
              }}
                onMouseEnter={e => e.currentTarget.style.color = "#888"}
                onMouseLeave={e => e.currentTarget.style.color = "#3a3a3a"}
              >{t.toUpperCase()}</a>
            ))}
          </div>
        </div> */}
      </footer>
    </div>
  );
}