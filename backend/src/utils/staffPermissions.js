const prisma = require("./prisma");

// What each owner-assigned team role opens. The staff sidebar is built from
// `sections`, `scope` decides which bookings the API hands over, and `money`
// keeps prices away from roles that do not run the till.
const BY_TITLE = {
  manager: { sections: ["overview", "bookings", "team", "messages", "profile"], scope: "all", money: true, assign: true },
  reception: { sections: ["overview", "bookings", "messages", "profile"], scope: "all", money: false, assign: false },
  technician: { sections: ["bookings", "messages", "profile"], scope: "mine", money: false, assign: false },
  craftsman: { sections: ["bookings", "messages", "profile"], scope: "mine", money: false, assign: false },
  support: { sections: ["messages", "profile"], scope: "none", money: false, assign: false },
};

// A title the owner typed themselves is treated as general staff: they get the
// job list and the inbox, but never the roster or the numbers.
const DEFAULT_ACCESS = { sections: ["bookings", "messages", "profile"], scope: "mine", money: false, assign: false };

function permissionsFor(title) {
  const key = String(title || "").trim().toLowerCase();
  return BY_TITLE[key] ? { ...BY_TITLE[key] } : { ...DEFAULT_ACCESS };
}

// The person's own row at that listing — null when they are not active staff.
async function staffMembership(userId, businessId) {
  if (!userId || !businessId) return null;
  return prisma.businessEmployee.findFirst({ where: { businessId, userId: String(userId), active: true } });
}

function parseRoles(user) {
  if (Array.isArray(user.roles)) return user.roles;
  try {
    const parsed = JSON.parse(user.roles || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// What the owner is allowed to see about a linked account — never the hash.
function publicUser(user) {
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email, avatarUrl: user.avatarUrl };
}

// Signing someone onto a team gives their account EMPLOYEE. It only takes over
// the dashboard they land on when the customer view was their only one: someone
// who owns a listing of their own stays where they were and switches instead.
async function grantStaffRole(account) {
  if (!account) return null;
  const roles = parseRoles(account);
  const next = roles.includes("EMPLOYEE") ? roles : ["EMPLOYEE", ...roles];
  const ownsAListing = (await prisma.business.count({ where: { ownerId: account.id } })) > 0;
  const active = account.currentRole || account.role;
  const takeOver = active === "CUSTOMER" && !ownsAListing;
  return prisma.user.update({
    where: { id: account.id },
    data: {
      roles: JSON.stringify(next),
      ...(takeOver ? { currentRole: "EMPLOYEE", role: "EMPLOYEE" } : {}),
    },
  });
}

// A removed teammate loses staff sign-in — but only once they are active on no
// other team. The row itself stays so past bookings still name them.
async function revokeStaffRole(userId) {
  if (!userId) return null;
  const stillOnATeam = await prisma.businessEmployee.findFirst({ where: { userId, active: true } });
  if (stillOnATeam) return null;
  const account = await prisma.user.findUnique({ where: { id: userId } });
  if (!account) return null;

  const remaining = parseRoles(account).filter((r) => r !== "EMPLOYEE");
  const roles = remaining.length ? remaining : ["CUSTOMER"];
  const data = { roles: JSON.stringify(roles) };
  if ((account.currentRole || account.role) === "EMPLOYEE") {
    const fallback = roles.includes("BUSINESS_OWNER") ? "BUSINESS_OWNER" : "CUSTOMER";
    data.currentRole = fallback;
    data.role = fallback;
  }
  return prisma.user.update({ where: { id: account.id }, data });
}

// Roles the API is willing to switch a signed-in account into.
const SWITCHABLE_ROLES = ["CUSTOMER", "BUSINESS_OWNER", "EMPLOYEE"];

module.exports = {
  permissionsFor,
  staffMembership,
  parseRoles,
  publicUser,
  grantStaffRole,
  revokeStaffRole,
  SWITCHABLE_ROLES,
  DEFAULT_ACCESS,
};
