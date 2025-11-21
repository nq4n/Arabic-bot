import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import "../styles/global.css";
import "../styles/Navbar.css"; // لو فيها كلاس card وغيره

type UserRole = "student" | "teacher" | "admin" | null;

type Profile = {
  id: string;
  username: string | null;
  role: string | null;
  must_change_password: boolean;
};

type Submission = {
  id: number;
  student_id: string;
};

type UserWithStats = Profile & {
  submissionsCount: number;
};

export default function TeacherPanel() {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // فورم إضافة مستخدم جديد
  const [newEmail, setNewEmail] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("student");
  const [newPassword, setNewPassword] = useState("123456789");
  const [addingUser, setAddingUser] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // تحميل المستخدمين + إحصائياتهم
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      try {
        // 1) جلب كل البروفايلات
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, role, must_change_password")
          .order("username", { ascending: true });

        if (profilesError) throw profilesError;

        // 2) جلب كل التسليمات (المعلم/الأدمن فقط يقدرون يشوفونهم حسب RLS)
        const { data: submissions, error: submissionsError } = await supabase
          .from("submissions")
          .select("id, student_id");

        if (submissionsError) throw submissionsError;

        const subs = (submissions || []) as Submission[];

        // 3) نحسب عدد التسليمات لكل طالب
        const countsMap: Record<string, number> = {};
        subs.forEach((s) => {
          countsMap[s.student_id] = (countsMap[s.student_id] || 0) + 1;
        });

        const list: UserWithStats[] = (profiles || []).map((p) => ({
          ...p,
          submissionsCount: countsMap[p.id] || 0,
        }));

        setUsers(list);
      } catch (err) {
        console.error(err);
        setError("حدث خطأ أثناء جلب بيانات المستخدمين.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // إضافة مستخدم جديد (معلم يضيف طالب أو معلم)
  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddingUser(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: newEmail,
        password: newPassword,
        options: {
          data: {
            username: newUsername,
            role: newRole,
          },
        },
      });

      console.log("SIGNUP DATA:", data);
      console.error("SIGNUP ERROR:", signUpError);

      if (signUpError) {
        setError("تعذّر إنشاء المستخدم. تأكّد من البريد أو جرّب لاحقاً.");
        return;
      }

      setSuccessMessage("تم إنشاء المستخدم بنجاح ✅ (لا تنسَ إبلاغه بالبريد والرمز المؤقت)");

      // تنظيف الحقول
      setNewEmail("");
      setNewUsername("");
      setNewPassword("123456789");
      setNewRole("student");

      // نعيد تحميل المستخدمين بعد أن ينشئ التريغر صف البروفايل
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, role, must_change_password")
        .order("username", { ascending: true });

      if (!profilesError) {
        // نعيد بناء users بدون إحصائيات التسليمات (أو تقدر تعيد حسابها بالكامل)
        setUsers((prev) => {
          // دمج بسيط: نخلي إعادة التحميل الكاملة أبسط
          return prev;
        });
      }
    } catch (err) {
      console.error(err);
      setError("حدث خطأ غير متوقع أثناء إنشاء المستخدم.");
    } finally {
      setAddingUser(false);
    }
  };

  // تغيير دور المستخدم (طالب ↔ معلم / أدمن)
  const handleChangeRole = async (userId: string, newRole: UserRole) => {
    if (!newRole) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);

      if (error) {
        console.error(error);
        setError("تعذّر تحديث صلاحيات المستخدم.");
        return;
      }

      // تحديث في الواجهة
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, role: newRole } : u
        )
      );
    } catch (err) {
      console.error(err);
      setError("حدث خطأ غير متوقع أثناء تحديث الصلاحيات.");
    }
  };

  return (
    <div className="page" dir="rtl" style={{ padding: "2rem" }}>
      <h1 style={{ fontFamily: "title", marginBottom: "1rem" }}>لوحة إدارة المستخدمين</h1>
      <p style={{ marginBottom: "1.5rem", color: "#4b5563" }}>
        من هنا يمكن للمعلم/المسؤول متابعة نشاط الطلاب، إضافة مستخدمين جدد، وتعديل الصلاحيات.
      </p>

      {/* قسم إضافة مستخدم جديد */}
      <section
        className="card"
        style={{ marginBottom: "2rem", padding: "1.5rem" }}
      >
        <h2 style={{ marginBottom: "1rem" }}>إضافة مستخدم جديد</h2>
        <p style={{ marginBottom: "0.75rem", fontSize: "0.9rem", color: "#6b7280" }}>
          سيتم إنشاء المستخدم برمز مؤقت يمكنه تغييره عند أول تسجيل دخول.
        </p>

        {error && (
          <p className="login-error" style={{ marginBottom: "0.75rem" }}>
            {error}
          </p>
        )}
        {successMessage && (
          <p style={{ color: "green", marginBottom: "0.75rem" }}>
            {successMessage}
          </p>
        )}

        <form
          onSubmit={handleCreateUser}
          className="login-form"
          style={{ maxWidth: 500 }}
        >
          <div className="input-group">
            <label htmlFor="newEmail">البريد الإلكتروني</label>
            <input
              id="newEmail"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
              placeholder="student@example.com"
            />
          </div>

          <div className="input-group">
            <label htmlFor="newUsername">اسم المستخدم</label>
            <input
              id="newUsername"
              type="text"
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              required
              placeholder="s123456 أو اسم مختصر"
            />
          </div>

          <div className="input-group">
            <label htmlFor="newRole">نوع المستخدم</label>
            <select
              id="newRole"
              value={newRole || "student"}
              onChange={(e) =>
                setNewRole(e.target.value as UserRole)
              }
            >
              <option value="student">طالب</option>
              <option value="teacher">معلم</option>
              <option value="admin">مسؤول</option>
            </select>
          </div>

          <div className="input-group">
            <label htmlFor="newPassword">كلمة المرور المبدئية</label>
            <input
              id="newPassword"
              type="text"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="login-submit-btn"
            disabled={addingUser}
          >
            {addingUser ? "جاري إنشاء المستخدم..." : "إنشاء المستخدم"}
          </button>
        </form>
      </section>

      {/* قائمة المستخدمين */}
      <section className="card" style={{ padding: "1.5rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>المستخدمون الحاليون</h2>

        {loading ? (
          <p>جارِ تحميل المستخدمين...</p>
        ) : users.length === 0 ? (
          <p>لا يوجد مستخدمون حتى الآن.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "0.9rem",
              }}
            >
              <thead>
                <tr>
                  <th style={{ borderBottom: "1px solid #e5e7eb", padding: "0.5rem" }}>
                    اسم المستخدم
                  </th>
                  <th style={{ borderBottom: "1px solid #e5e7eb", padding: "0.5rem" }}>
                    الصلاحية
                  </th>
                  <th style={{ borderBottom: "1px solid #e5e7eb", padding: "0.5rem" }}>
                    عدد التسليمات
                  </th>
                  <th style={{ borderBottom: "1px solid #e5e7eb", padding: "0.5rem" }}>
                    يحتاج تغيير كلمة المرور؟
                  </th>
                  <th style={{ borderBottom: "1px solid #e5e7eb", padding: "0.5rem" }}>
                    تعديل الصلاحيات
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td
                      style={{
                        borderBottom: "1px solid #f3f4f6",
                        padding: "0.5rem",
                      }}
                    >
                      {u.username || "—"}
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #f3f4f6",
                        padding: "0.5rem",
                      }}
                    >
                      {u.role === "admin"
                        ? "مسؤول"
                        : u.role === "teacher"
                        ? "معلم"
                        : "طالب"}
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #f3f4f6",
                        padding: "0.5rem",
                      }}
                    >
                      {u.submissionsCount}
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #f3f4f6",
                        padding: "0.5rem",
                      }}
                    >
                      {u.must_change_password ? "نعم" : "لا"}
                    </td>
                    <td
                      style={{
                        borderBottom: "1px solid #f3f4f6",
                        padding: "0.5rem",
                      }}
                    >
                      <select
                        value={u.role || "student"}
                        onChange={(e) =>
                          handleChangeRole(
                            u.id,
                            e.target.value as UserRole
                          )
                        }
                      >
                        <option value="student">طالب</option>
                        <option value="teacher">معلم</option>
                        <option value="admin">مسؤول</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
