const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Missing auth token" });

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, roles, currentRole, email }

    // Check ban status on every request so a ban takes effect immediately
    // even for users who already have a valid token.
    const dbUser = await prisma.user.findUnique({ where: { id: payload.id }, select: { bannedAt: true, banReason: true } });
    if (dbUser?.bannedAt) {
      return res.status(403).json({
        error: "Your account has been suspended",
        reason: dbUser.banReason || "Please contact support for more information.",
      });
    }

    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
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
