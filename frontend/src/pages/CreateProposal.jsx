import { useState, useEffect, useRef } from "react";
import { ethers } from "ethers";
import { toast } from "react-hot-toast";
import { useWeb3 } from "../context/Web3Context";
import { useNavigate, Link } from "react-router-dom";
import { uploadFileToPinata, uploadJSONToPinata } from "../utils/pinata";
import { CONTRACTS } from "../config";

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
      <label
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: "10px",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#666",
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        {label}
        {required && (
          <span
            style={{
              color: "var(--color-primary, #F59E0B)",
              fontSize: "14px",
              lineHeight: 1,
            }}
          >
            *
          </span>
        )}
      </label>
      {children}
      {hint && (
        <p
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "10px",
            color: "#444",
            margin: 0,
            lineHeight: 1.7,
          }}
        >
          {hint}
        </p>
      )}
    </div>
  );
}

/* ─── Styled inputs ─── */
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
      style={{
        ...fieldBase,
        fontFamily: mono ? "'Space Mono', monospace" : "inherit",
        ...props.style,
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "rgba(245,158,11,0.4)";
        e.currentTarget.style.background = "rgba(245,158,11,0.03)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
      }}
    />
  );
}

function StyledSelect({ mono = true, ...props }) {
  return (
    <select
      {...props}
      style={{
        ...fieldBase,
        fontFamily: mono ? "'Space Mono', monospace" : "inherit",
        cursor: "pointer",
        appearance: "none", // Removes default OS arrow
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23666666'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "right 12px center",
        backgroundSize: "14px",
        paddingRight: "40px",
        ...props.style,
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "rgba(245,158,11,0.4)";
        e.currentTarget.style.background = "rgba(245,158,11,0.03)";
        e.currentTarget.style.backgroundImage = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23F59E0B'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`;
        e.currentTarget.style.backgroundRepeat = "no-repeat";
        e.currentTarget.style.backgroundPosition = "right 12px center";
        e.currentTarget.style.backgroundSize = "14px";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
        e.currentTarget.style.backgroundImage = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23666666'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`;
        e.currentTarget.style.backgroundRepeat = "no-repeat";
        e.currentTarget.style.backgroundPosition = "right 12px center";
        e.currentTarget.style.backgroundSize = "14px";
      }}
    >
      {props.children}
    </select>
  );
}

function StyledTextarea(props) {
  return (
    <textarea
      {...props}
      style={{
        ...fieldBase,
        resize: "none",
        fontFamily: "inherit",
        fontSize: "13.5px",
        lineHeight: 1.7,
        ...props.style,
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "rgba(245,158,11,0.4)";
        e.currentTarget.style.background = "rgba(245,158,11,0.03)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
        e.currentTarget.style.background = "rgba(255,255,255,0.03)";
      }}
    />
  );
}

/* ─── Summary row ─── */
function SummaryRow({ label, value, mono = false }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        padding: "10px 0",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
        gap: "16px",
      }}
    >
      <span
        style={{
          fontFamily: "'Space Mono', monospace",
          fontSize: "10px",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#555",
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: mono ? "'Space Mono', monospace" : "inherit",
          fontSize: mono ? "11px" : "13px",
          color: "#aaa",
          textAlign: "right",
          wordBreak: "break-all",
        }}
      >
        {value}
      </span>
    </div>
  );
}

// 🔥 UPDATE THESE WITH YOUR NEWLY DEPLOYED ADDRESSES
// const SYSTEM_ADDRESSES = {
//   treasury: "0xc3e53F4d16Ae77Db1c982e75a937B9f60FE63690", // Replace with your actual Treasury address
//   dgtToken: "0x5FbDB2315678afecb367f032d93F642f64180aa3", // Replace with your actual Token address
// };

