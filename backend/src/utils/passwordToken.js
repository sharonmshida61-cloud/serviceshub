const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const RESET_TTL_MINUTES = 30;
const ISSUER = "serviceshub:password-reset";

// Derived from JWT_SECRET rather than used directly: a reset link can never be
// replayed as an access token, or the other way round, because the two are
// signed with different keys.
function resetSecret() {
  return crypto.createHmac("sha256", process.env.JWT_SECRET).update(ISSUER).digest("hex");
}

// A short fingerprint of the account's current password hash. Access tokens
// carry it so changing the password retires every session that was issued
// before; reset tokens carry it so a link can only be used once.
function passwordNonce(user) {
  return crypto.createHash("sha256").update(user.passwordHash).digest("hex").slice(0, 16);
}

function signResetToken(user) {
  return jwt.sign({ sub: user.id, nonce: passwordNonce(user) }, resetSecret(), {
    expiresIn: `${RESET_TTL_MINUTES}m`,
    issuer: ISSUER,
  });
}

// Returns the payload, or null for anything expired, tampered or already used.
function readResetToken(token) {
  try {
    return jwt.verify(token, resetSecret(), { algorithms: ["HS256"], issuer: ISSUER });
  } catch (err) {
    return null;
  }
}

function tokenMatchesUser(payload, user) {
  return !!payload && !!user && !user.bannedAt && payload.nonce === passwordNonce(user);
}

module.exports = {
  RESET_TTL_MINUTES,
  passwordNonce,
  signResetToken,
  readResetToken,
  tokenMatchesUser,
};
