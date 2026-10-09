const express = require("express");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { z } = require("zod");
const prisma = require("../utils/prisma");
const uploadRoot = require("../utils/uploadRoot");
const profilePhoto = require("../utils/profilePhoto");
const { requireAuth } = require("../middleware/auth");
const { verifyGoogleIdToken } = require("../utils/googleToken");
const { sendEmail, emailConfigured } = require("../utils/mailer");
const { resetEmail } = require("../utils/resetEmail");
const {
  RESET_TTL_MINUTES,
  passwordNonce,
  signResetToken,
  readResetToken,
  tokenMatchesUser,
} = require("../utils/passwordToken");

const router = express.Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  // Owners are contacted about bookings by phone, so it is collected on both
  // forms rather than left to the profile editor.
  phone: z
    .string({
      required_error: "Phone number is required",
      invalid_type_error: "Phone number is required",
    })
    .trim()
    .min(7, "Enter a valid phone number")
    .max(30, "That phone number looks too long"),
  nationality: z.string().trim().max(60).optional(),
  // One account type per signup: a customer books services, an owner lists
  // them. ADMIN and EMPLOYEE accounts are created by the platform, never
  // self-served.
  role: z.enum(["CUSTOMER", "BUSINESS_OWNER"]),
  business: z
    .object({
      name: z.string().min(2),
      categorySlug: z.string().min(1),
      city: z.string().optional(),
    })
    .optional(),
});

function signToken(user, remember = true) {
  const roles = Array.isArray(user.roles) ? user.roles : (typeof user.roles === 'string' ? JSON.parse(user.roles) : [user.role || "CUSTOMER"]);
  const currentRole = user.currentRole || roles[0] || "CUSTOMER";
  return jwt.sign(
    { id: user.id, roles, currentRole, email: user.email, name: user.name, nonce: passwordNonce(user) },
    process.env.JWT_SECRET,
    // An unchecked "remember me" should die with the browser session, so the
    // token itself expires soon as well as being stored only in sessionStorage.
    { expiresIn: remember === false ? "12h" : "7d" }
  );
}

const registerUpload = multer({
  // The picture cannot be stored until the account exists, so it is buffered and
  // written after the insert rather than streamed to disk first.
  storage: multer.memoryStorage(),
  limits: { fileSize: profilePhoto.MAX_BYTES },
  fileFilter: profilePhoto.fileFilter,
}).single("file");

function withProfilePhoto(req, res, next) {
  registerUpload(req, res, (err) => {
    if (!err) return next();
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "That photo is too large. Maximum size is 5 MB." });
    }
    res.status(400).json({ error: err.message || "Could not read the uploaded photo" });
  });
}

function registerInput(req) {
  const input = { ...(req.body || {}) };
  // Multipart fields are always strings, so an owner's business details arrive
  // as the JSON the form appended.
  if (typeof input.business === "string") {
    try {
      input.business = JSON.parse(input.business);
    } catch (e) {
      input.business = null;
    }
  }
  return input;
}

router.post("/register", withProfilePhoto, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "A profile picture is required" });

  const parsed = registerSchema.safeParse(registerInput(req));
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { name, email, password, phone, nationality, role, business } = parsed.data;

  if (role === "BUSINESS_OWNER" && !business) {
    return res.status(400).json({ error: "Business name and category are required to register as a business owner" });
  }

  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return res.status(409).json({ error: "An account with this email already exists" });

    // Resolved up front so a bad slug cannot leave an account without a listing.
    const category = business
      ? await prisma.category.findUnique({ where: { slug: business.categorySlug } })
      : null;
    if (business && !category) return res.status(400).json({ error: "Unknown category" });

    const passwordHash = await bcrypt.hash(password, 10);
    const created = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        nationality: nationality || null,
        passwordHash,
        roles: JSON.stringify([role]),
        currentRole: role,
        role, // backward compatibility
      },
    });

    let user = created;
    try {
      const filename = profilePhoto.filename(req.file.originalname);
      const dir = path.join(uploadRoot, "avatars", created.id);
      await fs.promises.mkdir(dir, { recursive: true });
      await fs.promises.writeFile(path.join(dir, filename), req.file.buffer);
      user = await prisma.user.update({
        where: { id: created.id },
        data: { avatarUrl: profilePhoto.url(req, created.id, filename) },
      });
    } catch (err) {
      // A mandatory picture that cannot be stored means no account at all, so
      // the row is removed again instead of leaving one with no photo.
      await prisma.user.delete({ where: { id: created.id } }).catch(() => {});
      throw err;
    }

    // Owners start their listing in PENDING so admin review begins immediately;
    // they can complete the details from the dashboard while it waits.
    if (category) {
      await prisma.business.create({
        data: {
          name: business.name,
          categoryId: category.id,
          ownerId: user.id,
          city: business.city,
          phone,
          status: "PENDING",
        },
      });
    }

    const token = signToken(user);
    res.status(201).json({ token, user: sanitize(user) });
  } catch (err) {
    console.error("[register]", err?.code || err?.message || err);
    res.status(500).json({ error: "Could not create your account. Please try again." });
  }
});

