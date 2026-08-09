import React, { useState } from "react";
import { supabase } from "../../supabaseClient";
import { useTheme } from "../../hooks/ThemeContext";
import "../../styles/Login.css";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme} className="theme-toggle-button">
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
};

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier) {
      setError("الرجاء إدخالاسم المستخدم.");
      setLoading(false);
      return;
    }

    let loginEmail = trimmedIdentifier;
    if (!trimmedIdentifier.includes("@")) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("email")
        .ilike("username", trimmedIdentifier)
        .maybeSingle();

      if (profileError) {
        setError("تعذر العثور على الحساب، حاول مرة أخرى.");
        setLoading(false);
        return;
      }

      if (!profile?.email) {
        setError("اسم المستخدم غير مرتبط ببريد إلكتروني.");
        setLoading(false);
        return;
      }

      loginEmail = profile.email;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError("أسم المسخدم أو كلمة المرور غير صحيحة.");
    }
    // On success, the onAuthStateChange in App.tsx will handle the rest.
  };

  return (
    <div className="login-page" dir="rtl">
      <div className="theme-toggle-container">
        <ThemeToggle />
      </div>

      <div className="login-intro">
        <h1 style={{fontFamily: "title",fontSize: "6rem",margin: "0",lineHeight: "1",padding: "0" }}>مداد</h1>
        <div className="login-welcome">
          <h2>مرحبًا بكم في منصّة مداد</h2>
          <p>
            ابدأ رحلتك في تطوير مهارات التعبير الكتابي مع دروس منظمة، وأنشطة تفاعلية،
            وتغذية راجعة داعمة.
          </p>
        </div>
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
              type="text"
              id="email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="user@example.com / s123456"
              autoComplete="username"
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

