import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="container page">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  
  // Check against currentRole (active role) or legacy role field
  const currentRole = user.currentRole || user.role;
  if (roles && !roles.includes(currentRole)) {
    return (
      <div className="container page">
        <div className="alert alert-error">
          Your account ({currentRole.replace("_", " ").toLowerCase()}) doesn't have access to this page.
        </div>
      </div>
    );
  }
  return children;
}
