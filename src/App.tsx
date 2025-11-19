
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Topics from './pages/Topics';
import Evaluate from './pages/Evaluate';
import Login from './pages/Login';
import Chat from './components/Chat';
import Topic from './pages/topic';
import { supabase } from './supabaseClient';
import { Session } from '@supabase/supabase-js';

function App() {
  const location = useLocation();
  const showNavbar = location.pathname !== '/login';
  const [session, setSession] = useState<Session | null>(null);

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

  return (
    <>
      {showNavbar && <Navbar session={session} />}
      <main>
        <Routes>
          <Route path="/login" element={<Login />} />
          {session ? (
            <>
              <Route path="/" element={<Topics />} />
              <Route path="/evaluate/:topicId/:submissionId?" element={<Evaluate />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/topic/:topicId" element={<Topic />} />
            </>
          ) : (
            <Route path="*" element={<Navigate to="/login" />} />
          )}
        </Routes>
      </main>
      {showNavbar && <Footer />}
    </>
  );
}

function Root() {
    return (
        <Router>
            <App />
        </Router>
    )
}

export default Root;
