
import { Link } from 'react-router-dom';
import '../styles/Topics.css';

// Mock Data
const topics = [
  {
    id: '1',
    title: 'احترام البيئة في حياتنا اليومية',
    level: 'الصف الخامس',
    description: 'تعلم كيفية كتابة مقال عن أهمية الحفاظ على البيئة من حولنا.',
  },
  {
    id: '2',
    title: 'أهمية القراءة اليومية',
    level: 'الصف السادس',
    description: 'اكتشف كيف تصيغ نصًا إقناعيًا حول فوائد القراءة وتأثيرها على الفكر.',
  },
  {
    id: '3',
    title: 'رحلة إلى المتحف الوطني',
    level: 'الصف الرابع',
    description: 'تدرب على كتابة نص وصفي لرحلة قمت بها إلى مكان تاريخي.',
  },
];

export default function Topics() {
  return (
    <div className="topics-page container">
      <header className="topics-header">
        <h1>اختر موضوع الكتابة</h1>
        <p>كل موضوع يضم درسًا، ونماذج، وأدوات لمساعدتك على الكتابة ببراعة.</p>
      </header>
      <div className="topics-grid">
        {topics.map(topic => (
          <div key={topic.id} className="topic-card card">
            <span className="topic-level">{topic.level}</span>
            <h2>{topic.title}</h2>
            <p>{topic.description}</p>
            <Link to={`/topic/${topic.id}`} className="button">
              فتح الموضوع
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
