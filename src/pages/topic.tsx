import { useNavigate, useParams } from "react-router-dom";
import "../styles/Topic.css";

export default function Topic() {
  const navigate = useNavigate();
  const { topicId } = useParams();

  // placeholder مثال — لاحقًا تستبدل بقيمة من API
  const topic = {
    title: "أهمية القراءة اليومية",
    grade: "الصف السادس",
    description: "اكتشف كيف نصيغ أفكارنا حول فوائد القراءة وأثرها على الفكر.",
    lesson:
      "القراءة اليومية تساعد على توسيع المعرفة وتحسين مهارات الكتابة وصياغة الأفكار. في هذا الدرس، سنتعرف على كيفية كتابة نص يوضح التأثير الإيجابي للقراءة في حياتنا.",
  };

  return (
    <div className="topic-page" dir="rtl">
      {/* =======================
          رأس الصفحة
      ======================= */}
      <div className="topic-header">
        <span className="topic-grade">{topic.grade}</span>
        <h1>{topic.title}</h1>
        <p className="topic-description">{topic.description}</p>
      </div>

      {/* =======================
          كارت الدرس
      ======================= */}
      <div className="card topic-section">
        <h2 className="section-title">الدرس</h2>
        <p className="section-text">{topic.lesson}</p>
        <button
          className="button"
          style={{ marginTop: "1rem" }}
          onClick={() => navigate(`/lesson-review/${topicId}`)}
        >
          راجع الدرس
        </button>
      </div>

      {/* =======================
          زر العودة
      ======================= */}
      <div className="topic-actions">
        <button
          className="button button-light"
          onClick={() => navigate("/")}
        >
          العودة إلى المواضيع
        </button>
      </div>
    </div>
  );
}
