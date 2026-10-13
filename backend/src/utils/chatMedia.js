const path = require("path");
const uploadRoot = require("./uploadRoot");

// Chat attachments come from both sides of a conversation and are only ever
// read back through a message row, so they keep their real mime family rather
// than the PHOTO/VIDEO split the portfolio uploader uses.
const IMAGES = ["image/jpeg", "image/png", "image/gif", "image/webp", "image/avif"];
const VIDEOS = ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo"];
const AUDIOS = ["audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav", "audio/x-wav", "audio/aac"];
// Office documents, PDFs and plain text. No archives: a zip in a support chat is
// a malware delivery route, not a quotation.
const DOCUMENTS = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/rtf",
  "text/rtf",
  "text/plain",
  "text/csv",
];
const ALLOWED = [...IMAGES, ...VIDEOS, ...AUDIOS, ...DOCUMENTS];

// A phone voice note is a few hundred KB; the 50 MB ceiling is for the video a
// customer films on site.
const MAX_BYTES = 50 * 1024 * 1024;
// Nobody sends a 50 MB invoice, and a document is the one attachment nobody
// previews, so an oversized one is a download nobody asked for.
const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

const baseMime = (mimetype) => String(mimetype || "").split(";")[0].trim().toLowerCase();

const kindOf = (mimetype) => {
  const mime = baseMime(mimetype);
  if (IMAGES.includes(mime)) return "IMAGE";
  if (VIDEOS.includes(mime)) return "VIDEO";
  if (AUDIOS.includes(mime)) return "AUDIO";
  if (DOCUMENTS.includes(mime)) return "DOCUMENT";
  return null;
};

function fileFilter(req, file, cb) {
  if (kindOf(file.mimetype)) cb(null, true);
  else cb(new Error("Chat attachments must be a photo, video, audio clip or document"));
}

// Grouped by thread participant so one person's uploads never mix with the
// other side's, and both are known before the first byte is written.
function dirFor(businessId, userId) {
  return path.join(uploadRoot, "chat", businessId, userId);
}

function filename(originalName) {
  const ext = path.extname(originalName || "").toLowerCase().slice(0, 10);
  return `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
}

function urlFor(req, businessId, userId, name) {
  const apiBase = process.env.API_BASE_URL || `${req.protocol}://${req.get("host")}`;
  return `${apiBase.replace(/\/$/, "")}/uploads/chat/${businessId}/${userId}/${name}`;
}

// Stickers ship with the app instead of being uploaded, so a sticker message
// points at one bundled asset path and nothing else can.
const STICKER_PATH = /^\/stickers\/[a-z0-9][a-z0-9-]{0,40}\.(png|svg)$/i;
const isBundledSticker = (url) => typeof url === "string" && STICKER_PATH.test(url);

// The name a document shows is whatever the sender's file system called it, so
// it loses path separators and control characters before it is stored.
function displayName(name) {
  const clean = String(name || "")
    .replace(/[\\/\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 120);
  return clean || "Document";
}

// A message must never point at somebody's arbitrary URL — that would turn the
// chat into a tracking pixel and a video player for whatever the sender hosts.
function assertOwnUpload(req, url) {
  if (typeof url !== "string" || !url) throw new Error("Attachment URL is required");
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Attachment URL is not valid");
  }
  if (!/^https?:$/.test(parsed.protocol)) throw new Error("Attachment URL must be http or https");
  if (!parsed.pathname.startsWith("/uploads/chat/")) throw new Error("That attachment was not uploaded to this chat");
  const hosts = new Set([req.get("host")]);
  if (process.env.API_BASE_URL) {
    try {
      hosts.add(new URL(process.env.API_BASE_URL).host);
    } catch {
      /* a malformed base URL simply means we trust the request host */
    }
  }
  if (!hosts.has(parsed.host)) throw new Error("Attachment must be hosted by this server");
  return parsed.pathname;
}

module.exports = {
  ALLOWED, MAX_BYTES, DOCUMENT_MAX_BYTES,
  kindOf, fileFilter, dirFor, filename, urlFor, assertOwnUpload,
  isBundledSticker, displayName,
};
