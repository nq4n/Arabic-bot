import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Session } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';
import { ThemeProvider } from './hooks/ThemeContext';

import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

// Page Imports
import Topics from './pages/Topics';
import Topic from './pages/topic';
import LessonReview from './pages/LessonReview';
import Evaluate from './pages/Evaluate';
import Login from './pages/Login';
import TeacherPanel from './pages/TeacherPanel';
import MySubmissions from './pages/MySubmissions';
import FirstLoginChangePassword from './components/FirstLoginChangePassword';

import './styles/global.css';

const AppContent = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const isLoginPage = location.pathname === '/login';

  // Effect 1: Manages session state from Supabase.
  useEffect(() => {
    // On initial load, get the session.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUserRole(session?.user?.user_metadata?.role || null);
      if (session?.user?.user_metadata?.is_first_login) {
        setShowChangePassword(true);
      }
      setIsLoading(false);
    });

    // Set up a listener for auth events (SIGN_IN, SIGN_OUT).
    // This listener only updates state, it does NOT navigate.
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUserRole(session?.user?.user_metadata?.role || null);
      // Handle the first-login case
      if (_event === 'SIGNED_IN' && session?.user?.user_metadata?.is_first_login) {
        setShowChangePassword(true);
      } else if (_event === 'SIGNED_OUT') {
        setShowChangePassword(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []); // Runs only once on mount.

  // Effect 2: Reacts to state changes to perform all navigation.
  useEffect(() => {
    if (isLoading) return; // Wait for the initial session check.
    if (showChangePassword) return; // Don't navigate while password change is required.

    const currentPath = location.pathname;

    if (session) {
      // User is logged in.
      const targetPath = (userRole === 'admin' || userRole === 'teacher') ? '/teacher' : '/';
      if (currentPath !== targetPath) {
        // If the user is on the login page, or any other "wrong" page, redirect them.
        navigate(targetPath);
      }
    } else {
      // User is not logged in.
      // If they are not on the login page, redirect them there.
      if (currentPath !== '/login') {
        navigate('/login');
      }
    }
  }, [session, userRole, isLoading, showChangePassword, navigate]);


  const handlePasswordChanged = async () => {
    await supabase.auth.updateUser({ data: { is_first_login: false } });
    setShowChangePassword(false);
    // The navigation effect will automatically redirect the user after the state updates.
  };

  if (isLoading) {
    return <div className="container fade-in-page">تحميل...</div>;
  }

  if (showChangePassword) {
    return <FirstLoginChangePassword onPasswordChanged={handlePasswordChanged} />;
  }

  return (
    <div className={`App ${isLoginPage ? 'login-view' : ''}`}>
      {!isLoginPage && <Navbar session={session} userRole={userRole} />}
      <main>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<ProtectedRoute userRole={userRole} requiredRole={['student', 'admin', 'teacher']}><Topics /></ProtectedRoute>} />
          <Route path="/topic/:topicId" element={<ProtectedRoute userRole={userRole} requiredRole={['student', 'admin', 'teacher']}><Topic /></ProtectedRoute>} />
          <Route path="/lesson-review/:topicId" element={<ProtectedRoute userRole={userRole} requiredRole={['student', 'admin', 'teacher']}><LessonReview /></ProtectedRoute>} />
          <Route path="/evaluate/:topicId" element={<ProtectedRoute userRole={userRole} requiredRole={['student', 'admin', 'teacher']}><Evaluate /></ProtectedRoute>} />
          <Route path="/my-submissions" element={<ProtectedRoute userRole={userRole} requiredRole={['student', 'admin', 'teacher']}><MySubmissions /></ProtectedRoute>} />

          <Route 
            path="/teacher"
            element={
              <ProtectedRoute userRole={userRole} requiredRole={['teacher', 'admin']}>
                <TeacherPanel />
              </ProtectedRoute>
            }
          />
          
          <Route path="*" element={<Navigate to={session ? "/" : "/login"} />} />
        </Routes>
      </main>
      {!isLoginPage && <Footer />}
    </div>
  );
}

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
