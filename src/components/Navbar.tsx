import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTheme } from '../hooks/useTheme';
import '../styles/Navbar.css';

const Navbar: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <NavLink to="/">أ</NavLink>
      </div>
      <div className="navbar-title">
        <NavLink to="/">منصّة تطوير الكتابة العربية</NavLink>
      </div>
      <ul className="navbar-links">
        <li><NavLink to="/" end>الموضوعات</NavLink></li>
        <li><NavLink to="/topic/1">الدرس</NavLink></li>
        <li><NavLink to="/write/1">الكتابة</NavLink></li>
        <li><NavLink to="/evaluate/1">التقييم</NavLink></li>
        <li><NavLink to="/teacher">صفحة المعلم</NavLink></li>
      </ul>
      <div className="navbar-actions">
        <button onClick={toggleTheme} className="theme-toggle">
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
        <div className="user-pill">طالب</div>
      </div>
    </nav>
  );
};

export default Navbar;
