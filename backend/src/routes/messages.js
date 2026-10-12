const express = require("express");
const prisma = require("../utils/prisma");
const { requireAuth } = require("../middleware/auth");
const { readCoords } = require("../utils/coords");
const { activeRole, canAccessThread } = require("../utils/threadAccess");
const { assertOwnUpload } = require("../utils/chatMedia");

const router = express.Router();

const MEDIA_KINDS = ["IMAGE", "VIDEO", "AUDIO"];
// WhatsApp's own choices, with the 8-hour option trimmed: a longer share than
// this is a courier, not a customer trying to find the door.
const LIVE_MINUTES = [15, 60];
const LIVE_MESSAGE = "Shared a live location";

// The conversation list can only show a few words, so an attachment gets a
// label instead of the empty string it stores as content.
function snippet(message) {
  if (message.mediaKind === "IMAGE") return "📷 Photo";
  if (message.mediaKind === "VIDEO") return "🎥 Video";
  if (message.mediaKind === "AUDIO") return "🎤 Voice message";
  if (message.liveShareId) return "📍 Live location";
  if (message.latitude !== null && message.latitude !== undefined) return `📍 ${message.locationName || "Location"}`;
  return message.content;
}

const isLive = (share) => !!share && !share.stoppedAt && new Date(share.expiresAt).getTime() > Date.now();

function threadInclude() {
  return {
    // Only what a chat bubble renders — sender rows carry the password hash.
    sender: { select: { id: true, name: true, avatarUrl: true } },
    liveShare: { select: { id: true, latitude: true, longitude: true, accuracy: true, startedAt: true, updatedAt: true, expiresAt: true, stoppedAt: true, startedById: true } },
  };
}

// Conversation list for the logged-in customer: one row per business, newest first.
router.get("/mine", requireAuth, async (req, res) => {
  const messages = await prisma.message.findMany({
    where: { customerId: req.user.id },
    orderBy: { createdAt: "desc" },
    include: { business: { select: { id: true, name: true, city: true } } },
  });

  const threads = new Map();
  for (const m of messages) {
    const existing = threads.get(m.businessId);
    if (existing) {
      existing.messageCount += 1;
      continue;
    }
    threads.set(m.businessId, {
      businessId: m.businessId,
      businessName: m.business.name,
      businessCity: m.business.city,
      lastMessage: snippet(m),
      lastKind: m.mediaKind || (m.liveShareId ? "LIVE" : m.latitude != null ? "PIN" : "TEXT"),
      lastAt: m.createdAt,
      lastFromMe: m.senderId === req.user.id,
      messageCount: 1,
    });
  }
  res.json([...threads.values()]);
});

// Get the message thread between the current user and a business.
// - If called by a customer: businessId identifies the business.
// - If called by an owner/employee: customerId (query param) picks which
//   customer's thread to view.
router.get("/thread/:businessId", requireAuth, async (req, res) => {
  const { businessId } = req.params;
  const customerId = activeRole(req.user) === "CUSTOMER" ? req.user.id : req.query.customerId;
  if (!customerId) return res.status(400).json({ error: "customerId query param is required for staff" });

  const allowed = await canAccessThread(req.user, businessId, customerId);
  if (!allowed) return res.status(403).json({ error: "You cannot view this conversation" });

  const messages = await prisma.message.findMany({
    where: { businessId, customerId },
    orderBy: { createdAt: "asc" },
    include: threadInclude(),
  });
  res.json(messages);
});

// List all conversation threads for a business (owner/employee inbox)
router.get("/business/:businessId/threads", requireAuth, async (req, res) => {
  const { businessId } = req.params;
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return res.status(404).json({ error: "Business not found" });
  const isOwner = business.ownerId === req.user.id;
  const isStaff = !!(await prisma.businessEmployee.findFirst({ where: { businessId, userId: req.user.id, active: true } }));
  if (!isOwner && !isStaff && activeRole(req.user) !== "ADMIN") return res.status(403).json({ error: "Not authorized" });

  const messages = await prisma.message.findMany({ where: { businessId }, orderBy: { createdAt: "desc" } });
  const seen = new Map();
  for (const m of messages) {
    const existing = seen.get(m.customerId);
    if (existing) {
      existing.messageCount += 1;
      continue;
    }
    seen.set(m.customerId, {
      customerId: m.customerId,
      lastMessage: snippet(m),
      lastKind: m.mediaKind || (m.liveShareId ? "LIVE" : m.latitude != null ? "PIN" : "TEXT"),
      lastAt: m.createdAt,
      lastFromMe: m.senderId === req.user.id,
      messageCount: 1,
    });
  }

  // customerId is a bare column, so the names arrive in one lookup rather than
  // leaving the client to display a uuid.
  const people = await prisma.user.findMany({
    where: { id: { in: [...seen.keys()] } },
    select: { id: true, name: true },
  });
  const byId = new Map(people.map((p) => [p.id, p]));
  res.json([...seen.values()].map((t) => ({
    ...t,
    customerName: byId.get(t.customerId)?.name || "Customer",
  })));
});

