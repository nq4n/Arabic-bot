import '../styles/Evaluation.css';

interface EvaluationProps {
  score: number;
  feedback: Array<{ error: string; suggestion: string }>;
}

export default function Evaluation({ score, feedback }: EvaluationProps) {
  return (
    <div className="evaluation-display card">
      <h2>تقييم الكتابة</h2>
      <div className="score-circle">{score}</div>
      <h3>نقاط للتطوير:</h3>
      <ul>
        {feedback.map((item, index) => (
          <li key={index}>
            <span className="error-text">{item.error}</span> → <span className="suggestion-text">{item.suggestion}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
