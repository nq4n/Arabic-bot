import React, { useEffect, useMemo, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import Papa from "papaparse";
import type { ParseResult } from "papaparse";
import { topics } from "../data/topics";
import { SkeletonSection } from "../components/SkeletonBlocks";
import {
  LessonSection,
  LessonVisibility,
  getLessonVisibility,
  buildLessonVisibilityFromRows,
  VISIBILITY_STORAGE_KEY,
} from "../utils/lessonSettings";
import "../styles/global.css";
import "../styles/Navbar.css";
import "../styles/TeacherPanel.css";
import { User } from "@supabase/supabase-js";

type UserRole = "student" | "teacher" | "admin" | null;

// Define a clear type for user profiles from Supabase
type Profile = {
  id: string;
  username: string | null;
  full_name?: string | null;
  email: string | null;
  role: UserRole;
  must_change_password: boolean;
  added_by_teacher_id?: string | null;
};

type UserWithStats = Profile & {
  submissionsCount: number;
};

type Submission = {
  id: number;
  student_id: string;
};

interface CsvRow {
  email: string;
  username?: string;
  full_name?: string; // Added full_name
  grade?: string; // Added grade
  role: UserRole;
  password: string;
}

const getDisplayName = (
  profile: { full_name?: string | null; username?: string | null; email?: string | null } | null,
  fallback = "—"
) => profile?.full_name || profile?.username || profile?.email || fallback;

export default function TeacherPanel() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<UserRole>(null);
  const [users, setUsers] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const topicIds = useMemo(() => topics.map((topic) => topic.id), []);
  const [lessonVisibility, setLessonVisibility] = useState<LessonVisibility>(() =>
    getLessonVisibility(topicIds)
  );


  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);

  const [newEmail, setNewEmail] = useState("");
  const [newFullName, setNewFullName] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("student");
  const [newPassword, setNewPassword] = useState("123456789");
  const [newGrade, setNewGrade] = useState(""); // New state for grade
  const [addingUser, setAddingUser] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserWithStats | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);


  const loadData = useCallback(async () => {
    setLoading(true);
    setFormError(null);

    try {
      let profilesQuery = supabase
        .from("profiles")
        .select("id, username, full_name, email, role, must_change_password, added_by_teacher_id")
        .order("username", { ascending: true });

      if (currentUserRole === "teacher" && currentUser?.id) {
        profilesQuery = profilesQuery
          .eq("role", "student")
          .eq("added_by_teacher_id", currentUser.id);
      }
      const { data: profiles, error: profilesError } = await profilesQuery;

      if (profilesError) throw profilesError;

      const studentIds = ((profiles as Profile[]) || [])
        .filter((p) => p.role === "student")
        .map((p) => p.id);

      let submissions: Submission[] = [];
      if (studentIds.length > 0 || currentUserRole !== "teacher") {
        let submissionsQuery = supabase
          .from("submissions")
          .select("id, student_id");

        if (currentUserRole === "teacher" && studentIds.length > 0) {
          submissionsQuery = submissionsQuery.in("student_id", studentIds);
        }

        const { data, error: submissionsError } = await submissionsQuery;
        if (submissionsError) throw submissionsError;
        submissions = (data || []) as Submission[];
      }

      const subs = (submissions || []) as Submission[];
      const countsMap: Record<string, number> = {};
      subs.forEach((s) => {
        countsMap[s.student_id] = (countsMap[s.student_id] || 0) + 1;
      });

      // Use the new Profile type for better type safety
      const list: UserWithStats[] = (profiles as Profile[] || []).map((p) => ({
        ...p,
        must_change_password: p.must_change_password ?? false,
        submissionsCount: countsMap[p.id] || 0,
      }));

      setUsers(list);

    } catch (err: any) {
      console.error("Error loading data:", err);
      setFormError(`حدث خطأ أثناء جلب البيانات: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, currentUserRole]);

  useEffect(() => {
    if (!currentUserRole) return;
    loadData();
  }, [currentUserRole, loadData]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Error fetching user:", error);
      } else if (data?.user) {
        setCurrentUser(data.user);
        // Fetch profile to get the role
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", data.user.id)
          .single();
        if (profileError) {
          console.error("Error fetching user role:", profileError);
        } else if (profileData) {
          setCurrentUserRole(profileData.role);
        }
      }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    setLessonVisibility(getLessonVisibility(topicIds));
  }, [topicIds]);

  useEffect(() => {
    const loadLessonVisibilitySettings = async () => {
      if (!currentUser || (currentUserRole !== "teacher" && currentUserRole !== "admin")) {
        return;
      }

      const { data, error } = await supabase
        .from("lesson_visibility_settings")
        .select("topic_id, settings")
        .eq("teacher_id", currentUser.id);

      if (error) {
        console.error("Error loading lesson visibility settings:", error);
        return;
      }

      const next = buildLessonVisibilityFromRows(topicIds, data || []);
      setLessonVisibility(next);
    };

    loadLessonVisibilitySettings();
  }, [currentUser, currentUserRole, topicIds]);

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

    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results: ParseResult<CsvRow>) => {
        const usersToCreate = results.data;
        let createdCount = 0;
        let errorList: string[] = [];

        for (const user of usersToCreate) {
          const { email, role, password, full_name, grade } = user;
          if (!email || !role || !password) {
            console.warn("Skipping incomplete row in CSV:", user);
            continue;
          }

          try {
            const body: {
              email: string;
              password: string;
              role: UserRole;
              addedBy?: string;
              full_name?: string;
              grade?: string; // Add grade here
            } = { email, password, role };

            if (full_name) {
              body.full_name = full_name;
            }
            if (grade) { // Add grade to body if present
              body.grade = grade;
            }

            if (currentUserRole === "teacher" && role === "student" && currentUser?.id) {
              body.addedBy = currentUser.id;
            }

            const { data: createData, error } = await supabase.functions.invoke("create-user", {
              body,
            });

            if (error) {
              errorList.push(`${email}: ${error.message}`);
            } else if (!createData?.success) {
              const reason = (createData as any)?.error || "فشل الإنشاء لسبب غير معروف";
              errorList.push(`${email}: ${reason}`);
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
      error: (err: any) => {
        setUploadError(`حدث خطأ أثناء تحليل الملف: ${err.message}`);
        setUploading(false);
      },
    });
  };

  const handleCreateUser = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddingUser(true);
    setFormError(null);
    setSuccessMessage(null);

    try {
      const body: any = {
        email: newEmail,
        password: newPassword,
        role: newRole,
        full_name: newFullName,
        grade: newGrade, // Add grade here
      };

      if (currentUserRole === "teacher" && newRole === "student") {
        body.addedBy = currentUser?.id;
      }

      const { data: _data, error } = await supabase.functions.invoke("create-user", {
        body,
      });

      if (error) {
        throw new Error(`تعذّر الاتصال بوظيفة السيرفر: ${error.message}`);
      }

      const responseBody = _data as any;

      if (!responseBody?.success) {
        throw new Error(`تعذّر إنشاء المستخدم: ${responseBody?.error ?? "سبب غير معروف"}`);
      }

      const generatedUsername = responseBody?.username as string | undefined;

      let msg = generatedUsername
        ? `تم إضافة المستخدم بنجاح. اسم المستخدم: ${generatedUsername}`
        : "تم إضافة المستخدم بنجاح.";

      setSuccessMessage(msg);
      if (responseBody.profileCreated === false && responseBody.profileError) {
        setSuccessMessage(
          `تم إنشاء المستخدم، لكن حدثت مشكلة في حفظ البيانات الإضافية: ${responseBody.profileError}`
        );
      }

      setNewEmail("");
      setNewFullName("");
      setNewPassword("123456789");
      setNewRole("student");
      setNewGrade(""); // Clear newGrade after submission

      setTimeout(() => loadData(), 1000);
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setAddingUser(false);
    }
  };

  const handleDeleteClick = (user: UserWithStats) => {
    setUserToDelete(user);
    setShowConfirmDelete(true);
  };

  const confirmDelete = async () => {
    if (!userToDelete) return;

    setLoading(true);
    setFormError(null);

    try {
      // Admin can delete any user.
      // Teacher can only delete students they added (this logic will be in the backend)
      const { data: responseBody, error } = await supabase.functions.invoke("delete-user", {
        body: {
          user_id: userToDelete.id, // The edge function expects 'user_id'
        },
      });

      if (error) {
        throw new Error(`تعذّر الاتصال بوظيفة السيرفر: ${error.message}`);
      }

      if (responseBody?.error) {
        throw new Error(`فشل حذف المستخدم: ${responseBody.error} ${responseBody.details ? `(${responseBody.details})` : ""}`);
      }

      setSuccessMessage(`تم حذف المستخدم ${getDisplayName(userToDelete, "—")} بنجاح.`);
      loadData(); // Reload data after deletion
    } catch (err: any) {
      setFormError(`فشل حذف المستخدم: ${err.message}`);
    } finally {
      setShowConfirmDelete(false);
      setUserToDelete(null);
      setLoading(false);
    }
  };

  const cancelDelete = () => {
    setShowConfirmDelete(false);
    setUserToDelete(null);
  };

  const handleChangeRole = async (userId: string, newRole: UserRole) => {
    if (!newRole) return;

    // Only admins can change roles
    if (currentUserRole !== "admin") {
      setFormError("ليس لديك صلاحية لتغيير الأدوار.");
      return;
    }

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

  const handleToggleMustChangePassword = async (
    userId: string,
    nextValue: boolean
  ) => {
    if (currentUserRole !== "admin") {
      setFormError("يجب أن تكون مسؤولاً لتعديل هذا الإعداد.");
      return;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ must_change_password: nextValue })
        .eq("id", userId);

      if (error) throw error;

      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, must_change_password: nextValue } : u
        )
      );
    } catch (err: any) {
      setFormError(`تعذر تحديث الإعداد: ${err.message}`);
    }
  };



  const handleVisibilityChange = (
    topicId: string,
    section: LessonSection,
    value: boolean
  ) => {
    const updated = {
      ...lessonVisibility,
      [topicId]: {
        ...(lessonVisibility[topicId] || {}),
        [section]: value,
      },
    };

    localStorage.setItem(VISIBILITY_STORAGE_KEY, JSON.stringify(updated));
    setLessonVisibility(updated);

    if (!currentUser) return;
    setFormError(null);

    const topicSettings = updated[topicId];
    supabase
      .from("lesson_visibility_settings")
      .upsert(
        {
          teacher_id: currentUser.id,
          topic_id: topicId,
          settings: topicSettings,
        },
        { onConflict: "teacher_id,topic_id" }
      )
      .then(({ error }) => {
        if (error) {
          console.error("Error updating lesson visibility settings:", error);
          setFormError("تعذر حفظ إعدادات إتاحة الدروس. حاول مرة أخرى.");
        }
      });
  };

  return (
    <div className="page" dir="rtl" style={{ padding: "2rem" }}>

      <div className='submissions-page' dir='rtl'>
        <header className='submissions-header'>
          <h1>لوحة إدارة المستخدمين</h1>
        </header>
      </div>
      <p style={{ marginBottom: "1.5rem", color: "#4b5563" }}>
        من هنا يمكن للمعلم/المسؤول متابعة نشاط الطلاب، إضافة مستخدمين جدد، وتعديل الصلاحيات.
      </p>

      <div className="teacher-cards-container">
        <section className="card lesson-visibility-card full-width-card">
          <div className="lesson-visibility-header">
            <h2>إدارة إتاحة الدروس للطلاب</h2>
            <p>
              يمكنك تعطيل الدرس كاملًا أو إيقاف أجزاء من مسار الدرس مثل المراجعة
              أو التقييم.
            </p>
          </div>
          <div className="topics-grid">
            {topics.map((topic) => (
              <div key={topic.id} className="topic-grid-item">
                <h3 className="topic-title">{topic.title}</h3>
                <div className="topic-sections">
                  {(["lesson", "review", "evaluation", "activity", "collaborative"] as LessonSection[]).map(
                    (section) => (
                      <div key={`${topic.id}-${section}`} className="topic-section-item">
                        <label className="topic-section-label">
                          {section === "collaborative" && "نشاط المناقشة"}
                          {section === "activity" && "الأنشطة"}
                          {section === "lesson" && "الدرس"}
                          {section === "review" && "المراجعة"}
                          {section === "evaluation" && "الكتابة والتقييم"}
                        </label>
                        <label className="toggle-switch">
                          <input
                            type="checkbox"
                            checked={lessonVisibility[topic.id]?.[section] ?? false}
                            onChange={(e) =>
                              handleVisibilityChange(
                                topic.id,
                                section,
                                e.target.checked
                              )
                            }
                          />
                          <span className="toggle-slider" aria-hidden="true"></span>
                          <span className="toggle-label">
                            {lessonVisibility[topic.id]?.[section]
                              ? ""
                              : ""}
                          </span>
                        </label>
                      </div>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>







      </div>

      <div className="teacher-cards-container">
        {/* رفع CSV */}
        <section
          className="card"
          style={{ marginBottom: "0", padding: "1.5rem" }}
        >
          <h2 style={{ marginBottom: "1rem" }}>رفع مستخدمين من ملف</h2>
          <p
            style={{
              marginBottom: "0.75rem",
              fontSize: "0.9rem",
              color: "var(--text-muted)",
            }}
          >
            ارفع ملف CSV يحتوي على الأعمدة:{" "}
            <code>email</code>, <code>role</code>, <code>password</code>, <code>full_name</code>.
          </p>
          <p
            style={{
              marginBottom: "0.75rem",
              fontSize: "0.9rem",
              color: "var(--text-muted)",
            }}
          >
            سيتم إنشاء أسماء المستخدمين تلقائياً.
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
              className="button button-compact"
              disabled={uploading || !file}
            >
              {uploading ? "جاري الرفع..." : "رفع وإنشاء"}
            </button>
          </div>
        </section>

        {/* إضافة مستخدم جديد */}
        <section
          className="card"
          style={{ marginBottom: "0", padding: "1.5rem" }}
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
            <p style={{ margin: "0 0 0.75rem", color: "var(--text-muted)" }}>
              سيتم إنشاء اسم المستخدم تلقائياً.
            </p>

            <div className="input-group">
              <label htmlFor="newFullName">الاسم الكامل (اختياري)</label>
              <input
                id="newFullName"
                type="text"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder="الاسم الثلاثي"
              />
            </div>

            <div className="input-group">
              <label htmlFor="newGrade">الصف/المستوى (اختياري)</label>
              <input
                id="newGrade"
                type="text"
                value={newGrade}
                onChange={(e) => setNewGrade(e.target.value)}
                placeholder="مثال: الصف الخامس"
              />
            </div>


            <div className="input-group">
              <label htmlFor="newRole">نوع المستخدم</label>
              {currentUserRole === "admin" ? (
                <select
                  id="newRole"
                  value={newRole || "student"}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                >
                  <option value="student">طالب</option>
                  <option value="teacher">معلم</option>
                  <option value="admin">مسؤول</option>
                </select>
              ) : (
                <select
                  id="newRole"
                  value={"student"}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  disabled // Teachers can only add students
                >
                  <option value="student">طالب</option>
                </select>
              )}
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
              className="button button-compact"
              disabled={addingUser}
            >
              {addingUser ? "جاري الإنشاء..." : "إنشاء المستخدم"}
            </button>
          </form>
        </section>
      </div>

      {/* جدول المستخدمين */}
      <section className="card" style={{ padding: "1.5rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>المستخدمون الحاليون</h2>

        {loading ? (
          <SkeletonSection lines={5} showTitle={false} />
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
                  <th style={{ borderBottom: "1px solid #e5e7eb", padding: "0.5rem" }}>الاسم</th>
                  <th style={{ borderBottom: "1px solid #e5e7eb", padding: "0.5rem" }}>اسم المستخدم</th>
                  <th style={{ borderBottom: "1px solid #e5e7eb", padding: "0.5rem" }}>البريد الإلكتروني</th>
                  <th style={{ borderBottom: "1px solid #e5e7eb", padding: "0.5rem" }}>الصلاحية</th>
                  <th style={{ borderBottom: "1px solid #e5e7eb", padding: "0.5rem" }}>عدد التسليمات</th>
                  <th style={{ borderBottom: "1px solid #e5e7eb", padding: "0.5rem" }}>يحتاج تغيير كلمة المرور؟</th>
                  <th style={{ borderBottom: "1px solid #e5e7eb", padding: "0.5rem" }}>تعديل الصلاحيات</th>
                  <th style={{ borderBottom: "1px solid #e5e7eb", padding: "0.5rem" }}>حذف</th>
                </tr>
              </thead>

              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td style={{ borderBottom: "1px solid #f3f4f6", padding: "0.5rem" }}>
                      {u.full_name || "—"}
                    </td>
                    <td style={{ borderBottom: "1px solid #f3f4f6", padding: "0.5rem" }}>
                      {u.username || "—"}
                    </td>
                    <td style={{ borderBottom: "1px solid #f3f4f6", padding: "0.5rem" }}>{u.email || "—"}</td>
                    <td style={{ borderBottom: "1px solid #f3f4f6", padding: "0.5rem" }}>{u.role === "admin" ? "مسؤول" : u.role === "teacher" ? "معلم" : "طالب"}</td>
                    <td style={{ borderBottom: "1px solid #f3f4f6", padding: "0.5rem" }}>{u.submissionsCount}</td>
                    <td style={{ borderBottom: "1px solid #f3f4f6", padding: "0.5rem" }}>
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <span>{u.must_change_password ? "نعم" : "لا"}</span>
                        {currentUserRole === "admin" && (
                          <button
                            type="button"
                            className="button button-compact"
                            onClick={() =>
                              handleToggleMustChangePassword(
                                u.id,
                                !u.must_change_password
                              )
                            }
                          >
                            {u.must_change_password ? "تعطيل" : "تفعيل"}
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ borderBottom: "1px solid #f3f4f6", padding: "0.5rem" }}>
                      {currentUserRole === "admin" ? (
                        <select value={u.role || "student"} onChange={(e) => handleChangeRole(u.id, e.target.value as UserRole)}>
                          <option value="student">طالب</option>
                          <option value="teacher">معلم</option>
                          <option value="admin">مسؤول</option>
                        </select>
                      ) : (
                        <span>{u.role === "admin" ? "مسؤول" : u.role === "teacher" ? "معلم" : "طالب"}</span>
                      )}
                    </td>
                    <td style={{ borderBottom: "1px solid #f3f4f6", padding: "0.5rem" }}>
                      {(currentUserRole === "admin" || (currentUserRole === "teacher" && u.role === "student")) && (
                        <button
                          className="button button-compact button-destructive"
                          onClick={() => handleDeleteClick(u)}
                          disabled={loading}
                        >
                          حذف
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showConfirmDelete && userToDelete && (
        <div className="modal-backdrop">
          <div className="modal-content card" dir="rtl">
            <h3>تأكيد الحذف</h3>
            <p>
              هل أنت متأكد أنك تريد حذف المستخدم {getDisplayName(userToDelete, "—")} (
              {userToDelete.email})؟
            </p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem", marginTop: "1.5rem" }}>
              <button className="button button-compact" onClick={cancelDelete}>
                إلغاء
              </button>
              <button className="button button-compact button-destructive" onClick={confirmDelete} disabled={loading}>
                {loading ? "جاري الحذف..." : "تأكيد الحذف"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
