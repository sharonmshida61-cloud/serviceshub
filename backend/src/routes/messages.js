const express = require("express");
const prisma = require("../utils/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

async function canAccessThread(user, businessId, customerId) {
  if (user.role === "ADMIN") return true;
  if (user.id === customerId) return true;
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return false;
  if (business.ownerId === user.id) return true;
  const staff = await prisma.businessEmployee.findFirst({ where: { businessId, userId: user.id, active: true } });
  return !!staff;
}

// Get the message thread between the current user and a business.
// - If called by a customer: businessId identifies the business.
// - If called by an owner/employee: customerId (query param) picks which
//   customer's thread to view.
router.get("/thread/:businessId", requireAuth, async (req, res) => {
  const { businessId } = req.params;
  const customerId = req.user.role === "CUSTOMER" ? req.user.id : req.query.customerId;
  if (!customerId) return res.status(400).json({ error: "customerId query param is required for staff" });

  const allowed = await canAccessThread(req.user, businessId, customerId);
  if (!allowed) return res.status(403).json({ error: "You cannot view this conversation" });

  const messages = await prisma.message.findMany({
    where: { businessId, customerId },
    orderBy: { createdAt: "asc" },
    include: { sender: true },
  });
  res.json(messages);
});

// List all conversation threads for a business (owner/employee inbox)
router.get("/business/:businessId/threads", requireAuth, async (req, res) => {
  const { businessId } = req.params;
  const allowed = await canAccessThread(req.user, businessId, "__any__").catch(() => false);
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return res.status(404).json({ error: "Business not found" });
  const isOwner = business.ownerId === req.user.id;
  const isStaff = !!(await prisma.businessEmployee.findFirst({ where: { businessId, userId: req.user.id, active: true } }));
  if (!isOwner && !isStaff && req.user.role !== "ADMIN") return res.status(403).json({ error: "Not authorized" });

  const messages = await prisma.message.findMany({ where: { businessId }, orderBy: { createdAt: "desc" } });
  const seen = new Set();
  const threads = [];
  for (const m of messages) {
    if (seen.has(m.customerId)) continue;
    seen.add(m.customerId);
    threads.push({ customerId: m.customerId, lastMessage: m.content, lastAt: m.createdAt });
  }
  res.json(threads);
});

router.post("/thread/:businessId", requireAuth, async (req, res) => {
  const { businessId } = req.params;
  const { content, bookingId } = req.body || {};
  if (!content) return res.status(400).json({ error: "content is required" });

  const customerId = req.user.role === "CUSTOMER" ? req.user.id : req.body.customerId;
  if (!customerId) return res.status(400).json({ error: "customerId is required for staff replies" });

  const allowed = await canAccessThread(req.user, businessId, customerId);
  if (!allowed) return res.status(403).json({ error: "You cannot message in this conversation" });

  const message = await prisma.message.create({
    data: { businessId, customerId, senderId: req.user.id, content, bookingId: bookingId || null },
    include: { sender: true },
  });
  res.status(201).json(message);
});

module.exports = router;
