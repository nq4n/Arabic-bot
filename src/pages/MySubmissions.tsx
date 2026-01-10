import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import '../styles/MySubmissions.css';

type Submission = {
  id: number;
  topic_title: string;
  created_at: string;
  ai_grade: number | null;
  teacher_response: { rubric_breakdown: { [key: string]: { score: number } }, total_score: number } | null;
};

export default function MySubmissions() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSubmissions = async () => {
      console.log('Attempting to fetch session...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
     

      if (sessionError || !session) {
        setError('You must be logged in to view your submissions.');
        setLoading(false);
        return;
      }

      console.log('Fetching submissions for user ID:', session.user.id);
      try {
        const { data, error: fetchError } = await supabase
          .from('submissions')
          .select('id, topic_title, created_at, ai_grade, teacher_response')
          .eq('student_id', session.user.id)
          .order('created_at', { ascending: false });

        if (fetchError) {
            console.error('Supabase error fetching submissions:', fetchError);
            throw fetchError;
        }

        console.log('Successfully fetched submissions data:', data);
        setSubmissions(data || []);
      } catch (e: any) {
        setError('Failed to fetch submissions.');
        console.error('The catch block was triggered during fetch:', e);
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
        <h1>تسليماتي</h1>
        <p>هنا يمكنك عرض جميع كتاباتك السابقة ونتائج تقييمها.</p>
      </header>

      <div className='card submissions-list'>
        {loading && <p>...جاري تحميل التسليمات</p>}
        {error && <p className='error-message'>{error}</p>}
        {!loading && !error && (
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
              {submissions.length === 0 ? (
                  <tr><td colSpan={5}>لم تقم بأي تسليمات بعد.</td></tr>
              ) : (
                submissions.map((sub) => {
                  const teacherScore = calculateTeacherScore(sub.teacher_response);
                  return (
                    <tr key={sub.id}>
                      <td>{sub.topic_title}</td>
                      <td>{new Date(sub.created_at).toLocaleDateString('ar')}</td>
                      <td>{sub.ai_grade !== null ? `${sub.ai_grade}/100` : '-'}</td>
                      <td>{teacherScore !== null ? `${teacherScore}/100` : 'لم يُقيّم بعد'}</td>
                      <td>
                        <button
                          className='button button-small'
                          onClick={() => navigate(`/submission/${sub.id}`)}
                        >
                          عرض التفاصيل
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
