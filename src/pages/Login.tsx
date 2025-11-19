
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../styles/Login.css';
import '../styles/global.css'

type UserRole = 'student' | 'teacher';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('student');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Step 1: Fetch the user's email from the profiles table based on the username
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id') // We need the user's ID (which is their email in auth.users)
      .eq('username', username)
      .single();

    if (profileError || !profile) {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة.');
      setLoading(false);
      return;
    }

    // The user's ID in the profiles table is their email in the auth.users table
    const userEmail = profile.id;

    // Step 2: Sign in with the fetched email and the provided password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: userEmail,
      password,
    });

    if (signInError) {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة.');
    } else {
      navigate('/');
    }
    setLoading(false);
  };

  return (
    <div className="login-page" dir="rtl">
      {/* Hero Section */}
      <section className="login-hero">
        <div className="login-hero-inner">
          <div>
             <h1 style={{ fontFamily: "title" }}>مداد</h1>
          </div>
          <h1 className="login-hero-title">منصّة تطوير الكتابة العربية</h1>
          <p className="login-hero-text">
            مساحة مخصصة لمساعدة الطلاب على تحسين مهاراتهم في التعبير الكتابي
            باللغة العربية، من خلال دروس، نماذج، وتقييم من المعلم والذكاء الاصطناعي.
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
            <h2>تسجيل الدخول</h2>
            <p className="login-subtitle">
              أدخل بياناتك للمتابعة إلى المنصّة.
            </p>
          </header>

          {/* Role Toggle */}
          <div className="login-role-toggle" aria-label="اختيار نوع المستخدم">
            <button
              type="button"
              className={`role-pill ${role === 'student' ? 'active' : ''}`}
              onClick={() => setRole('student')}
            >
              أنا طالب
            </button>
            <button
              type="button"
              className={`role-pill ${role === 'teacher' ? 'active' : ''}`}
              onClick={() => setRole('teacher')}
            >
              أنا معلم
            </button>
          </div>

          <form onSubmit={handleLogin} className="login-form">
            {error && <p className="login-error">{error}</p>}
            <div className="input-group">
              <label htmlFor="username">اسم المستخدم</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="s123456"
                autoComplete="username"
                required
              />
            </div>

            <div className="input-group">
              <div className="input-label-row">
                <label htmlFor="password">كلمة المرور</label>
              </div>
              <div className="password-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
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
                  aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                >
                  {showPassword ? '👁️‍🗨️' : '👁️'}
                </button>
              </div>
            </div>

            <div className="login-actions-row">
              <label className="remember-me">
                <input type="checkbox" />
                <span>تذكرني على هذا الجهاز</span>
              </label>
            </div>

            <button type="submit" className="login-submit-btn" disabled={loading}>
              {loading ? 'جاري الدخول...' : 'الدخول إلى المنصّة'}
            </button>
          </form>

          <footer className="login-footer-note">
            <p>
              في حال واجهت مشكلة في تسجيل الدخول، الرجاء التواصل مع المعلم أو مسؤول النظام.
            </p>
          </footer>
        </div>
      </section>
    </div>
  );
}
