const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const INVITE_TTL_DAYS = 7;
const ISSUER = "serviceshub:team-invite";

// Derived from JWT_SECRET rather than used directly, so an invitation link can
// never be replayed as an access token or as a password-reset link.
function inviteSecret() {
  return crypto.createHmac("sha256", process.env.JWT_SECRET).update(ISSUER).digest("hex");
}

function newInviteSeed() {
  return crypto.randomBytes(12).toString("hex");
}

// The seed is the row's current invitation. Asking for a new link stores a new
// seed, which is what retires the QR code and message sent before.
function signInviteToken(employeeId, seed) {
  return jwt.sign({ sub: String(employeeId), sid: seed }, inviteSecret(), {
    expiresIn: `${INVITE_TTL_DAYS}d`,
    issuer: ISSUER,
  });
}

// Returns the payload, or null for anything expired or tampered with.
function readInviteToken(token) {
  try {
    return jwt.verify(token, inviteSecret(), { algorithms: ["HS256"], issuer: ISSUER });
  } catch {
    return null;
  }
}

module.exports = { INVITE_TTL_DAYS, newInviteSeed, signInviteToken, readInviteToken };
