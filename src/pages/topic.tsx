import { useParams, useNavigate } from "react-router-dom";
import { topics } from "../data/topics";
import "../styles/Topic.css";

export default function Topic() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const topic = topics.find((t) => t.id === topicId);

  if (!topic) {
    return <div className="topic-page">الموضوع غير موجود</div>;
  }
  
  if (!topic.lesson.header) {
     return (
      <div className="topic-page" dir="rtl">
        <div className="not-found-container">
          <h1>قيد الإنشاء</h1>
          <p>عذرًا، محتوى هذا الموضوع لم يكتمل بعد. نعمل على إضافته قريبًا.</p>
          <button className="button" onClick={() => navigate("/")}>
            العودة إلى قائمة المواضيع
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="topic-page" dir="rtl">
      <header className="topic-main-header">
        <h1>{topic.lesson.header}</h1>
      </header>

      <section className="topic-section card intro-card">
        <h2 className="section-title"><i className="fas fa-book-open icon"></i> أولاً: تهيئة</h2>
        <p className="intro-paragraph">{topic.lesson.introduction.tahdid}</p>
        <p className="intro-paragraph">{topic.lesson.introduction.importance}</p>
      </section>

      <section className="topic-section card">
        <h2 className="section-title"><i className="fas fa-shoe-prints icon"></i> ثانيًا: خطوات الوصف</h2>
        <div className="steps-grid">
          {topic.lesson.steps.map((step) => (
            <div key={step.step} className="step-card">
              <div className="step-header">
                 <i className={`${step.icon} step-icon`}></i>
                 <span className="step-number">الخطوة {step.step}</span>
              </div>
              <h3 className="step-title">{step.title}</h3>
              <p>{step.description}</p>
              {step.options && (
                <ul className="options-list">
                  {step.options.map((option, index) => (
                    <li key={index}>{option}</li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="topic-section card">
        <h2 className="section-title"><i className="fas fa-pencil-ruler icon"></i> {topic.activities.header}</h2>
        <ul className="activities-list">
          {topic.activities.list.map((activity) => (
            <li key={activity.activity}>
                <i className={`${activity.icon} activity-icon`}></i>
                <span>{activity.description}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* زر الانتقال إلى المراجعة */}
      <div className="page-actions">
        <button
          className="button button-primary cta-button"
          onClick={() => navigate(`/lesson-review/${topic.id}`)}
        >
          <i className="fas fa-arrow-left"></i>
          فهمت الدرس، لننتقل للمراجعة
        </button>
      </div>
    </div>
  );
}
