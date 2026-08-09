import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { topics } from "../../data/topics";
import { LessonVisibility, markLessonCompleted, isSectionActive } from "../../utils/lessonSettings";
import "../../styles/LessonReview.css";
import { supabase } from "../../supabaseClient";
import Chat from '../../components/Chat';
import { SkeletonHeader, SkeletonSection } from "../../components/SkeletonBlocks";
import { autoConfirmTracking } from '../../utils/enhancedStudentTracking';

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
        video: true,
      };
    });
    return defaults;
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState("summary");

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
          video: row.settings?.video ?? true,
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

  const isReviewActive = isSectionActive(lessonVisibility, topic.id, "review", true);
  const isEvaluationActive = isSectionActive(lessonVisibility, topic.id, "evaluation", true);

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

  const reviewSections = [
    { id: "summary", label: "ملخص الخطوات", icon: "fas fa-list-check" },
    { id: "model", label: topic.writingModel.header, icon: "fas fa-file-invoice" },
    { id: "assistant", label: "المساعد الذكي", icon: "fas fa-comments" },
  ];

  const effectiveReview = reviewSections.some((s) => s.id === activeSection)
    ? activeSection
    : reviewSections[0].id;

  const goReviewPrev = () => {
    const index = reviewSections.findIndex((s) => s.id === effectiveReview);
    if (index > 0) setActiveSection(reviewSections[index - 1].id);
  };
  const goReviewNext = () => {
    const index = reviewSections.findIndex((s) => s.id === effectiveReview);
    if (index < reviewSections.length - 1) setActiveSection(reviewSections[index + 1].id);
  };

  return (
    <div className="review-page" dir="rtl">
      <header className="review-header page-header">
        <h1 className="page-title">مراجعة الدرس: {topic.title}</h1>
        <p className="page-subtitle">قبل أن تبدأ الكتابة، دعنا نراجع أهم النقاط ونتفاعل مع المساعد الذكي.</p>
      </header>

      <div className="topic-stepper">
        <nav className="topic-stepper-nav" aria-label="أقسام المراجعة">
          {reviewSections.map((section, index) => (
            <button
              key={section.id}
              type="button"
              className={`topic-stepper-btn ${effectiveReview === section.id ? "is-active" : ""}`}
              onClick={() => setActiveSection(section.id)}
              aria-current={effectiveReview === section.id}
            >
              <span className="topic-stepper-badge">{index + 1}</span>
              <i className={section.icon}></i>
              <span className="topic-stepper-label">{section.label}</span>
            </button>
          ))}
        </nav>

        <div className="topic-stepper-content">
          {effectiveReview === "summary" && (
            <section className="review-section card topic-section">
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
          )}

          {effectiveReview === "model" && (
            <section className="review-section card topic-section">
              <h2 className="section-title"><i className="fas fa-file-invoice icon"></i> {topic.writingModel.header}</h2>
              <p className="model-content">{topic.writingModel.content}</p>
            </section>
          )}

          {effectiveReview === "assistant" && (
            <section className="review-section card topic-section">
              <h2 className="section-title"><i className="fas fa-comments icon"></i> المساعد الذكي</h2>
              <p>لديك سؤال؟ أو تحتاج لمناقشة فكرة؟ تحدث مع المساعد الذكي الآن.</p>
              <Chat topicContent={topicContent} />
            </section>
          )}
        </div>

        <div className="topic-stepper-controls">
          <button
            type="button"
            className="button button-secondary"
            onClick={goReviewPrev}
            disabled={effectiveReview === reviewSections[0].id}
            aria-disabled={effectiveReview === reviewSections[0].id}
          >
            <i className="fas fa-arrow-right"></i>
            السابق
          </button>
          <button
            type="button"
            className="button button-primary cta-button"
            onClick={goReviewNext}
            disabled={effectiveReview === reviewSections[reviewSections.length - 1].id}
            aria-disabled={effectiveReview === reviewSections[reviewSections.length - 1].id}
          >
            التالي
            <i className="fas fa-arrow-left"></i>
          </button>
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
