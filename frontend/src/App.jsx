import { Routes, Route, Link, useNavigate } from "react-router-dom";
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
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import NotificationBell from "./components/NotificationBell.jsx";
import LanguageSwitcher from "./components/LanguageSwitcher.jsx";

const DASHBOARD_BY_ROLE = {
  CUSTOMER: "/dashboard/customer",
  BUSINESS_OWNER: "/dashboard/business",
  EMPLOYEE: "/dashboard/employee",
  ADMIN: "/dashboard/admin",
};

export default function App() {
  const { user, logout, loading } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  return (
    <div>
      <header className="topbar">
        <div className="container">
          <Link to="/" className="brand">
            Nearby<span className="dot">•</span>
          </Link>
          <nav className="nav-links">
            <Link to="/">{t("nav.discover")}</Link>
            {!loading && user && (
              <>
                <Link to={DASHBOARD_BY_ROLE[user.role]}>{t("nav.dashboard")}</Link>
                <Link to="/settings">{t("nav.settings")}</Link>
                <NotificationBell />
                <span className="role-badge">{user.role.replace("_", " ")}</span>
                <button
                  className="linklike"
                  onClick={() => {
                    logout();
                    navigate("/");
                  }}
                >
                  {t("nav.signOut")}
                </button>
              </>
            )}
            {!loading && !user && (
              <>
                <Link to="/login">{t("nav.signIn")}</Link>
                <Link to="/register">
                  <button className="btn btn-primary btn-sm">{t("nav.join")}</button>
                </Link>
              </>
            )}
            <LanguageSwitcher />
          </nav>
        </div>
      </header>

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
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
