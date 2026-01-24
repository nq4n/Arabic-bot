import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { topics } from "../data/topics";
import { LessonVisibility, markLessonCompleted } from "../utils/lessonSettings";
import "../styles/LessonReview.css";
import { supabase } from "../supabaseClient";
import Chat from '../components/Chat';
import { SkeletonHeader, SkeletonSection } from "../components/SkeletonBlocks";
import { autoConfirmTracking } from '../utils/enhancedStudentTracking';

export default function LessonReview() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const topic = topics.find((t) => t.id === topicId);
  const topicIds = useMemo(() => topics.map((t) => t.id), []);
  
  // Initialize with sensible defaults - review and evaluation visible by default
  const [lessonVisibility, setLessonVisibility] = useState<LessonVisibility>(() => {
    const defaults: LessonVisibility = {};
    topicIds.forEach((id) => {
      defaults[id] = {
        lesson: true,
        review: true, // Review is visible by default
        evaluation: true, // Evaluation is visible by default
        activity: false,
      };
    });
    return defaults;
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadLessonVisibilitySettings = async () => {
      setIsLoading(true);
      if (!topic) {
        setIsLoading(false);
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData.session;
      if (!session) {
        setIsLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, added_by_teacher_id")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileError) {
        setIsLoading(false);
        return;
      }

      const teacherId =
        profile?.role === "teacher" || profile?.role === "admin"
          ? session.user.id
          : profile?.added_by_teacher_id;

      if (!teacherId) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("lesson_visibility_settings")
        .select("topic_id, settings")
        .eq("teacher_id", teacherId);

      if (error) {
        setIsLoading(false);
        return;
      }

      // Build visibility from database - merge with current defaults
      const updatedVisibility: LessonVisibility = {
        // Keep existing defaults
        ...lessonVisibility,
      };
      
      // Override with database values for topics that exist in DB
      (data || []).forEach((row) => {
        updatedVisibility[row.topic_id] = {
          lesson: row.settings?.lesson ?? true,
          review: row.settings?.review ?? false,
          evaluation: row.settings?.evaluation ?? false,
          activity: row.settings?.activity ?? false,
        };
      });
      
      setLessonVisibility(updatedVisibility);
      setIsLoading(false);
    };

    loadLessonVisibilitySettings();
  }, [topic, topicIds]);

  useEffect(() => {
    if (!topic) return;
    markLessonCompleted(topicIds, topic.id);
  }, [topic?.id, topicIds]);
  if (!topic) {
    return <div className="review-page">الموضوع غير موجود</div>;
  }

  const isReviewActive = lessonVisibility[topic.id]?.review ?? true;
  const isEvaluationActive = lessonVisibility[topic.id]?.evaluation ?? true;

  if (isLoading) {
    return (
      <div className="review-page" dir="rtl">
        <header className="review-header page-header">
          <SkeletonHeader titleWidthClass="skeleton-w-40" subtitleWidthClass="skeleton-w-70" />
        </header>
        <div className="review-grid">
          <div className="review-column">
            <SkeletonSection lines={4} />
            <SkeletonSection lines={3} />
          </div>
          <div className="review-column">
            <SkeletonSection lines={4} />
          </div>
        </div>
      </div>
    );
  }

  if (!isReviewActive) {
    return (
      <div className="review-page" dir="rtl">
        <header className="review-header page-header">
          <h1 className="page-title">قسم المراجعة غير متاح حاليًا</h1>
          <p className="page-subtitle">تم إيقاف هذا القسم من قبل المعلم. يرجى الرجوع لاحقًا.</p>
        </header>
        <div className="page-actions">
          <button className="button button-secondary" onClick={() => navigate("/")}> 
            <i className="fas fa-arrow-right"></i>
            العودة إلى قائمة المواضيع
          </button>
        </div>
      </div>
    );
  }

  // 1. Assemble all relevant topic information into a single string for the AI.
  const topicContent = `
    عنوان الدرس: ${topic.title}

    مقدمة الدرس:
    - التهيئة: ${topic.lesson.introduction.tahdid}
    - الأهمية: ${topic.lesson.introduction.importance}

    ملخص الخطوات:
    ${topic.lesson.steps.map(step => `- ${step.title}: ${step.description}`).join('\n')}

    أنشطة تطبيقية:
    ${topic.activities.list.map(activity => `- ${activity.description}`).join('\n')}

    موضوعات مقترحة للكتابة:
    ${topic.writingPrompts.list.map(prompt => `- ${prompt}`).join('\n')}

    أسئلة للمراجعة:
    ${topic.reviewQuestions.map(question => `- ${question.question} (الإجابة: ${question.answer})`).join('\n')}

    مهمة التقييم الخاصة بالدرس:
    ${topic.evaluationTask.description}

    نموذج تطبيقي للكتابة:
    ${topic.writingModel.content}
  `;

  // Handler: update tracking before navigating to evaluation
  const handleProceedToEvaluation = async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (session) {
      await autoConfirmTracking({
        studentId: session.user.id,
        topicId: topic.id,
        trackingType: 'lesson'
      });
    }
    navigate(`/evaluate/${topic.id}`);
  };

  return (
    <div className="review-page" dir="rtl">
      <header className="review-header page-header">
        <h1 className="page-title">مراجعة الدرس: {topic.title}</h1>
        <p className="page-subtitle">قبل أن تبدأ الكتابة، دعنا نراجع أهم النقاط ونتفاعل مع المساعد الذكي.</p>
      </header>

      <div className="review-grid">
        {/* Left Column: Summary and Model */}
        <div className="review-column">
          <section className="review-section card">
            <h2 className="section-title"><i className="fas fa-list-check icon"></i> ملخص الخطوات</h2>
            <ul className="summary-list">
              {topic.lesson.steps.map(step => (
                <li key={step.step}>
                  <i className={`${step.icon} step-icon`}></i>
                  <strong>{step.title}:</strong> {step.description}
                </li>
              ))}
            </ul>
          </section>

          <section className="review-section card">
            <h2 className="section-title"><i className="fas fa-file-invoice icon"></i> {topic.writingModel.header}</h2>
            <p className="model-content">{topic.writingModel.content}</p>
          </section>
        </div>

        {/* Right Column: AI Assistant */}
        <div className="review-column">
          <section className="review-section card sticky-card">
             <h2 className="section-title"><i className="fas fa-comments icon"></i> المساعد الذكي</h2>
             <p>لديك سؤال؟ أو تحتاج لمناقشة فكرة؟ تحدث مع المساعد الذكي الآن.</p>
             {/* 2. Pass the assembled content to the Chat component */}
             <Chat topicContent={topicContent} />
          </section>
        </div>
      </div>

       {/* Final Action Button */}
      <div className="page-actions">
         <button
            className="button button-secondary"
            onClick={() => navigate(-1)}
          >
            <i className="fas fa-arrow-right"></i>
            رجوع
          </button>
         <button
            className="button button-primary cta-button"
            onClick={handleProceedToEvaluation}
            disabled={!isEvaluationActive}
            aria-disabled={!isEvaluationActive}
          >
            <i className="fas fa-feather-alt"></i>
            أنا مستعد، لنبدأ الكتابة!
          </button>
          {!isEvaluationActive && (
            <p className="muted-note">قسم الكتابة والتقييم غير متاح حاليًا لهذا الدرس.</p>
          )}
      </div>
    </div>
  );
}