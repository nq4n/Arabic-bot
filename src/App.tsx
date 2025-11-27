import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

import Topics from "./pages/Topics";
import Evaluate from "./pages/Evaluate";
import Login from "./pages/Login";
import Topic from "./pages/topic";
import TeacherPanel from "./pages/TeacherPanel";
import FirstLoginChangePassword from "./components/FirstLoginChangePassword";
import LessonReview from "./pages/LessonReview";
import MySubmissions from "./pages/MySubmissions";

import { supabase } from "./supabaseClient";
import type { Session } from "@supabase/supabase-js";

type UserRole = "student" | "teacher" | "admin" | null;

type ProtectedRouteProps = {
  session: Session | null;
  children: React.ReactNode;
};

function ProtectedRoute({
  session,
  children,
}: ProtectedRouteProps) {
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppInner() {
  const location = useLocation();
  const showNavbar = location.pathname !== "/login";

  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session || null);
      setLoadingAuth(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchRole = async () => {
      if (!session) {
        setRole(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();

      if (!error && data?.role) {
        setRole(data.role as UserRole);
      } else {
        const metaRole = (session.user.user_metadata as any)?.role;
        setRole(metaRole || null);
      }
    };

    fetchRole();
  }, [session]);

  if (loadingAuth) {
    return <div style={{ padding: "2rem" }}>...جارِ تحميل البيانات</div>;
  }

  return (
    <>
      {showNavbar && <Navbar session={session} />}

      <main>
        <Routes>
          <Route
            path="/login"
            element={session ? <Navigate to="/" replace /> : <Login />}
          />

          <Route
            path="/first-login"
            element={
              <ProtectedRoute session={session}>
                <FirstLoginChangePassword />
              </ProtectedRoute>
            }
          />

          <Route
            path="/"
            element={
              <ProtectedRoute session={session}>
                <Topics />
              </ProtectedRoute>
            }
          />

          <Route path="/topics" element={<Navigate to="/" replace />} />

          <Route
            path="/evaluate/:topicId/:submissionId?"
            element={
              <ProtectedRoute session={session}>
                {role === "student" ? <Evaluate /> : <Navigate to="/" replace />}
              </ProtectedRoute>
            }
          />

          <Route
            path="/topic/:topicId"
            element={
              <ProtectedRoute session={session}>
                <Topic />
              </ProtectedRoute>
            }
          />

          <Route
            path="/lesson-review/:topicId"
            element={
              <ProtectedRoute session={session}>
                <LessonReview />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/my-submissions"
            element={
              <ProtectedRoute session={session}>
                <MySubmissions />
              </ProtectedRoute>
            }
          />

          <Route
            path="/teacher/panel"
            element={
              <ProtectedRoute session={session}>
                {role === "teacher" || role === "admin" ? (
                  <TeacherPanel />
                ) : (
                  <Navigate to="/" replace />
                )}
              </ProtectedRoute>
            }
          />

          <Route
            path="*"
            element={
              session ? (
                <Navigate to="/" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </main>

      {showNavbar && <Footer />}
    </>
  );
}

function Root() {
  return (
    <Router>
      <AppInner />
    </Router>
  );
}

export default Root;
