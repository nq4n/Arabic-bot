import React from 'react';
import '../styles/Submissions.css';

const submissions = [
  { id: 1, student: 'طالب ١', score: 85, date: '2023-10-27' },
  { id: 2, student: 'طالب ٢', score: 92, date: '2023-10-26' },
  { id: 3, student: 'طالب ٣', score: 78, date: '2023-10-25' },
];

const Submissions: React.FC = () => {
  return (
    <div className="card submissions-card">
      <h2>الكتابات السابقة</h2>
      <ul className="submissions-list">
        {submissions.map(sub => (
          <li key={sub.id}>
            <div className="submission-info">
              <span>{sub.student}</span>
              <span>{sub.date}</span>
            </div>
            <div className="submission-score">{sub.score}</div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Submissions;
