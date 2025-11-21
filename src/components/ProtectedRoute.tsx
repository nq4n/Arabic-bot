import { Navigate } from "react-router-dom";
import { ReactNode } from "react";

type Props = {
  requiredRole?: string;        // "teacher" | "admin" | "student"
  userRole: string | null;
  children: ReactNode;
};

export default function ProtectedRoute({ requiredRole, userRole, children }: Props) {
  // لو ما فيه مستخدم أساسًا → روح للـ login
  if (!userRole) return <Navigate to="/login" replace />;

  // لو الصفحة لها دور محدد
  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
}
