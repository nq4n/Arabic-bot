
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../styles/Evaluate.css';

// Define the structure of a submission based on your database
interface Submission {
  id: number;
  student_id: string;
  text: string;
  ai_fixed_text: string;
  ai_grade: number;
  ai_response: {
    score: number;
    feedback: { error: string; suggestion: string }[];
    suggestedVersion: string;
  };
  created_at: string;
}

export default function Evaluate() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!submissionId) {
      setLoading(false);
      setError('لم يتم تحديد تسليم لعرضه.');
      return;
    }

    const fetchSubmission = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('id', submissionId)
        .single(); // Use single() as we expect one result

      if (error) {
        console.error('Error fetching submission:', error);
        setError('حدث خطأ أثناء جلب بيانات التقييم.');
        setSubmission(null);
      } else {
        setSubmission(data);
        setError(null);
      }
      setLoading(false);
    };

    fetchSubmission();
  }, [submissionId]);

  if (loading) {
    return <div className="container">جاري تحميل التقييم...</div>;
  }

  if (error) {
    return <div className="container error-message">{error}</div>;
  }

  if (!submission) {
    return <div className="container">لم يتم العثور على التسليم المطلوب.</div>;
  }

  const evaluation = submission.ai_response; // The AI response from the database

  return (
    <div className="evaluate-page container">
      <header className="evaluate-header">
        <h1>نتائج التقييم</h1>
      </header>

      <div className="evaluation-content">
        <div className="card submission-card">
          <h2>النص الذي أرسلته</h2>
          <p>{submission.text}</p>
        </div>

        {evaluation ? (
          <div className="card evaluation-card">
            <h2>تقييم الذكاء الاصطناعي</h2>
            <div className="score">الدرجة: <span>{submission.ai_grade || evaluation.score} / 100</span></div>
            {evaluation.feedback && evaluation.feedback.length > 0 && (
              <>
                <h3>الأخطاء والتوصيات:</h3>
                <ul className="feedback-list">
                  {evaluation.feedback.map((item: any, index: number) => (
                    <li key={index}>
                      <span className="error">{item.error}</span> <span className="arrow">→</span> <span className="suggestion">{item.suggestion}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {submission.ai_fixed_text && (
                <>
                    <h3>النسخة المقترحة:</h3>
                    <p className="suggested-version">{submission.ai_fixed_text}</p>
                </>
            )}
          </div>
        ) : (
            <div className="card evaluation-card">
                <h2>التقييم</h2>
                <p>لم يتم العثور على تقييم لهذا النص.</p>
            </div>
        )}
      </div>
    </div>
  );
}
