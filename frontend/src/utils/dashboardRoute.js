export const DASHBOARD_BY_ROLE = {
  CUSTOMER: "/dashboard/customer",
  BUSINESS_OWNER: "/dashboard/business",
  EMPLOYEE: "/dashboard/employee",
  ADMIN: "/dashboard/admin",
};

// The active role picks the landing page, not the legacy role column: an account
// its business added as a teammate opens the staff view even though it can also
// book services as a customer.
export function dashboardPathFor(user) {
  if (!user) return "/";
  return DASHBOARD_BY_ROLE[user.currentRole || user.role] || "/";
}
