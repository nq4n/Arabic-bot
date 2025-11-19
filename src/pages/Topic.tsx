import { useParams, Link } from 'react-router-dom';
import { useAI } from '../hooks/useAI';
import '../styles/Topic.css';

const predefinedQuestions = [
    { id: '1', question: 'ما هو الهدف من هذا الدرس؟', answer: 'الهدف هو تعلم كتابة وصفية.' },
    { id: '2', question: 'ما هي عناصر الكتابة الوصفية؟', answer: 'الوصف الحسي، التفاصيل الدقيقة، اللغة المجازية.' },
];

export default function Topic() {
  const { topicId } = useParams();
  const { chatWithAI, getPredefinedBotResponse } = useAI();

  // Mock data - in a real app, you'd fetch this based on topicId
  const topic = {
    title: 'رحلة إلى المتحف الوطني',
    lesson: 'الكتابة الوصفية هي فن رسم الكلمات. في هذا الدرس، سنتعلم كيف نصف الأماكن والأشياء بأسلوب جذاب يثير خيال القارئ. سنركز على استخدام الحواس الخمس في الكتابة.',
    model: 'كان المتحف الوطني بناءً شامخًا، تفوح من جدرانه رائحة التاريخ. الأصوات كانت خافتة، كأنها همسات من الماضي، وكل قطعة أثرية تحكي قصة بلون مختلف.'
  };

  return (
    <div className="topic-page container">
      <header className="topic-header">
        <h1>{topic.title}</h1>
        <p>الدرس، النموذج، والأدوات التفاعلية</p>
      </header>

      <div className="topic-content">
        <div className="lesson-section">
          <div className="card">
            <h2>نص الدرس</h2>
            <p>{topic.lesson}</p>
          </div>
          <div className="card">
            <h2>نموذج الكتابة</h2>
            <p>{topic.model}</p>
          </div>
        </div>

        <div className="interactive-section">
          <div className="card">
            <h3>بوت الأسئلة</h3>
            <div className="predefined-questions">
              {predefinedQuestions.map(q => (
                <button key={q.id} className="question-btn" onClick={() => getPredefinedBotResponse(q.id)}>
                  {q.question}
                </button>
              ))}
            </div>
          </div>
          <div className="card">
            <h3>AI Chat</h3>
            <div className="ai-chat-box">
              {/* AI chat UI would go here */}
              <p>تحدث مع الذكاء الاصطناعي لاستكشاف الموضوع أكثر.</p>
              <input type="text" placeholder="اسأل شيئًا..." />
              <button onClick={() => chatWithAI('test message')}>إرسال</button>
            </div>
          </div>
        </div>
      </div>

      <div className="start-writing-action">
        <Link to={`/write/${topicId}`} className="button">الانتقال إلى صفحة الكتابة</Link>
      </div>
    </div>
  );
}
