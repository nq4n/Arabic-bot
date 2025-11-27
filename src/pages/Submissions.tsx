import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Link } from "react-router-dom";

type Submission = {
  id: number;
  topic_id: number;
  student_id: string;
  content: string;
  created_at: string;
  score_ai: number | null;
  score_teacher: number | null;
  profiles: { full_name: string } | null;
  topics: { title: string } | null;
};

export default function Submissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("submissions")
          .select(`
            id,
            topic_id,
            student_id,
            content,
            created_at,
            score_ai,
            score_teacher,
            profiles ( full_name ),
            topics ( title )
          `);

        if (error) {
          console.error("Error fetching submissions:", error);
        } else {
          setSubmissions(data || []);
        }
      } catch (e) {
        console.error("Exception when fetching submissions:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, []);

  return (
    <div className="teacher-panel" dir="rtl">
      <header className="teacher-panel-header">
        <h1>التسليمات</h1>
        <p>عرض وتقييم تسليمات الطلاب.</p>
      </header>

      <section className="card" style={{ padding: "1.5rem" }}>
        {loading ? (
          <p>جاري تحميل التسليمات...</p>
        ) : (
          <div className="table-container">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>الطالب</th>
                  <th>الموضوع</th>
                  <th>تقييم الذكاء الاصطناعي</th>
                  <th>تقييم المعلم</th>
                  <th>عرض</th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((sub) => (
                  <tr key={sub.id}>
                    <td>{sub.profiles?.full_name || "غير معروف"}</td>
                    <td>{sub.topics?.title || "غير معروف"}</td>
                    <td>{sub.score_ai ?? "-"}</td>
                    <td>{sub.score_teacher ?? "-"}</td>
                    <td>
                      <Link to={`/evaluate/${sub.topic_id}/${sub.id}`} className="view-button">
                        عرض
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
