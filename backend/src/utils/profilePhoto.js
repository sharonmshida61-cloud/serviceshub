const path = require("path");

// A profile picture is sent by two different routes — attached to a new account
// at sign-up and replaced from the profile editor — so both must enforce the
// same types, size and final URL shape.
const IMAGES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"];
const MAX_BYTES = 5 * 1024 * 1024;

function fileFilter(req, file, cb) {
  if (IMAGES.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Profile pictures must be JPEG, PNG, GIF, WebP or AVIF images"));
}

// Timestamped so a user replacing their picture never overwrites the old file.
function filename(originalName) {
  const ext = path.extname(originalName).toLowerCase();
  return `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
}

function url(req, userId, name) {
  const apiBase = process.env.API_BASE_URL || `${req.protocol}://${req.get("host")}`;
  return `${apiBase.replace(/\/$/, "")}/uploads/avatars/${userId}/${name}`;
}

module.exports = { MAX_BYTES, fileFilter, filename, url };
