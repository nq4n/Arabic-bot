import { useLocation } from 'react-router-dom';
import '../styles/Evaluate.css';

export default function Evaluate() {
  const location = useLocation();
  // In a real app, you might fetch submission and evaluation if not passed in state
  const { submission, evaluation } = location.state || {};

  return (
    <div className="evaluate-page container">
      <header className="evaluate-header">
        <h1>نتائج التقييم</h1>
      </header>

      <div className="evaluation-content">
        <div className="card submission-card">
          <h2>النص الذي أرسلته</h2>
          <p>{submission || 'لم يتم العثور على النص.'}</p>
        </div>

        {evaluation && (
          <div className="card evaluation-card">
            <h2>تقييم الذكاء الاصطناعي</h2>
            <div className="score">الدرجة: <span>{evaluation.score} / 100</span></div>
            <h3>الأخطاء والتوصيات:</h3>
            <ul className="feedback-list">
              {evaluation.feedback.map((item: any, index: number) => (
                <li key={index}>
                  <span className="error">{item.error}</span> <span className="arrow">→</span> <span className="suggestion">{item.suggestion}</span>
                </li>
              ))}
            </ul>
            <h3>النسخة المقترحة:</h3>
            <p className="suggested-version">{evaluation.suggestedVersion}</p>
          </div>
        )}
      </div>
    </div>
  );
}
