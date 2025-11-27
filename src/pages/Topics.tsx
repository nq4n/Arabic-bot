import { useNavigate } from "react-router-dom";
import { topics } from "../data/topics"; // استيراد البيانات الجديدة
import "../styles/Topics.css";

export default function Topics() {
  const navigate = useNavigate();

  return (
    <div className="topics-page" dir="rtl">
      <header className="topics-header">
        <h1>موضوعات الكتابة</h1>
        <p>اختر موضوعًا لتبدأ رحلتك في عالم التعبير والإبداع.</p>
      </header>

      <div className="topics-grid">
        {topics.map((topic) => (
          <div key={topic.id} className="card topic-card">
            <div className="card-content">
              <h2>{topic.title}</h2>
              <p>{topic.description}</p>
            </div>
            <div className="card-actions">
              <button
                className="button"
                onClick={() => navigate(`/topic/${topic.id}`)}
              >
                عرض الدرس
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
