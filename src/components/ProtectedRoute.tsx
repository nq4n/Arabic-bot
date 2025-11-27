import { Navigate } from "react-router-dom";
import { ReactNode } from "react";

type Props = {
  requiredRole?: string;
  userRole: string | null;
  children: ReactNode;
};

export default function ProtectedRoute({ requiredRole, userRole, children }: Props) {
  // If the user is not logged in, redirect to the login page.
  if (!userRole) {
    return <Navigate to="/login" replace />;
  }

  // If a specific role is required, check if the user has that role.
  // We also allow the 'admin' to access 'teacher' routes.
  if (requiredRole) {
    const isAuthorized = 
      userRole === requiredRole || 
      (requiredRole === 'teacher' && userRole === 'admin');

    if (!isAuthorized) {
      // If not authorized, redirect to the main page.
      return <Navigate to="/" replace />;
    }
  }

  // If all checks pass, render the children components.
  return <>{children}</>;
}
