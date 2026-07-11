const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const prisma = require("../utils/prisma");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  phone: z.string().optional(),
  // Users can now register as CUSTOMER and/or BUSINESS_OWNER
  // true = they want this role, false = they don't
  asCustomer: z.boolean().default(true),
  asBusinessOwner: z.boolean().default(false),
});

function signToken(user) {
  const roles = Array.isArray(user.roles) ? user.roles : (typeof user.roles === 'string' ? JSON.parse(user.roles) : [user.role || "CUSTOMER"]);
  const currentRole = user.currentRole || roles[0] || "CUSTOMER";
  return jwt.sign(
    { id: user.id, roles, currentRole, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { name, email, password, phone, asCustomer, asBusinessOwner } = parsed.data;

  if (!asCustomer && !asBusinessOwner) {
    return res.status(400).json({ error: "Must register as either Customer or Business Owner" });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return res.status(409).json({ error: "An account with this email already exists" });

  const passwordHash = await bcrypt.hash(password, 10);
  const roles = [];
  if (asCustomer) roles.push("CUSTOMER");
  if (asBusinessOwner) roles.push("BUSINESS_OWNER");

  const user = await prisma.user.create({
    data: {
      name,
      email,
      phone,
      passwordHash,
      roles: JSON.stringify(roles),
      currentRole: roles[0],
      role: roles[0], // backward compatibility
    },
  });

  const token = signToken(user);
  res.status(201).json({ token, user: sanitize(user) });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(401).json({ error: "Invalid email or password" });

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid email or password" });

  if (user.bannedAt) {
    return res.status(403).json({
      error: "Your account has been suspended",
      reason: user.banReason || "Please contact support for more information.",
    });
  }

  const token = signToken(user);
  res.json({ token, user: sanitize(user) });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: sanitize(user) });
});

// Switch active role (for users with multiple roles)
router.post("/switchRole/:role", requireAuth, async (req, res) => {
  const { role } = req.params;
  const validRoles = ["CUSTOMER", "BUSINESS_OWNER"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: "User not found" });

  const roles = Array.isArray(user.roles) ? user.roles : JSON.parse(user.roles || "[]");
  if (!roles.includes(role)) {
    return res.status(403).json({ error: "User does not have this role" });
  }

  const updated = await prisma.user.update({
    where: { id: req.user.id },
    data: { currentRole: role },
  });

  const token = signToken(updated);
  res.json({ token, user: sanitize(updated) });
});

function sanitize(user) {
  const { passwordHash, ...rest } = user;
  // Parse roles if they're stored as JSON string
  if (typeof rest.roles === 'string') {
    rest.roles = JSON.parse(rest.roles);
  } else if (!Array.isArray(rest.roles)) {
    rest.roles = [rest.role || "CUSTOMER"];
  }
  // Ensure currentRole is set
  if (!rest.currentRole) {
    rest.currentRole = Array.isArray(rest.roles) ? rest.roles[0] : rest.role || "CUSTOMER";
  }
  return rest;
}

module.exports = router;
