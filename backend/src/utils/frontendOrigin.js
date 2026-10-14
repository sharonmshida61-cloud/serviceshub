// Links handed to a user (password resets, team invitations) have to point at the
// deployed SPA, not at this API, so both routes resolve the origin the same way.
function frontendOrigin() {
  const candidates = [process.env.FRONTEND_URL, ...(process.env.CORS_ORIGIN || "").split(",")];
  const match = candidates.map((o) => (o || "").trim().replace(/\/+$/, "")).find((o) => o.startsWith("http"));
  return match || "http://localhost:5173";
}

module.exports = { frontendOrigin };
