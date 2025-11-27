import { useNavigate, useParams } from "react-router-dom";
import Chat from "../components/Chat";
import "../styles/LessonReview.css";

export default function LessonReview() {
  const navigate = useNavigate();
  const { topicId } = useParams();

  const lesson = {
    title: "أهمية القراءة اليومية",
    summary: [
      "القراءة توسع المعرفة وتفتح آفاقًا جديدة.",
      "تحسن مهارات الكتابة والتعبير.",
      "تزيد من القدرة على التركيز والتحليل.",
      "تنمي الخيال والإبداع.",
    ],
    readyQuestions: [
      "ما الفكرة الأساسية في هذا الموضوع؟",
      "كيف تؤثر القراءة اليومية على أسلوب الكتابة؟",
      "ما العناصر المهمة عند وصف فوائد القراءة؟",
    ],
  };

  return (
    <div className="lesson-review-page" dir="rtl">
      <header className="lesson-header">
        <h1>مراجعة درس: {lesson.title}</h1>
        <p>استخدم هذه الأدوات لتعميق فهمك للدرس وترسيخ معلوماتك.</p>
      </header>

      <div className="review-layout">
        {/* القسم الأيمن: أدوات المراجعة */}
        <div className="review-tools">
          <section className="card">
            <h2>أهم النقاط في الدرس</h2>
            <ul>
              {lesson.summary.map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          </section>
          <section className="card">
            <h2>اختبر فهمك</h2>
            <p>قريبًا... اختبار قصير ممتع!</p>
          </section>
        </div>

        {/* القسم الأيسر: الشات والأسئلة */}
        <div className="review-chat-area">
          <div className="card">
            <h2>أسئلة جاهزة</h2>
            <ul className="questions-list">
              {lesson.readyQuestions.map((q, i) => (
                <li key={i}>• {q}</li>
              ))}
            </ul>
          </div>
          <div className="card">
            <h2>اسأل الذكاء الاصطناعي</h2>
            <Chat topicId={topicId} />
          </div>
        </div>
      </div>

      {/* أزرار أسفل الصفحة */}
      <div className="review-actions">
        <button
          className="button"
          onClick={() => navigate(`/evaluate/${topicId}`)}
        >
          أكتب تعبيرك عن هذا الموضوع
        </button>
        <button
          className="button button-light"
          onClick={() => navigate(`/topic/${topicId}`)}
        >
          العودة إلى الموضوع
        </button>
      </div>
    </div>
  );
}
