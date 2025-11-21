import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTheme } from "../hooks/ThemeContext";
import "../styles/Navbar.css";
import "../styles/global.css";
import { supabase } from "../supabaseClient";
import { Session } from "@supabase/supabase-js";

type UserRole = "student" | "teacher" | "admin" | null;

export default function Navbar({ session }: { session: Session | null }) {
  const { theme, toggleTheme } = useTheme();
  const [role, setRole] = useState<UserRole>(null);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // غالبًا عندك في App useEffect يتابع session ويحوّل لصفحة login
  };

  // جلب دور المستخدم من profiles أو من user_metadata
  useEffect(() => {
    const fetchRole = async () => {
      if (!session) {
        setRole(null);
        return;
      }

      const userId = session.user.id;

      // نحاول أولاً من جدول profiles
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

      if (!error && profile?.role) {
        setRole(profile.role as UserRole);
        return;
      }

      // لو ما قدرنا، نرجع لبيانات المستخدم في auth
      const metaRole = (session.user.user_metadata as any)?.role;
      if (metaRole) {
        setRole(metaRole as UserRole);
      } else {
        setRole(null);
      }
    };

    fetchRole();
  }, [session]);

  const renderLinks = () => {
    if (role === "teacher" || role === "admin") {
      return (
        <>
          <NavLink to="/teacher/panel">لوحة المستخدم</NavLink>
          <NavLink to="/teacher/submissions">تقييم التسليمات</NavLink>
        </>
      );
    }

    // الحالة الافتراضية: طالب
    return (
      <>
        <NavLink to="/topics">الموضوعات</NavLink>
        <NavLink to="/evaluate/1">تسليماتي</NavLink>
      </>
    );
  };

  const renderRoleLabel = () => {
    if (role === "admin") return "مسؤول";
    if (role === "teacher") return "معلم";
    return "طالب";
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* اللوجو / اسم المشروع */}
        <div className="navbar-logo">
          <NavLink to={"/"}>
            <h1 style={{ fontFamily: "title" }}>صَياغ</h1>
          </NavLink>
        </div>

        {/* الروابط حسب دور المستخدم */}
        <div className="navbar-links">{renderLinks()}</div>

        <div className="navbar-actions">
          <button onClick={toggleTheme} className="theme-toggle">
            {theme === "light" ? "🌙" : "☀️"}
          </button>

          {session && (
            <>
              <div className="user-pill">{renderRoleLabel()}</div>
              <button onClick={handleLogout} className="logout-button">
                تسجيل الخروج
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