export default function CreateProposal() {
  useSharedFonts();

  const { account, daoContract, tokenBalance } = useWeb3();
  const navigate = useNavigate();

  // Action Builder State
  const [actionType, setActionType] = useState("sendFunds");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");

  // Custom Fallback State
  const [target, setTarget] = useState("");
  const [calldata, setCalldata] = useState("0x");

  // General Proposal State
  const [votingDelay, setVotingDelay] = useState(0);
  const [votingPeriod, setVotingPeriod] = useState(86400);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadStep, setUploadStep] = useState("");
  const [step, setStep] = useState(1);
  const fileInputRef = useRef(null);

  const fileToBase64 = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024)
      return toast.error("Image must be under 10 MB");
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const validateStep1 = () => {
    if (!title) return toast.error("Please provide a title");

    if (actionType === "sendFunds") {
      if (!ethers.isAddress(recipient))
        return toast.error("Invalid recipient address");
      if (!amount || isNaN(amount) || Number(amount) <= 0)
        return toast.error("Please enter a valid amount");
    } else {
      if (!ethers.isAddress(target))
        return toast.error("Invalid target address");
      if (!calldata.startsWith("0x"))
        return toast.error("Calldata must start with 0x");
    }

    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!account) return toast.error("Connect wallet first");
    if (!daoContract) return toast.error("Contract not loaded");
    if (Number(votingPeriod) <= 0)
      return toast.error("Voting period must be > 0");
    if (parseFloat(tokenBalance) < 10) {
      return toast.error("You need at least 10 DGT to create a proposal.");
    }
    
    setLoading(true);
    try {
      // ── Determine Target & Calldata based on selected Action ──
      let finalTarget = target;
      let finalCalldata = calldata;

      if (actionType === "sendFunds") {
        // 🔥 NOW READING DIRECTLY FROM YOUR CONFIG.JS 🔥
        finalTarget = CONTRACTS.Treasury;

        const iface = new ethers.Interface([
          "function withdrawERC20(address token, address to, uint256 amount)",
        ]);

        finalCalldata = iface.encodeFunctionData("withdrawERC20", [
          CONTRACTS.MintableToken, // 🔥 NOW READING DIRECTLY FROM CONFIG.JS 🔥
          recipient,
          ethers.parseEther(amount.toString()),
        ]);
      }

      // ── Step 1: Upload image to IPFS ──
      let imageCid = null;
      let imageBase64 = null;
      if (imageFile) {
        setUploadStep("Uploading image to IPFS…");
        toast.loading("Uploading image…", { id: "create" });
        imageBase64 = await fileToBase64(imageFile);
        imageCid = await uploadFileToPinata(imageFile);
        try {
          localStorage.setItem(`dao_ipfs_img_${imageCid}`, imageBase64);
        } catch {}
      }

      // ── Step 2: Upload metadata JSON to IPFS ──
      setUploadStep("Uploading metadata to IPFS…");
      toast.loading("Uploading metadata…", { id: "create" });
      const metadata = {
        title: title || "Untitled Proposal",
        description: description || "",
        image: imageCid ? `ipfs://${imageCid}` : null,
        author: account,
        createdAt: Math.floor(Date.now() / 1000),
      };
      const metadataCid = await uploadJSONToPinata(metadata);
      const ipfsDescription = `ipfs://${metadataCid}`;

      // ── Step 3: Submit on-chain ──
      setUploadStep("Submitting to blockchain…");
      toast.loading("Creating proposal…", { id: "create" });
      const tx = await daoContract.createProposal(
        finalTarget,
        finalCalldata,
        Number(votingDelay),
        Number(votingPeriod),
        ipfsDescription,
      );

      const receipt = await tx.wait();

      const event = receipt.logs
        .map((log) => {
          try {
            return daoContract.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find((e) => e?.name === "ProposalCreated");

      const proposalId = event ? event.args.id.toString() : "?";
      toast.success(`Proposal #${proposalId} created!`, { id: "create" });
      navigate(`/proposal/${proposalId}`);
    } catch (err) {
      toast.error(err?.reason || err?.message || "Failed to create proposal", {
        id: "create",
      });
    } finally {
      setLoading(false);
      setUploadStep("");
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
    <div
      style={{
        maxWidth: "640px",
        margin: "80px auto 64px",
        padding: "0 clamp(16px, 4vw, 32px)",
        position: "relative",
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: "fixed",
          top: "20%",
          right: "-10%",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background: "rgba(245,158,11,0.06)",
          filter: "blur(80px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Back link */}
      <div className="dgt-fade-up">
        <Link
          to="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            fontFamily: "'Space Mono', monospace",
            fontSize: "10px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#444",
            textDecoration: "none",
            marginBottom: "40px",
            transition: "color 0.2s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#888")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#444")}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Dashboard
        </Link>
      </div>

      {/* Header */}
      <div className="dgt-fade-up-d1" style={{ marginBottom: "40px" }}>
        <span
          style={{
            fontFamily: "'Space Mono', monospace",
            fontSize: "10px",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--color-primary, #F59E0B)",
            display: "block",
            marginBottom: "10px",
          }}
        >
          Governance
        </span>
        <h1
          style={{
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: "clamp(2rem, 5vw, 3rem)",
            fontWeight: 600,
            letterSpacing: "-0.02em",
            margin: "0 0 10px",
            lineHeight: 1.1,
          }}
        >
          Create{" "}
          <em
            style={{
              fontStyle: "italic",
              color: "var(--color-primary, #F59E0B)",
            }}
          >
            Proposal
          </em>
        </h1>
        <p
          style={{
            fontSize: "14px",
            color: "#555",
            margin: 0,
            lineHeight: 1.7,
          }}
        >
          Submit a governance proposal for the Organisation to review and vote
          on.
        </p>
      </div>

      {/* Step indicator */}
      <div
        className="dgt-fade-up-d2"
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: "0",
          marginBottom: "48px",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "10px",
          overflow: "hidden",
        }}
      >
        {[
          { n: 1, label: "Details" },
          { n: 2, label: "Configuration" },
        ].map(({ n, label }, i) => (
          <div
            key={n}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "14px 20px",
              background:
                step >= n ? "rgba(245,158,11,0.06)" : "rgba(0,0,0,0.2)",
              borderRight:
                i === 0 ? "1px solid rgba(255,255,255,0.06)" : "none",
              transition: "background 0.3s ease",
            }}
          >
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "'Space Mono', monospace",
                fontSize: "10px",
                background:
                  step >= n
                    ? "var(--color-primary, #F59E0B)"
                    : "rgba(255,255,255,0.06)",
                color: step >= n ? "#000" : "#444",
                fontWeight: 700,
                flexShrink: 0,
                transition: "background 0.3s ease, color 0.3s ease",
              }}
            >
              {n}
            </div>
            <span
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "10px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: step >= n ? "#ccc" : "#444",
                transition: "color 0.3s ease",
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {step === 1 ? (
          <div
            className="dgt-fade-up-d2"
            style={{ display: "flex", flexDirection: "column", gap: "28px" }}
          >
            <Field
              label="Action Type"
              required
              hint="What do you want this proposal to do?"
            >
              <StyledSelect
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
              >
                <option
                  value="sendFunds"
                  style={{ background: "#111", color: "#ccc" }}
                >
                  Send Treasury Funds
                </option>
                <option
                  value="custom"
                  style={{ background: "#111", color: "#ccc" }}
                >
                  Expert / Custom Calldata
                </option>
              </StyledSelect>
            </Field>

            <Field
              label="Title"
              required
              hint="A short, clear title for this proposal."
            >
              <StyledInput
                type="text"
                mono={false}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Fund the developer grants program"
              />
            </Field>

            {/* ACTION SPECIFIC FIELDS */}
            {actionType === "sendFunds" ? (
              <>
                <Field
                  label="Recipient Address"
                  required
                  hint="The wallet address receiving the tokens."
                >
                  <StyledInput
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder="0x..."
                  />
                </Field>
                <Field
                  label="Amount (DGT)"
                  required
                  hint="How many DGT tokens to send."
                >
                  <StyledInput
                    type="number"
                    min="0"
                    step="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 69"
                  />
                </Field>
              </>
            ) : (
              <>
                <Field
                  label="Target Address"
                  required
                  hint="The contract address this proposal will call on execution."
                >
                  <StyledInput
                    type="text"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder="0x0000000000000000000000000000000000000000"
                  />
                </Field>

                <Field
                  label="Calldata"
                  hint="Encoded function call data. Use 0x for no calldata."
                >
                  <StyledInput
                    type="text"
                    value={calldata}
                    onChange={(e) => setCalldata(e.target.value)}
                    placeholder="0x"
                  />
                </Field>
              </>
            )}

            <Field
              label="Description"
              hint="Stored on IPFS. Describe what this proposal does and why it matters."
            >
              <StyledTextarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Describe what this proposal does, why it matters, and what the expected outcome is…"
              />
            </Field>

            <Field
              label="Cover Image"
              hint="Optional. Upload an image to be stored on IPFS alongside your proposal."
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ display: "none" }}
              />
              {imagePreview ? (
                <div style={{ position: "relative" }}>
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{
                      width: "100%",
                      maxHeight: "180px",
                      objectFit: "cover",
                      borderRadius: "8px",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                      fileInputRef.current.value = "";
                    }}
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      background: "rgba(0,0,0,0.6)",
                      border: "none",
                      borderRadius: "50%",
                      width: "28px",
                      height: "28px",
                      cursor: "pointer",
                      color: "#fff",
                      fontSize: "14px",
                      lineHeight: "28px",
                      textAlign: "center",
                    }}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  style={{
                    ...fieldBase,
                    textAlign: "center",
                    cursor: "pointer",
                    padding: "28px 16px",
                    border: "1px dashed rgba(255,255,255,0.12)",
                    color: "#555",
                    fontSize: "12px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "8px",
                    transition: "border-color 0.2s, color 0.2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "rgba(245,158,11,0.4)";
                    e.currentTarget.style.color = "#aaa";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor =
                      "rgba(255,255,255,0.12)";
                    e.currentTarget.style.color = "#555";
                  }}
                >
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="3" />
                    <circle cx="8.5" cy="8.5" r="1.5" />
                    <path d="M21 15l-5-5L5 21" />
                  </svg>
                  Click to upload image
                  <span style={{ fontSize: "10px", color: "#444" }}>
                    PNG, JPG, GIF up to 10MB
                  </span>
                </button>
              )}
            </Field>

            {/* Divider */}
            <div
              style={{ height: "1px", background: "rgba(255,255,255,0.05)" }}
            />

            <button
              type="button"
              onClick={validateStep1}
              style={{
                padding: "15px 32px",
                borderRadius: "8px",
                border: "none",
                background: "var(--color-primary, #F59E0B)",
                color: "#000",
                fontFamily: "'Space Mono', monospace",
                fontSize: "11px",
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "opacity 0.2s, transform 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = "0.88";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = "1";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Continue to Configuration →
            </button>
          </div>
        ) : (
          <div
            className="dgt-fade-up"
            style={{ display: "flex", flexDirection: "column", gap: "28px" }}
          >
            <Field
              label="Voting Delay"
              hint="Seconds before voting opens. Use 0 for an immediate start."
            >
              <StyledInput
                type="number"
                min={0}
                value={votingDelay}
                onChange={(e) => setVotingDelay(e.target.value)}
              />
            </Field>

            <Field
              label="Voting Period"
              required
              hint="Duration the vote is open, in seconds."
            >
              <StyledInput
                type="number"
                min={1}
                value={votingPeriod}
                onChange={(e) => setVotingPeriod(e.target.value)}
              />
              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                  marginTop: "4px",
                }}
              >
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
                        border: active
                          ? "1px solid rgba(245,158,11,0.4)"
                          : "1px solid rgba(255,255,255,0.07)",
                        background: active
                          ? "rgba(245,158,11,0.08)"
                          : "transparent",
                        color: active
                          ? "var(--color-primary, #F59E0B)"
                          : "#555",
                        fontFamily: "'Space Mono', monospace",
                        fontSize: "10px",
                        letterSpacing: "0.08em",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        if (!active) e.currentTarget.style.color = "#aaa";
                      }}
                      onMouseLeave={(e) => {
                        if (!active) e.currentTarget.style.color = "#555";
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </Field>

            {/* Summary panel */}
            <div
              style={{
                background: "rgba(255,255,255,0.02)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "10px",
                padding: "20px 24px",
              }}
            >
              <span
                style={{
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "9px",
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "#444",
                  display: "block",
                  marginBottom: "4px",
                }}
              >
                Proposal Summary
              </span>

              {actionType === "sendFunds" ? (
                <>
                  <SummaryRow
                    label="Action"
                    value="Send Treasury Funds"
                    mono={false}
                  />
                  <SummaryRow label="Recipient" value={recipient || "—"} mono />
                  <SummaryRow
                    label="Amount"
                    value={`${amount || "0"} DGT`}
                    mono={false}
                  />
                </>
              ) : (
                <>
                  <SummaryRow label="Target" value={target || "—"} mono />
                  <SummaryRow
                    label="Calldata"
                    value={
                      calldata.length > 20
                        ? calldata.slice(0, 20) + "…"
                        : calldata
                    }
                    mono
                  />
                </>
              )}

              <SummaryRow
                label="Voting Starts"
                value={
                  votingDelay === 0 || votingDelay === "0"
                    ? "Immediately"
                    : `After ${formatPeriod(votingDelay)}`
                }
              />
              <SummaryRow
                label="Voting Duration"
                value={`${Number(votingPeriod).toLocaleString()}s (${formatPeriod(votingPeriod)})`}
              />
              <div style={{ padding: "10px 0 0" }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "10px",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "#555",
                    }}
                  >
                    Quorum Required
                  </span>
                  <span
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "10px",
                      color: "var(--color-primary, #F59E0B)",
                      padding: "3px 10px",
                      borderRadius: "100px",
                      background: "rgba(245,158,11,0.08)",
                      border: "1px solid rgba(245,158,11,0.2)",
                    }}
                  >
                    30% of snapshot supply
                  </span>
                </div>
              </div>
            </div>

            {!account && (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: "8px",
                  background: "rgba(245,158,11,0.06)",
                  border: "1px solid rgba(245,158,11,0.15)",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "11px",
                  color: "var(--color-primary, #F59E0B)",
                  textAlign: "center",
                }}
              >
                Connect your wallet to submit a proposal
              </div>
            )}

            <div style={{ display: "flex", gap: "12px" }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  flex: "0 0 auto",
                  padding: "15px 24px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "transparent",
                  color: "#666",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "11px",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.16)";
                  e.currentTarget.style.color = "#aaa";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
                  e.currentTarget.style.color = "#666";
                }}
              >
                ← Back
              </button>

              <button
                type="submit"
                disabled={loading || !account}
                style={{
                  flex: 1,
                  padding: "15px 32px",
                  borderRadius: "8px",
                  border: "none",
                  background:
                    loading || !account
                      ? "rgba(245,158,11,0.3)"
                      : "var(--color-primary, #F59E0B)",
                  color: loading || !account ? "rgba(0,0,0,0.5)" : "#000",
                  fontFamily: "'Space Mono', monospace",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  cursor: loading || !account ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                }}
                onMouseEnter={(e) => {
                  if (!loading && account) {
                    e.currentTarget.style.opacity = "0.88";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = "1";
                  e.currentTarget.style.transform = "translateY(0)";
                }}
              >
                {loading ? (
                  <>
                    <span
                      style={{
                        width: "14px",
                        height: "14px",
                        border: "2px solid rgba(0,0,0,0.2)",
                        borderTopColor: "#000",
                        borderRadius: "50%",
                        animation: "spin 0.7s linear infinite",
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                    />
                    {uploadStep || "Submitting…"}
                  </>
                ) : (
                  "Submit Proposal"
                )}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
