import { useNavigate } from "react-router-dom";
import "../styles/MySubmissions.css";

// بيانات وهمية للتسليمات
const mockSubmissions = [
  {
    id: "sub_001",
    topicId: "topic-1",
    topicTitle: "أهمية القراءة اليومية",
    date: "2024-05-20",
    aiScore: 85,
    teacherScore: 90,
  },
  {
    id: "sub_002",
    topicId: "topic-2",
    topicTitle: "تأثير التكنولوجيا على التواصل",
    date: "2024-05-15",
    aiScore: 78,
    teacherScore: null, // لم يقيمها المعلم بعد
  },
  {
    id: "sub_003",
    topicId: "topic-3",
    topicTitle: "الحفاظ على البيئة مسؤوليتنا",
    date: "2024-05-10",
    aiScore: 92,
    teacherScore: 95,
  },
];

export default function MySubmissions() {
  const navigate = useNavigate();

  const handleViewSubmission = (topicId: string, submissionId: string) => {
    // المسار الجديد سيعرض التقييم للقراءة فقط
    navigate(`/evaluate/${topicId}/${submissionId}`);
  };

  return (
    <div className="submissions-page" dir="rtl">
      <header className="submissions-header">
        <h1>تسليماتي</h1>
        <p>هنا يمكنك عرض جميع كتاباتك السابقة ونتائج تقييمها.</p>
      </header>

      <div className="card submissions-list">
        <table>
          <thead>
            <tr>
              <th>الموضوع</th>
              <th>تاريخ التسليم</th>
              <th>تقييم الذكاء الاصطناعي</th>
              <th>تقييم المعلم</th>
              <th>الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            {mockSubmissions.map((sub) => (
              <tr key={sub.id}>
                <td>{sub.topicTitle}</td>
                <td>{sub.date}</td>
                <td>{sub.aiScore}/100</td>
                <td>{sub.teacherScore ? `${sub.teacherScore}/100` : "لم يُقيّم بعد"}</td>
                <td>
                  <button
                    className="button button-small"
                    onClick={() => handleViewSubmission(sub.topicId, sub.id)}
                  >
                    عرض التفاصيل
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
