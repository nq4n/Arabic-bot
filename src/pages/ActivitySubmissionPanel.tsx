import { useState } from "react";
import { SkeletonSection } from "../components/SkeletonBlocks";
import { topics } from "../data/topics";
import "../styles/TeacherPanel.css";

type UserRole = "student" | "teacher" | "admin" | null;

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

type ActivitySubmission = {
  id: number;
  student_id: string;
  topic_id: string;
  activity_id: number;
  response_text: string | null;
  created_at: string;
};

type CollaborativeCompletion = {
  id: number;
  student_id: string;
  topic_id: string;
  activity_kind: string;
  completed_at: string;
};

type LeaderboardEntry = {
  rank: number;
  studentId: string;
  name: string;
  totalPoints: number;
  level: string;
};

type StudentTrackingEntry = {
  id: number;
  student_id: string;
  student_name: string;
  tracking_data: Record<string, any>; // Using Record<string, any> for jsonb
  created_at: string;
  updated_at: string;
};

type Props = {
  loading: boolean;
  users: UserWithStats[];
  activitySubmissions: ActivitySubmission[];
  collaborativeCompletions: CollaborativeCompletion[];
  leaderboard: LeaderboardEntry[];
  studentTrackingData: StudentTrackingEntry[]; // New prop
  onDeleteCompletion: (completionId: number) => void;
  onViewCollaborativeDetails: (topicId: string, studentId: string, kind: string) => Promise<any[] | null>;
  getDisplayName: (
    profile:
      | { full_name?: string | null; username?: string | null; email?: string | null }
      | null
      | undefined,
    fallback?: string
  ) => string;
};

