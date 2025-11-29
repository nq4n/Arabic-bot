// src/components/Navbar.tsx
import { NavLink } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { useTheme } from "../hooks/ThemeContext";
import "../styles/Navbar.css";
import "../styles/ProfileDropdown.css";
import { supabase } from "../supabaseClient";
import { Session } from "@supabase/supabase-js";

type UserRole = "student" | "teacher" | "admin" | null;

interface NavbarProps {
  session: Session | null;
  userRole: UserRole;
}

// --- SVG Icons --- //
const UserIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const LogoutIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export default function Navbar({ session, userRole }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const avatarUrl = session?.user?.user_metadata?.avatar_url;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setDropdownOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const renderLinks = () => {
    if (userRole === "teacher" || userRole === "admin") {
      return (
        <>
          {/* match /teacher route in App.tsx */}
          <NavLink to="/teacher">لوحة المستخدمين</NavLink>
          {/* use same submissions route used for students */}
          <NavLink to="/submissions">التسليمات</NavLink>
        </>
      );
    }
    return (
      <>
        <NavLink to="/" end>
          الموضوعات
        </NavLink>
        <NavLink to="/my-submissions">تسليماتي</NavLink>
      </>
    );
  };

  const getRoleDisplayName = (role: UserRole) => {
    if (role === "admin") return "مسؤول";
    if (role === "teacher") return "معلم";
    return "طالب";
  };

  // Logo should send teacher/admin directly to /teacher, student to /
  const logoTarget =
    userRole === "teacher" || userRole === "admin" ? "/teacher" : "/";

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <div className="navbar-logo">
          <NavLink to={logoTarget}>
            <h1 style={{ fontFamily: "title" }}>مداد</h1>
          </NavLink>
        </div>

        <div className="navbar-links">{session && renderLinks()}</div>

        <div className="navbar-actions">
          <button onClick={toggleTheme} className="theme-toggle">
            {theme === "light" ? "🌙" : "☀️"}
          </button>

          {session && (
            <div
              className={`profile-dropdown ${
                isDropdownOpen ? "open" : ""
              }`}
              ref={dropdownRef}
            >
              <button
                onClick={() => setDropdownOpen(!isDropdownOpen)}
                className="profile-dropdown-button"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="profile-avatar-image"
                  />
                ) : (
                  <UserIcon />
                )}
              </button>

              <div
                className={`profile-dropdown-content ${
                  isDropdownOpen ? "show" : ""
                }`}
              >
                <div className="dropdown-user-info">
                  <div className="user-email">{session.user.email}</div>
                  <div className="user-role">
                    {getRoleDisplayName(userRole)}
                  </div>
                </div>
                <button onClick={handleLogout} className="logout-button-item">
                  <LogoutIcon />
                  <span>تسجيل الخروج</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
