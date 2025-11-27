import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useTheme } from "../hooks/ThemeContext";
import "../styles/Login.css";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme} className="theme-toggle-button">
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // We no longer need the navigate hook here for redirection

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // --- FIX: Simplified login logic. No more redirection from here. ---
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      // The onAuthStateChange in App.tsx will not fire if the sign-in fails,
      // so we need to handle the error message here.
      setError("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
    }
    // On successful sign-in, the onAuthStateChange listener in App.tsx will trigger,
    // updating the session and role, and handling the redirection.
  };

  return (
    <div className="login-page" dir="rtl">
      <div className="theme-toggle-container">
        <ThemeToggle />
      </div>

      <div className="login-intro">
        <h1 style={{fontFamily: "title",fontSize: "200px",margin: "0",lineHeight: "0.5",padding: "0" }}>مداد</h1>
        <p style={{
          marginTop: "0px",
          fontSize: "18px",
          color: "#555"
        }}>
          منصّة تطوير الكتابة العربية لتحسين مهارات الطلاب في التعبير الكتابي.
        </p>
      </div>

      <div className="card login-card">
        <header className="login-header">
          <h2>تسجيل الدخول</h2>
          <p className="login-subtitle">أدخل بياناتك للمتابعة إلى المنصّة.</p>
        </header>

        {error && <p className="login-error">{error}</p>}

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <label htmlFor="email">البريد الإلكتروني</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="password">كلمة المرور</label>
            <div className="password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              >
                {showPassword ? "👁️‍🗨️" : "👁️"}
              </button>
            </div>
          </div>

          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? "جاري الدخول..." : "الدخول إلى المنصّة"}
          </button>
        </form>

        <footer className="login-footer-note">
          <p>
            في حال واجهت مشكلة، الرجاء التواصل مع مسؤول النظام.
          </p>
        </footer>
      </div>
    </div>
  );
}
