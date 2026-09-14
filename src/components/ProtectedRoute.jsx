import { Navigate } from "react-router";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({ allowedRoles, children }) {
  const { session, profile, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(profile?.role)) {
    return <Navigate to="/unauthorized" replace />;
  }
  return children;
}