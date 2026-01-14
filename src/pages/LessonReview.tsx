import { useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { topics } from "../data/topics";
import { isLessonSectionActive, markLessonCompleted } from "../utils/lessonSettings";
import "../styles/LessonReview.css"; 
import Chat from '../components/Chat';

export default function LessonReview() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const topic = topics.find((t) => t.id === topicId);
  const topicIds = useMemo(() => topics.map((t) => t.id), []);

  if (!topic) {
    return <div className="review-page">الموضوع غير موجود</div>;
  }

  const isReviewActive = isLessonSectionActive(topicIds, topic.id, "review");
  const isEvaluationActive = isLessonSectionActive(topicIds, topic.id, "evaluation");

  useEffect(() => {
    markLessonCompleted(topicIds, topic.id);
  }, [topic.id, topicIds]);

  if (!isReviewActive) {
    return (
      <div className="review-page" dir="rtl">
        <header className="review-header">
          <h1>قسم المراجعة غير متاح حاليًا</h1>
          <p>تم إيقاف هذا القسم من قبل المعلم. يرجى الرجوع لاحقًا.</p>
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

  return (
    <div className="review-page" dir="rtl">
      <header className="review-header">
        <h1>مراجعة الدرس: {topic.title}</h1>
        <p>قبل أن تبدأ الكتابة، دعنا نراجع أهم النقاط ونتفاعل مع المساعد الذكي.</p>
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
            onClick={() => navigate(`/evaluate/${topic.id}`)}
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


