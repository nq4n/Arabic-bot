import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../styles/Evaluate.css";

// نوع بيانات لنتيجة التقييم
type EvaluationResult = {
  score: number;
  feedback: string;
  suggestions: string[];
};

export default function Evaluate() {
  const navigate = useNavigate();
  const { topicId } = useParams();

  const [text, setText] = useState("");
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [result, setResult] = useState<EvaluationResult | null>(null);

  const handleEvaluate = async () => {
    if (!text.trim()) {
      alert("الرجاء إدخال النص أولاً.");
      return;
    }
    setIsEvaluating(true);
    setResult(null); // مسح النتائج السابقة

    // --- محاكاة لطلب تقييم من الذكاء الاصطناعي ---
    // لاحقًا، سنستبدل هذا بطلب API حقيقي
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const mockResult: EvaluationResult = {
      score: 85,
      feedback: "عمل رائع! نصك منظم بشكل جيد ويعبر عن الفكرة بوضوح.",
      suggestions: [
        "حاول استخدام مفردات أكثر تنوعًا لإثراء النص.",
        'يمكنك إضافة مثال شخصي لتدعيم فكرتك في الفقرة الثانية. ',
        'تأكد من علامات الترقيم في نهاية كل جملة. ',
      ],
    };
    // --- نهاية المحاكاة ---

    setResult(mockResult);
    setIsEvaluating(false);
  };

  return (
    <div className="evaluate-page" dir="rtl">
      <header className="evaluate-header">
        <h1>تقييم النص</h1>
        <p>اكتب أو الصق النص الذي أعددته للحصول على تقييم فوري.</p>
      </header>

      <div className="card evaluation-area">
        <textarea
          className="text-editor"
          placeholder="أدخل النص هنا..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={15}
        ></textarea>
        <button onClick={handleEvaluate} disabled={isEvaluating} className="button">
          {isEvaluating ? "...جاري التقييم" : "قيّم النص الآن"}
        </button>
      </div>

      {result && (
        <section className="card results-area">
          <h2>نتيجة التقييم</h2>
          <div className="score">{result.score}/100</div>
          <h3><i className="fas fa-comment-dots"></i> ملاحظات عامة</h3>
          <p>{result.feedback}</p>
          <h3><i className="fas fa-lightbulb"></i> اقتراحات للتحسين</h3>
          <ul>
            {result.suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </section>
      )}

      <div className="page-actions">
        <button
          className="button button-light"
          onClick={() => navigate(`/lesson-review/${topicId}`)}
        >
          العودة إلى المراجعة
        </button>
      </div>
    </div>
  );
}
