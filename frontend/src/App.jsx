import { Routes, Route, Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "./context/AuthContext.jsx";
import { useLanguage } from "./context/LanguageContext.jsx";
import Home from "./pages/Home.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import BusinessDetail from "./pages/BusinessDetail.jsx";
import CustomerDashboard from "./pages/CustomerDashboard.jsx";
import BusinessOwnerDashboard from "./pages/BusinessOwnerDashboard.jsx";
import EmployeeDashboard from "./pages/EmployeeDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import Settings from "./pages/Settings.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import Browse from "./pages/Browse.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import NotificationBell from "./components/NotificationBell.jsx";
import LanguageSwitcher from "./components/LanguageSwitcher.jsx";

const DASHBOARD_BY_ROLE = {
  CUSTOMER: "/dashboard/customer",
  BUSINESS_OWNER: "/dashboard/business",
  EMPLOYEE: "/dashboard/employee",
  ADMIN: "/dashboard/admin",
};

const API_BASE_URL = (import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:4000/api" : "/api")).replace(/\/$/, "");

export default function App() {
  const { user, logout, loading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const closeMobileNav = () => setMobileMenuOpen(false);

  // Get current active role (or fall back to first available role)
  const currentRole = user?.currentRole || user?.role;
  const availableRoles = Array.isArray(user?.roles) ? user.roles : (user?.role ? [user.role] : []);

  return (
    <div>
      <header className="topbar">
        <div className="container">
          <div className="topbar-main">
            <Link to="/" className="brand" onClick={closeMobileNav}>
              Nearby<span className="dot">•</span>
            </Link>
            <button
              type="button"
              className="mobile-nav-toggle"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-expanded={mobileMenuOpen}
              aria-label={t("nav.toggleMenu")}
            >
              <span />
              <span />
              <span />
            </button>
          </div>
          <nav className={`nav-links ${mobileMenuOpen ? "mobile-open" : ""}`}>
            {(!user || currentRole !== "CUSTOMER") && (
              <Link to={user ? "/browse" : "/"} onClick={closeMobileNav}>{t("nav.discover")}</Link>
            )}
            {!loading && user && (
              <>
                <Link to={DASHBOARD_BY_ROLE[currentRole]} onClick={closeMobileNav}>{t("nav.dashboard")}</Link>
                <Link to="/settings" onClick={closeMobileNav}>{t("nav.settings")}</Link>
                <NotificationBell />
                <div style={{ position: "relative", display: "inline-block" }}>
                  <button 
                    className="role-badge" 
                    onClick={() => {
                      setShowRoleSwitcher(!showRoleSwitcher);
                      closeMobileNav();
                    }}
                    style={{ cursor: availableRoles.length > 1 ? "pointer" : "default" }}
                  >
                    {currentRole.replace("_", " ")}
                    {availableRoles.length > 1 && <span style={{ marginLeft: "4px" }}>▼</span>}
                  </button>
                  {showRoleSwitcher && availableRoles.length > 1 && (
                    <div style={{
                      position: "absolute",
                      top: "100%",
                      right: 0,
                      background: "white",
                      border: "1px solid var(--line)",
                      borderRadius: "8px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      zIndex: 1000,
                      minWidth: "150px",
                      marginTop: "4px"
                    }}>
                      {availableRoles.map((role) => (
                        <button
                          key={role}
                          onClick={() => {
                            // Call switch role endpoint
                            const token = localStorage.getItem("token");
                            fetch(`${API_BASE_URL}/auth/switchRole/${role}`, {
                              method: "POST",
                              headers: { Authorization: `Bearer ${token}` }
                            })
                              .then(r => r.json())
                              .then(({ token: newToken, user: newUser }) => {
                                localStorage.setItem("token", newToken);
                                window.location.reload();
                              });
                            setShowRoleSwitcher(false);
                            closeMobileNav();
                          }}
                          style={{
                            display: "block",
                            width: "100%",
                            textAlign: "left",
                            padding: "8px 12px",
                            border: "none",
                            background: role === currentRole ? "var(--amber-light)" : "transparent",
                            cursor: "pointer",
                            fontSize: "0.9rem"
                          }}
                        >
                          {role.replace("_", " ")}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  className="linklike"
                  onClick={() => {
                    logout();
                    navigate("/");
                    closeMobileNav();
                  }}
                >
                  {t("nav.signOut")}
                </button>
              </>
            )}
            {!loading && !user && (
              <>
                <Link to="/login" onClick={closeMobileNav}>{t("nav.signIn")}</Link>
                <Link to="/register" className="btn btn-primary btn-sm" onClick={closeMobileNav}>{t("nav.join")}</Link>
              </>
            )}
            <LanguageSwitcher />
          </nav>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/browse" element={<Browse />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/business/:id" element={<BusinessDetail />} />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } />

        <Route
          path="/dashboard/customer"
          element={
            <ProtectedRoute roles={["CUSTOMER"]}>
              <CustomerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/business"
          element={
            <ProtectedRoute roles={["BUSINESS_OWNER"]}>
              <BusinessOwnerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/employee"
          element={
            <ProtectedRoute roles={["EMPLOYEE"]}>
              <EmployeeDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/admin"
          element={
            <ProtectedRoute roles={["ADMIN"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}
