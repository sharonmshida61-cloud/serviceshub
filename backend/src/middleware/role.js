// Usage: requireRole("ADMIN") or requireRole("ADMIN", "BUSINESS_OWNER")
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    // Support both legacy `role` field and the newer `currentRole`/`roles` fields in the JWT
    const activeRole = req.user.currentRole || req.user.role;
    if (!activeRole || !roles.includes(activeRole)) {
      return res.status(403).json({ error: "Insufficient permissions for this action" });
    }
    next();
  };
}

module.exports = { requireRole };
