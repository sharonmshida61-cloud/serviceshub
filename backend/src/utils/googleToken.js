const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const CERTS_URL = "https://www.googleapis.com/oauth2/v3/certs";
const KEY_TTL_MS = 60 * 60 * 1000;
const ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

let cached = { at: 0, keys: [] };

async function googleKeys() {
  if (cached.keys.length && Date.now() - cached.at < KEY_TTL_MS) return cached.keys;
  const res = await fetch(CERTS_URL);
  if (!res.ok) throw new Error(`Google keys endpoint returned ${res.status}`);
  const { keys } = await res.json();
  cached = {
    at: Date.now(),
    keys: keys.map((jwk) => ({
      kid: jwk.kid,
      pem: crypto.createPublicKey({ key: jwk, format: "jwk" }).export({ type: "spki", format: "pem" }),
    })),
  };
  return cached.keys;
}

// The browser gets this ID token from Google Identity Services; we check it the
// same way Google's own libraries would before trusting the email inside it.
async function verifyGoogleIdToken(token) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    const err = new Error("Google sign-in is not configured on this server");
    err.status = 503;
    throw err;
  }

  const header = jwt.decode(token, { complete: true });
  if (!header || !header.header.kid) {
    const err = new Error("Unreadable Google credential");
    err.status = 401;
    throw err;
  }

  const key = (await googleKeys()).find((k) => k.kid === header.header.kid);
  if (!key) {
    cached = { at: 0, keys: [] };
    const err = new Error("Unknown Google signing key");
    err.status = 401;
    throw err;
  }

  return jwt.verify(token, key.pem, {
    algorithms: ["RS256"],
    audience: clientId,
    issuer: ISSUERS,
  });
}

module.exports = { verifyGoogleIdToken };
