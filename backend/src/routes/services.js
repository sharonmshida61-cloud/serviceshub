const express = require("express");
const prisma = require("../utils/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

function parse(service) {
  return { ...service, attributes: JSON.parse(service.attributes || "{}") };
}

async function assertOwnerOrAdmin(req, res, businessId) {
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) {
    res.status(404).json({ error: "Business not found" });
    return null;
  }
  if (business.ownerId !== req.user.id && req.user.role !== "ADMIN") {
    res.status(403).json({ error: "Only the business owner can manage services" });
    return null;
  }
  return business;
}

router.get("/business/:businessId", async (req, res) => {
  const services = await prisma.service.findMany({
    where: { businessId: req.params.businessId, active: true },
  });
  res.json(services.map(parse));
});

router.post("/", requireAuth, async (req, res) => {
  const { businessId, name, description, priceCents, durationMinutes, attributes } = req.body || {};
  if (!businessId || !name || priceCents == null) {
    return res.status(400).json({ error: "businessId, name and priceCents are required" });
  }
  const business = await assertOwnerOrAdmin(req, res, businessId);
  if (!business) return;

  const service = await prisma.service.create({
    data: {
      businessId,
      categoryId: business.categoryId,
      name,
      description,
      priceCents,
      durationMinutes: durationMinutes || 60,
      attributes: JSON.stringify(attributes || {}),
    },
  });
  res.status(201).json(parse(service));
});

router.patch("/:id", requireAuth, async (req, res) => {
  const service = await prisma.service.findUnique({ where: { id: req.params.id } });
  if (!service) return res.status(404).json({ error: "Service not found" });
  const business = await assertOwnerOrAdmin(req, res, service.businessId);
  if (!business) return;

  const { name, description, priceCents, durationMinutes, attributes, active } = req.body || {};
  const updated = await prisma.service.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(priceCents !== undefined && { priceCents }),
      ...(durationMinutes !== undefined && { durationMinutes }),
      ...(attributes !== undefined && { attributes: JSON.stringify(attributes) }),
      ...(active !== undefined && { active }),
    },
  });
  res.json(parse(updated));
});

router.delete("/:id", requireAuth, async (req, res) => {
  const service = await prisma.service.findUnique({ where: { id: req.params.id } });
  if (!service) return res.status(404).json({ error: "Service not found" });
  const business = await assertOwnerOrAdmin(req, res, service.businessId);
  if (!business) return;

  await prisma.service.update({ where: { id: req.params.id }, data: { active: false } });
  res.status(204).end();
});

module.exports = router;
