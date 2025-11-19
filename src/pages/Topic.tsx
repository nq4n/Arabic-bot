import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAI } from '../hooks/useAI';
import '../styles/Topic.css';
import Submissions from '../components/Submissions';

const modelText = "تعتبر البيئة بيتنا الكبير الذي نعيش فيه، ولذلك يجب علينا أن نحافظ عليها نظيفة وصحية. يمكننا أن نبدأ بأشياء بسيطة مثل عدم رمي القمامة في الشارع وزراعة الأشجار في حديقة المنزل أو المدرسة. كل عمل صغير نقوم به يمكن أن يساعد في حماية كوكبنا.";

const questions = [
  { id: 'q1', text: 'ما هي الفكرة الرئيسية للنص؟' },
  { id: 'q2', text: 'اذكر طريقتين للمحافظة على البيئة وردتا في النص.' },
  { id: 'q3', text: 'لماذا من المهم أن نحافظ على البيئة؟' }
];

const tips = [
  'استخدم كلمات قوية ومعبرة.',
  'تأكد من أن كل فقرة تحتوي على فكرة رئيسية واحدة.',
  'راجع النص بعد الانتهاء لتصحيح الأخطاء.'
];

const Topic: React.FC = () => {
  const { topicId } = useParams<{ topicId: string }>();
  const { getPredefinedBotResponse } = useAI();
  const [answers, setAnswers] = React.useState<Record<string, string>>({});

  const handleQuestionClick = async (questionId: string) => {
    if (answers[questionId]) return;
    const response = await getPredefinedBotResponse(questionId);
    setAnswers(prev => ({ ...prev, [questionId]: response }));
  };

  return (
    <div className="topic-page">
      <header className="topic-header card">
        <h1>احترام البيئة في حياتنا اليومية</h1>
        <p>في هذا الدرس، ستتعلم كيف تكتب نصًا مقنعًا عن أهمية الحفاظ على البيئة.</p>
        <Link to={`/write/${topicId}`} className="button">ابدأ الكتابة الآن</Link>
      </header>

      <div className="topic-content">
        <div className="main-column">
          <div className="card">
            <h2>النموذج</h2>
            <p className="model-text">{modelText}</p>
          </div>
          <div className="card">
            <h2>أسئلة وأجوبة</h2>
            <ul className="qa-list">
              {questions.map(q => (
                <li key={q.id} onClick={() => handleQuestionClick(q.id)}>
                  <span className="question-text">{q.text}</span>
                  {answers[q.id] && <p className="answer-text">{answers[q.id]}</p>}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="side-column">
          <div className="card tips-card">
            <h2>نصائح للكتابة</h2>
            <ul>
              {tips.map((tip, index) => <li key={index}>{tip}</li>)}
            </ul>
          </div>
           <Submissions />
        </div>
      </div>
    </div>
  );
};

export default Topic;
