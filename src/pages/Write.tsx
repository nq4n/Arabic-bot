import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAI } from '../hooks/useAI';
import { useWritingTools } from '../hooks/useWritingTools';
import '../styles/Write.css';

export default function Write() {
  const { topicId } = useParams();
  const navigate = useNavigate();
  const { evaluateWriting } = useAI();
  const { countWords, countSentences } = useWritingTools();

  const [text, setText] = useState('');

  const handleSubmission = async () => {
    // In a real app, you would save the submission to a backend
    const evaluationResult = await evaluateWriting(text, topicId || '1');
    // Navigate to the evaluation page with the results
    navigate(`/evaluate/${topicId}`, { state: { submission: text, evaluation: evaluationResult } });
  };

  return (
    <div className="write-page container">
      <header className="write-header">
        <h1>صفحة الكتابة</h1>
        <p>اكتب النص الخاص بك أدناه. استخدم الأدوات المتاحة لمساعدتك.</p>
      </header>

      <div className="editor-card card">
        <div className="toolbar">
          <button><b>B</b></button>
          <button><u>U</u></button>
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="ابدأ الكتابة هنا..."
        />
        <div className="stats">
          <span>عدد الكلمات: {countWords(text)}</span>
          <span>عدد الجمل: {countSentences(text)}</span>
        </div>
      </div>

      <div className="actions">
        <button className="secondary">حفظ مسودة</button>
        <button onClick={handleSubmission}>إرسال للتقييم</button>
      </div>
    </div>
  );
}
