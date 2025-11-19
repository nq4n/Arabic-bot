import { NavLink } from 'react-router-dom';
import { useTheme } from '../hooks/ThemeContext';
import '../styles/Navbar.css';

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          <NavLink to="/">أ</NavLink>
          <h1>منصّة تطوير الكتابة العربية</h1>
        </div>
        <div className="navbar-links">
          <NavLink to="/">الموضوعات</NavLink>
          <NavLink to="/topic/1">الدرس</NavLink>
          <NavLink to="/write/1">الكتابة</NavLink>
          <NavLink to="/evaluate/1">التقييم</NavLink>
          <NavLink to="/teacher">صفحة المعلم</NavLink>
        </div>
        <div className="navbar-actions">
          <button onClick={toggleTheme} className="theme-toggle">
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <div className="user-pill">طالب</div>
        </div>
      </div>
    </nav>
  );
}
