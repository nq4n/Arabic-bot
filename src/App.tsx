import { lazy, Suspense, useEffect, useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { ThemeProvider } from "./hooks/ThemeContext";
import { useSession } from "./hooks/SessionContext";
import { PreviewProvider, usePreview } from "./hooks/PreviewContext";
import { isPreviewMode, setPreviewMode as persistPreviewMode } from "./utils/lessonSettings";

import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import ProtectedRoute from "./components/ProtectedRoute";
import AchievementToast from "./components/AchievementToast";
import SkeletonPage from "./components/SkeletonPage";

import FirstLoginChangePassword from "./components/FirstLoginChangePassword";

const Topics = lazy(() => import("./pages/lessons/Topics"));
const Topic = lazy(() => import("./pages/lessons/topic"));
const LessonReview = lazy(() => import("./pages/lessons/LessonReview"));
const Evaluate = lazy(() => import("./pages/lessons/Evaluate"));
const Login = lazy(() => import("./pages/auth/Login"));
const TeacherPanel = lazy(() => import("./pages/teacher/TeacherPanel"));
const MySubmissions = lazy(() => import("./pages/student/MySubmissions"));
const Submissions = lazy(() => import("./pages/teacher/Submissions"));
const ActivitySubmissionsPage = lazy(() => import("./pages/teacher/ActivitySubmissionsPage"));
const SubmissionReview = lazy(() => import("./pages/teacher/SubmissionReview"));
const StudentProgress = lazy(() => import("./pages/teacher/StudentProgress"));
const AboutUs = lazy(() => import("./pages/shared/AboutUs"));
const ChatCenter = lazy(() => import("./pages/shared/ChatCenter"));
const Profile = lazy(() => import("./pages/student/Profile"));
const LandscapeDescriptionTutorial = lazy(() => import("./pages/activities/LandscapeDescriptionTutorial"));
const Activity = lazy(() => import("./pages/activities/Activity"));

export type UserRole = "student" | "teacher" | "admin" | null;

function LegacyActivityRouteRedirect() {
  const { topicId } = useParams<{ topicId: string }>();

  if (!topicId) {
    return <Navigate to="/" replace />;
  }

  return <Navigate to={`/activity/${topicId}/tutorial`} replace />;
}

const AppContent = () => {
  const {
    session,
    profile,
    loading: isSessionLoading,
    userRole,
  } = useSession();
  const { isPreview } = usePreview();
  // Routing must follow the persisted flag (synchronous) so that exiting
  // preview immediately grants access to teacher routes — relying on the React
  // state alone would lag one render and bounce the teacher back into preview.
  const previewActive = isPreviewMode();
  const [passwordChangeDismissed, setPasswordChangeDismissed] = useState(false);
  const [isOnline, setIsOnline] = useState(window.navigator.onLine);

  const location = useLocation();
  const reactNavigate = useNavigate();
  const isLoginPage = location.pathname === "/login";

  const urlParams = new URLSearchParams(location.search);
  const wantsExit = urlParams.get("exit-preview") === "1";
  useEffect(() => {
    if (wantsExit) {
      persistPreviewMode(false);
      const cleanUrl = location.pathname;
      reactNavigate(cleanUrl, { replace: true });
    }
  }, [wantsExit, location.pathname, reactNavigate]);

  // In preview mode a teacher/admin browses the site as a student, so treat the
  // role as "student" for navigation/routing. Even when not signed in we must
  // not re-route through teacher pages while preview is being toggled.
  const effectiveRole: UserRole = previewActive ? "student" : userRole;
  const routingRole: UserRole = previewActive ? "student" : userRole;

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    setPasswordChangeDismissed(false);
  }, [session?.user.id]);

  const handlePasswordChanged = () => {
    setPasswordChangeDismissed(true);
  };

  if (isSessionLoading) {
    return <SkeletonPage />;
  }

  const showChangePassword = Boolean(
    session && profile?.must_change_password && !passwordChangeDismissed
  );
  const isRoleLoading = isSessionLoading;

  if (showChangePassword && session) {
    return (
      <div key={location.pathname} className="fade-in-page">
        <FirstLoginChangePassword onPasswordChanged={handlePasswordChanged} />
      </div>
    );
  }

  const isAuthenticated = !!session;
  const defaultPath =
    effectiveRole === "admin" || effectiveRole === "teacher" ? "/teacher" : "/";

  return (
    <div
      key={location.pathname}
      className={`App fade-in-page ${isLoginPage ? "login-view" : ""}`}
    >
      {!isLoginPage && (
        <Navbar
          session={session}
          userRole={routingRole}
          isPreview={isPreview}
          onExitPreview={() => {
            persistPreviewMode(false);
            window.location.href = "/teacher";
          }}
        />
      )}
      {!isOnline && (
        <div className="offline-banner">
          <i className="fas fa-wifi-slash"></i>
          <span>أنت الآن غير متصل بالإنترنت. قد لا تعمل بعض الميزات بشكل صحيح.</span>
        </div>
      )}
      <AchievementToast />

      <main className={isPreview ? "preview-active-main" : ""}>
        <Suspense fallback={<SkeletonPage />}>
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
                userRole={routingRole}
                isRoleLoading={isRoleLoading} // Pass the loading state
                requiredRole={["student", "admin", "teacher"]}
              >
                {!isPreview &&
                (userRole === "admin" || userRole === "teacher") ? (
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
              <ProtectedRoute userRole={routingRole} isRoleLoading={isRoleLoading} requiredRole={["student"]}>
                <Topic />
              </ProtectedRoute>
            }
          />
          <Route
            path="/lesson-review/:topicId"
            element={
              <ProtectedRoute userRole={routingRole} isRoleLoading={isRoleLoading} requiredRole={["student"]}>
                <LessonReview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/collaborative-activity/:topicId"
            element={
              <ProtectedRoute userRole={routingRole} isRoleLoading={isRoleLoading} requiredRole={["student"]}>
                <LegacyActivityRouteRedirect />
              </ProtectedRoute>
            }
          />
          <Route
            path="/peer-dialogue/:topicId"
            element={
              <ProtectedRoute userRole={routingRole} isRoleLoading={isRoleLoading} requiredRole={["student"]}>
                <LegacyActivityRouteRedirect />
              </ProtectedRoute>
            }
          />
          <Route
            path="/report-assembly/:topicId"
            element={
              <ProtectedRoute userRole={routingRole} isRoleLoading={isRoleLoading} requiredRole={["student"]}>
                <LegacyActivityRouteRedirect />
              </ProtectedRoute>
            }
          />
          <Route
            path="/activity/:topicId/tutorial"
            element={
              <ProtectedRoute userRole={routingRole} isRoleLoading={isRoleLoading} requiredRole={["student"]}>
                <LandscapeDescriptionTutorial />
              </ProtectedRoute>
            }
          />
          <Route
            path="/activity/:topicId"
            element={
              <ProtectedRoute userRole={routingRole} isRoleLoading={isRoleLoading} requiredRole={["student"]}>
                <LandscapeDescriptionTutorial />
              </ProtectedRoute>
            }
          />
          <Route
            path="/activity/:topicId/task"
            element={
              <ProtectedRoute userRole={routingRole} isRoleLoading={isRoleLoading} requiredRole={["student"]}>
                <Activity />
              </ProtectedRoute>
            }
          />
          <Route
            path="/evaluate/:topicId"
            element={
              <ProtectedRoute userRole={routingRole} isRoleLoading={isRoleLoading} requiredRole={["student"]}>
                <Evaluate />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-submissions"
            element={
              <ProtectedRoute userRole={routingRole} isRoleLoading={isRoleLoading} requiredRole={["student"]}>
                <MySubmissions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/submission/:submissionId"
            element={
              <ProtectedRoute userRole={routingRole} isRoleLoading={isRoleLoading} requiredRole={["student", "teacher", "admin"]}>
                <SubmissionReview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/teacher"
            element={
              <ProtectedRoute
                userRole={routingRole}
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
                userRole={routingRole}
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
                userRole={routingRole}
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
                userRole={routingRole}
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
                userRole={routingRole}
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
                userRole={routingRole}
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
                userRole={routingRole}
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
        </Suspense>
      </main>

      {!isLoginPage && <Footer />}
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <PreviewProvider>
        <Router>
          <AppContent />
        </Router>
      </PreviewProvider>
    </ThemeProvider>
  );
}

export default App;
