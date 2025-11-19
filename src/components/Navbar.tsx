
import { NavLink } from 'react-router-dom';
import { useTheme } from '../hooks/ThemeContext';
import '../styles/Navbar.css';
import '../styles/global.css'
import { supabase } from '../supabaseClient';
import { Session } from '@supabase/supabase-js';

export default function Navbar({ session }: { session: Session | null }) {
  const { theme, toggleTheme } = useTheme();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          <NavLink to={"/"}><h1 style={{ fontFamily: "title" }}>صَياغ</h1></NavLink>
        </div>
        <div className="navbar-links">
          <NavLink to="">الموضوعات</NavLink>
          <NavLink to="/evaluate/1">تسليماتي</NavLink>
        </div>
        <div className="navbar-actions">
          <button onClick={toggleTheme} className="theme-toggle">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          {session && (
            <>
              <div className="user-pill">طالب</div>
              <button onClick={handleLogout} className="logout-button">تسجيل الخروج</button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
