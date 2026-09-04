import crypto from "node:crypto";

const COOKIE_NAME = "auto_research_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function secret() {
  return process.env.SESSION_SECRET || "dev-only-insecure-secret";
}

function sign(value) {
  const mac = crypto.createHmac("sha256", secret()).update(value).digest("hex");
  return `${value}.${mac}`;
}

function safeEqual(a = "", b = "") {
  const aBuf = Buffer.from(String(a));
  const bBuf = Buffer.from(String(b));
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function verifySigned(signed) {
  if (!signed) return false;
  const idx = signed.lastIndexOf(".");
  if (idx === -1) return false;
  const value = signed.slice(0, idx);
  const mac = signed.slice(idx + 1);
  const expected = crypto.createHmac("sha256", secret()).update(value).digest("hex");
  return safeEqual(mac, expected);
}

function parseCookies(header) {
  const out = {};
  (header || "").split(";").forEach((part) => {
    const idx = part.indexOf("=");
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(value);
  });
  return out;
}

export function checkLoginCredentials(email, password) {
  return (
    safeEqual(email, process.env.ADMIN_EMAIL || "") &&
    safeEqual(password, process.env.ADMIN_PASSWORD || "")
  );
}

export function createSessionCookie() {
  const value = `ok:${Date.now()}`;
  const signed = sign(value);
  return `${COOKIE_NAME}=${encodeURIComponent(signed)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${MAX_AGE_SECONDS}`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

// Two independent credentials by design: ADMIN_EMAIL/ADMIN_PASSWORD is the
// human login for the browser UI (session cookie); PIPELINE_TOKEN is a
// separate bearer token for the research-pipeline Routine to call the API
// without a browser. Leaking one never exposes the other.
export function isAuthenticated(req) {
  const cookies = parseCookies(req.headers.cookie);
  if (verifySigned(cookies[COOKIE_NAME])) return true;

  const authHeader = req.headers.authorization || "";
  if (authHeader.startsWith("Bearer ")) {
    return safeEqual(authHeader.slice(7), process.env.PIPELINE_TOKEN || "");
  }
  return false;
}
