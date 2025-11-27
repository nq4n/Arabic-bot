import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);

  useEffect(() => {
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session) {
        const role = session.user?.user_metadata?.role || 'student';
        setUserRole(role);
        // Check for first login
        if (session.user?.user_metadata?.is_first_login) {
          setShowChangePassword(true);
        }
      }
      setIsLoading(false);
    };

    getSession();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        const role = session.user?.user_metadata?.role || 'student';
        setUserRole(role);
        if (_event === 'SIGNED_IN' && session.user?.user_metadata?.is_first_login) {
          setShowChangePassword(true);
        }
      } else {
        setUserRole(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handlePasswordChanged = async () => {
      await supabase.auth.updateUser({
          data: { is_first_login: false }
      });
      setShowChangePassword(false);
  };

  if (isLoading) {
    return <div>تحميل...</div>;
  }

  if (showChangePassword && session) {
      return <FirstLoginChangePassword onPasswordChanged={handlePasswordChanged} />
  }

  return (
    <ThemeProvider>
      <Router>
        <div className="App">
          <Navbar session={session} userRole={userRole} />
          <main>
            <Routes>
              <Route path="/login" element={<Login />} />

              {/* Protected Routes */}
              <Route path="/" element={<ProtectedRoute userRole={userRole}><Topics /></ProtectedRoute>} />
              <Route path="/topic/:topicId" element={<ProtectedRoute userRole={userRole}><Topic /></ProtectedRoute>} />
              <Route path="/lesson-review/:topicId" element={<ProtectedRoute userRole={userRole}><LessonReview /></ProtectedRoute>} />
              <Route path="/evaluate/:topicId" element={<ProtectedRoute userRole={userRole}><Evaluate /></ProtectedRoute>} />
              <Route path="/my-submissions" element={<ProtectedRoute userRole={userRole}><MySubmissions /></ProtectedRoute>} />

              {/* Teacher and Admin Routes */}
              <Route 
                path="/teacher" 
                element={
                  <ProtectedRoute userRole={userRole} requiredRole="teacher">
                    <TeacherPanel />
                  </ProtectedRoute>
                }
              />
              
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