export default function TeacherActivityReports({
  loading,
  users,
  activitySubmissions,
  collaborativeCompletions,
  leaderboard,
  studentTrackingData = [], // Provide a default empty array
  onDeleteCompletion,
  onViewCollaborativeDetails,
  getDisplayName,
}: Props) {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<ActivitySubmission | null>(null);
  const [selectedCollab, setSelectedCollab] = useState<CollaborativeCompletion | null>(null);
  const [collabDetails, setCollabDetails] = useState<any[] | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const handleViewCollab = async (completion: CollaborativeCompletion) => {
    setSelectedCollab(completion);
    setLoadingDetails(true);
    const log = await onViewCollaborativeDetails(completion.topic_id, completion.student_id, completion.activity_kind);
    setCollabDetails(log);
    setLoadingDetails(false);
  };

  return (
    <div className="teacher-cards-container">
      {/* تحديد طالب */}
      <section className="card lesson-visibility-card full-width-card">
        <div className="lesson-visibility-header">
          <h2>تحديد طالب</h2>
          <p>حدد طالباً لعرض بيانات تتبع الأنشطة الخاصة به.</p>
        </div>

        {loading ? (
          <SkeletonSection lines={2} showTitle={false} />
        ) : users.length === 0 ? (
          <p className="muted-note">لا يوجد طلاب متاحون.</p>
        ) : (
          <div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
              {users.map((user) => (
                <button
                  key={user.id}
                  className={`button button-compact ${selectedStudentId === user.id ? 'button-primary' : 'button-secondary'}`}
                  onClick={() => setSelectedStudentId(user.id)}
                  style={{
                    borderColor: selectedStudentId === user.id ? 'var(--primary)' : 'var(--border-color)',
                    backgroundColor: selectedStudentId === user.id ? 'var(--primary)' : 'var(--bg-secondary)',
                    color: selectedStudentId === user.id ? 'var(--primary-icon)' : 'var(--text-main)',
                  }}
                >
                  {getDisplayName(user)}
                </button>
              ))}
            </div>
            {selectedStudentId && (
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <button
                  type="button"
                  className="button button-compact button-destructive"
                  onClick={() => setSelectedStudentId(null)}
                >
                  إلغاء تحديد الطالب
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* تسليمات الأنشطة من الطلاب */}
      <section className="card lesson-visibility-card">
        <div className="lesson-visibility-header">
          <h2>تسليمات الأنشطة من الطلاب</h2>
          <p>هنا تظهر الأنشطة التي أرسلها الطلاب للمعلمين.</p>
        </div>

        {loading ? (
          <SkeletonSection lines={4} showTitle={false} />
        ) : activitySubmissions.length === 0 ? (
          <p className="muted-note">لا توجد تسليمات أنشطة بعد.</p>
        ) : (
          <div className="data-cards-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {activitySubmissions.map((submission) => (
              <div key={submission.id} className="card submission-item" style={{ display: 'flex', flexDirection: 'column', padding: '1rem' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <h3
                    style={{ fontSize: '1.1rem', marginBottom: '0.25rem', color: 'var(--primary)' }}
                  >
                    {getDisplayName(
                      users.find((u) => u.id === submission.student_id) || null,
                      "طالب"
                    )} - {topics.find((t) => t.id === submission.topic_id)?.title || submission.topic_id}
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>النشاط: {submission.activity_id}</p>
                </div>
                <div style={{ flexGrow: 1, marginBottom: '1rem' }}>
                  <p>
                    <strong>وصف الطالب:</strong>{" "}
                    {submission.response_text ? (
                      <span title={submission.response_text}>
                        {submission.response_text.length > 100
                          ? submission.response_text.substring(0, 97) + "..."
                          : submission.response_text}
                      </span>
                    ) : (
                      "-"
                    )}
                  </p>
                </div>
                <div style={{ marginTop: 'auto', textAlign: 'right' }}>
                  <button
                    type="button"
                    className="button button-compact"
                    onClick={() => setSelectedSubmission(submission)}
                  >
                    عرض التفاصيل
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* سجل إنهاء الأنشطة التعاونية */}
      <section className="card lesson-visibility-card">
        <div className="lesson-visibility-header">
          <h2>سجل إنهاء الأنشطة التعاونية</h2>
          <p>يمكن حذف السجل لإعادة فتح النشاط للطالب.</p>
        </div>

        {loading ? (
          <SkeletonSection lines={4} showTitle={false} />
        ) : collaborativeCompletions.length === 0 ? (
          <p className="muted-note">لا يوجد سجلات للأنشطة التعاونية.</p>
        ) : (
          <div className="data-cards-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {collaborativeCompletions.map((completion) => (
              <div key={completion.id} className="card completion-item" style={{ display: 'flex', flexDirection: 'column', padding: '1rem' }}>
                <div style={{ marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem', color: 'var(--primary)' }}>
                    {getDisplayName(
                      users.find((u) => u.id === completion.student_id) || null,
                      "غير معروف"
                    )} - {topics.find((t) => t.id === completion.topic_id)?.title || completion.topic_id}
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>نوع النشاط: {completion.activity_kind}</p>
                </div>
                <div style={{ flexGrow: 1, marginBottom: '1rem' }}>
                  <p>
                    <strong>تاريخ الإنهاء:</strong> {new Date(completion.completed_at).toLocaleDateString("ar")}
                  </p>
                </div>
                <div style={{ marginTop: 'auto', textAlign: 'right' }}>
                  <button
                    type="button"
                    className="button button-compact button-secondary"
                    onClick={() => handleViewCollab(completion)}
                    style={{ marginLeft: '0.5rem' }}
                  >
                    عرض التفاصيل
                  </button>
                  <button
                    type="button"
                    className="button button-compact button-destructive"
                    onClick={() => onDeleteCompletion(completion.id)}
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* لوحة صدارة الطلاب */}
      <section className="card lesson-visibility-card">
        <div className="lesson-visibility-header">
          <h2>لوحة صدارة الطلاب</h2>
          <p>ترتيب الطلاب بناءً على النقاط المجمعة من الدروس والأنشطة.</p>
        </div>

        {loading ? (
          <SkeletonSection lines={5} showTitle={false} />
        ) : leaderboard.length === 0 ? (
          <p className="muted-note">لا توجد بيانات كافية لعرض اللوحة.</p>
        ) : (
          <div className="data-cards-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            {leaderboard.map((entry) => (
              <div
                key={entry.studentId}
                className="card leaderboard-item"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '1rem',
                  backgroundColor: entry.rank === 1 ? "rgba(255, 215, 0, 0.1)" : "",
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span className={`rank-badge rank-${entry.rank <= 3 ? entry.rank : "other"}`} style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
                    {entry.rank}
                  </span>
                  <h3 style={{ fontSize: '1.1rem', color: 'var(--text-main)', margin: 0 }}>{entry.name}</h3>
                </div>
                <div style={{ flexGrow: 1 }}>
                  <p style={{ margin: '0.5rem 0 0.25rem' }}>
                    <strong>المستوى:</strong> {entry.level}
                  </p>
                  <p style={{ fontWeight: "bold", color: "var(--primary)", fontSize: '1.2rem', margin: '0.25rem 0 0' }}>
                    مجموع النقاط: {entry.totalPoints}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* بيانات تتبع الطلاب */}
      <section className="card lesson-visibility-card">
        <div className="lesson-visibility-header">
          <h2>بيانات تتبع الطلاب</h2>
          <p>عرض سجلات التتبع المفصلة للطلاب.</p>
        </div>

        {loading ? (
          <SkeletonSection lines={4} showTitle={false} />
        ) : (
          <div className="data-cards-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {!selectedStudentId ? (
              <p className="muted-note full-width" style={{ gridColumn: '1 / -1' }}>
                الرجاء تحديد طالب لعرض بيانات التتبع الخاصة به.
              </p>
            ) : (
              studentTrackingData
                .filter((tracking) => tracking.student_id === selectedStudentId)
                .map((tracking) => (
                  <div key={tracking.id} className="card tracking-item" style={{ display: 'flex', flexDirection: 'column', padding: '1rem' }}>
                    <div style={{ marginBottom: '0.5rem' }}>
                      <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem', color: 'var(--primary)' }}>
                        {getDisplayName(
                          users.find((u) => u.id === tracking.student_id) || null,
                          tracking.student_name
                        )}
                      </h3>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        تم الإنشاء: {new Date(tracking.created_at).toLocaleDateString("ar")}
                      </p>
                      <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                        آخر تحديث: {new Date(tracking.updated_at).toLocaleDateString("ar")}
                      </p>
                    </div>
                    <div style={{ flexGrow: 1 }}>
                      <strong>بيانات التتبع:</strong>
                      <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', backgroundColor: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: 'var(--border-radius)', fontSize: '0.85rem' }}>
                        <code>{JSON.stringify(tracking.tracking_data, null, 2)}</code>
                      </pre>
                    </div>
                    <div style={{ marginTop: 'auto', textAlign: 'right' }}>
                      <button
                        type="button"
                        className="button button-compact button-secondary"
                        onClick={() => setSelectedStudentId(null)}
                      >
                        إلغاء التحديد
                      </button>
                    </div>
                  </div>
                ))
            )}
            {/* If no tracking data for the selected student */}
            {selectedStudentId && !studentTrackingData.some(t => t.student_id === selectedStudentId) && (
              <p className="muted-note full-width" style={{ gridColumn: '1 / -1' }}>
                لا توجد بيانات تتبع للطالب المحدد.
              </p>
            )}
          </div>
        )}
      </section>

      {/* Modal for Activity Submissions */}
      {selectedSubmission && (
        <div className="modal-backdrop" onClick={() => setSelectedSubmission(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'right', direction: 'rtl', maxWidth: '700px' }}>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>تفاصيل التسليم</h3>
            <div style={{ margin: '1.5rem 0', maxHeight: '60vh', overflowY: 'auto' }}>
              <p><strong>الطالب:</strong> {getDisplayName(users.find(u => u.id === selectedSubmission.student_id))}</p>
              <p><strong>الدرس:</strong> {topics.find(t => t.id === selectedSubmission.topic_id)?.title || selectedSubmission.topic_id}</p>
              <p><strong>رقم النشاط:</strong> {selectedSubmission.activity_id}</p>
              <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
                <strong>التسليم:</strong>
                <p style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>{selectedSubmission.response_text || "لا يوجد نص."}</p>
              </div>
            </div>
            <button className="button button-secondary" onClick={() => setSelectedSubmission(null)}>إغلاق</button>
          </div>
        </div>
      )}

      {/* Modal for Collaborative Activities */}
      {selectedCollab && (
        <div className="modal-backdrop" onClick={() => { setSelectedCollab(null); setCollabDetails(null); }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ textAlign: 'right', direction: 'rtl', maxWidth: '800px', width: '90%' }}>
            <h3 style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>تفاصيل النشاط التعاوني</h3>
            <div style={{ margin: '1.5rem 0', maxHeight: '60vh', overflowY: 'auto' }}>
              <p><strong>الطالب:</strong> {getDisplayName(users.find(u => u.id === selectedCollab.student_id))}</p>
              <p><strong>الدرس:</strong> {topics.find(t => t.id === selectedCollab.topic_id)?.title || selectedCollab.topic_id}</p>
              <p><strong>النوع:</strong> {selectedCollab.activity_kind === 'discussion' ? 'مناقشة جماعية' : 'حوار ثنائي'}</p>

              <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
                <strong>سجل المحادثة:</strong>
                {loadingDetails ? (
                  <p>جاري تحميل السجل...</p>
                ) : collabDetails && collabDetails.length > 0 ? (
                  <div style={{ marginTop: '1rem' }}>
                    {collabDetails.map((msg, idx) => (
                      <div key={idx} style={{
                        marginBottom: '0.75rem',
                        padding: '0.5rem',
                        borderRadius: '0.5rem',
                        backgroundColor: msg.userId === selectedCollab.student_id ? 'rgba(var(--primary-rgb), 0.1)' : 'var(--bg-card)',
                        border: '1px solid var(--border-color-light)',
                        textAlign: 'right'
                      }}>
                        <div style={{ fontSize: '0.8rem', color: 'var(--primary)', marginBottom: '0.25rem', fontWeight: 'bold' }}>
                          {getDisplayName(users.find(u => u.id === msg.userId)) || msg.role || "مستخدم"}
                        </div>
                        <div style={{ fontSize: '0.95rem' }}>{msg.text}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                          {new Date(msg.timestamp).toLocaleString("ar")}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ marginTop: '0.5rem', color: 'var(--text-muted)' }}>لا يوجد سجل محادثة متاح لهذا النشاط.</p>
                )}
              </div>
            </div>
            <button className="button button-secondary" onClick={() => { setSelectedCollab(null); setCollabDetails(null); }}>إغلاق</button>
          </div>
        </div>
      )}
    </div>
  );
}
