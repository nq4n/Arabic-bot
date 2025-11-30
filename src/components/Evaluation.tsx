import '../styles/Evaluation.css';
import type { AIResponseType } from '../services/aiEvaluationService';

// The props now directly match the structure of the AI response
interface EvaluationProps {
  aiResponse: AIResponseType;
}

export default function Evaluation({ aiResponse }: EvaluationProps) {
  const { score, feedback, suggestions, rubric_breakdown } = aiResponse;

  return (
    <div className="evaluation-display card" dir='rtl'>
      <div className="evaluation-header">
        <h2><i className="fas fa-poll"></i> التقييم الشامل</h2>
        <div className="score-circle">{score}</div>
      </div>

      <div className="feedback-section">
        <h3><i className="fas fa-comment-alt"></i> ملاحظات عامة</h3>
        <p>{feedback}</p>
      </div>

      {suggestions && suggestions.length > 0 && (
        <div className="suggestions-section">
          <h3><i className="fas fa-lightbulb"></i> اقتراحات للتحسين</h3>
          <ul>
            {suggestions.map((suggestion, index) => (
              <li key={index}>{suggestion}</li>
            ))}
          </ul>
        </div>
      )}

      {rubric_breakdown && (
        <div className="rubric-breakdown-section">
            <h3><i className="fas fa-tasks"></i> تفصيل الدرجات</h3>
            <div className="rubric-grid">
            {Object.entries(rubric_breakdown).map(([criterionId, details]) => (
                <div key={criterionId} className="rubric-item">
                    <strong className="criterion-name">{criterionId.replace(/_/g, ' ')}</strong>
                    <span className="criterion-score">({details.score})</span>
                    <p className="criterion-feedback">{details.feedback}</p>
                </div>
            ))}
            </div>
        </div>
      )}
    </div>
  );
}