function parseMedia(req, body) {
  const { mediaKind, mediaUrl, mediaSecs } = body || {};
  if (!mediaKind && !mediaUrl) return {};
  if (!MEDIA_KINDS.includes(mediaKind)) throw new Error("Attachment must be a photo, video or audio clip");
  if (!mediaUrl) throw new Error("Upload the file before sending it");
  assertOwnUpload(req, mediaUrl);
  const seconds = Number(mediaSecs);
  return {
    mediaKind,
    mediaUrl,
    ...(Number.isFinite(seconds) && seconds > 0 ? { mediaSecs: Math.min(Math.round(seconds), 600) } : {}),
  };
}

router.post("/thread/:businessId", requireAuth, async (req, res) => {
  const { businessId } = req.params;
  const { content, bookingId, locationName } = req.body || {};

  let coords;
  let media;
  try {
    coords = readCoords(req.body);
    media = parseMedia(req, req.body);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  const hasPin = coords.latitude !== undefined;
  const hasMedia = !!media.mediaKind;
  // A shared pin or an attachment is a complete message on its own.
  if (!content && !hasPin && !hasMedia) return res.status(400).json({ error: "content is required" });

  const customerId = activeRole(req.user) === "CUSTOMER" ? req.user.id : req.body.customerId;
  if (!customerId) return res.status(400).json({ error: "customerId is required for staff replies" });

  const allowed = await canAccessThread(req.user, businessId, customerId);
  if (!allowed) return res.status(403).json({ error: "You cannot message in this conversation" });

  const message = await prisma.message.create({
    data: {
      businessId,
      customerId,
      senderId: req.user.id,
      content: content || "",
      bookingId: bookingId || null,
      ...coords,
      ...media,
      ...(hasPin && locationName ? { locationName } : {}),
    },
    include: threadInclude(),
  });
  res.status(201).json(message);
});

// ---------------------------------------------------------------------------
// Live location — one share row per session that keeps only the newest fix, so
// the conversation shows a single moving bubble instead of a pin per ping.
// ---------------------------------------------------------------------------

async function startShare(req, res) {
  const { businessId, minutes } = req.body || {};
  const span = LIVE_MINUTES.includes(Number(minutes)) ? Number(minutes) : LIVE_MINUTES[0];
  const customerId = activeRole(req.user) === "CUSTOMER" ? req.user.id : req.body.customerId;
  if (!customerId) return res.status(400).json({ error: "customerId is required for staff" });

  let coords;
  try {
    coords = readCoords(req.body);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  if (coords.latitude === undefined) return res.status(400).json({ error: "A starting position is required" });
  if (!(await canAccessThread(req.user, businessId, customerId))) {
    return res.status(403).json({ error: "You cannot message in this conversation" });
  }

  const expiresAt = new Date(Date.now() + span * 60_000);
  const accuracy = Number(req.body?.accuracy);
  const share = await prisma.liveLocationShare.create({
    data: {
      businessId,
      customerId,
      startedById: req.user.id,
      latitude: coords.latitude,
      longitude: coords.longitude,
      accuracy: Number.isFinite(accuracy) ? accuracy : null,
      expiresAt,
    },
  });
  const message = await prisma.message.create({
    data: { businessId, customerId, senderId: req.user.id, content: LIVE_MESSAGE, liveShareId: share.id },
    include: threadInclude(),
  });
  res.status(201).json({ share, message });
}

async function pingShare(req, res) {
  const share = await prisma.liveLocationShare.findUnique({ where: { id: req.params.id } });
  if (!share) return res.status(404).json({ error: "That live location share no longer exists" });
  if (share.startedById !== req.user.id) return res.status(403).json({ error: "Only the person who started the share can update it" });
  if (!isLive(share)) return res.status(410).json({ error: "That live location share has ended" });

  let coords;
  try {
    coords = readCoords(req.body);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  if (coords.latitude === undefined) return res.status(400).json({ error: "Coordinates are required" });

  const updated = await prisma.liveLocationShare.update({
    where: { id: share.id },
    data: { latitude: coords.latitude, longitude: coords.longitude, accuracy: Number.isFinite(Number(req.body?.accuracy)) ? Number(req.body.accuracy) : null },
  });
  res.json(updated);
}

async function stopShare(req, res) {
  const share = await prisma.liveLocationShare.findUnique({ where: { id: req.params.id } });
  if (!share) return res.status(404).json({ error: "That live location share no longer exists" });
  if (share.startedById !== req.user.id) return res.status(403).json({ error: "Only the person who started the share can stop it" });
  if (share.stoppedAt) return res.json(share);
  res.json(await prisma.liveLocationShare.update({ where: { id: share.id }, data: { stoppedAt: new Date() } }));
}

// After a reload the sender needs to know it is still sharing to show Stop.
async function activeShare(req, res) {
  const { businessId } = req.query;
  if (!businessId) return res.status(400).json({ error: "businessId is required" });
  const share = await prisma.liveLocationShare.findFirst({
    where: { businessId, startedById: req.user.id, stoppedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { startedAt: "desc" },
  });
  res.json(share || null);
}

router.post("/locations/start", requireAuth, startShare);
router.post("/locations/:id/ping", requireAuth, pingShare);
router.post("/locations/:id/stop", requireAuth, stopShare);
router.get("/locations/active", requireAuth, activeShare);

module.exports = router;
