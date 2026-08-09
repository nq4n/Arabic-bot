import { useState } from "react";
import { SkeletonSection } from "../../components/SkeletonBlocks";
import { topics } from "../../data/topics";
import "../../styles/TeacherPanel.css";

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
  onViewCollaborativeDetails,
  getDisplayName,
}: Props) {
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'all' | 'single'>('all');
  const [selectedSubmission, setSelectedSubmission] = useState<ActivitySubmission | null>(null);
  const [selectedCollab, setSelectedCollab] = useState<CollaborativeCompletion | null>(null);
  const [collabDetails, setCollabDetails] = useState<any[] | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const filteredActivitySubmissions = viewMode === 'single' && selectedStudentId
    ? activitySubmissions.filter(s => s.student_id === selectedStudentId)
    : activitySubmissions;

  const filteredCollaborativeCompletions = viewMode === 'single' && selectedStudentId
    ? collaborativeCompletions.filter(c => c.student_id === selectedStudentId)
    : collaborativeCompletions;

  const filteredLeaderboard = viewMode === 'single' && selectedStudentId
    ? leaderboard.filter(e => e.studentId === selectedStudentId)
    : leaderboard;

  const filteredTrackingData = viewMode === 'single' && selectedStudentId
    ? studentTrackingData.filter(t => t.student_id === selectedStudentId)
    : studentTrackingData;

  const handleViewCollab = async (completion: CollaborativeCompletion) => {
    setSelectedCollab(completion);
    setLoadingDetails(true);
    const log = await onViewCollaborativeDetails(completion.topic_id, completion.student_id, completion.activity_kind);
    setCollabDetails(log);
    setLoadingDetails(false);
  };

  return (
    <div className="teacher-cards-container">
      {/* تحديد طالب وطريقة العرض */}
      <section className="card lesson-visibility-card full-width-card">
        <div className="lesson-visibility-header">
          <h2>تحديد طالب</h2>
          <p>حدد طالباً لعرض بياناتActivities الخاصة به، أو اعرض الكل.</p>
        </div>

        {loading ? (
          <SkeletonSection lines={2} showTitle={false} />
        ) : users.length === 0 ? (
          <p className="muted-note">لا يوجد طلاب متاحون.</p>
        ) : (
          <div>
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="viewMode"
                  checked={viewMode === 'all'}
                  onChange={() => { setViewMode('all'); setSelectedStudentId(null); }}
                />
                <span>عرض الكل</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="viewMode"
                  checked={viewMode === 'single'}
                  onChange={() => setViewMode('single')}
                />
                <span>عرض طالب واحد</span>
              </label>
            </div>
            {viewMode === 'single' && (
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
            )}
            {selectedStudentId && (
              <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="button button-compact button-secondary"
                  onClick={() => { setSelectedStudentId(null); setViewMode('all'); }}
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
        ) : filteredActivitySubmissions.length === 0 ? (
          <p className="muted-note">لا توجد تسليمات أنشطة {(viewMode === 'single' && selectedStudentId) ? 'لهذا الطالب' : ''} بعد.</p>
        ) : (
          <div className="data-cards-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {filteredActivitySubmissions.map((submission) => (
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
          <p>سجل الأنشطة التعاونية التي أنهى الطلاب.</p>
        </div>

        {loading ? (
          <SkeletonSection lines={4} showTitle={false} />
        ) : filteredCollaborativeCompletions.length === 0 ? (
          <p className="muted-note">لا يوجد سجلات للأنشطة التعاونية {(viewMode === 'single' && selectedStudentId) ? 'لهذا الطالب' : ''}.</p>
        ) : (
          <div className="data-cards-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {filteredCollaborativeCompletions.map((completion) => (
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
                  >
                    عرض التفاصيل
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
        ) : filteredLeaderboard.length === 0 ? (
          <p className="muted-note">لا توجد بيانات كافية لعرض اللوحة {(viewMode === 'single' && selectedStudentId) ? 'لهذا الطالب' : ''}.</p>
        ) : (
          <div className="data-cards-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            {filteredLeaderboard.map((entry) => (
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
            {viewMode === 'all' ? (
              <p className="muted-note full-width" style={{ gridColumn: '1 / -1' }}>
                الرجاء تحديد طالب واحد لعرض بيانات التتبع الخاصة به.
              </p>
            ) : !selectedStudentId ? (
              <p className="muted-note full-width" style={{ gridColumn: '1 / -1' }}>
                الرجاء تحديد طالب لعرض بيانات التتبع الخاصة به.
              </p>
            ) : (
              filteredTrackingData.map((tracking) => {
                const data = tracking.tracking_data || {};
                const lessons: Record<string, { completed: boolean }> = data.lessons || {};
                const activities: Record<string, { completedIds: number[] }> = data.activities || {};
                const evaluations: Record<string, { score: number }> = data.evaluations || {};
                const collaborative: Record<string, { discussion?: boolean; dialogue?: boolean }> = data.collaborative || {};
                const totalPoints = data.points?.total ?? 0;

                const lessonsCompleted = Object.values(lessons).filter((l) => l?.completed).length;
                const activitiesCompleted = Object.values(activities).reduce(
                  (sum, a) => sum + (a?.completedIds?.length || 0),
                  0
                );
                const evaluationsCount = Object.keys(evaluations).length;
                const collaborativeCount = Object.values(collaborative).reduce(
                  (sum, c) => sum + (c?.discussion ? 1 : 0) + (c?.dialogue ? 1 : 0),
                  0
                );

                const activityTopicEntries = Object.entries(activities).filter(
                  ([, val]) => (val?.completedIds?.length || 0) > 0
                );
                const collaborativeTopicEntries = Object.entries(collaborative).filter(
                  ([, val]) => val?.discussion || val?.dialogue
                );

                const getTopicTitle = (topicId: string) =>
                  topics.find((t) => t.id === topicId)?.title || topicId;

                const getActivityTitle = (topicId: string, activityId: number) => {
                  const topic = topics.find((t) => t.id === topicId);
                  const activity = topic?.activities?.list?.find((a) => a.activity === activityId);
                  return activity?.title || `نشاط ${activityId}`;
                };

                return (
                  <div key={tracking.id} className="tracking-visual full-width" style={{ gridColumn: '1 / -1' }}>
                    <div className="tracking-visual-header">
                      <div>
                        <h3 style={{ margin: 0, color: 'var(--primary)' }}>
                          {getDisplayName(
                            users.find((u) => u.id === tracking.student_id) || null,
                            tracking.student_name
                          )}
                        </h3>
                        <p style={{ margin: '0.25rem 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          آخر تحديث: {new Date(tracking.updated_at).toLocaleString("ar")}
                        </p>
                      </div>
                      <div className="tracking-points-badge">
                        <span className="tracking-points-value">{totalPoints}</span>
                        <span className="tracking-points-label">نقطة</span>
                      </div>
                    </div>

                    <div className="tracking-stats-grid">
                      <div className="tracking-stat">
                        <i className="fas fa-book-open tracking-stat-icon"></i>
                        <div className="tracking-stat-meta">
                          <span className="tracking-stat-value">{lessonsCompleted}</span>
                          <span className="tracking-stat-label">دروس مكتملة</span>
                        </div>
                      </div>
                      <div className="tracking-stat">
                        <i className="fas fa-tasks tracking-stat-icon"></i>
                        <div className="tracking-stat-meta">
                          <span className="tracking-stat-value">{activitiesCompleted}</span>
                          <span className="tracking-stat-label">أنشطة منجزة</span>
                        </div>
                      </div>
                      <div className="tracking-stat">
                        <i className="fas fa-pen-nib tracking-stat-icon"></i>
                        <div className="tracking-stat-meta">
                          <span className="tracking-stat-value">{evaluationsCount}</span>
                          <span className="tracking-stat-label">تقييمات</span>
                        </div>
                      </div>
                      <div className="tracking-stat">
                        <i className="fas fa-users tracking-stat-icon"></i>
                        <div className="tracking-stat-meta">
                          <span className="tracking-stat-value">{collaborativeCount}</span>
                          <span className="tracking-stat-label">أنشطة تعاونية</span>
                        </div>
                      </div>
                    </div>

                    {lessonsCompleted > 0 && (
                      <div className="tracking-section">
                        <div className="tracking-section-title">
                          <i className="fas fa-check-circle"></i> الدروس المكتملة
                        </div>
                        <div className="tracking-pills">
                          {Object.entries(lessons)
                            .filter(([, l]) => l?.completed)
                            .map(([topicId]) => (
                              <span key={topicId} className="tracking-pill tracking-pill-lesson">
                                <i className="fas fa-check"></i> {getTopicTitle(topicId)}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}

                    {activityTopicEntries.length > 0 && (
                      <div className="tracking-section">
                        <div className="tracking-section-title">
                          <i className="fas fa-tasks"></i> الأنشطة المنجزة
                        </div>
                        <div className="tracking-activity-group">
                          {activityTopicEntries.map(([topicId, val]) => (
                            <div key={topicId} className="tracking-topic-row">
                              <span className="tracking-topic-name">{getTopicTitle(topicId)}</span>
                              <div className="tracking-pills">
                                {(val?.completedIds || []).map((activityId) => (
                                  <span key={activityId} className="tracking-pill tracking-pill-activity">
                                    <i className="fas fa-star"></i> {getActivityTitle(topicId, activityId)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {evaluationsCount > 0 && (
                      <div className="tracking-section">
                        <div className="tracking-section-title">
                          <i className="fas fa-pen-nib"></i> التقييمات الكتابية
                        </div>
                        <div className="tracking-pills">
                          {Object.entries(evaluations).map(([topicId, evalData]) => (
                            <span key={topicId} className="tracking-pill tracking-pill-evaluation">
                              <i className="fas fa-check"></i> {getTopicTitle(topicId)}
                              <span className="tracking-score">{evalData?.score ?? ""}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {collaborativeTopicEntries.length > 0 && (
                      <div className="tracking-section">
                        <div className="tracking-section-title">
                          <i className="fas fa-users"></i> الأنشطة التعاونية
                        </div>
                        <div className="tracking-activity-group">
                          {collaborativeTopicEntries.map(([topicId, val]) => (
                            <div key={topicId} className="tracking-topic-row">
                              <span className="tracking-topic-name">{getTopicTitle(topicId)}</span>
                              <div className="tracking-pills">
                                {val?.discussion && (
                                  <span className="tracking-pill tracking-pill-collab">
                                    <i className="fas fa-comments"></i> مناقشة جماعية
                                  </span>
                                )}
                                {val?.dialogue && (
                                  <span className="tracking-pill tracking-pill-collab">
                                    <i className="fas fa-comments"></i> حوار ثنائي
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
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

