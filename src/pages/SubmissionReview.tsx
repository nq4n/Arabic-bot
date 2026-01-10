import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import type { AIResponseType } from '../services/aiEvaluationService';
import { rubrics } from '../data/rubrics';
import type { RubricLevel } from '../data/rubrics';
import { topics, WritingSection } from '../data/topics';
import '../styles/SubmissionReview.css';
import '../styles/Tabs.css';

// --- TYPE DEFINITIONS ---
type Submission = {
  id: number;
  student_id: string;
  topic_title: string;
  submission_data: { [key: string]: string };
  ai_response: AIResponseType;
  teacher_response: TeacherResponseType | null;
  created_at: string;
};

type TeacherResponseType = {
  feedback: string;
  rubric_breakdown: { [key: string]: { score: number } };
  total_score: number;
};

type Profile = {
  role: 'student' | 'teacher' | 'admin';
};

// --- COMPONENT ---
export default function SubmissionReview() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();

  // --- STATE MANAGEMENT ---
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('ai'); // 'ai' or 'teacher'

  // State for teacher's form
  const [teacherFeedback, setTeacherFeedback] = useState('');
  const [teacherScores, setTeacherScores] = useState<{ [key: string]: { score: number } }>({});
  const [teacherSelections, setTeacherSelections] = useState<{ [key: string]: string }>({});
  const [isSaving, setIsSaving] = useState(false);

  // --- DATA FETCHING ---
  const topic = topics.find(t => t.title === submission?.topic_title);
  const rubric = rubrics.find(r => r.topicId === topic?.id);

  const fetchSubmissionAndProfile = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) throw new Error('يجب عليك تسجيل الدخول لعرض هذه الصفحة.');

      const [profileRes, submissionRes] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', session.user.id).single(),
        supabase.from('submissions').select('*').eq('id', submissionId).single(),
      ]);

      if (profileRes.error) throw profileRes.error;
      setProfile(profileRes.data as Profile);

      if (submissionRes.error) throw submissionRes.error;
      const subData = submissionRes.data as Submission;
      setSubmission(subData);

      if (profileRes.data.role === 'student' && subData.student_id !== session.user.id) {
          throw new Error("ليس لديك صلاحية لعرض هذا التسليم.");
      }

      if (subData.teacher_response) {
        setTeacherFeedback(subData.teacher_response.feedback || '');
        const breakdown = subData.teacher_response.rubric_breakdown || {};
        setTeacherScores(breakdown);
        const topicForSubmission = topics.find((t) => t.title === subData.topic_title);
        const rubricForSubmission = rubrics.find((r) => r.topicId === topicForSubmission?.id);
        if (rubricForSubmission) {
          const selections = rubricForSubmission.criteria.reduce<Record<string, string>>(
            (acc, criterion) => {
              const score = breakdown[criterion.id]?.score;
              const levelMatch = criterion.levels.find((level) => level.score === score);
              if (levelMatch) {
                acc[criterion.id] = levelMatch.id;
              }
              return acc;
            },
            {}
          );
          setTeacherSelections(selections);
        }
      }
    } catch (e: any) {
      setError(e.message || 'حدث خطأ ما.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    fetchSubmissionAndProfile();
  }, [fetchSubmissionAndProfile]);

  // --- EVENT HANDLERS ---
  const handleTeacherLevelSelect = (criterionId: string, level: RubricLevel) => {
    setTeacherSelections((prev) => ({ ...prev, [criterionId]: level.id }));
    setTeacherScores((prev) => ({ ...prev, [criterionId]: { score: level.score } }));
  };

  const handleTeacherSubmit = async () => {
    if (!submission || !rubric) return;
    setIsSaving(true);

    const totalScore = Object.values(teacherScores).reduce((sum, item) => sum + item.score, 0);

    const teacherResponse: TeacherResponseType = {
        feedback: teacherFeedback,
        rubric_breakdown: teacherScores,
        total_score: totalScore,
    };

    const { error: updateError } = await supabase
        .from('submissions')
        .update({ teacher_response: teacherResponse })
        .eq('id', submission.id);
    
    if (updateError) {
        alert('حدث خطأ أثناء حفظ تقييمك.');
        console.error(updateError);
    } else {
        alert('تم حفظ التقييم بنجاح!');
        setSubmission(prev => prev ? { ...prev, teacher_response: teacherResponse } : null);
    }
    setIsSaving(false);
  };

  // --- RENDER LOGIC ---
  if (loading) return <div className='page-container' dir='rtl'><div className='loading-indicator'><div className='spinner'></div></div></div>;
  if (error) return <div className='page-container' dir='rtl'><p className='error-message'>{error}</p></div>;
  if (!submission || !rubric) return <div className='page-container' dir='rtl'><p className='error-message'>لا يمكن عرض هذا التسليم.</p></div>;

  const aiResponse = submission.ai_response;
  const isTeacher = profile?.role === 'teacher' || profile?.role === 'admin';
  const evaluationTitle =
    topic?.evaluationTask.mode === "discussion"
      ? "مناقشة الطالب"
      : topic?.evaluationTask.mode === "dialogue"
        ? "حوار الطالب"
        : topic?.evaluationTask.mode === "report"
          ? "تقرير الطالب"
          : "كتابة الطالب";
  const evaluationTaskTitle =
    topic?.evaluationTask.mode === "discussion"
      ? "مهمة المناقشة"
      : topic?.evaluationTask.mode === "dialogue"
        ? "مهمة الحوار"
        : topic?.evaluationTask.mode === "report"
          ? "مهمة التقرير"
          : "مهمة الكتابة";

  const renderAITab = () => (
      <section className='card ai-feedback-area'>
          <h2><i className='fas fa-robot'></i> تقييم الذكاء الاصطناعي</h2>
          <div className='score ai-score'>{aiResponse.score}/{rubric.criteria.reduce((acc, crit) => acc + crit.levels[0].score, 0)}</div>
          <h4>ملاحظات عامة:</h4>
          <p>{aiResponse.feedback}</p>
          <h4>اقتراحات للتحسين:</h4>
          <ul>{aiResponse.suggestions.map((s, i) => <li key={i}>{s}</li>)}</ul>
          <h4>تقييم حسب المعايير:</h4>
          <div className='rubric-feedback-display'>
              {Object.entries(aiResponse.rubric_breakdown).map(([key, value]) => (
                  <div key={key} className='rubric-item-display'>
                      <strong>{rubric.criteria.find(c => c.id === key)?.name}:</strong> {value.score}/{rubric.criteria.find(c => c.id === key)?.levels[0].score || 5} - {value.feedback}
                  </div>
              ))}
          </div>
      </section>
  );

  const renderTeacherTab = () => {
      if (isTeacher) {
          const allCriteriaSelected = rubric.criteria.every((criterion) =>
            teacherScores[criterion.id]?.score !== undefined
          );
          const levelHeaders = rubric.criteria[0]?.levels ?? [];
          return (
              <section className='card teacher-grading-area'>
                  <h2><i className='fas fa-marker'></i> نموذج تقييم المعلم</h2>
                  <div className='form-group'>
                      <label htmlFor='teacher-feedback'>ملاحظات عامة</label>
                      <textarea id='teacher-feedback' value={teacherFeedback} onChange={e => setTeacherFeedback(e.target.value)} rows={4} />
                  </div>
                  <h4>تقييم المعايير (اختر مستوى لكل معيار)</h4>
                  <div className='rubric-criteria-selection'>
                    {rubric.criteria.map((criterion) => (
                      <div key={criterion.id} className='criterion-block'>
                        <h3>{criterion.name}</h3>
                        <p className='criterion-description'>{criterion.description}</p>
                        <div className='level-options'>
                          {criterion.levels.map((level) => (
                            <div
                              key={level.id}
                              className={`level-box ${teacherSelections[criterion.id] === level.id ? 'selected' : ''}`}
                              onClick={() => handleTeacherLevelSelect(criterion.id, level)}
                            >
                              <span className='level-label'>{level.label} ({level.score})</span>
                              <span className='level-description'>{level.description}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={handleTeacherSubmit} disabled={isSaving || !allCriteriaSelected} className='button button-primary'>
                      {isSaving ? 'جاري الحفظ...' : 'حفظ التقييم'}
                  </button>
                  {!allCriteriaSelected && (
                    <p className='muted-note'>يرجى اختيار مستوى لكل معيار قبل حفظ التقييم.</p>
                  )}
              </section>
          );
      }

      if (submission.teacher_response) {
          const totalTeacherScore = submission.teacher_response.total_score;
          return (
              <section className='card teacher-feedback-view-area'>
                  <h2><i className='fas fa-chalkboard-teacher'></i> تقييم المعلم</h2>
                  <div className='score teacher-score'>{totalTeacherScore}/{rubric.criteria.reduce((acc, crit) => acc + crit.levels[0].score, 0)}</div>
                  {submission.teacher_response.feedback && <p><strong>ملاحظات المعلم:</strong> {submission.teacher_response.feedback}</p>}
                  <h4>تقييم حسب المعايير:</h4>
                  <div className='rubric-feedback-display'>
                      {Object.entries(submission.teacher_response.rubric_breakdown).map(([key, value]) => (
                          <div key={key} className='rubric-item-display'>
                              <strong>{rubric.criteria.find(c => c.id === key)?.name}:</strong> {value.score}/{rubric.criteria.find(c => c.id === key)?.levels[0].score || 5}
                          </div>
                      ))}
                  </div>
              </section>
          );
      }

      return (
          <section className='card teacher-feedback-view-area placeholder'>
              <h2><i className='fas fa-chalkboard-teacher'></i> تقييم المعلم</h2>
              <p>لم يقم المعلم بتقييم هذا التسليم بعد.</p>
          </section>
      );
  };

  return (
    <div className='page-container submission-review-page' dir='rtl'>
        <header className='review-header'>
            <h1>مراجعة التسليم: {submission.topic_title}</h1>
            <p><strong>تاريخ التسليم:</strong> {new Date(submission.created_at).toLocaleString('ar')}</p>
        </header>

        <div className='review-layout'>
            <section className='card writing-display-area'>
                <h2><i className='fas fa-pen-nib'></i> {evaluationTitle}</h2>
                {topic?.evaluationTask?.description && (
                  <div className='evaluation-task-note'>
                    <strong>{evaluationTaskTitle}:</strong> {topic.evaluationTask.description}
                  </div>
                )}
                {Object.entries(submission.submission_data).map(([key, value]) => (
                    <div key={key} className='writing-section-display'>
                        <h4>{topic?.writingSections?.find((s: WritingSection) => s.id === key)?.title || 'النص الرئيسي'}</h4>
                        <p>{value}</p>
                    </div>
                ))}
            </section>

            <div className='feedback-column'>
                <div className='tabs'>
                    <button onClick={() => setActiveTab('ai')} className={activeTab === 'ai' ? 'active' : ''}>تقييم الذكاء الاصطناعي</button>
                    <button onClick={() => setActiveTab('teacher')} className={activeTab === 'teacher' ? 'active' : ''}>تقييم المعلم</button>
                </div>
                <div className='tab-content'>
                    {activeTab === 'ai' ? renderAITab() : renderTeacherTab()}
                </div>
            </div>
        </div>

        <div className='page-actions'>
            <button className='button button-secondary' onClick={() => isTeacher ? navigate('/submissions') : navigate('/my-submissions')}><i className='fas fa-list-ul'></i> كل التسليمات</button>
        </div>
    </div>
  );
}
