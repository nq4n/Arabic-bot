import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import TeacherPanel from "./pages/TeacherPanel";
import Topics from "./pages/Topics";
import Evaluate from "./pages/Evaluate";
import Login from "./pages/Login";
import Chat from "./components/Chat";
import Topic from "./pages/topic";

import { supabase } from "./supabaseClient";
import type { Session } from "@supabase/supabase-js";
import FirstLoginChangePassword from "./components/FirstLoginChangePassword";

// نوع الدور
type UserRole = "student" | "teacher" | "admin" | null;

// ✅ مكوّن لحماية الصفحات
type ProtectedRouteProps = {
  session: Session | null;
  userRole?: UserRole;
  requiredRole?: UserRole; // لو تركته فاضي → بس يتحقق من وجود session
  children: React.ReactNode;
};

function ProtectedRoute({
  session,
  userRole,
  requiredRole,
  children,
}: ProtectedRouteProps) {
  // لو ما فيه جلسة → رجّع المستخدم للـ login
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // لو محدد دور معيّن للصفحة (مثلاً طالب فقط) والمستخدم ليس من نفس الدور
  if (requiredRole && userRole && userRole !== requiredRole) {
    // نمنعه ونرجعه للصفحة الرئيسية
    return <Navigate to="/" replace />;
  }

  // مسموح يدخل
  return <>{children}</>;
}

// ✅ المكوّن الرئيسي للتطبيق
function App() {
  const location = useLocation();
  const showNavbar = location.pathname !== "/login";

  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);

  // جلب session من Supabase + متابعة تغيّرها
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // جلب دور المستخدم من جدول profiles
  useEffect(() => {
    const fetchRole = async () => {
      if (!session) {
        setRole(null);
        return;
      }

      const userId = session.user.id;

      // نحاول أولاً من جدول profiles
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (!error && profile?.role) {
        setRole(profile.role as UserRole);
        return;
      }

      // في حال ما وجدنا، نحاول نقرأ من user_metadata
      const metaRole = (session.user.user_metadata as any)?.role;
      if (metaRole) {
        setRole(metaRole as UserRole);
      } else {
        setRole(null);
      }
    };

    fetchRole();
  }, [session]);

  return (
    <>
      {showNavbar && <Navbar session={session} />}

      <main>
        <Routes>
          {/* صفحة تسجيل الدخول */}
          <Route path="/login" element={<Login />} />

          {/* صفحة تغيير كلمة المرور أول مرة (محمية، لكن بدون تقييد دور معيّن) */}
          <Route
            path="/first-login"
            element={
              <ProtectedRoute session={session}>
                <FirstLoginChangePassword />
              </ProtectedRoute>
            }
          />

          {/* الصفحة الرئيسية: متاحة لأي مستخدم مسجّل (طالب، معلم، أدمن) */}
          <Route
            path="/"
            element={
              <ProtectedRoute session={session}>
                <Topics />
              </ProtectedRoute>
            }
          />
          <Route path="/teacher/panel" element={<TeacherPanel />} />
          {/* صفحة تسليماتي: للطالب فقط */}
          <Route
            path="/evaluate/:topicId/:submissionId?"
            element={
              <ProtectedRoute
                session={session}
                userRole={role}
                requiredRole="student"
              >
                <Evaluate />
              </ProtectedRoute>
            }
          />

          {/* صفحة الشات: مفتوحة لكل المستخدمين المسجلين */}
          <Route
            path="/chat"
            element={
              <ProtectedRoute session={session}>
                <Chat />
              </ProtectedRoute>
            }
          />

          {/* صفحة موضوع واحد: مفتوحة لكل المستخدمين المسجلين */}
          <Route
            path="/topic/:topicId"
            element={
              <ProtectedRoute session={session}>
                <Topic />
              </ProtectedRoute>
            }
          />

          {/* أي مسار غير معروف → رجوع حسب الحالة */}
          <Route
            path="*"
            element={
              session ? <Navigate to="/" replace /> : <Navigate to="/login" replace />
            }
          />
        </Routes>
      </main>

      {showNavbar && <Footer />}
    </>
  );
}

// ✅ الجذر الذي يغلّف التطبيق بالـ Router
function Root() {
  return (
    <Router>
      <App />
    </Router>
  );
}

export default Root;
