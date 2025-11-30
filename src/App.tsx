import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { Session } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";
import { ThemeProvider } from "./hooks/ThemeContext";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";

// Pages
import Topics from "./pages/Topics";
import Topic from "./pages/topic";
import LessonReview from "./pages/LessonReview";
import Evaluate from "./pages/Evaluate";
import Login from "./pages/Login";
import TeacherPanel from "./pages/TeacherPanel";
import MySubmissions from "./pages/MySubmissions";
import Submissions from "./pages/Submissions";
import SubmissionReview from "./pages/SubmissionReview"; 
import FirstLoginChangePassword from "./components/FirstLoginChangePassword";

export type UserRole = "student" | "teacher" | "admin" | null;

const AppContent = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [isRoleLoading, setIsRoleLoading] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);

  const location = useLocation();
  const isLoginPage = location.pathname === "/login";

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsSessionLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (isSessionLoading) return;

    const fetchUserProfile = async () => {
      if (!session) {
        setUserRole(null);
        setShowChangePassword(false);
        setIsRoleLoading(false);
        return;
      }

      setIsRoleLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("role, must_change_password")
        .eq("id", session.user.id)
        .single();

      if (error) {
        console.error("Error fetching user profile:", error);
        setUserRole(null);
        setShowChangePassword(false);
      } else if (data) {
        setUserRole(data.role as UserRole);
        setShowChangePassword(data.must_change_password);
      }
      setIsRoleLoading(false);
    };

    fetchUserProfile();
  }, [session, isSessionLoading]);

  const handlePasswordChanged = () => {
    setShowChangePassword(false);
  };

  if (isSessionLoading) {
    return <div className="container">تحميل...</div>;
  }

  if (showChangePassword && session) {
    return (
      <div key={location.pathname} className="fade-in-page">
        <FirstLoginChangePassword onPasswordChanged={handlePasswordChanged} />
      </div>
    );
  }

  const isAuthenticated = !!session;
  const defaultPath =
    userRole === "admin" || userRole === "teacher" ? "/teacher" : "/";

  return (
    <div
      key={location.pathname}
      className={`App fade-in-page ${isLoginPage ? "login-view" : ""}`}
    >
      {!isLoginPage && <Navbar session={session} userRole={userRole} />}

      <main>
        <Routes>
          <Route
            path="/login"
            element={
              isAuthenticated ? <Navigate to={defaultPath} replace /> : <Login />
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute
                userRole={userRole}
                isRoleLoading={isRoleLoading} // Pass the loading state
                requiredRole={["student", "admin", "teacher"]}
              >
                {userRole === "admin" || userRole === "teacher" ? (
                  <Navigate to="/teacher" replace />
                ) : (
                  <Topics />
                )}
              </ProtectedRoute>
            }
          />
          <Route
            path="/topic/:topicId"
            element={
              <ProtectedRoute userRole={userRole} isRoleLoading={isRoleLoading} requiredRole={["student"]}>
                <Topic />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lesson-review/:topicId"
            element={
              <ProtectedRoute userRole={userRole} isRoleLoading={isRoleLoading} requiredRole={["student"]}>
                <LessonReview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/evaluate/:topicId"
            element={
              <ProtectedRoute userRole={userRole} isRoleLoading={isRoleLoading} requiredRole={["student"]}>
                <Evaluate />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-submissions"
            element={
              <ProtectedRoute userRole={userRole} isRoleLoading={isRoleLoading} requiredRole={["student"]}>
                <MySubmissions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/submission/:submissionId"
            element={
              <ProtectedRoute userRole={userRole} isRoleLoading={isRoleLoading} requiredRole={["student", "teacher", "admin"]}>
                <SubmissionReview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher"
            element={
              <ProtectedRoute
                userRole={userRole}
                isRoleLoading={isRoleLoading}
                requiredRole={["teacher", "admin"]}
              >
                <TeacherPanel />
              </ProtectedRoute>
            }
          />
          <Route
            path="/submissions"
            element={
              <ProtectedRoute
                userRole={userRole}
                isRoleLoading={isRoleLoading}
                requiredRole={["teacher", "admin"]}
              >
                <Submissions />
              </ProtectedRoute>
            }
          />
          <Route
            path="*"
            element={
              isAuthenticated ? (
                <Navigate to={defaultPath} replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </main>

      {!isLoginPage && <Footer />}
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <Router>
        <AppContent />
      </Router>
    </ThemeProvider>
  );
}

export default App;
