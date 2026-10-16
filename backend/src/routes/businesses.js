const express = require("express");
const QRCode = require("qrcode");
const prisma = require("../utils/prisma");
const { requireAuth, optionalAuth } = require("../middleware/auth");
const { requireRole } = require("../middleware/role");
const { readCoords } = require("../utils/coords");
const { CITIES } = require("../data/eastAfrica");
const { frontendOrigin } = require("../utils/frontendOrigin");
const { INVITE_TTL_DAYS, newInviteSeed, signInviteToken } = require("../utils/inviteToken");
const {
  permissionsFor,
  staffMembership,
  publicUser,
  grantStaffRole,
  revokeStaffRole,
} = require("../utils/staffPermissions");

const router = express.Router();

function parseJsonFields(biz) {
  return { ...biz, attributes: JSON.parse(biz.attributes || "{}") };
}

// The detail page renders each service, including the photo the owner attached to
// it, so those attributes have to arrive parsed as well.
function parseDetail(biz) {
  const out = parseJsonFields(biz);
  if (Array.isArray(out.services)) {
    out.services = out.services.map((s) => ({ ...s, attributes: JSON.parse(s.attributes || "{}") }));
  }
  return out;
}

// The owner's own site. People type "pipepro.co.ke" rather than a full URL, so
// the scheme is added for them; anything that is not an http(s) link is refused
// so a listing can never carry a javascript: or data: href.
function normalizeWebsite(value) {
  if (value === undefined) return undefined;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  let url;
  try {
    url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`);
  } catch {
    throw new Error('Website must be a link, like pipepro.co.ke or https://pipepro.co.ke');
  }
  if (!["http:", "https:"].includes(url.protocol) || !url.hostname.includes(".")) {
    throw new Error('Website must be a link, like pipepro.co.ke or https://pipepro.co.ke');
  }
  if (trimmed.length > 200) throw new Error("Website link is too long (200 characters max)");
  return url.pathname === "/" ? url.origin : url.href;
}

// ---------------------------------------------------------------------------
// DISCOVERY: search + filter + compare. This single endpoint powers the
// "discover" and "compare" experience across every category.
// Query params: category=slug, city=, country=, minRating=, sort=rating|price|newest
// ---------------------------------------------------------------------------
router.get("/", async (req, res) => {
  const { category, city, country, minRating, q, sort = "rating" } = req.query;
  const where = { status: "APPROVED" };

  if (category) {
    const cat = await prisma.category.findUnique({ where: { slug: category } });
    if (!cat) return res.json([]);
    where.categoryId = cat.id;
  }
  if (minRating) where.avgRating = { gte: Number(minRating) };

  let businesses = await prisma.business.findMany({
    where,
    include: { category: true, services: { where: { active: true } } },
  });

  // Case-insensitive JS filtering (SQLite doesn't support Prisma mode: insensitive)
  if (q && q.trim()) {
    const term = q.trim().toLowerCase();
    businesses = businesses.filter(
      (b) =>
        b.name.toLowerCase().includes(term) ||
        (b.description && b.description.toLowerCase().includes(term)) ||
        (b.city && b.city.toLowerCase().includes(term))
    );
  }
  if (city && city.trim()) {
    const cityTerm = city.trim().toLowerCase();
    businesses = businesses.filter(
      (b) => b.city && b.city.toLowerCase().includes(cityTerm)
    );
  }
  // The catalogue is the only place a city is tied to a country, so a country
  // filter is expanded into its city set. A listing outside the launch region
  // belongs to no country and drops out of a country-scoped search.
  if (country && country.trim()) {
    const wanted = country.trim().toLowerCase();
    const regions = new Set(
      CITIES.filter((c) => c.country.toLowerCase() === wanted).map((c) => c.city.toLowerCase())
    );
    businesses = businesses.filter(
      (b) => b.city && regions.has(b.city.trim().toLowerCase())
    );
  }

  // Sorting
  if (sort === "rating") businesses.sort((a, b) => b.avgRating - a.avgRating);
  else if (sort === "newest") businesses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  else if (sort === "price") {
    const minPrice = (b) =>
      b.services.length ? Math.min(...b.services.map((s) => s.priceCents)) : Infinity;
    businesses.sort((a, b) => minPrice(a) - minPrice(b));
  }

  res.json(businesses.map(parseJsonFields));
});

// Must stay above /:id or Express reads "cities" as a business id.
router.get("/cities", async (req, res) => {
  const rows = await prisma.business.findMany({
    where: { status: "APPROVED" },
    select: { city: true },
  });

  const counts = new Map();
  for (const row of rows) {
    const name = (row.city || "").trim();
    if (!name) continue;
    counts.set(name, (counts.get(name) || 0) + 1);
  }

  const known = new Set(CITIES.map((c) => c.city));
  const options = [
    ...CITIES.map(({ city, country }) => ({ city, country, count: counts.get(city) || 0 })),
    // A listing can already sit somewhere outside the launch region; keep it
    // searchable instead of hiding it from the picker.
    ...[...counts]
      .filter(([city]) => !known.has(city))
      .map(([city, count]) => ({ city, country: null, count })),
  ];

  res.json(
    options.sort(
      (a, b) =>
        String(a.country ?? "\uffff").localeCompare(String(b.country ?? "\uffff")) ||
        b.count - a.count ||
        a.city.localeCompare(b.city)
    )
  );
});

// Businesses owned by the current user (for the Business Owner dashboard)
router.get("/mine", requireAuth, requireRole("BUSINESS_OWNER", "ADMIN"), async (req, res) => {
  const businesses = await prisma.business.findMany({
    where: { ownerId: req.user.id },
    include: {
      category: true,
      services: true,
      employees: {
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
        },
      },
    },
  });
  res.json(businesses.map(parseDetail));
});

// ---------------------------------------------------------------------------
// STAFF WORKSPACE: the teammate's own view. Everything is keyed off the signed-in
// user's active BusinessEmployee rows, so a worker never has to know a business
// id — the listing their owner added them to is what comes back.
// ---------------------------------------------------------------------------
router.get("/staff/mine", requireAuth, async (req, res) => {
  const rows = await prisma.businessEmployee.findMany({
    where: { userId: req.user.id, active: true },
    include: {
      business: {
        include: {
          category: { select: { id: true, name: true, slug: true, icon: true } },
          owner: { select: { id: true, name: true, email: true, phone: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  res.json(
    rows.map((row) => {
      const b = row.business;
      return {
        employeeId: row.id,
        title: row.title,
        joinedAt: row.createdAt,
        permissions: permissionsFor(row.title),
        business: {
          id: b.id,
          name: b.name,
          status: b.status,
          city: b.city,
          address: b.address,
          latitude: b.latitude,
          longitude: b.longitude,
          phone: b.phone,
          email: b.email,
          website: b.website,
          avgRating: b.avgRating,
          reviewCount: b.reviewCount,
          category: b.category,
          ownerId: b.ownerId,
          owner: b.owner,
        },
      };
    })
  );
});

// ---------------------------------------------------------------------------
// CUSTOMERS: all customers who have booked this business, with full history
// Only the business owner or an admin can access this.
// ---------------------------------------------------------------------------
router.get("/:id/customers", requireAuth, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { id: req.params.id } });
  if (!business) return res.status(404).json({ error: "Business not found" });

  const activeRole = req.user.currentRole || req.user.role;
  if (business.ownerId !== req.user.id && activeRole !== "ADMIN") {
    return res.status(403).json({ error: "Only the business owner can view customer details" });
  }

  // Pull every booking for this business, including the customer profile and payment
  const bookings = await prisma.booking.findMany({
    where: { businessId: req.params.id },
    include: {
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          createdAt: true,
          bannedAt: true,
          banReason: true,
        },
      },
      service: { select: { id: true, name: true, priceCents: true, durationMinutes: true } },
      payment: true,
      review: { select: { id: true, rating: true, comment: true, createdAt: true } },
    },
    orderBy: { scheduledAt: "desc" },
  });

  // Group bookings by customer so the owner sees one card per customer
  const customerMap = new Map();
  for (const booking of bookings) {
    const cid = booking.customer.id;
    if (!customerMap.has(cid)) {
      customerMap.set(cid, {
        customer: booking.customer,
        bookings: [],
        totalSpentCents: 0,
        paidCount: 0,
        unpaidCount: 0,
        completedCount: 0,
        cancelledCount: 0,
      });
    }
    const entry = customerMap.get(cid);
    entry.bookings.push(booking);

    if (booking.payment?.status === "PAID") {
      entry.totalSpentCents += booking.payment.amountCents;
      entry.paidCount++;
    } else if (["PENDING", "CONFIRMED"].includes(booking.status) && !booking.payment) {
      entry.unpaidCount++;
    }
    if (booking.status === "COMPLETED") entry.completedCount++;
    if (booking.status === "CANCELLED" || booking.status === "DECLINED") entry.cancelledCount++;
  }

  res.json(Array.from(customerMap.values()));
});

// Get a single business by ID
router.get("/:id", optionalAuth, async (req, res) => {
  const business = await prisma.business.findUnique({
    where: { id: req.params.id },
    include: {
      category: true,
      services: { where: { active: true } },
      reviews: { include: { customer: true }, orderBy: { createdAt: "desc" } },
      employees: {
        where: { active: true },
        select: {
          id: true,
          title: true,
          staffName: true,
          user: { select: { id: true, name: true, avatarUrl: true } },
        },
      },
      availability: true,
    },
  });
  if (!business) return res.status(404).json({ error: "Business not found" });

  // Non-approved listings are only visible to their owner or an admin
  if (business.status !== "APPROVED") {
    const activeRole = req.user?.currentRole || req.user?.role;
    const isOwner = req.user?.id === business.ownerId;
    const isAdmin = activeRole === "ADMIN";
    if (!isOwner && !isAdmin) {
      return res.status(404).json({ error: "Business not found" });
    }
  }

  res.json(parseDetail(business));
});

// Customers reach a listing through these six: they search by city, read the
// description, call the phone, open the map pin for directions and check the
// website. An admin cannot meaningfully review a listing that is missing one, so
// the create card asks for all of them and the API refuses any that arrive blank.
const LISTING_REQUIRED = {
  name: "business name",
  description: "description",
  categorySlug: "category",
  city: "city",
  phone: "phone number",
  website: "website",
};

function missingListingFields(body) {
  return Object.entries(LISTING_REQUIRED)
    .filter(([key]) => !String(body?.[key] ?? "").trim())
    .map(([, label]) => label);
}

// Create a new business listing (defaults to PENDING until admin approves)
router.post("/", requireAuth, requireRole("BUSINESS_OWNER", "ADMIN"), async (req, res) => {
  const { name, description, categorySlug, address, city, phone, email, website, attributes } = req.body || {};
  const missing = missingListingFields(req.body);
  if (missing.length) {
    return res.status(400).json({ error: `Still needed before you can list: ${missing.join(", ")}.` });
  }

  let coords;
  let site;
  try {
    coords = readCoords(req.body);
    site = normalizeWebsite(website);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  if (coords.latitude === undefined) {
    return res.status(400).json({ error: "Pin your location on the map so customers can find you and get directions." });
  }

  const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
  if (!category) return res.status(400).json({ error: "Unknown category" });

  const business = await prisma.business.create({
    data: {
      name,
      description,
      categoryId: category.id,
      ownerId: req.user.id,
      address,
      city,
      phone,
      email,
      website: site,
      attributes: JSON.stringify(attributes || {}),
      status: "PENDING",
      ...coords,
    },
  });
  res.status(201).json(parseJsonFields(business));
});

router.patch("/:id", requireAuth, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { id: req.params.id } });
  if (!business) return res.status(404).json({ error: "Business not found" });
  const activeRole = req.user.currentRole || req.user.role;
  if (business.ownerId !== req.user.id && activeRole !== "ADMIN") {
    return res.status(403).json({ error: "Only the business owner or an admin can edit this listing" });
  }

  const { name, description, address, city, phone, email, website, attributes } = req.body || {};
  let coords;
  let site;
  try {
    coords = readCoords(req.body);
    site = normalizeWebsite(website);
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  const updated = await prisma.business.update({
    where: { id: req.params.id },
    data: {
      ...(name !== undefined && { name }),
      ...(description !== undefined && { description }),
      ...(address !== undefined && { address }),
      ...(city !== undefined && { city }),
      ...(phone !== undefined && { phone }),
      ...(email !== undefined && { email }),
      ...(website !== undefined && { website: site }),
      ...(attributes !== undefined && { attributes: JSON.stringify(attributes) }),
      ...coords,
    },
  });
  res.json(parseJsonFields(updated));
});

// Take your own listing off the directory, or put it back in the review queue.
// The row is never removed: bookings, chats and reviews belong to customers as
// much as to the owner, so closing hides the listing and keeps its history.
router.patch("/:id/visibility", requireAuth, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { id: req.params.id } });
  if (!business) return res.status(404).json({ error: "Business not found" });
  if (!ownsBusiness(business, req.user)) {
    return res.status(403).json({ error: notOwnerOf(business, req.user) });
  }

  const status = req.body?.closed ? "CLOSED" : "PENDING";
  const updated = await prisma.business.update({ where: { id: business.id }, data: { status } });
  res.json(parseJsonFields(updated));
});

// -------------------- Employees (owner manages staff) ----------------------

// The role an owner gives a teammate. It is stored in `title`, which the public
// team list already renders as "Name — Role".
const STAFF_ROLES = ["Manager", "Technician", "Craftsman", "Reception", "Support"];

function resolveStaffRole(role, title) {
  const named = STAFF_ROLES.find((r) => r.toLowerCase() === String(role || "").toLowerCase());
  if (named) return named;
  const custom = String(title || "").trim().slice(0, 40);
  return custom || "Staff";
}

function ownsBusiness(business, user) {
  return business.ownerId === user.id || (user.currentRole || user.role) === "ADMIN";
}

// Naming the sign-in that made the request is what makes "but I am the owner"
// answerable: a tab that has been open for a while can be carrying an older
// session belonging to someone else in the same browser.
function notOwnerOf(business, user) {
  return `${user.email || "This sign-in"} is not the owner of ${business.name}. Check which account this browser is signed in as, then try again.`;
}

function cleanField(value, max, { email = false } = {}) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;
  if (trimmed.length > max) throw new Error(`That entry is too long (${max} characters max)`);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)) {
    throw new Error("Email needs to look like amina@email.com");
  }
  return trimmed;
}

async function findTeamTarget({ userId, email }) {
  if (userId) return prisma.user.findUnique({ where: { id: String(userId) } });
  const trimmed = String(email || "").trim();
  if (!trimmed) return null;
  return prisma.user.findFirst({ where: { email: { equals: trimmed, mode: "insensitive" } } });
}

// Add a teammate. Name, phone and email are all optional — an email that matches
// a Nearby account links them so they can sign in, and anyone else is kept as the
// owner's own contact entry.
router.post("/:id/employees", requireAuth, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { id: req.params.id } });
  if (!business) return res.status(404).json({ error: "Business not found" });
  if (!ownsBusiness(business, req.user)) {
    return res.status(403).json({ error: notOwnerOf(business, req.user) });
  }

  const body = req.body || {};
  let staffName, staffPhone, staffEmail;
  try {
    staffName = cleanField(body.name, 60);
    staffPhone = cleanField(body.phone, 30);
    staffEmail = cleanField(body.email, 120, { email: true });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  const userId = body.userId ? String(body.userId) : null;
  if (!userId && !staffName && !staffPhone && !staffEmail) {
    return res.status(400).json({ error: "Give them a name, phone or email so you recognise them later." });
  }

  const account = userId || staffEmail ? await findTeamTarget({ userId, email: staffEmail }) : null;
  if (userId && !account) return res.status(404).json({ error: "No user found with that id" });
  if (account && account.id === business.ownerId) {
    return res.status(400).json({ error: "You own this listing, so you are already on the team." });
  }

  const details = {
    title: resolveStaffRole(body.role, body.title),
    staffName,
    staffPhone,
    staffEmail,
  };

  if (account) {
    const existing = await prisma.businessEmployee.findUnique({
      where: { businessId_userId: { businessId: business.id, userId: account.id } },
    });
    if (existing?.active) {
      return res.status(409).json({ error: `${staffName || account.name} is already on your team.` });
    }
    if (existing) {
      await grantStaffRole(account);
      return res.json(await prisma.businessEmployee.update({ where: { id: existing.id }, data: { ...details, active: true } }));
    }
    await grantStaffRole(account);
    const employee = await prisma.businessEmployee.create({
      data: { businessId: business.id, userId: account.id, ...details },
    });
    return res.status(201).json(employee);
  }

  if (staffEmail) {
    const dupe = await prisma.businessEmployee.findFirst({
      where: { businessId: business.id, active: true, staffEmail: { equals: staffEmail, mode: "insensitive" } },
    });
    if (dupe) return res.status(409).json({ error: `${staffName || staffEmail} is already on your team.` });
  }
  const employee = await prisma.businessEmployee.create({ data: { businessId: business.id, ...details } });
  res.status(201).json(employee);
});

// A scanned QR has to open the very site the owner is looking at, so the
// browser's own origin wins over the server's environment guess. Only a bare
// http(s) origin is accepted — never a path, query or arbitrary string.
function inviteSiteOrigin(body) {
  const raw = String(body?.siteOrigin || "").trim().replace(/\/+$/, "");
  return /^https?:\/\/[-a-z0-9.]+(:\d+)?$/i.test(raw) ? raw : frontendOrigin();
}

// A teammate who has no account yet is sent a link and a QR code: opening either
// one starts a sign-up scoped to this listing and this role, and the account it
// creates lands on the staff dashboard. Asking again mints a new seed, so the
// link or picture sent before stops working.
router.post("/:id/employees/:employeeId/invite", requireAuth, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { id: req.params.id } });
  if (!business) return res.status(404).json({ error: "Business not found" });
  if (!ownsBusiness(business, req.user)) {
    return res.status(403).json({ error: notOwnerOf(business, req.user) });
  }
  const member = await prisma.businessEmployee.findFirst({
    where: { id: req.params.employeeId, businessId: business.id },
  });
  if (!member) return res.status(404).json({ error: "That teammate is not on this listing" });
  if (!member.active) {
    return res.status(400).json({ error: "Bring them back on the team before sending an invitation." });
  }
  if (member.userId) {
    return res.status(409).json({ error: `${member.staffName || "That teammate"} already has a sign-in.` });
  }

  const seed = newInviteSeed();
  await prisma.businessEmployee.update({ where: { id: member.id }, data: { inviteSeed: seed } });
  const inviteUrl = `${inviteSiteOrigin(req.body)}/invite/${signInviteToken(member.id, seed)}`;
  const qrDataUrl = await QRCode.toDataURL(inviteUrl, {
    errorCorrectionLevel: "H",
    type: "image/png",
    width: 512,
    margin: 2,
  });

  res.json({
    url: inviteUrl,
    qrDataUrl,
    expiresAt: new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
    title: member.title,
    staffName: member.staffName,
    staffEmail: member.staffEmail,
    businessName: business.name,
  });
});

// The roster a Manager reads from their own dashboard. Owners already get the
// same rows through /mine, so this only opens the team section to titles that
// have one — everyone else is refused.
router.get("/:id/employees", requireAuth, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { id: req.params.id } });
  if (!business) return res.status(404).json({ error: "Business not found" });

  let membership = null;
  if (business.ownerId !== req.user.id && (req.user.currentRole || req.user.role) !== "ADMIN") {
    membership = await staffMembership(req.user.id, business.id);
    if (!membership) return res.status(403).json({ error: "You are not staff at this listing" });
    if (!permissionsFor(membership.title).sections.includes("team")) {
      return res.status(403).json({ error: `Your role (${membership.title}) does not open the team list` });
    }
  }

  const members = await prisma.businessEmployee.findMany({
    where: { businessId: business.id, active: true },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      title: true,
      staffName: true,
      staffPhone: true,
      staffEmail: true,
      createdAt: true,
      userId: true,
      user: { select: { id: true, name: true, email: true, avatarUrl: true } },
    },
  });
  res.json(
    members.map((m) => ({
      ...m,
      name: m.staffName || m.user?.name || "Team member",
      isMe: membership ? m.id === membership.id : m.userId === req.user.id,
    }))
  );
});

// Change a teammate's role, contact details, or activate/deactivate them.
router.patch("/:id/employees/:employeeId", requireAuth, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { id: req.params.id } });
  if (!business) return res.status(404).json({ error: "Business not found" });
  if (!ownsBusiness(business, req.user)) {
    return res.status(403).json({ error: notOwnerOf(business, req.user) });
  }
  const member = await prisma.businessEmployee.findFirst({
    where: { id: req.params.employeeId, businessId: business.id },
  });
  if (!member) return res.status(404).json({ error: "That teammate is not on this listing" });

  const { role, title, active, name, phone, email } = req.body || {};
  const data = {};
  if (role !== undefined || title !== undefined) data.title = resolveStaffRole(role, title);
  if (active !== undefined) data.active = Boolean(active);
  try {
    if (name !== undefined) data.staffName = cleanField(name, 60);
    if (phone !== undefined) data.staffPhone = cleanField(phone, 30);
    if (email !== undefined) data.staffEmail = cleanField(email, 120, { email: true });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  if (!Object.keys(data).length) return res.status(400).json({ error: "Nothing to change" });

  // A contact-only row that now carries a registered email becomes a real login,
  // which is how an owner hands someone access after adding them by name first.
  let account = null;
  if (!member.userId && data.staffEmail) {
    account = await findTeamTarget({ email: data.staffEmail });
    if (account && account.id !== business.ownerId) data.userId = account.id;
  }

  try {
    const updated = await prisma.businessEmployee.update({ where: { id: member.id }, data });
    if (account && data.userId) await grantStaffRole(account);
    res.json({ ...updated, user: account && data.userId ? publicUser(account) : null });
  } catch (e) {
    if (e.code === "P2002") {
      return res.status(409).json({ error: "That account is already on your team." });
    }
    throw e;
  }
});

// Remove a teammate. Members with booking history are kept (deactivated) so the
// owner's past records still name them; ?permanent=true drops the row entirely.
router.delete("/:id/employees/:employeeId", requireAuth, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { id: req.params.id } });
  if (!business) return res.status(404).json({ error: "Business not found" });
  if (!ownsBusiness(business, req.user)) {
    return res.status(403).json({ error: notOwnerOf(business, req.user) });
  }
  const member = await prisma.businessEmployee.findFirst({
    where: { id: req.params.employeeId, businessId: business.id },
  });
  if (!member) return res.status(404).json({ error: "That teammate is not on this listing" });

  if (req.query.permanent === "true") {
    await prisma.businessEmployee.delete({ where: { id: member.id } });
    await revokeStaffRole(member.userId);
    return res.status(204).end();
  }

  await prisma.businessEmployee.update({ where: { id: member.id }, data: { active: false } });
  await revokeStaffRole(member.userId);
  res.status(204).end();
});

// -------------------- Availability -----------------------------------------

router.post("/:id/availability", requireAuth, async (req, res) => {
  const business = await prisma.business.findUnique({ where: { id: req.params.id } });
  if (!business) return res.status(404).json({ error: "Business not found" });
  const activeRole = req.user.currentRole || req.user.role;
  if (business.ownerId !== req.user.id && activeRole !== "ADMIN") {
    return res.status(403).json({ error: "Only the business owner can set availability" });
  }
  const { dayOfWeek, startTime, endTime, employeeId } = req.body || {};
  const slot = await prisma.availability.create({
    data: { businessId: business.id, dayOfWeek, startTime, endTime, employeeId: employeeId || null },
  });
  res.status(201).json(slot);
});

module.exports = router;
