const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { requireAuth } = require("../middleware/auth");
const prisma = require("../utils/prisma");
const uploadRoot = require("../utils/uploadRoot");
const profilePhoto = require("../utils/profilePhoto");
const chatMedia = require("../utils/chatMedia");
const { activeRole, canAccessThread } = require("../utils/threadAccess");

const router = express.Router();

// ---------------------------------------------------------------------------
// Storage — files land in <uploadRoot>/<businessId>/
// Filenames are timestamped to avoid collisions.
// ---------------------------------------------------------------------------
const storage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(uploadRoot, req.params.businessId || "misc");
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

// Accept images and common video formats only
const ALLOWED_MIME = [
  "image/jpeg", "image/png", "image/gif", "image/webp", "image/avif",
  "video/mp4", "video/webm", "video/quicktime", "video/x-msvideo",
];

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter(req, file, cb) {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only images (JPEG, PNG, GIF, WebP) and videos (MP4, WebM, MOV, AVI) are allowed"));
    }
  },
});

// ---------------------------------------------------------------------------
// POST /api/upload/avatar
// Profile pictures belong to the signed-in user, not to a business, so they
// land in <uploadRoot>/avatars/<userId>.
// ---------------------------------------------------------------------------
const avatarUpload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      const dir = path.join(uploadRoot, "avatars", req.user.id);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename(req, file, cb) {
      cb(null, profilePhoto.filename(file.originalname));
    },
  }),
  limits: { fileSize: profilePhoto.MAX_BYTES },
  fileFilter: profilePhoto.fileFilter,
});

router.post("/avatar", requireAuth, avatarUpload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file received" });
  res.status(201).json({
    url: profilePhoto.url(req, req.user.id, req.file.filename),
    type: "PHOTO",
    filename: req.file.filename,
    size: req.file.size,
  });
});

// ---------------------------------------------------------------------------
// POST /api/upload/chat/:businessId
// Attachments for a conversation. Any participant may send one, so the guard is
// the thread itself (customer, business owner, staff or admin) rather than
// ownership of the business. Field name "file"; staff also send customerId.
// ---------------------------------------------------------------------------
const chatUpload = multer({
  storage: multer.diskStorage({
    destination(req, file, cb) {
      const dir = chatMedia.dirFor(req.params.businessId, req.user.id);
      fs.mkdirSync(dir, { recursive: true });
      cb(null, dir);
    },
    filename(req, file, cb) {
      cb(null, chatMedia.filename(file.originalname));
    },
  }),
  limits: { fileSize: chatMedia.MAX_BYTES },
  fileFilter: chatMedia.fileFilter,
});

router.post("/chat/:businessId", requireAuth, chatUpload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file received" });

  const kind = chatMedia.kindOf(req.file.mimetype);
  // multer caps every chat file at the video ceiling; a document has its own,
  // much smaller one, so it is checked once the bytes are on disk.
  if (kind === "DOCUMENT" && req.file.size > chatMedia.DOCUMENT_MAX_BYTES) {
    fs.rmSync(req.file.path, { force: true });
    return res.status(413).json({ error: "Documents are limited to 10 MB" });
  }

  const customerId = activeRole(req.user) === "CUSTOMER" ? req.user.id : req.body?.customerId;
  const allowed = customerId && (await canAccessThread(req.user, req.params.businessId, customerId));
  if (!allowed) {
    fs.rmSync(req.file.path, { force: true });
    return res.status(403).json({ error: "You cannot send files in this conversation" });
  }

  res.status(201).json({
    url: chatMedia.urlFor(req, req.params.businessId, req.user.id, req.file.filename),
    kind,
    mime: req.file.mimetype,
    name: req.file.originalname,
    size: req.file.size,
  });
});

// ---------------------------------------------------------------------------
// POST /api/upload/:businessId
// Multipart upload — field name "file"
// Returns { url, type } where type is "PHOTO" or "VIDEO"
// ---------------------------------------------------------------------------
router.post("/:businessId", requireAuth, upload.single("file"), async (req, res) => {
  // Verify the requester owns the business
  const business = await prisma.business.findUnique({ where: { id: req.params.businessId } });
  if (!business) return res.status(404).json({ error: "Business not found" });

  const activeRole = req.user.currentRole || req.user.role;
  if (business.ownerId !== req.user.id && activeRole !== "ADMIN") {
    // Remove the uploaded file if auth fails
    if (req.file) fs.unlinkSync(req.file.path);
    return res.status(403).json({ error: "Only the business owner can upload media" });
  }

  if (!req.file) return res.status(400).json({ error: "No file received" });

  const isVideo = req.file.mimetype.startsWith("video/");
  const type = isVideo ? "VIDEO" : "PHOTO";

  // Build the public URL — served at /uploads/<businessId>/<filename>
  const apiBase = process.env.API_BASE_URL || `${req.protocol}://${req.get("host")}`;
  const normalizedApiBase = apiBase.replace(/\/$/, "");
  const url = `${normalizedApiBase}/uploads/${req.params.businessId}/${req.file.filename}`;

  res.status(201).json({ url, type, filename: req.file.filename, size: req.file.size });
});

// Error handler specific to multer (file too large, wrong type, etc.)
router.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "File is too large. Maximum size is 50 MB." });
  }
  if (err.message) {
    return res.status(400).json({ error: err.message });
  }
  next(err);
});

module.exports = router;
