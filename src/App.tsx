import { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useParams,
} from "react-router-dom";
import { Session } from "@supabase/supabase-js";
import { supabase } from "./supabaseClient";
import { ThemeProvider } from "./hooks/ThemeContext";
import { SessionProvider } from "./hooks/SessionContext";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import AchievementToast from "./components/AchievementToast";
import SkeletonPage from "./components/SkeletonPage";

// Pages
import Topics from "./pages/lessons/Topics";
import Topic from "./pages/lessons/topic";
import LessonReview from "./pages/lessons/LessonReview";
import Evaluate from "./pages/lessons/Evaluate";
import Login from "./pages/auth/Login";
import TeacherPanel from "./pages/teacher/TeacherPanel";
import MySubmissions from "./pages/student/MySubmissions";
import Submissions from "./pages/teacher/Submissions";
import ActivitySubmissionsPage from "./pages/teacher/ActivitySubmissionsPage";
import SubmissionReview from "./pages/teacher/SubmissionReview";
import StudentProgress from "./pages/teacher/StudentProgress";
import AboutUs from "./pages/shared/AboutUs";
import FirstLoginChangePassword from "./components/FirstLoginChangePassword";
import ChatCenter from "./pages/shared/ChatCenter";
import Profile from "./pages/student/Profile";
import LandscapeDescriptionTutorial from "./pages/activities/LandscapeDescriptionTutorial";
import Activity from "./pages/activities/Activity";

export type UserRole = "student" | "teacher" | "admin" | null;

function LegacyActivityRouteRedirect() {
  const { topicId } = useParams<{ topicId: string }>();

  if (!topicId) {
    return <Navigate to="/" replace />;
  }

  return <Navigate to={`/activity/${topicId}/tutorial`} replace />;
}

const AppContent = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [isRoleLoading, setIsRoleLoading] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);

  const location = useLocation();
  const isLoginPage = location.pathname === "/login";

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsSessionLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
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

      // Skip fetch if offline to avoid ERR_INTERNET_DISCONNECTED logs
      if (!window.navigator.onLine) {
        setIsRoleLoading(false);
        return;
      }

      setIsRoleLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("role, must_change_password")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error) {
          // Suppress "Failed to fetch" noise when offline
          if (error.message === 'TypeError: Failed to fetch' || !window.navigator.onLine) {
            // Quietly fail
          } else {
            console.error("Error fetching user profile:", error);
          }
          setUserRole(null);
          setShowChangePassword(false);
        } else if (data) {
          setUserRole(data.role as UserRole);
          setShowChangePassword(data.must_change_password);
        }
      } catch (err: any) {
        if (err.message !== 'TypeError: Failed to fetch') {
          console.error("Unexpected error in fetchUserProfile:", err);
        }
      } finally {
        setIsRoleLoading(false);
      }
    };

    fetchUserProfile();
  }, [session, isSessionLoading]);

  const handlePasswordChanged = () => {
    setShowChangePassword(false);
  };

  if (isSessionLoading) {
    return <SkeletonPage />;
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
      {!isOnline && (
        <div className="offline-banner">
          <i className="fas fa-wifi-slash"></i>
          <span>أنت الآن غير متصل بالإنترنت. قد لا تعمل بعض الميزات بشكل صحيح.</span>
        </div>
      )}
      <AchievementToast />

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
            path="/collaborative-activity/:topicId"
            element={
              <ProtectedRoute userRole={userRole} isRoleLoading={isRoleLoading} requiredRole={["student"]}>
                <LegacyActivityRouteRedirect />
              </ProtectedRoute>
            }
          />
          <Route
            path="/peer-dialogue/:topicId"
            element={
              <ProtectedRoute userRole={userRole} isRoleLoading={isRoleLoading} requiredRole={["student"]}>
                <LegacyActivityRouteRedirect />
              </ProtectedRoute>
            }
          />
          <Route
            path="/report-assembly/:topicId"
            element={
              <ProtectedRoute userRole={userRole} isRoleLoading={isRoleLoading} requiredRole={["student"]}>
                <LegacyActivityRouteRedirect />
              </ProtectedRoute>
            }
          />
          <Route
            path="/activity/:topicId/tutorial"
            element={
              <ProtectedRoute userRole={userRole} isRoleLoading={isRoleLoading} requiredRole={["student"]}>
                <LandscapeDescriptionTutorial />
              </ProtectedRoute>
            }
          />
          <Route
            path="/activity/:topicId"
            element={
              <ProtectedRoute userRole={userRole} isRoleLoading={isRoleLoading} requiredRole={["student"]}>
                <LandscapeDescriptionTutorial />
              </ProtectedRoute>
            }
          />
          <Route
            path="/activity/:topicId/task"
            element={
              <ProtectedRoute userRole={userRole} isRoleLoading={isRoleLoading} requiredRole={["student"]}>
                <Activity />
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
            path="/activity-submissions"
            element={
              <ProtectedRoute
                userRole={userRole}
                isRoleLoading={isRoleLoading}
                requiredRole={["teacher", "admin"]}
              >
                <ActivitySubmissionsPage />
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
            path="/student-progress"
            element={
              <ProtectedRoute
                userRole={userRole}
                isRoleLoading={isRoleLoading}
                requiredRole={["student", "teacher", "admin"]}
              >
                <StudentProgress />
              </ProtectedRoute>
            }
          />
          <Route
            path="/about"
            element={
              <ProtectedRoute
                userRole={userRole}
                isRoleLoading={isRoleLoading}
                requiredRole={["student", "teacher", "admin"]}
              >
                <AboutUs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chats"
            element={
              <ProtectedRoute
                userRole={userRole}
                isRoleLoading={isRoleLoading}
                requiredRole={["student", "teacher", "admin"]}
              >
                <ChatCenter />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute
                userRole={userRole}
                isRoleLoading={isRoleLoading}
                requiredRole={["student", "teacher", "admin"]}
              >
                <Profile />
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
      <SessionProvider>
        <Router>
          <AppContent />
        </Router>
      </SessionProvider>
    </ThemeProvider>
  );
}

export default App;
