import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="container page">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) {
    return (
      <div className="container page">
        <div className="alert alert-error">
          Your account ({user.role.replace("_", " ").toLowerCase()}) doesn't have access to this page.
        </div>
      </div>
    );
  }
  return children;
}
