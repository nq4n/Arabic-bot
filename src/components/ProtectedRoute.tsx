import { Navigate } from "react-router-dom";
import { ReactElement } from "react";
import type { UserRole } from "../App"; // or copy the type if this import causes issues

interface ProtectedRouteProps {
  userRole: UserRole;          // "student" | "teacher" | "admin" | null
  requiredRole?: UserRole[];   // allowed roles list (optional)
  children: ReactElement;
}

export default function ProtectedRoute({
  userRole,
  requiredRole,
  children,
}: ProtectedRouteProps) {
  // 1) Not logged in -> go to login
  if (!userRole) {
    return <Navigate to="/login" replace />;
  }

  // 2) If there is a requiredRole list, check if userRole is allowed
  if (requiredRole && !requiredRole.includes(userRole)) {
    // decide default page based on role
    const defaultPath =
      userRole === "admin" || userRole === "teacher" ? "/teacher" : "/";

    return <Navigate to={defaultPath} replace />;
  }

  // 3) Authorized -> render content
  return children;
}
