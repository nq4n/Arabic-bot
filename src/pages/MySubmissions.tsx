import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { SkeletonSection } from '../components/SkeletonBlocks';
import '../styles/MySubmissions.css';

type Submission = {
  id: number;
  topic_title: string;
  created_at: string;
  ai_grade: number | null;
  teacher_response: { rubric_breakdown: { [key: string]: { score: number } }, total_score: number } | null;
};

type TrackingConfirmation = {
  id: number;
  tracking_type: string;
  topic_id: string;
  activity_id: number | null;
  is_confirmed: boolean;
  confirmation_timestamp: string | null;
  created_at: string;
};

export default function MySubmissions() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [confirmations, setConfirmations] = useState<TrackingConfirmation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'submissions' | 'activities'>('submissions');

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
        // Fetch formal writing submissions
        const { data: subData, error: subError } = await supabase
          .from('submissions')
          .select('id, topic_title, created_at, ai_grade, teacher_response')
          .eq('student_id', session.user.id)
          .order('created_at', { ascending: false });

        if (subError) throw subError;
        setSubmissions(subData || []);

        // Fetch tracking confirmations (lessons, activities)
        const { data: confData, error: confError } = await supabase
          .from('tracking_confirmations')
          .select('id, tracking_type, topic_id, activity_id, is_confirmed, confirmation_timestamp, created_at')
          .eq('student_id', session.user.id)
          .order('created_at', { ascending: false });

        if (confError) throw confError;
        setConfirmations(confData || []);

      } catch (e: any) {
        setError('Failed to fetch data.');
        console.error('Error fetching submissions/activities:', e);
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

  const getTrackingTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'lesson': 'درس',
      'activity': 'نشاط',
      'evaluation': 'تقييم',
      'collaborative': 'تعاوني'
    };
    return labels[type] || type;
  };

  return (
    <div className='submissions-page' dir='rtl'>
      <header className='submissions-header page-header'>
        <h1 className="page-title">تسليماتي</h1>
        <p className="page-subtitle">هنا يمكنك عرض جميع كتاباتك السابقة ونتائج تقييمها.</p>
      </header>

      <div className='card submissions-list' aria-busy={loading}>
        {loading && <SkeletonSection lines={5} />}
        {error && <p className='error-message'>{error}</p>}
        <div className="tabs-navigation" style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem' }}>
          <button
            className={`button ${activeTab === 'submissions' ? 'button-primary' : 'button-light'}`}
            onClick={() => setActiveTab('submissions')}
          >
            كتاباتي وتقييماتي
          </button>
          <button
            className={`button ${activeTab === 'activities' ? 'button-primary' : 'button-light'}`}
            onClick={() => setActiveTab('activities')}
          >
            سجل أنشطتي ودروسي
          </button>
        </div>

        {activeTab === 'submissions' && !loading && !error && (
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

        {activeTab === 'activities' && !loading && !error && (
          <table>
            <thead>
              <tr>
                <th>نوع النشاط</th>
                <th>الموضوع</th>
                <th>الحالة</th>
                <th>تاريخ التأكيد</th>
              </tr>
            </thead>
            <tbody>
              {confirmations.length === 0 ? (
                <tr><td colSpan={5}>لا يوجد سجل أنشطة بعد.</td></tr>
              ) : (
                confirmations.map((c) => (
                  <tr key={c.id}>
                    <td>{getTrackingTypeLabel(c.tracking_type)}</td>
                    <td>{c.topic_id}</td>
                    <td>
                      <span className={c.is_confirmed ? 'status-confirmed' : 'status-pending'}>
                        {c.is_confirmed ? 'مؤكد' : 'قيد الانتظار'}
                      </span>
                    </td>
                    <td>
                      {c.confirmation_timestamp
                        ? new Date(c.confirmation_timestamp).toLocaleString('ar-SA')
                        : new Date(c.created_at).toLocaleString('ar-SA')}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
