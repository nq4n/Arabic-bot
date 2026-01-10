import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { rubrics } from '../data/rubrics';
import { topics } from '../data/topics';
import '../styles/Submissions.css';

type Submission = {
  id: number;
  topic_title: string;
  created_at: string;
  ai_grade: number | null;
  teacher_response: { rubric_breakdown: { [key: string]: { score: number } }, total_score: number } | null;
  profiles: { username: string }; // Corrected to be a single object
};

export default function Submissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('submissions')
          .select(`
            id, 
            topic_title, 
            created_at, 
            ai_grade, 
            teacher_response,
            profiles ( username ) 
          `)
          .order('created_at', { ascending: false });

        if (fetchError) {
          console.error('Error fetching submissions:', fetchError);
          throw fetchError;
        }

        // The data from Supabase needs to be transformed to match the Submission type
        const formattedData = data.map(item => ({
          ...item,
          profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles,
        }));

        setSubmissions(formattedData || []);
      } catch (e: any) {
        setError(`Failed to fetch submissions: ${e.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, []);

  const calculateTeacherScore = (response: Submission['teacher_response']) => {
      if (!response || response.total_score === undefined) return null; 
      return response.total_score;
  }

  return (
    <div className='submissions-page' dir='rtl'>
      <header className='submissions-header'>
        <h1>كل التسليمات</h1>
        <p>عرض وتقييم تسليمات الطلاب.</p>
      </header>

      <section className='card submissions-list'>
        {loading ? (
          <p>...جاري تحميل التسليمات</p>
        ) : error ? (
            <p className='error-message'>{error}</p>
        ) : (
          <div className='table-container'>
            <table className='custom-table'>
              <thead>
                <tr>
                  <th>الطالب</th>
                  <th>الموضوع</th>
                  <th>تاريخ التسليم</th>
                  <th>تقييم الذكاء الاصطناعي</th>
                  <th>تقييم المعلم</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {submissions.length === 0 ? (
                    <tr><td colSpan={6}>لا توجد تسليمات لعرضها.</td></tr>
                ) : (
                    submissions.map((sub) => {
                        const teacherScore = calculateTeacherScore(sub.teacher_response);
                        const topic = topics.find(t => t.title === sub.topic_title);
                        const rubricForTopic = topic ? rubrics.find(r => r.topicId === topic.id) : undefined;
                        const maxTotalScore = rubricForTopic ? 
                            rubricForTopic.criteria.reduce((sum, c) => sum + (c.levels.find(l => l.id === 'excellent')?.score || 0), 0)
                            : 100; // Default to 100 if rubric not found

                        return (
                          <tr key={sub.id}>
                            <td>{sub.profiles?.username || 'غير معروف'}</td>
                            <td>{sub.topic_title}</td>
                            <td>{new Date(sub.created_at).toLocaleDateString('ar')}</td>
                            <td>{sub.ai_grade !== null ? `${sub.ai_grade}/${maxTotalScore}` : '-'}</td>
                            <td>{teacherScore !== null ? `${teacherScore}/${maxTotalScore}` : 'لم يُقيّم بعد'}</td>
                            <td>
                              <Link to={`/submission/${sub.id}`} className='button button-small'>
                                عرض وتقييم
                              </Link>
                            </td>
                          </tr>
                        )
                    })
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
