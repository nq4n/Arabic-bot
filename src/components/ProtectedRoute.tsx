import { Navigate } from "react-router-dom";
import { ReactElement } from "react";
import type { UserRole } from "../App"; // or copy the type if this import causes issues

interface ProtectedRouteProps {
  userRole: UserRole;
  isRoleLoading: boolean; // Add this new prop
  requiredRole?: UserRole[];
  children: ReactElement;
}

export default function ProtectedRoute({
  userRole,
  isRoleLoading, // Destructure the new prop
  requiredRole,
  children,
}: ProtectedRouteProps) {

  // NEW: Wait until the role is loaded before doing anything
  if (isRoleLoading) {
    return <div className="container">تحميل...</div>; 
  }

  // 1) Not logged in -> go to login
  if (!userRole) {
    return <Navigate to="/login" replace />;
  }

  // 2) If there is a requiredRole list, check if userRole is allowed
  if (requiredRole && !requiredRole.includes(userRole)) {
    const defaultPath =
      userRole === "admin" || userRole === "teacher" ? "/teacher" : "/";
    return <Navigate to={defaultPath} replace />;
  }

  // 3) Authorized -> render content
  return children;
}
