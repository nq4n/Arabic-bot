import { useParams, useNavigate } from "react-router-dom";
import { topics } from "../data/topics";
import "../styles/LessonReview.css"; 
import Chat from '../components/Chat';

export default function LessonReview() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const topic = topics.find((t) => t.id === topicId);

  if (!topic) {
    return <div className="review-page">الموضوع غير موجود</div>;
  }

  // 1. Assemble all relevant topic information into a single string for the AI.
  const topicContent = `
    عنوان الدرس: ${topic.title}

    ملخص الخطوات:
    ${topic.lesson.steps.map(step => `- ${step.title}: ${step.description}`).join('\n')}

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
          >
            <i className="fas fa-feather-alt"></i>
            أنا مستعد، لنبدأ الكتابة!
          </button>
      </div>
    </div>
  );
}
