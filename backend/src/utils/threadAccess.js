const prisma = require("./prisma");

const activeRole = (user) => user?.currentRole || user?.role;

// A thread is the pair (business, customer). Anyone who is one side of that
// pair — the customer, the business owner, an active employee, or an admin —
// may read and post in it. Shared by the message routes and the chat uploader.
async function canAccessThread(user, businessId, customerId) {
  if (!user || !businessId || !customerId) return false;
  if (activeRole(user) === "ADMIN") return true;
  if (user.id === customerId) return true;
  const business = await prisma.business.findUnique({ where: { id: businessId } });
  if (!business) return false;
  if (business.ownerId === user.id) return true;
  const staff = await prisma.businessEmployee.findFirst({ where: { businessId, userId: user.id, active: true } });
  return !!staff;
}

module.exports = { activeRole, canAccessThread };
