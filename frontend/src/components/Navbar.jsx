import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useWeb3 } from "../context/Web3Context";

export default function Navbar() {
  const { account, tokenBalance, connecting, connectWallet, disconnectWallet } = useWeb3();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinks = [
    { to: "/dashboard", label: "Dashboard" },
    { to: "/create", label: "Create Proposal" },
  ];

  const isActive = (path) => location.pathname === path;

  const truncAddr = account
    ? `${account.slice(0, 6)}…${account.slice(-4)}`
    : "";

  return (
    <>
      <div className="fixed top-0 left-0 w-full z-40 px-4 pt-4 flex justify-center pointer-events-none">
        <header
          className="w-full max-w-[1200px] glass-panel rounded-2xl pointer-events-auto"
          style={{
            background: "rgba(10, 10, 10, 0.4)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
          }}
        >
          <div className="flex items-center justify-between px-4 sm:px-6 lg:px-8 h-16">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center gap-2 no-underline"
              style={{ color: "var(--color-text)" }}
            >
              {/* <div
              className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ background: "var(--color-primary)" }}
            >
              D
            </div> */}
              <span className="text-xl font-bold tracking-tight hidden sm:inline" style={{ fontFamily: "var(--font-heading)" }}>
                DAO Governance
              </span>
            </Link>

            {/* Desktop Nav Links */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium no-underline transition-colors duration-200"
                  style={{
                    color: isActive(to) ? "var(--color-primary-lt)" : "var(--color-text-sec)",
                    background: isActive(to) ? "rgba(245, 158, 11, 0.15)" : "transparent",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive(to)) e.currentTarget.style.color = "var(--color-text)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive(to)) e.currentTarget.style.color = "var(--color-text-sec)";
                  }}
                >
                  {label}
                </Link>
              ))}
            </nav>

            {/* Right side */}
            <div className="flex items-center gap-3">
              {account ? (
                <div className="hidden sm:flex items-center gap-2">
                  {/* Token balance badge */}
                  {/* <span
                    className="px-3 py-1.5 rounded-lg text-xs font-medium"
                    style={{
                      background: "rgba(245, 158, 11, 0.15)",
                      color: "var(--color-primary-lt)",
                      border: "1px solid rgba(245, 158, 11, 0.3)",
                    }}
                  >
                    {parseFloat(tokenBalance).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}{" "}
                    DGT
                  </span> */}

                  {/* Address badge */}
                  {/* <button
                    onClick={() => {
                      navigator.clipboard.writeText(account);
                      // tiny visual feedback — handled by CSS
                    }}
                    className="glass-panel px-3 py-1.5 rounded-lg text-xs font-mono cursor-pointer transition-colors duration-200"
                    style={{
                      color: "var(--color-text-sec)",
                    }}
                    title="Click to copy full address"
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = "var(--color-border-hover)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = "var(--color-border)";
                    }}
                  >
                    {truncAddr}
                  </button> */}

                  {/* Disconnect */}
                  <button
                    onClick={disconnectWallet}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all duration-200"
                    style={{
                      background: "rgba(248, 113, 113, 0.1)",
                      color: "var(--color-danger)",
                      border: "1px solid rgba(248, 113, 113, 0.2)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(248, 113, 113, 0.2)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(248, 113, 113, 0.1)";
                    }}
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={connectWallet}
                  disabled={connecting}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-black cursor-pointer transition-all duration-200 disabled:opacity-50 hover:-translate-y-1"
                  style={{
                    background: "var(--color-primary)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "var(--color-primary-lt)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "var(--color-primary)";
                  }}
                >
                  {connecting ? (
                    <span className="flex items-center gap-2">
                      <span
                        className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                      />
                      Connecting…
                    </span>
                  ) : (
                    "Connect Wallet"
                  )}
                </button>
              )}

              {/* Mobile hamburger */}
              <button
                className="md:hidden flex flex-col gap-1 p-2 cursor-pointer"
                onClick={() => setMobileOpen(true)}
                aria-label="Open menu"
                style={{ color: "var(--color-text-sec)" }}
              >
                <span className="w-5 h-0.5 rounded" style={{ background: "currentColor" }} />
                <span className="w-5 h-0.5 rounded" style={{ background: "currentColor" }} />
                <span className="w-5 h-0.5 rounded" style={{ background: "currentColor" }} />
              </button>
            </div>
          </div>
        </header>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          onClick={() => setMobileOpen(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          {/* Drawer panel */}
          <div
            className="absolute right-0 top-0 h-full w-72 flex flex-col p-6 backdrop-blur-xl"
            style={{
              background: "rgba(10, 10, 10, 0.9)",
              borderLeft: "1px solid var(--color-border)",
              animation: "slide-in-right 0.25s ease-out",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setMobileOpen(false)}
              className="self-end mb-6 p-1 cursor-pointer"
              aria-label="Close menu"
              style={{ color: "var(--color-text-sec)" }}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4l12 12M16 4L4 16" />
              </svg>
            </button>

            {/* Nav links */}
            <nav className="flex flex-col gap-1 mb-8">
              {navLinks.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-lg text-sm font-medium no-underline transition-colors duration-200"
                  style={{
                    color: isActive(to) ? "var(--color-primary-lt)" : "var(--color-text-sec)",
                    background: isActive(to) ? "rgba(245, 158, 11, 0.15)" : "transparent",
                  }}
                >
                  {label}
                </Link>
              ))}
            </nav>

            {/* Mobile wallet info */}
            {account ? (
              <div className="flex flex-col gap-3 mt-auto">
                <div
                  className="glass-panel rounded-lg p-4"
                >
                  <p className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>
                    Wallet
                  </p>
                  <p className="text-sm font-mono" style={{ color: "var(--color-text-sec)" }}>
                    {truncAddr}
                  </p>
                  <p className="text-xs mt-2" style={{ color: "var(--color-text-muted)" }}>
                    Balance
                  </p>
                  <p className="text-sm font-medium" style={{ color: "var(--color-primary-lt)" }}>
                    {parseFloat(tokenBalance).toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}{" "}
                    DGT
                  </p>
                </div>
                <button
                  onClick={() => { disconnectWallet(); setMobileOpen(false); }}
                  className="w-full py-2.5 rounded-lg text-sm font-medium cursor-pointer transition-colors duration-200"
                  style={{
                    background: "rgba(248, 113, 113, 0.1)",
                    color: "var(--color-danger)",
                    border: "1px solid rgba(248, 113, 113, 0.2)",
                  }}
                >
                  Disconnect Wallet
                </button>
              </div>
            ) : (
              <button
                onClick={() => { connectWallet(); setMobileOpen(false); }}
                disabled={connecting}
                className="mt-auto w-full py-2.5 rounded-lg text-sm font-medium text-black cursor-pointer disabled:opacity-50"
                style={{ background: "var(--color-primary)" }}
              >
                {connecting ? "Connecting…" : "Connect Wallet"}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}