router.post("/login", async (req, res) => {
  const { email, password, remember } = req.body || {};
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

  const token = signToken(user, remember);
  res.json({ token, user: sanitize(user) });
});

const googleSchema = z.object({
  credential: z.string().min(20),
  remember: z.boolean().optional(),
});

// Google Identity Services hands the browser an ID token; we verify it with
// Google's own signing keys and then issue one of ours.
router.post("/google", async (req, res) => {
  const parsed = googleSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: "Google credential is required" });
  const { credential, remember } = parsed.data;

  let profile;
  try {
    profile = await verifyGoogleIdToken(credential);
  } catch (err) {
    return res.status(err.status || 401).json({ error: err.message || "Google sign-in failed" });
  }

  if (!profile.email || profile.email_verified !== true) {
    return res.status(401).json({ error: "That Google account has no verified email address" });
  }

  try {
    let user = await prisma.user.findUnique({ where: { email: profile.email } });
    if (!user) {
      // passwordHash stays required by the schema, so give Google-only accounts a
      // random one: password sign-in cannot work until they set one themselves.
      const randomHash = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10);
      try {
        user = await prisma.user.create({
          data: {
            email: profile.email,
            name: profile.name || profile.email.split("@")[0],
            passwordHash: randomHash,
            avatarUrl: profile.picture || null,
            roles: JSON.stringify(["CUSTOMER"]),
            currentRole: "CUSTOMER",
            role: "CUSTOMER",
          },
        });
      } catch (err) {
        // Two first sign-ins for the same address at once: the loser re-reads it.
        if (err.code !== "P2002") throw err;
        user = await prisma.user.findUnique({ where: { email: profile.email } });
      }
    }

    if (user.bannedAt) {
      return res.status(403).json({
        error: "Your account has been suspended",
        reason: user.banReason || "Please contact support for more information.",
      });
    }

    const token = signToken(user, remember);
    res.json({ token, user: sanitize(user) });
  } catch (err) {
    res.status(500).json({ error: "Could not complete Google sign-in" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ user: sanitize(user) });
});

const profileSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  phone: z.string().max(30).optional(),
  nationality: z.string().trim().max(60).nullable().optional(),
  avatarUrl: z.string().url().startsWith("http").max(600).nullable().optional(),
});

router.patch("/me", requireAuth, async (req, res) => {
  const parsed = profileSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });

  const { name, phone, nationality, avatarUrl } = parsed.data;
  const data = {};
  if (name !== undefined) data.name = name.trim();
  if (phone !== undefined) data.phone = phone.trim() || null;
  if (nationality !== undefined) data.nationality = nationality?.trim() || null;
  if (avatarUrl !== undefined) data.avatarUrl = avatarUrl;
  if (!Object.keys(data).length) return res.status(400).json({ error: "Nothing to update" });

  const updated = await prisma.user.update({ where: { id: req.user.id }, data });
  res.json({ user: sanitize(updated) });
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

router.post("/change-password", requireAuth, async (req, res) => {
  const parsed = changePasswordSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) return res.status(404).json({ error: "User not found" });

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Your current password is incorrect" });
  if (currentPassword === newPassword) {
    return res.status(400).json({ error: "Choose a new password different from the current one" });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(newPassword, 10) },
  });
  // The token this browser holds was minted against the old hash and would be
  // rejected on its next request, so hand it a fresh one. Every other device
  // keeps the older token and is now signed out.
  res.json({ ok: true, token: signToken(updated) });
});

