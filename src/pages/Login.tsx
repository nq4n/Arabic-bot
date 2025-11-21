import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import "../styles/Login.css";
import "../styles/global.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // 👇 حالة الـ OTP
  const [otpMode, setOtpMode] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpLoading, setOtpLoading] = useState(false);

  const navigate = useNavigate();

  // 🔹 1) تسجيل الدخول العادي بالبريد + كلمة المرور
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

      console.log("LOGIN DATA:", data);
      console.error("LOGIN ERROR:", signInError);

      // لو فيه خطأ
      if (signInError || !data?.user) {
        // ⛔ الحالة الخاصة بنا: الإيميل غير مفعّل → نفعّل وضع OTP
        if (signInError?.message === "Email not confirmed") {
          // محاولة إرسال OTP إلى الإيميل
          const { error: otpError } = await supabase.auth.signInWithOtp({
            email,
            options: {
              shouldCreateUser: false, // لا ننشئ مستخدم جديد، نفس المستخدم الحالي
            },
          });

          if (otpError) {
            console.error("OTP SEND ERROR:", otpError);
            setError("تعذّر إرسال رمز التفعيل، حاول مرة أخرى لاحقًا.");
          } else {
            setOtpMode(true);
            setInfo("تم إرسال رمز التفعيل إلى بريدك الإلكتروني، الرجاء إدخاله في الخانة أدناه.");
          }

          return;
        }

        setError("البريد الإلكتروني أو كلمة المرور غير صحيحة.");
        return;
      }

      // ✅ لو نجح تسجيل الدخول بكلمة المرور
      const user = data.user;

      // نفحص هل لازم يغيّر كلمة المرور (must_change_password)
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("must_change_password")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("PROFILE ERROR:", profileError);
        setError("حدث خطأ أثناء جلب بيانات الحساب.");
        return;
      }

      if (profile?.must_change_password) {
        navigate("/first-login");
      } else {
        navigate("/");
      }
    } catch (err) {
      console.error("UNEXPECTED LOGIN ERROR:", err);
      setError("حدث خطأ غير متوقع، حاول مرة أخرى لاحقًا.");
    } finally {
      setLoading(false);
    }
  };

  // 🔹 2) التحقق من الـ OTP بعد ما يوصله بالإيميل
  const handleVerifyOtp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setOtpLoading(true);
    setError(null);
    setInfo(null);

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otpCode,
        type: "email", // تأكيد إيميل برمز
      });

      console.log("VERIFY OTP DATA:", data);
      console.error("VERIFY OTP ERROR:", error);

      if (error || !data?.user) {
        setError("رمز التفعيل غير صحيح أو منتهي الصلاحية.");
        return;
      }

      const user = data.user;

      // بعد تأكيد الإيميل، نرسل المستخدم إلى صفحة تغيير كلمة المرور
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("must_change_password")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("PROFILE ERROR:", profileError);
        // حتى لو صار خطأ في البروفايل، نوديه يغيّر الرمز
        navigate("/first-login");
        return;
      }

      if (profile?.must_change_password) {
        navigate("/first-login");
      } else {
        navigate("/");
      }
    } catch (err) {
      console.error("UNEXPECTED OTP VERIFY ERROR:", err);
      setError("حدث خطأ أثناء التحقق من الرمز.");
    } finally {
      setOtpLoading(false);
    }
  };

  return (
    <div className="login-page" dir="rtl">
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

          {/* رسائل عامة */}
          {error && <p className="login-error">{error}</p>}
          {info && <p style={{ color: "#0f766e", marginBottom: "0.75rem" }}>{info}</p>}

          {/* نموذج تسجيل الدخول */}
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

          {/* 👇 كارت الـ OTP يظهر فقط لما يكون otpMode = true */}
          {otpMode && (
            <div
              className="card"
              style={{
                marginTop: "1.5rem",
                padding: "1rem 1.25rem",
                background: "#f9fafb",
                border: "1px solid #e5e7eb",
                borderRadius: "0.75rem",
              }}
            >
              <h3 style={{ marginBottom: "0.5rem" }}>تفعيل الحساب برمز التحقق</h3>
              <p style={{ fontSize: "0.9rem", color: "#6b7280", marginBottom: "0.75rem" }}>
                تم إرسال رمز مكوّن من أرقام إلى بريدك الإلكتروني. الرجاء إدخاله
                لتفعيل الحساب ومتابعة تغيير كلمة المرور.
              </p>

              <form onSubmit={handleVerifyOtp} className="login-form">
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

                <button
                  type="submit"
                  className="login-submit-btn"
                  disabled={otpLoading}
                >
                  {otpLoading ? "جاري التحقق..." : "تأكيد الرمز والمتابعة"}
                </button>
              </form>
            </div>
          )}

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
