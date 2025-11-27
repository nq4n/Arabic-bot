import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "../styles/Login.css";
import "../styles/global.css";

// A new modal component for OTP verification
const OtpModal = ({ onClose, onVerify, loading }: { onClose: () => void; onVerify: (otp: string) => void; loading: boolean; }) => {
  const [otpCode, setOtpCode] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    onVerify(otpCode);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content card">
        <h3>تفعيل الحساب برمز التحقق</h3>
        <p>
          تم إرسال رمز مكوّن من أرقام إلى بريدك الإلكتروني. الرجاء إدخاله
          لتفعيل الحساب ومتابعة تغيير كلمة المرور.
        </p>
        <form onSubmit={handleSubmit} className="login-form">
          <div className="input-group">
            <label htmlFor="otp">رمز التفعيل (OTP)</label>
            <input
              id="otp"
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              required
              placeholder="123456"
            />
          </div>
          <button type="submit" className="login-submit-btn" disabled={loading}>
            {loading ? "جاري التحقق..." : "تأكيد الرمز والمتابعة"}
          </button>
        </form>
        <button onClick={onClose} className="modal-close-btn">
          إغلاق
        </button>
      </div>
    </div>
  );
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // New state for showing the OTP modal
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) {
        if (signInError.message === "Email not confirmed") {
          const { error: otpError } = await supabase.auth.signInWithOtp({
            email,
            options: {
              shouldCreateUser: false,
            },
          });

          if (otpError) {
            setError("تعذّر إرسال رمز التفعيل، حاول مرة أخرى لاحقًا.");
          } else {
            setInfo(
              "تم إرسال رمز التفعيل إلى بريدك الإلكتروني، الرجاء إدخاله في النموذج المنبثق."
            );
            setShowOtpModal(true);
          }
        } else {
          setError("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
        }
        return;
      }

      if (!data.user) {
        setError("حدث خطأ غير متوقع، حاول مرة أخرى.");
        return;
      }

      const user = data.user;
      const { data: profile } = await supabase
        .from("profiles")
        .select("must_change_password")
        .eq("id", user.id)
        .single();

      if (profile?.must_change_password) {
        navigate("/first-login");
      } 
      // No else block needed, App.tsx will handle the redirect

    } catch (err) {
      setError("حدث خطأ غير متوقع، حاول مرة أخرى لاحقًا.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (otpCode: string) => {
    setOtpLoading(true);
    setError(null);
    setInfo(null);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: "email",
      });

      if (error || !data.user) {
        setError("رمز التفعيل غير صحيح أو منتهي الصلاحية.");
        return;
      }

      setShowOtpModal(false);
      navigate("/first-login");
    } catch (err) {
      setError("حدث خطأ أثناء التحقق من الرمز.");
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="login-page" dir="rtl">
      {showOtpModal && (
        <OtpModal
          onClose={() => setShowOtpModal(false)}
          onVerify={handleVerifyOtp}
          loading={otpLoading}
        />
      )}

      {/* Hero Section */}
      <section className="login-hero">
        <div className="login-hero-inner">
          <h1 style={{ fontFamily: "title" }}>مداد</h1>

          <h1 className="login-hero-title">منصّة تطوير الكتابة العربية</h1>
          <p className="login-hero-text">
            مساحة مخصصة لمساعدة الطلاب على تحسين مهاراتهم في التعبير الكتابي
            باللغة العربية، من خلال دروس، نماذج، وتقييم من المعلم والذكاء
            الاصطناعي.
          </p>

          <ul className="login-hero-list">
            <li>📚 موضوعات ودرورس في مهارات الكتابة</li>
            <li>✍️ كتابة نصوص خاصة بالطالب</li>
            <li>🤖 تقييم أوّلي من الذكاء الاصطناعي</li>
            <li>👩‍🏫 متابعة وتقويم من المعلم</li>
          </ul>
        </div>
      </section>

      {/* Login Form Section */}
      <section className="login-container">
        <div className="login-card card">
          <header className="login-header">
            <div className="login-brand">
              <span className="login-brand-title">مداد</span>
            </div>

            <h2>تسجيل الدخول</h2>
            <p className="login-subtitle">
              أدخل بياناتك للمتابعة إلى المنصّة.
            </p>
          </header>

          {error && <p className="login-error">{error}</p>}
          {info && <p style={{ color: "#0f766e", marginBottom: "0.75rem" }}>{info}</p>}

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
              <div className="input-label-row">
                <label htmlFor="password">كلمة المرور</label>
              </div>

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
                  aria-label={
                    showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"
                  }
                >
                  {showPassword ? "👁️‍🗨️" : "👁️"}
                </button>
              </div>
            </div>

            <div className="login-actions-row">
              <label className="remember-me">
                <input type="checkbox" />
                <span>تذكرني على هذا الجهاز</span>
              </label>
            </div>

            <button
              type="submit"
              className="login-submit-btn"
              disabled={loading}
            >
              {loading ? "جاري الدخول..." : "الدخول إلى المنصّة"}
            </button>
          </form>

          <footer className="login-footer-note">
            <p>
              في حال واجهت مشكلة في تسجيل الدخول، الرجاء التواصل مع المعلم أو
              مسؤول النظام.
            </p>
          </footer>
        </div>
      </section>
    </div>
  );
}
