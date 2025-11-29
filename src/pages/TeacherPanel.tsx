import React, { useEffect, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import Papa from "papaparse";
import "../styles/global.css";
import "../styles/Navbar.css";

type UserRole = "student" | "teacher" | "admin" | null;

type AppUser = {
  id: string;
  username: string | null;
  email: string | null;
  role: string | null;
  must_change_password: boolean;
};

type Submission = {
  id: number;
  student_id: string;
};

type UserWithStats = AppUser & {
  submissionsCount: number;
};

export default function TeacherPanel() {
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  // رفع CSV
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  // إضافة مستخدم واحد
  const [newEmail, setNewEmail] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("student");
  const [newPassword, setNewPassword] = useState("123456789");
  const [addingUser, setAddingUser] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // جلب البيانات من Supabase
  const loadData = useCallback(async () => {
    setLoading(true);
    setFormError(null);

    try {
      // 1) جلب المستخدمين من جدول profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, email, role, must_change_password")
        .order("username", { ascending: true });

      console.log("PROFILES DATA:", profiles);
      console.log("PROFILES ERROR:", profilesError);

      if (profilesError) throw profilesError;

      // 2) جلب التسليمات لحساب عددها
      const { data: submissions, error: submissionsError } = await supabase
        .from("submissions")
        .select("id, student_id");

      console.log("SUBMISSIONS DATA:", submissions);
      console.log("SUBMISSIONS ERROR:", submissionsError);

      if (submissionsError) throw submissionsError;

      const subs = (submissions || []) as Submission[];

      const countsMap: Record<string, number> = {};
      subs.forEach((s) => {
        countsMap[s.student_id] = (countsMap[s.student_id] || 0) + 1;
      });

      // 3) دمج البيانات
      const list: UserWithStats[] = (profiles || []).map((p: any) => ({
        id: p.id,
        username: p.username,
        email: p.email,
        role: p.role,
        must_change_password: p.must_change_password ?? false,
        submissionsCount: countsMap[p.id] || 0,
      }));

      console.log("FINAL USER LIST:", list);
      setUsers(list);
    } catch (err: any) {
      console.error("Error loading data:", err);
      setFormError(`حدث خطأ أثناء جلب البيانات: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ===== رفع ملف CSV =====
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleFileUpload = async () => {
    if (!file) return;

    setUploading(true);
    setUploadError(null);
    setUploadSuccess(null);
    setFormError(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const usersToCreate = results.data as any[];
        let createdCount = 0;
        let errorList: string[] = [];

        for (const user of usersToCreate) {
          const { email, username, role, password } = user;
          if (!email || !username || !role || !password) {
            console.warn("Skipping incomplete row in CSV:", user);
            continue;
          }

          try {
            const { data, error } = await supabase.functions.invoke("create-user", {
              body: {
                email,
                password,
                username,
                role,
              },
            });
          
            if (error) {
              errorList.push(`${email}: ${error.message}`);
            } else {
              createdCount++;
            }
          } catch (e: any) {
            errorList.push(`${email}: ${e.message}`);
          }
          
        }

        setUploading(false);
        if (createdCount > 0) {
          setUploadSuccess(`تم إنشاء ${createdCount} مستخدم بنجاح.`);
        }
        if (errorList.length > 0) {
          setUploadError(`فشل في إنشاء بعض المستخدمين: ${errorList.join(", ")}`);
        }

        if (createdCount > 0) {
          setTimeout(() => loadData(), 1500);
        }
      },
      error: (err) => {
        setUploadError(`حدث خطأ أثناء تحليل الملف: ${err.message}`);
        setUploading(false);
      },
    });
  };

  // ===== إضافة مستخدم يدوي =====
  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddingUser(true);
    setFormError(null);
    setSuccessMessage(null);
  
    try {
      const { data, error } = await supabase.functions.invoke("create-user", {
        body: {
          email: newEmail,
          password: newPassword,
          username: newUsername,
          role: newRole,
        },
      });
  
      console.log("create-user response:", { data, error });
  
      // لو فيه مشكلة في الاتصال نفسه أو status مش 2xx
      if (error) {
        setFormError(`تعذّر الاتصال بوظيفة السيرفر: ${error.message}`);
        return;
      }
  
      const body = data as any;
  
      if (!body?.success) {
        setFormError(
          `تعذّر إنشاء المستخدم: ${body?.error ?? "سبب غير معروف"}`
        );
        return;
      }
  
      // نجاح
      if (body.profileCreated === false && body.profileError) {
        // حالة نادرة: المستخدم موجود في Auth لكن فيه مشكلة بسيطة في profiles
        setSuccessMessage(
          `تم إنشاء المستخدم، لكن حدثت مشكلة في حفظ البيانات الإضافية: ${body.profileError}`
        );
      } else {
        setSuccessMessage("تم إنشاء المستخدم بنجاح ✅");
      }
  
      setNewEmail("");
      setNewUsername("");
      setNewPassword("123456789");
      setNewRole("student");
  
      setTimeout(() => loadData(), 1000);
    } catch (err: any) {
      setFormError(`فشل الاتصال بوظيفة السيرفر: ${err.message}`);
    } finally {
      setAddingUser(false);
    }
  };
  

  // ===== تغيير الصلاحيات =====
  const handleChangeRole = async (userId: string, newRole: UserRole) => {
    if (!newRole) return;
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    } catch (err: any) {
      setFormError(`فشل تحديث الصلاحية: ${err.message}`);
    }
  };

  return (
    <div className="page" dir="rtl" style={{ padding: "2rem" }}>
      <h1 style={{ fontFamily: "title", marginBottom: "1rem" }}>
        لوحة إدارة المستخدمين
      </h1>
      <p style={{ marginBottom: "1.5rem", color: "#4b5563" }}>
        من هنا يمكن للمعلم/المسؤول متابعة نشاط الطلاب، إضافة مستخدمين جدد، وتعديل الصلاحيات.
      </p>

      {/* رفع CSV */}
      <section
        className="card"
        style={{ marginBottom: "2rem", padding: "1.5rem" }}
      >
        <h2 style={{ marginBottom: "1rem" }}>رفع مستخدمين من ملف</h2>
        <p
          style={{
            marginBottom: "0.75rem",
            fontSize: "0.9rem",
            color: "#6b7280",
          }}
        >
          ارفع ملف CSV يحتوي على الأعمدة:{" "}
          <code>email</code>, <code>username</code>, <code>role</code>,{" "}
          <code>password</code>.
        </p>
        {uploadError && (
          <p className="login-error" style={{ marginBottom: "0.75rem" }}>
            {uploadError}
          </p>
        )}
        {uploadSuccess && (
          <p style={{ color: "green", marginBottom: "0.75rem" }}>
            {uploadSuccess}
          </p>
        )}
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <input type="file" accept=".csv" onChange={handleFileChange} />
          <button
            onClick={handleFileUpload}
            className="login-submit-btn"
            disabled={uploading || !file}
          >
            {uploading ? "جاري الرفع..." : "رفع وإنشاء"}
          </button>
        </div>
      </section>

      {/* إضافة مستخدم جديد */}
      <section
        className="card"
        style={{ marginBottom: "2rem", padding: "1.5rem" }}
      >
        <h2 style={{ marginBottom: "1rem" }}>إضافة مستخدم جديد</h2>
        {formError && <p className="login-error">{formError}</p>}
        {successMessage && <p style={{ color: "green" }}>{successMessage}</p>}

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
              onChange={(e) => setNewRole(e.target.value as UserRole)}
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
            {addingUser ? "جاري الإنشاء..." : "إنشاء المستخدم"}
          </button>
        </form>
      </section>

      {/* جدول المستخدمين */}
      <section className="card" style={{ padding: "1.5rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>المستخدمون الحاليون</h2>

        {loading ? (
          <p>جارِ تحميل المستخدمين...</p>
        ) : formError ? (
          <p className="login-error">{formError}</p>
        ) : users.length === 0 ? (
          <p>لا يوجد مستخدمون مسجلون حتى الآن.</p>
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
                  <th
                    style={{
                      borderBottom: "1px solid #e5e7eb",
                      padding: "0.5rem",
                    }}
                  >
                    اسم المستخدم
                  </th>
                  <th
                    style={{
                      borderBottom: "1px solid #e5e7eb",
                      padding: "0.5rem",
                    }}
                  >
                    البريد الإلكتروني
                  </th>
                  <th
                    style={{
                      borderBottom: "1px solid #e5e7eb",
                      padding: "0.5rem",
                    }}
                  >
                    الصلاحية
                  </th>
                  <th
                    style={{
                      borderBottom: "1px solid #e5e7eb",
                      padding: "0.5rem",
                    }}
                  >
                    عدد التسليمات
                  </th>
                  <th
                    style={{
                      borderBottom: "1px solid #e5e7eb",
                      padding: "0.5rem",
                    }}
                  >
                    يحتاج تغيير كلمة المرور؟
                  </th>
                  <th
                    style={{
                      borderBottom: "1px solid #e5e7eb",
                      padding: "0.5rem",
                    }}
                  >
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
                      {u.email || "—"}
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
                          handleChangeRole(u.id, e.target.value as UserRole)
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
