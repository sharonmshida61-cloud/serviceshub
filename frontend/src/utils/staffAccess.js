// Roles an owner can hand out. Anything else the owner typed earlier is kept as
// a custom role so editing one member never rewrites another's title.
export const STAFF_ROLES = ["Manager", "Technician", "Craftsman", "Reception", "Support"];

export function roleChoices(current) {
  const list = STAFF_ROLES.includes(current) || !current ? STAFF_ROLES : [current, ...STAFF_ROLES];
  return [...new Set([...list, "Other"])];
}

// Kept in step with backend/src/utils/staffPermissions.js so the owner's team
// table and the teammate's own dashboard describe the same access.
const GRANTS = {
  manager:
    "Own dashboard, every booking on the listing, the team list and all customer chats. Can confirm, decline and hand jobs to teammates, and sees what has been collected.",
  reception:
    "Dashboard, every booking on the listing and all customer chats. Can confirm and complete, but not turn a job down or see the team.",
  technician:
    "Their own jobs plus anything unclaimed on today's board, and customer chats. Cannot see the whole booking list or the team.",
  craftsman:
    "Their own jobs plus anything unclaimed on today's board, and customer chats. Cannot see the whole booking list or the team.",
  support:
    "Customer chats only. No booking board and no team list.",
  other:
    "Their own jobs and customer chats. The owner can change the role at any time.",
};

export function roleGrants(title) {
  const key = String(title || "").trim().toLowerCase();
  return GRANTS[key] || GRANTS.other;
}
