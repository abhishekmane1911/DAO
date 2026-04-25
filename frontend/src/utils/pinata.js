/**
 * pinata.js — IPFS upload utilities using Pinata REST API
 *
 * Strategy for reading metadata:
 *   1. Check localStorage cache first (populated at upload time, works offline/behind proxies)
 *   2. Fallback to IPFS gateway fetch (may fail if network blocks external SSL)
 *   3. Return null silently on failure — UI degrades gracefully
 */

const JWT     = import.meta.env.VITE_PINATA_JWT;
const GATEWAY = import.meta.env.VITE_PINATA_GATEWAY || "https://ipfs.io";

const LS_PREFIX = "dao_ipfs_meta_";

/* ─── Local cache helpers ─── */

/** Save metadata to localStorage keyed by CID. Called right after upload. */
export function cacheMetadataLocally(cid, metadata) {
  try {
    localStorage.setItem(`${LS_PREFIX}${cid}`, JSON.stringify(metadata));
  } catch { /* quota exceeded or private mode — silently skip */ }
}

/** Read metadata from localStorage by CID. Returns null if not found. */
function getLocalMetadata(cid) {
  try {
    const raw = localStorage.getItem(`${LS_PREFIX}${cid}`);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/* ─── Upload helpers ─── */

/**
 * Upload a raw File object to IPFS via Pinata.
 * Returns the IPFS CID string.
 */
export async function uploadFileToPinata(file) {
  if (!JWT) throw new Error("Pinata JWT not set in .env (VITE_PINATA_JWT)");

  const formData = new FormData();
  formData.append("file", file);
  formData.append(
    "pinataMetadata",
    JSON.stringify({ name: `dao-${file.name}-${Date.now()}` })
  );
  formData.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

  const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: { Authorization: `Bearer ${JWT}` },
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Pinata file upload failed: ${errText}`);
  }

  const data = await res.json();
  return data.IpfsHash; // CID
}

/**
 * Upload a JSON metadata object to IPFS via Pinata.
 * Returns the IPFS CID string, and caches metadata locally.
 */
export async function uploadJSONToPinata(json) {
  if (!JWT) throw new Error("Pinata JWT not set in .env (VITE_PINATA_JWT)");

  const res = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${JWT}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      pinataContent: json,
      pinataMetadata: { name: `dao-proposal-${Date.now()}` },
      pinataOptions: { cidVersion: 1 },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Pinata JSON upload failed: ${errText}`);
  }

  const data = await res.json();
  const cid = data.IpfsHash;

  // 🔑 Cache locally so reading works even if IPFS gateway is blocked
  cacheMetadataLocally(cid, json);

  return cid;
}

/* ─── Read helpers ─── */

/**
 * Resolve an IPFS URI or CID to a displayable URL.
 * Priority: localStorage image cache → IPFS gateway URL
 */
export function resolveIPFS(cidOrUri) {
  if (!cidOrUri) return null;
  if (cidOrUri.startsWith("http") || cidOrUri.startsWith("blob:") || cidOrUri.startsWith("data:")) return cidOrUri;
  const cid = cidOrUri.replace("ipfs://", "");
  // Check if we cached the image locally (set at upload time)
  try {
    const cached = localStorage.getItem(`dao_ipfs_img_${cid}`);
    if (cached) return cached;
  } catch { /* ignore */ }
  return `${GATEWAY}/ipfs/${cid}`;
}

/**
 * Fetch and parse proposal metadata.
 * Priority: localStorage cache → IPFS gateway → null
 */
export async function fetchProposalMetadata(description) {
  if (!description) return null;

  // Must look like an IPFS CID (not plain text or "0x")
  const cid = description.replace("ipfs://", "");
  if (!cid || cid.length < 20 || cid === "0x") return null;

  // 1️⃣ localStorage cache — instant, works even if network is blocked
  const cached = getLocalMetadata(cid);
  if (cached) return cached;

  // 2️⃣ Try IPFS gateway — silently return null on any failure
  try {
    const url = resolveIPFS(cid);
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return null;
    const json = await res.json();
    // Cache the successful result for next time
    cacheMetadataLocally(cid, json);
    return json;
  } catch {
    // Network blocked / cert error / timeout — fail silently
    return null;
  }
}
