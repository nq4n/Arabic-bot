import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
  teacher_grade: number | null;
};

type TeacherResponseType = {
  feedback: string;
  rubric_breakdown: { [key: string]: { score: number } };
  total_score: number;
};

type Profile = {
  role: 'student' | 'teacher' | 'admin';
};

type TabKey = 'ai' | 'teacher';

export default function SubmissionReview() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();

  // --- STATE MANAGEMENT ---
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Teacher form state
  const [teacherFeedback, setTeacherFeedback] = useState('');
  const [teacherScores, setTeacherScores] = useState<{ [key: string]: { score: number } }>({});
  const [teacherSelections, setTeacherSelections] = useState<{ [key: string]: string }>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCriterionIndex, setCurrentCriterionIndex] = useState(0);

  // Refs for scrolling
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const criteriaRefs = useRef<(HTMLDivElement | null)[]>([]);

  // --- DATA LOOKUPS ---
  const topic = useMemo(() => {
    if (!submission?.topic_title) return undefined;
    return topics.find((t) => t.title === submission.topic_title);
  }, [submission?.topic_title]);

  const rubric = useMemo(() => {
    if (!topic?.id) return undefined;
    const foundRubric = rubrics.find((r) => r.topicId === topic.id);
    if (!foundRubric) return undefined;
    // Sort levels once for consistent display
    return {
        ...foundRubric,
        criteria: foundRubric.criteria.map(c => ({
            ...c,
            levels: [...c.levels].sort((a,b) => b.score - a.score)
        }))
    };
  }, [topic?.id]);

  const totalMaxScore = useMemo(() => {
    if (!rubric) return 0;
    return rubric.criteria.reduce((sum, c) => {
        const max = c.levels.length > 0 ? c.levels[0].score : 0; // Assumes levels are sorted desc
        return sum + max;
    }, 0);
  }, [rubric]);

  // --- DATA FETCHING ---
  const fetchSubmissionAndProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    setCurrentCriterionIndex(0); // Reset on fetch

    try {
      if (!submissionId) throw new Error('معرّف التسليم غير موجود.');

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError || !session) throw new Error('يجب عليك تسجيل الدخول لعرض هذه الصفحة.');

      const [profileRes, submissionRes] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', session.user.id).single(),
        supabase.from('submissions').select('*').eq('id', submissionId).single(),
      ]);

      if (profileRes.error) throw profileRes.error;
      const userProfile = profileRes.data as Profile;
      setProfile(userProfile);

      if (submissionRes.error) throw submissionRes.error;
      const subData = submissionRes.data as Submission;
      setSubmission(subData);

      // Student authorization
      if (userProfile.role === 'student' && subData.student_id !== session.user.id) {
        throw new Error('ليس لديك صلاحية لعرض هذا التسليم.');
      }

      // Preload teacher response if exists
      if (subData.teacher_response && rubric) {
        setTeacherFeedback(subData.teacher_response.feedback || '');
        setTeacherScores(subData.teacher_response.rubric_breakdown || {});

        const restored = rubric.criteria.reduce<Record<string, string>>((acc, criterion) => {
            const score = subData.teacher_response?.rubric_breakdown?.[criterion.id]?.score;
            if (typeof score !== 'number') return acc;

            const match = criterion.levels.find((lvl) => Number(lvl.score) === Number(score));
            if (match) acc[criterion.id] = match.id;

            return acc;
        }, {});
        setTeacherSelections(restored);
      } else {
        setTeacherFeedback('');
        setTeacherScores({});
        setTeacherSelections({});
      }
    } catch (e: any) {
      setError(e?.message || 'حدث خطأ ما.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [submissionId, rubric]);

  useEffect(() => {
    fetchSubmissionAndProfile();
  }, [fetchSubmissionAndProfile]);
  
  // Effect to scroll the active criterion into view
  useEffect(() => {
    const targetElement = criteriaRefs.current[currentCriterionIndex];
    if (targetElement) {
        targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'nearest',
            inline: 'start',
        });
    }
  }, [currentCriterionIndex]);


  // --- EVENT HANDLERS ---
  const handleTeacherLevelSelect = (criterionId: string, level: RubricLevel) => {
    setTeacherSelections((prev) => ({ ...prev, [criterionId]: level.id }));
    setTeacherScores((prev) => ({
      ...prev,
      [criterionId]: { score: Number(level.score) || 0 },
    }));
  };

  const handleTeacherSubmit = async () => {
    if (!submission || !rubric) return;

    setIsSaving(true);
    try {
      // Calculate total only from current criteria ids
      const totalScore = rubric.criteria.reduce((sum, c) => {
        const s = teacherScores[c.id]?.score;
        return sum + (typeof s === 'number' ? s : 0);
      }, 0);

      const teacherResponse: TeacherResponseType = {
        feedback: teacherFeedback,
        rubric_breakdown: teacherScores,
        total_score: totalScore,
      };

      const { error: updateError } = await supabase
        .from('submissions')
        .update({ teacher_response: teacherResponse, teacher_grade: totalScore })
        .eq('id', submission.id);

      if (updateError) {
        alert('حدث خطأ أثناء حفظ تقييمك.');
        console.error(updateError);
        return;
      }

      alert('تم حفظ التقييم بنجاح!');
      setSubmission((prev) =>
        prev ? { ...prev, teacher_response: teacherResponse, teacher_grade: totalScore } : null
      );
      setIsEditing(false);
    } catch (e) {
      console.error(e);
      alert('حدث خطأ غير متوقع أثناء الحفظ.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- RENDER LOGIC ---
  if (loading)
    return (
      <div className="page-container" dir="rtl">
        <div className="loading-indicator">
          <div className="spinner"></div>
        </div>
      </div>
    );

  if (error)
    return (
      <div className="page-container" dir="rtl">
        <p className="error-message">{error}</p>
      </div>
    );

  if (!submission || !rubric)
    return (
      <div className="page-container" dir="rtl">
        <p className="error-message">لا يمكن عرض هذا التسليم.</p>
      </div>
    );

  const aiResponse = submission.ai_response;
  const isTeacher = profile?.role === 'teacher' || profile?.role === 'admin';

  const evaluationTitle =
    topic?.evaluationTask.mode === 'discussion'
      ? 'مناقشة الطالب'
      : topic?.evaluationTask.mode === 'dialogue'
        ? 'حوار الطالب'
        : topic?.evaluationTask.mode === 'report'
          ? 'تقرير الطالب'
          : 'كتابة الطالب';

  const evaluationTaskTitle =
    topic?.evaluationTask.mode === 'discussion'
      ? 'مهمة المناقشة'
      : topic?.evaluationTask.mode === 'dialogue'
        ? 'مهمة الحوار'
        : topic?.evaluationTask.mode === 'report'
          ? 'مهمة التقرير'
          : 'مهمة الكتابة';

  const renderAITab = () => {
    const suggestions = Array.isArray(aiResponse?.suggestions) ? aiResponse.suggestions : [];
    const aiScore = typeof aiResponse?.score === 'number' ? aiResponse.score : 0;

    return (
      <section className="card ai-feedback-area">
        <h2>
          <i className="fas fa-robot"></i> تقييم الذكاء الاصطناعي
        </h2>

        <div className="score ai-score">
          {aiScore}/{totalMaxScore}
        </div>

        <h4>ملاحظات عامة:</h4>
        <p>{aiResponse?.feedback || '—'}</p>

        <h4>اقتراحات للتحسين:</h4>
        {suggestions.length > 0 ? (
          <ul>
            {suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        ) : (
          <p className="muted-note">لا توجد اقتراحات.</p>
        )}

        <h4>تقييم حسب المعايير:</h4>
        <div className="rubric-feedback-display">
          {rubric.criteria.map((criterion) => {
            const breakdownItem = aiResponse?.rubric_breakdown?.[criterion.id];
            const maxScore = criterion.levels.length > 0 ? criterion.levels[0].score : 0;

            if (breakdownItem) {
              return (
                <div key={criterion.id} className="rubric-item-display">
                  <strong>{criterion.name}:</strong> {breakdownItem.score}/{maxScore} -{' '}
                  {breakdownItem.feedback}
                </div>
              );
            }

            return (
              <div key={criterion.id} className="rubric-item-display">
                <strong>{criterion.name}:</strong>{' '}
                <span className="muted-note">لا يوجد تقييم لهذا المعيار من الذكاء الاصطناعي</span>
              </div>
            );
          })}
        </div>
      </section>
    );
  };

  const renderTeacherTab = () => {
    const showGradingForm = isTeacher && (!submission.teacher_response || isEditing);

    if (showGradingForm) {
      const criteriaCount = rubric.criteria.length;
      // Require selection for every criterion
      const allCriteriaSelected = rubric.criteria.every((criterion) => {
        const selectedLevelId = teacherSelections[criterion.id];
        if (!selectedLevelId) return false;
        return criterion.levels.some((lvl) => lvl.id === selectedLevelId);
      });

      const handleNext = () => {
        setCurrentCriterionIndex(prev => Math.min(prev + 1, criteriaCount - 1));
      };
  
      const handlePrev = () => {
        setCurrentCriterionIndex(prev => Math.max(prev - 1, 0));
      };

      return (
        <section className="card teacher-grading-area">
          <h2>
            <i className="fas fa-marker"></i> تقييم المعايير (اختر مستوى لكل معيار)
          </h2>

          <div className="form-group">
            <label htmlFor="teacher-feedback">ملاحظات عامة</label>
            <textarea
              id="teacher-feedback"
              value={teacherFeedback}
              onChange={(e) => setTeacherFeedback(e.target.value)}
              rows={4}
            />
          </div>

          <div className="criteria-nav">
            <button onClick={handlePrev} disabled={currentCriterionIndex === 0}>
              <i className="fas fa-arrow-right"></i> السابق
            </button>
            <span>المعيار {currentCriterionIndex + 1} / {criteriaCount}</span>
            <button onClick={handleNext} disabled={currentCriterionIndex === criteriaCount - 1}>
              التالي <i className="fas fa-arrow-left"></i>
            </button>
          </div>

          <div className="rubric-criteria-selection" ref={scrollContainerRef}>
            {rubric.criteria.map((criterion, index) => (
              <div 
                key={criterion.id} 
                className="criterion-block"
                ref={el => criteriaRefs.current[index] = el}
              >
                <h3>{criterion.name}</h3>
                <p className="criterion-description">{criterion.description}</p>

                <div className="level-options">
                  {criterion.levels.map((level) => (
                    <div
                      key={level.id}
                      className={`level-box ${
                        teacherSelections[criterion.id] === level.id ? 'selected' : ''
                      }`}
                      onClick={() => handleTeacherLevelSelect(criterion.id, level)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') handleTeacherLevelSelect(criterion.id, level);
                      }}
                    >
                      <span className="level-label">
                        {level.label} ({Number(level.score) || 0})
                      </span>
                      <span className="level-description">{level.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="teacher-form-actions">
            <button
              onClick={handleTeacherSubmit}
              disabled={isSaving || !allCriteriaSelected}
              className="button button-primary"
            >
              {isSaving ? 'جاري الحفظ...' : 'حفظ التقييم'}
            </button>

            {isEditing && (
              <button onClick={() => { setIsEditing(false); setCurrentCriterionIndex(0); }} className="button button-secondary">
                إلغاء
              </button>
            )}
          </div>

          {!allCriteriaSelected && (
            <p className="muted-note">يرجى اختيار مستوى لكل معيار قبل حفظ التقييم.</p>
          )}
        </section>
      );
    }

    // Teacher view mode
    if (submission.teacher_response) {
      const totalTeacherScore = submission.teacher_grade;

      return (
        <section className="card teacher-feedback-view-area">
          <div className="teacher-feedback-header">
            <h2>
              <i className="fas fa-chalkboard-teacher"></i> تقييم المعلم
            </h2>

            {isTeacher && (
              <button onClick={() => { setIsEditing(true); setCurrentCriterionIndex(0); }} className="button button-secondary">
                تعديل
              </button>
            )}
          </div>

          <div className="score teacher-score">
            {totalTeacherScore !== null ? totalTeacherScore : 'لم يحدد'}/{totalMaxScore}
          </div>

          {submission.teacher_response.feedback && (
            <p>
              <strong>ملاحظات المعلم:</strong> {submission.teacher_response.feedback}
            </p>
          )}

          <h4>تقييم حسب المعايير:</h4>
          <div className="rubric-feedback-display">
            {rubric.criteria.map((criterion) => {
              const breakdownItem = submission.teacher_response?.rubric_breakdown?.[criterion.id];
              const maxScore = criterion.levels.length > 0 ? criterion.levels[0].score : 0;

              if (breakdownItem) {
                return (
                  <div key={criterion.id} className="rubric-item-display">
                    <strong>{criterion.name}:</strong> {breakdownItem.score}/{maxScore}
                  </div>
                );
              }

              return (
                <div key={criterion.id} className="rubric-item-display">
                  <strong>{criterion.name}:</strong>{' '}
                  <span className="muted-note">لم يتم تسجيل هذا المعيار</span>
                </div>
              );
            })}
          </div>
        </section>
      );
    }

    // Student view when teacher hasn't evaluated yet
    return (
      <section className="card teacher-feedback-view-area placeholder">
        <h2>
          <i className="fas fa-chalkboard-teacher"></i> تقييم المعلم
        </h2>
        <p>لم يقم المعلم بتقييم هذا التسليم بعد.</p>
      </section>
    );
  };

  return (
    <div className="page-container submission-review-page" dir="rtl">
      <header className="review-header">
        <h1>مراجعة التسليم: {submission.topic_title}</h1>
        <p>
          <strong>تاريخ التسليم:</strong> {new Date(submission.created_at).toLocaleString('ar')}
        </p>
      </header>

      <div className="review-layout">
        <section className="card writing-display-area">
          <h2>
            <i className="fas fa-pen-nib"></i> {evaluationTitle}
          </h2>

          {topic?.evaluationTask?.description && (
            <div className="evaluation-task-note">
              <strong>{evaluationTaskTitle}:</strong> {topic.evaluationTask.description}
            </div>
          )}

          {Object.entries(submission.submission_data || {}).map(([key, value]) => (
            <div key={key} className="writing-section-display">
              <h4>
                {topic?.writingSections?.find((s: WritingSection) => s.id === key)?.title || 'النص الرئيسي'}
              </h4>
              <p>{value}</p>
            </div>
          ))}
        </section>

        {renderAITab()}
        {renderTeacherTab()}
      </div>

      <div className="page-actions">
        <button
          className="button button-secondary"
          onClick={() => (isTeacher ? navigate('/submissions') : navigate('/my-submissions'))}
        >
          <i className="fas fa-list-ul"></i> كل التسليمات
        </button>
      </div>
    </div>
  );
}
