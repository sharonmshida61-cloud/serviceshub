const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { passwordNonce } = require("../utils/passwordToken");
const prisma = new PrismaClient();

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing auth token" });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }

  req.user = payload; // { id, roles, currentRole, email, nonce }

  // The account is re-read on every request so a ban takes effect immediately
  // even for users who already hold a valid token — and so does the password:
  // a token carries a fingerprint of the hash it was issued against, so
  // resetting or changing the password retires every older session at once.
  // A failed lookup must not answer 401: the client ends the session on that.
  try {
    const dbUser = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { bannedAt: true, banReason: true, passwordHash: true },
    });
    if (!dbUser) {
      return res.status(401).json({ error: "This account no longer exists" });
    }
    if (dbUser.bannedAt) {
      return res.status(403).json({
        error: "Your account has been suspended",
        reason: dbUser.banReason || "Please contact support for more information.",
      });
    }
    if (payload.nonce !== passwordNonce(dbUser)) {
      return res.status(401).json({
        error: "Your password was changed, so this session has ended. Please sign in again.",
      });
    }
  } catch (err) {
    console.error("[auth] account lookup failed", err?.code || err?.message || err);
    return res.status(503).json({ error: "Could not check your session. Please try again." });
  }

  next();
}

// Optional auth: attaches req.user if a valid token is present, but does not
// reject the request if it's missing. Useful for public routes that behave
// slightly differently for logged-in users (e.g. showing "already booked").
function optionalAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next();
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    // ignore invalid token, treat as anonymous
  }
  next();
}

module.exports = { requireAuth, optionalAuth };
