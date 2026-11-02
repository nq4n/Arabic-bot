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

const GENERIC_ERROR = "تعذر تسجيل الدخول، حاول مرة أخرى.";

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // الطلاب يدخلون باسم المستخدم فقط. حقل كلمة المرور يظهر فقط للمعلمين
  // والمسؤولين، أو إذا تعذر الوصول إلى وظيفة الدخول بدون كلمة مرور.
  const [needsPassword, setNeedsPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetToIdentifierStep = () => {
    setNeedsPassword(false);
    setPassword("");
    setShowPassword(false);
    setError(null);
  };

  // يُستخدم لمسار المعلم/المسؤول فقط: تحويل اسم المستخدم إلى بريد إلكتروني
  // قبل تسجيل الدخول بكلمة المرور.
  const resolveEmail = async (value: string): Promise<string | null> => {
    if (value.includes("@")) return value;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("email")
      .ilike("username", value)
      .maybeSingle();

    if (profileError || !profile?.email) {
      return null;
    }

    return profile.email;
  };

  const signInWithPasswordStep = async (trimmedIdentifier: string) => {
    const loginEmail = await resolveEmail(trimmedIdentifier);

    if (!loginEmail) {
      setError("اسم المستخدم أو كلمة المرور غير صحيحة.");
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    });

    if (signInError) {
      setError("اسم المستخدم أو كلمة المرور غير صحيحة.");
    }
    // On success, the onAuthStateChange in App.tsx will handle the rest.
  };

  const signInWithUsernameOnly = async (trimmedIdentifier: string) => {
    const { data, error: invokeError } = await supabase.functions.invoke(
      "student-login",
      { body: { identifier: trimmedIdentifier } }
    );

    // الوظيفة غير متاحة (لم تُنشر بعد أو انقطاع بالشبكة): نعود لمسار
    // كلمة المرور حتى لا يُحجب أحد عن الدخول.
    if (invokeError) {
      console.error("student-login invoke error:", invokeError);
      setNeedsPassword(true);
      return;
    }

    const response = data as {
      success?: boolean;
      requiresPassword?: boolean;
      tokenHash?: string;
      error?: string;
    } | null;

    if (!response?.success) {
      setError(response?.error ?? GENERIC_ERROR);
      return;
    }

    if (response.requiresPassword) {
      setNeedsPassword(true);
      return;
    }

    if (!response.tokenHash) {
      setError(GENERIC_ERROR);
      return;
    }

    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: response.tokenHash,
      type: "magiclink",
    });

    if (verifyError) {
      console.error("student-login verifyOtp error:", verifyError);
      setError(GENERIC_ERROR);
    }
    // On success, the onAuthStateChange in App.tsx will handle the rest.
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const trimmedIdentifier = identifier.trim();
    if (!trimmedIdentifier) {
      setError("الرجاء إدخال اسم المستخدم.");
      return;
    }

    setLoading(true);

    try {
      if (needsPassword) {
        await signInWithPasswordStep(trimmedIdentifier);
      } else {
        await signInWithUsernameOnly(trimmedIdentifier);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(GENERIC_ERROR);
    } finally {
      setLoading(false);
    }
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
          <p className="login-subtitle">
            {needsPassword
              ? "أدخل كلمة المرور للمتابعة إلى المنصّة."
              : "أدخل اسم المستخدم للمتابعة إلى المنصّة."}
          </p>
        </header>

        {error && <p className="login-error">{error}</p>}

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <label htmlFor="identifier">اسم المستخدم</label>
            <input
              type="text"
              id="identifier"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="s123456"
              autoComplete="username"
              disabled={needsPassword}
              required
            />
          </div>

          {needsPassword && (
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
                  autoFocus
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
          )}

          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? "جاري الدخول..." : "الدخول إلى المنصّة"}
          </button>

          {needsPassword && (
            <button
              type="button"
              className="login-secondary-btn"
              onClick={resetToIdentifierStep}
              disabled={loading}
            >
              تغيير اسم المستخدم
            </button>
          )}
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
