import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { useNavigate } from "react-router-dom";

export default function FirstLoginChangePassword() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

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
      // 1) جلب المستخدم الحالي
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        setError("انتهت الجلسة، الرجاء تسجيل الدخول مرة أخرى.");
        return;
      }

      // 2) تحديث كلمة المرور
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        console.error(updateError);

        if ((updateError as any).status === 422) {
          setError(
            "كلمة المرور الجديدة يجب أن تكون مختلفة عن القديمة وتحقق شروط الأمان."
          );
        } else {
          setError("تعذّر تغيير كلمة المرور، حاول مرة أخرى.");
        }
        return;
      }

      // 3) تحديث البروفايل: must_change_password = false
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ must_change_password: false })
        .eq("id", user.id);

      if (profileError) {
        console.error(profileError);
        setError(
          "تم تغيير كلمة المرور، لكن حدث خطأ في تحديث بيانات الحساب."
        );
        return;
      }

      // 4) نجاح → رجوع للصفحة الرئيسية
      navigate("/");
    } catch (err) {
      console.error(err);
      setError("حدث خطأ غير متوقع.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page" dir="rtl">
      <section className="login-container">
        <div className="login-card card">
          <header className="login-header">
            <div className="login-brand">
              <span className="login-brand-title">مداد</span>
            </div>
            <h2>تعيين كلمة مرور جديدة</h2>
            <p className="login-subtitle">
              هذه أول مرة تسجّل الدخول، الرجاء تعيين كلمة مرور خاصة بك.
            </p>
          </header>

          <form
            onSubmit={handleSubmit}
            className="login-form"
            style={{ maxWidth: 400, marginTop: 16 }}
          >
            {error && <p className="login-error">{error}</p>}

            {/* كلمة المرور الجديدة */}
            <div className="input-group">
              <label htmlFor="newPassword">كلمة المرور الجديدة</label>
              <div className="password-wrapper">
                <input
                  id="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  aria-label={
                    showNewPassword
                      ? "إخفاء كلمة المرور"
                      : "إظهار كلمة المرور"
                  }
                >
                  {showNewPassword ? "👁️‍🗨️" : "👁️"}
                </button>
              </div>
            </div>

            {/* تأكيد كلمة المرور */}
            <div className="input-group">
              <label htmlFor="confirmPassword">تأكيد كلمة المرور</label>
              <div className="password-wrapper">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() =>
                    setShowConfirmPassword((prev) => !prev)
                  }
                  aria-label={
                    showConfirmPassword
                      ? "إخفاء كلمة المرور"
                      : "إظهار كلمة المرور"
                  }
                >
                  {showConfirmPassword ? "👁️‍🗨️" : "👁️"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="login-submit-btn"
            >
              {loading ? "جاري الحفظ..." : "حفظ كلمة المرور"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
