const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

function getToken() {
  return localStorage.getItem("token");
}

async function request(path, { method = "GET", body, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // no body
  }

  if (!res.ok) {
    const message = (data && data.error) || `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data;
}

export const api = {
  // auth
  register: (payload) => request("/auth/register", { method: "POST", body: payload, auth: false }),
  login: (payload) => request("/auth/login", { method: "POST", body: payload, auth: false }),
  me: () => request("/auth/me"),

  // categories
  categories: (all = false) => request(`/categories${all ? "?all=true" : ""}`),
  category: (slug) => request(`/categories/${slug}`),
  createCategory: (payload) => request("/categories", { method: "POST", body: payload }),
  updateCategory: (id, payload) => request(`/categories/${id}`, { method: "PATCH", body: payload }),

  // businesses
  searchBusinesses: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/businesses${qs ? `?${qs}` : ""}`, { auth: false });
  },
  myBusinesses: () => request("/businesses/mine"),
  business: (id) => request(`/businesses/${id}`, { auth: false }),
  createBusiness: (payload) => request("/businesses", { method: "POST", body: payload }),
  updateBusiness: (id, payload) => request(`/businesses/${id}`, { method: "PATCH", body: payload }),
  addEmployee: (businessId, payload) => request(`/businesses/${businessId}/employees`, { method: "POST", body: payload }),
  removeEmployee: (businessId, employeeId) => request(`/businesses/${businessId}/employees/${employeeId}`, { method: "DELETE" }),
  addAvailability: (businessId, payload) => request(`/businesses/${businessId}/availability`, { method: "POST", body: payload }),

  // services
  servicesForBusiness: (businessId) => request(`/services/business/${businessId}`, { auth: false }),
  createService: (payload) => request("/services", { method: "POST", body: payload }),
  updateService: (id, payload) => request(`/services/${id}`, { method: "PATCH", body: payload }),
  deleteService: (id) => request(`/services/${id}`, { method: "DELETE" }),

  // bookings
  createBooking: (payload) => request("/bookings", { method: "POST", body: payload }),
  myBookings: () => request("/bookings/mine"),
  businessBookings: (businessId) => request(`/bookings/business/${businessId}`),
  updateBookingStatus: (id, status) => request(`/bookings/${id}/status`, { method: "PATCH", body: { status } }),

  // payments
  payForBooking: (bookingId, method) => request(`/payments/bookings/${bookingId}/pay`, { method: "POST", body: { method } }),

  // messages
  getThread: (businessId, customerId) =>
    request(`/messages/thread/${businessId}${customerId ? `?customerId=${customerId}` : ""}`),
  sendMessage: (businessId, payload) => request(`/messages/thread/${businessId}`, { method: "POST", body: payload }),
  businessThreads: (businessId) => request(`/messages/business/${businessId}/threads`),

  // reviews
  createReview: (payload) => request("/reviews", { method: "POST", body: payload }),
  businessReviews: (businessId) => request(`/reviews/business/${businessId}`, { auth: false }),
  replyToReview: (id, ownerReply) => request(`/reviews/${id}/reply`, { method: "PATCH", body: { ownerReply } }),

  // admin
  adminStats: () => request("/admin/stats"),
  pendingBusinesses: () => request("/admin/businesses/pending"),
  setBusinessStatus: (id, status) => request(`/admin/businesses/${id}/status`, { method: "PATCH", body: { status } }),
  adminUsers: () => request("/admin/users"),
  setUserRole: (id, role) => request(`/admin/users/${id}/role`, { method: "PATCH", body: { role } }),
  banUser: (id, reason) => request(`/admin/users/${id}/ban`, { method: "PATCH", body: { reason } }),
  unbanUser: (id) => request(`/admin/users/${id}/unban`, { method: "PATCH" }),
  deleteUser: (id) => request(`/admin/users/${id}`, { method: "DELETE" }),

  // favorites
  favorites: () => request("/favorites"),
  addFavorite: (businessId) => request("/favorites", { method: "POST", body: { businessId } }),
  removeFavorite: (businessId) => request(`/favorites/${businessId}`, { method: "DELETE" }),
  checkFavorite: (businessId) => request(`/favorites/check/${businessId}`),

  // loyalty
  loyaltyCards: () => request("/loyalty"),
  loyaltyCard: (businessId) => request(`/loyalty/${businessId}`),
  awardPoints: (payload) => request("/loyalty/award", { method: "POST", body: payload }),
  loyaltyStats: (businessId) => request(`/loyalty/business/${businessId}/stats`),

  // portfolio
  portfolioItems: (businessId) => request(`/portfolio/business/${businessId}`, { auth: false }),
  addPortfolioItem: (payload) => request("/portfolio", { method: "POST", body: payload }),
  updatePortfolioItem: (id, payload) => request(`/portfolio/${id}`, { method: "PUT", body: payload }),
  deletePortfolioItem: (id) => request(`/portfolio/${id}`, { method: "DELETE" }),

  // notifications
  notifications: (unreadOnly = false) => request(`/notifications${unreadOnly ? "?unreadOnly=true" : ""}`),
  markNotificationRead: (id) => request(`/notifications/${id}/read`, { method: "PUT" }),
  markAllNotificationsRead: () => request("/notifications/read-all", { method: "PUT" }),
  unreadCount: () => request("/notifications/unread-count"),
  createNotification: (payload) => request("/notifications", { method: "POST", body: payload }),

  // QR check-in
  generateQR: (bookingId) => request(`/qrcheckin/generate/${bookingId}`, { method: "POST" }),
  qrCheckin: (qrCode) => request("/qrcheckin/checkin", { method: "POST", body: { qrCode } }),
  qrStatus: (bookingId) => request(`/qrcheckin/status/${bookingId}`),

  // settings
  getSettings: () => request("/settings"),
  updateSettings: (payload) => request("/settings", { method: "PUT", body: payload }),

  // analytics
  businessAnalytics: (businessId, params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/analytics/business/${businessId}${qs ? `?${qs}` : ""}`);
  },
  platformAnalytics: () => request("/analytics/platform"),

  // AI smart match
  smartMatch: (query) => request("/smartmatch", { method: "POST", body: { query } }),
  smartMatchHistory: () => request("/smartmatch/history"),

  // waiting list
  joinWaitingList: (payload) => request("/waitinglist", { method: "POST", body: payload }),
  myWaitingLists: () => request("/waitinglist/mine"),
  notifyWaitingList: (businessId, payload) => request(`/waitinglist/notify/${businessId}`, { method: "POST", body: payload }),
  removeFromWaitingList: (id) => request(`/waitinglist/${id}`, { method: "DELETE" }),

  // emergency booking
  createEmergency: (payload) => request("/emergency", { method: "POST", body: payload }),
  myEmergencies: () => request("/emergency/mine"),
  acceptEmergency: (id, businessId) => request(`/emergency/${id}/accept`, { method: "POST", body: { businessId } }),
  businessEmergencies: (businessId) => request(`/emergency/business/${businessId}`),

  // platform loyalty (cross-business)
  platformLoyalty: () => request("/platformloyalty"),
  awardPlatformPoints: (payload) => request("/platformloyalty/award", { method: "POST", body: payload }),
  redeemPlatformPoints: (payload) => request("/platformloyalty/redeem", { method: "POST", body: payload }),
  platformLoyaltyStats: () => request("/platformloyalty/stats"),

  // AI review summary
  reviewSummary: (businessId) => request(`/reviewsummary/${businessId}`, { auth: false }),
  regenerateReviewSummary: (businessId) => request(`/reviewsummary/${businessId}/regenerate`, { method: "POST" }),

  // enhanced portfolio (photos, videos, certificates, licenses)
  enhancedPortfolio: (businessId, type) => request(`/enhancedportfolio/business/${businessId}${type ? `?type=${type}` : ""}`, { auth: false }),
  addEnhancedPortfolio: (payload) => request("/enhancedportfolio", { method: "POST", body: payload }),
  updateEnhancedPortfolio: (id, payload) => request(`/enhancedportfolio/${id}`, { method: "PUT", body: payload }),
  deleteEnhancedPortfolio: (id) => request(`/enhancedportfolio/${id}`, { method: "DELETE" }),
  verifyPortfolioItem: (id) => request(`/enhancedportfolio/${id}/verify`, { method: "POST" }),
  portfolioStats: (businessId) => request(`/enhancedportfolio/business/${businessId}/stats`),
};

export function formatMoney(cents) {
  return `$${(cents / 100).toFixed(2)}`;
}
