import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/Topics.css';

export type Topic = {
  id: string;
  title: string;
  level: string;
  description: string;
};

const topics: Topic[] = [
  {
    id: '1',
    title: 'احترام البيئة في حياتنا اليومية',
    level: 'الصف الخامس',
    description: 'تعلم كيفية الكتابة عن أهمية الحفاظ على البيئة من حولنا.'
  },
  {
    id: '2',
    title: 'أهمية القراءة اليومية',
    level: 'الصف السادس',
    description: 'اكتشف كيف يمكن للقراءة أن تغير حياتك وتوسع آفاقك.'
  },
  {
    id: '3',
    title: 'رحلة إلى المتحف الوطني',
    level: 'الصف الرابع',
    description: 'صف زيارتك للمتحف الوطني وما تعلمته من كنوز تاريخية.'
  }
];

const Topics: React.FC = () => {
  return (
    <div className="topics-page">
      <header className="topics-header">
        <h1>اختر موضوع الكتابة</h1>
        <p>كل موضوع يحتوي على درس، نموذج، أسئلة، ونشاط كتابي لمساعدتك على التحسن.</p>
      </header>
      <div className="topics-grid">
        {topics.map(topic => (
          <div key={topic.id} className="topic-card card">
            <span className="topic-level">{topic.level}</span>
            <h2>{topic.title}</h2>
            <p>{topic.description}</p>
            <Link to={`/topic/${topic.id}`} className="button">فتح الموضوع</Link>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Topics;
