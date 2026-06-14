import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

interface Props {
  children: React.ReactNode;
  // "STAFF" = back-office (ADMIN ou TEACHER)
  requiredRole?: "ADMIN" | "STUDENT" | "STAFF";
}

export default function ProtectedRoute({ children, requiredRole }: Props) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-ms-cream flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-ms-lavender border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-ms-gray text-lg font-medium">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const isStaff = user.role === "ADMIN" || user.role === "TEACHER";
  const allowed =
    !requiredRole ||
    (requiredRole === "STAFF" ? isStaff : user.role === requiredRole);

  if (!allowed) {
    return <Navigate to={isStaff ? "/admin" : "/dashboard"} replace />;
  }

  return <>{children}</>;
}