const INVALID_LINK = "This reset link is no longer valid. Please request a new one.";

// One request per address per minute: enough to stop a script spending the
// mail quota, loose enough that an impatient user never sees it.
const RESET_COOLDOWN_MS = 60 * 1000;
const lastResetRequest = new Map();

function throttled(email) {
  const now = Date.now();
  const last = lastResetRequest.get(email);
  if (last && now - last < RESET_COOLDOWN_MS) return true;
  lastResetRequest.set(email, now);
  if (lastResetRequest.size > 1000) {
    for (const [key, at] of lastResetRequest) {
      if (now - at > RESET_COOLDOWN_MS) lastResetRequest.delete(key);
    }
  }
  return false;
}

// The link has to point at the deployed SPA, not at this API.
function frontendOrigin() {
  const candidates = [process.env.FRONTEND_URL, ...(process.env.CORS_ORIGIN || "").split(",")];
  const match = candidates.map((o) => (o || "").trim().replace(/\/+$/, "")).find((o) => o.startsWith("http"));
  return match || "http://localhost:5173";
}

async function userFromResetToken(token) {
  const payload = readResetToken(token);
  if (!payload) return null;
  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  return tokenMatchesUser(payload, user) ? user : null;
}

const forgotSchema = z.object({ email: z.string().email().max(160) });

router.post("/forgot-password", async (req, res) => {
  const parsed = forgotSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: "Enter a valid email address" });
  const { email } = parsed.data;

  if (!emailConfigured() && process.env.NODE_ENV === "production") {
    return res.status(503).json({ error: "Password reset email is not configured on this server" });
  }
  if (throttled(email)) {
    return res.status(429).json({ error: "Please wait a minute before requesting another link" });
  }

  try {
    // Looked up exactly as typed: emails are stored as given and login does the
    // same, so normalising here would only make addresses unfindable.
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.json({ ok: true });

    const resetUrl = `${frontendOrigin()}/reset-password?token=${signResetToken(user)}`;

    if (!emailConfigured()) {
      console.log(`[dev] password reset link for ${user.email}: ${resetUrl}`);
      return res.json({ ok: true, devResetUrl: resetUrl });
    }

    await sendEmail({ to: user.email, ...resetEmail({ name: user.name, resetUrl, minutes: RESET_TTL_MINUTES }) });
    res.json({ ok: true });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ error: err.message });
    console.error("[forgot-password]", err?.code || err?.message || err);
    res.status(502).json({ error: "Could not send the reset email. Please try again." });
  }
});

const verifyResetSchema = z.object({ token: z.string().min(20).max(4096) });

router.post("/reset-password/verify", async (req, res) => {
  const parsed = verifyResetSchema.safeParse(req.body || {});
  if (!parsed.success) return res.status(400).json({ error: INVALID_LINK });
  try {
    const user = await userFromResetToken(parsed.data.token);
    if (!user) return res.status(400).json({ error: INVALID_LINK });
    res.json({ ok: true, email: user.email });
  } catch (err) {
    console.error("[reset-password/verify]", err?.code || err?.message || err);
    res.status(500).json({ error: "Could not check that link" });
  }
});

const resetSchema = z.object({
  token: z.string().min(20).max(4096),
  password: z.string().min(6),
});

router.post("/reset-password", async (req, res) => {
  const parsed = resetSchema.safeParse(req.body || {});
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { token, password } = parsed.data;

  try {
    const user = await userFromResetToken(token);
    if (!user) return res.status(400).json({ error: INVALID_LINK });

    if (await bcrypt.compare(password, user.passwordHash)) {
      return res.status(400).json({ error: "Choose a new password different from the current one" });
    }

    // Replacing the hash is also what retires this link: its nonce no longer
    // matches, so a second submission with the same token is rejected.
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(password, 10) },
    });
    res.json({ ok: true });
  } catch (err) {
    console.error("[reset-password]", err?.code || err?.message || err);
    res.status(500).json({ error: "Could not reset the password" });
  }
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
