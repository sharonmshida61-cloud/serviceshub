const express = require("express");
const prisma = require("../utils/prisma");
const { requireAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");

const router = express.Router();

// Public: list all active categories (for the "browse by category" home page)
router.get("/", async (req, res) => {
  const includeInactive = req.query.all === "true";
  const categories = await prisma.category.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: { name: "asc" },
  });
  res.json(categories.map(withParsedSchema));
});

router.get("/:slug", async (req, res) => {
  const category = await prisma.category.findUnique({ where: { slug: req.params.slug } });
  if (!category) return res.status(404).json({ error: "Category not found" });
  res.json(withParsedSchema(category));
});

// Admin-only: create a brand new business category. This is the mechanism
// that lets the platform grow (e.g. adding "Dog Groomers" or "Pool Cleaners")
// without touching any code — just data.
router.post("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { name, slug, icon, description, attributeSchema } = req.body || {};
  if (!name || !slug) return res.status(400).json({ error: "name and slug are required" });

  try {
    const category = await prisma.category.create({
      data: {
        name,
        slug,
        icon: icon || "sparkles",
        description,
        attributeSchema: JSON.stringify(attributeSchema || []),
      },
    });
    res.status(201).json(withParsedSchema(category));
  } catch (err) {
    if (err.code === "P2002") return res.status(409).json({ error: "A category with this name or slug already exists" });
    throw err;
  }
});

router.patch("/:id", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const { name, icon, description, attributeSchema, active } = req.body || {};
  const category = await prisma.category.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(icon !== undefined && { icon }),
      ...(description !== undefined && { description }),
      ...(attributeSchema !== undefined && { attributeSchema: JSON.stringify(attributeSchema) }),
      ...(active !== undefined && { active }),
    },
  });
  res.json(withParsedSchema(category));
});

function withParsedSchema(category) {
  return { ...category, attributeSchema: JSON.parse(category.attributeSchema || "[]") };
}

module.exports = router;
