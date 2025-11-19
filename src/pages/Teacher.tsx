import '../styles/Teacher.css';

// Mock Data
const students = [
  { id: 1, name: 'أحمد الغامدي', level: 'متقدم', lastActivity: '2 ساعة' },
  { id: 2, name: 'فاطمة الزهراني', level: 'متوسط', lastActivity: 'يوم واحد' },
  { id: 3, name: 'علي الشهري', level: 'مبتدئ', lastActivity: '3 أيام' },
];

const recentSubmissions = [
  { id: 1, student: 'أحمد الغامدي', topic: 'احترام البيئة', score: 88 },
  { id: 2, student: 'فاطمة الزهراني', topic: 'أهمية القراءة', score: 92 },
  { id: 3, student: 'علي الشهري', topic: 'رحلة للمتحف', score: 76 },
];

export default function Teacher() {
  return (
    <div className="teacher-page container">
      <header className="teacher-header">
        <h1>لوحة تحكم المعلم</h1>
        <p>مرحباً بك، يمكنك هنا متابعة تقدم طلابك والاطلاع على كتاباتهم.</p>
      </header>

      <div className="teacher-content">
        <div className="card students-list-card">
          <h2>قائمة الطلاب</h2>
          <ul className="students-list">
            {students.map(student => (
              <li key={student.id}>
                <span className="student-name">{student.name}</span>
                <span className={`student-level ${student.level.toLowerCase()}`}>{student.level}</span>
                <span className="student-activity">آخر نشاط: {student.lastActivity}</span>
                <button className="button-small">عرض التفاصيل</button>
              </li>
            ))}
          </ul>
        </div>

        <div className="card submissions-card">
          <h2>أحدث الكتابات المُرسَلة</h2>
          <ul className="submissions-list">
            {recentSubmissions.map(submission => (
              <li key={submission.id}>
                <span className="submission-student">{submission.student}</span>
                <span className="submission-topic">{submission.topic}</span>
                <span className="submission-score">التقييم: {submission.score}</span>
                <button className="button-small">مراجعة</button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
