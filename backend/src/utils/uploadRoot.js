const path = require("path");

// Vercel's function filesystem is read-only outside /tmp, so uploads go there
// when running on Vercel. Note: /tmp is per-instance and ephemeral — files do
// not survive cold starts. Set UPLOADS_DIR to override (e.g. a mounted volume).
module.exports =
  process.env.UPLOADS_DIR || (process.env.VERCEL ? "/tmp/uploads" : path.join(__dirname, "../../uploads"));
