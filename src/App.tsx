import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './hooks/ThemeContext';
import useAuth from './hooks/useAuth';

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

import './styles/global.css';

function App() {
  const { userRole, isLoading, session } = useAuth();

  // Wait until the auth state is loaded
  if (isLoading) {
    return <div>Loading...</div>; // Or a proper spinner component
  }

  return (
    <ThemeProvider>
      <Router>
        <div className="App">
          <Navbar userRole={userRole} />
          <main>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />

              {/* Protected Routes for All Logged-in Users */}
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

              {/* Fallback for unknown routes - maybe a 404 page */}
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
