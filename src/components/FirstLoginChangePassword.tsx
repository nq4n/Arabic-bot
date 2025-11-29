import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import "../styles/Login.css"; // Reuse the login styles for consistency
import { useTheme } from "../hooks/ThemeContext";

// The component receives this prop from App.tsx
type Props = {
  onPasswordChanged: () => void;
};

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();
  return (
    <button onClick={toggleTheme} className="theme-toggle-button">
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
};


export default function FirstLoginChangePassword({ onPasswordChanged }: Props) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("كلمة المرور يجب أن تكون 8 أحرف على الأقل.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }

    setLoading(true);

    try {
      // 1. Update the user's password in Supabase Auth
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        // This can happen if the new password is the same as the old one, for example.
        throw updateError;
      }

      // 2. Get the user to update the 'profiles' table
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
          throw new Error("User not found after password update.");
      }
      
      // 3. Set 'must_change_password' to false in the public profiles table
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ must_change_password: false })
        .eq("id", user.id);

      if (profileError) {
        // This is a secondary error, the main password change succeeded.
        // We can log it, but the user can proceed.
        console.error("Failed to update profile after password change:", profileError);
      }

      setSuccess(true);
      // Call the callback from App.tsx after a short delay
      setTimeout(() => {
        onPasswordChanged();
      }, 1500);

    } catch (err: any) {
      console.error(err);
      setError(err.message || "فشل تحديث كلمة المرور. حاول مرة أخرى.");
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
            <h1 style={{fontFamily: "title",fontSize: "200px",margin: "0",lineHeight: "0.5",padding: "0" }}>مداد</h1>
            <p style={{ marginTop: "0px", fontSize: "18px", color: "#555" }}>
                منصّة تطوير الكتابة العربية لتحسين مهارات الطلاب في التعبير الكتابي.
            </p>
        </div>
        
        <div className="card login-card">
            <header className="login-header">
                <h2>تعيين كلمة مرور جديدة</h2>
                <p className="login-subtitle">
                    لأسباب تتعلق بالأمان، يرجى تعيين كلمة مرور جديدة لحسابك.
                </p>
            </header>

            {error && <p className="login-error">{error}</p>}
            {success && <p style={{color: 'green', textAlign: 'center'}}>تم تحديث كلمة المرور بنجاح! جاري تسجيل الدخول...</p>}

            <form onSubmit={handleSubmit} className="login-form">
                <div className="input-group">
                    <label htmlFor="newPassword">كلمة المرور الجديدة</label>
                    <div className="password-wrapper">
                        <input
                            id="newPassword"
                            type={showPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            placeholder="••••••••"
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

                <div className="input-group">
                    <label htmlFor="confirmPassword">تأكيد كلمة المرور</label>
                    <input
                        id="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        placeholder="••••••••"
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading || success}
                    className="login-submit-btn"
                >
                    {loading ? "جاري التحديث..." : "تحديث كلمة المرور والمتابعة"}
                </button>
            </form>
        </div>
    </div>
  );
}