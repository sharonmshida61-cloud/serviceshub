import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useLanguage } from "../context/LanguageContext.jsx";

export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const { t } = useLanguage();

  if (loading) return <div className="container page">{t("common.loading")}</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  // Check against currentRole (active role) or legacy role field
  const currentRole = user.currentRole || user.role;
  if (roles && !roles.includes(currentRole)) {
    return (
      <div className="container page">
        <div className="alert alert-error">
          {t("error.unauthorized")}
        </div>
      </div>
    );
  }
  return children;
}
