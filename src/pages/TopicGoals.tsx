import { useNavigate, useParams } from "react-router-dom";
import { topics } from "../data/topics";
import "../styles/TopicGoals.css";

export default function TopicGoals() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const topic = topics.find((item) => item.id === topicId);

  if (!topic) {
    return (
      <div className="topic-page" dir="rtl">
        <div className="not-found-container">
          <h1>لا يمكن العثور على هذا الدرس.</h1>
          <button className="button" onClick={() => navigate("/")}>
            العودة إلى صفحة الدروس
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="topic-page topic-goals-page" dir="rtl">
      <div className="card topic-goals-card">
        <header className="page-header topic-goals-header">
          <h1 className="page-title">أهداف الدرس: {topic.title}</h1>
          <p className="page-subtitle">اقرأ الهدف ثم ابدأ الدرس.</p>
        </header>

        <button
          type="button"
          className="button topic-goals-button"
          onClick={() => navigate(`/topic/${topic.id}`)}
        >
          <span className="topic-goals-text">{topic.description}</span>
          <span className="topic-goals-cta">ابدأ الدرس</span>
        </button>
      </div>
    </div>
  );
}
