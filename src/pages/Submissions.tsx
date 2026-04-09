import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { rubrics } from '../data/rubrics';
import { topics } from '../data/topics';
import { SkeletonSection } from '../components/SkeletonBlocks';
import '../styles/Submissions.css';

type Submission = {
  id: number;
  topic_title: string;
  created_at: string;
  ai_grade: number | null;
  teacher_response: { rubric_breakdown: { [key: string]: { score: number } }, total_score: number } | null;
  profiles: { full_name: string | null; username: string };
};





export default function Submissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<string>('');

  const getDisplayName = (profile: { full_name: string | null; username: string }) => {
    return profile?.full_name || profile?.username || 'غير معروف';
  };

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
            profiles ( full_name, username ) 
          `)
          .order('created_at', { ascending: false });

        if (fetchError) {
          console.error('Error fetching submissions:', fetchError);
          throw fetchError;
        }

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

  const filteredSubmissions = submissions.filter(sub => {
    const matchLesson = selectedLesson === '' || sub.topic_title === selectedLesson;
    return matchLesson;
  });

  const isPageLoading = loading;

  const calculateTeacherScore = (response: Submission['teacher_response']) => {
      if (!response || response.total_score === undefined) return null; 
      return response.total_score;
  }

  return (
    <div className='submissions-page' dir='rtl' aria-busy={isPageLoading}>
      <section className='card submissions-list' aria-busy={loading}>
          <div className='lesson-visibility-header'>
            <h1>كل التسليمات</h1>
            <p>عرض وتقييم تسليمات الطلاب.</p>
          </div>

          {/* فلتر الدرس والطالب */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label htmlFor="lessonFilter">الدرس:</label>
              <select
                id="lessonFilter"
                value={selectedLesson}
                onChange={(e) => setSelectedLesson(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}
              >
                <option value="">كل الدروس</option>
                {topics.map(topic => (
                  <option key={topic.id} value={topic.title}>{topic.title}</option>
                ))}
              </select>
            </div>
          </div>

          {loading ? (
            <SkeletonSection lines={6} showTitle={false} />
          ) : error ? (
              <p className='error-message'>{error}</p>
          ) : (
            <div className="data-cards-container" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {filteredSubmissions.length === 0 ? (
                  <p className='muted-note full-width' style={{ gridColumn: '1 / -1' }}>لا توجد تسليمات لعرضها.</p>
              ) : (
                  filteredSubmissions.map((sub) => {
                      const teacherScore = calculateTeacherScore(sub.teacher_response);
                      const topic = topics.find(t => t.title === sub.topic_title);
                      const rubricForTopic = topic ? rubrics.find(r => r.topicId === topic.id) : undefined;
                      const maxTotalScore = rubricForTopic ?
                          rubricForTopic.criteria.reduce((sum, c) => sum + (c.levels.find(l => l.id === 'excellent')?.score || 0), 0)
                          : 100; // Default to 100 if rubric not found

                      return (
                        <div key={sub.id} className="card submission-item" style={{ display: 'flex', flexDirection: 'column', padding: '1rem' }}>
                            <h3 style={{ fontSize: '1.1rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>
                                {getDisplayName(sub.profiles)} - {sub.topic_title}
                            </h3>
                            <div style={{ flexGrow: 1, marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                                <p style={{ margin: '0 0 0.25rem' }}>تاريخ التسليم: {new Date(sub.created_at).toLocaleDateString('ar')}</p>
                                <p style={{ margin: '0 0 0.25rem' }}>تقييم الذكاء الاصطناعي: {sub.ai_grade !== null ? `${sub.ai_grade}/${maxTotalScore}` : '-'}</p>
                                <p style={{ margin: '0' }}>تقييم المعلم: {teacherScore !== null ? `${teacherScore}/${maxTotalScore}` : 'لم يُقيّم بعد'}</p>
                            </div>
                            <div style={{ marginTop: 'auto', textAlign: 'right' }}>
                                <Link to={`/submission/${sub.id}`} className='button button-compact'>
                                  عرض وتقييم
                                </Link>
                            </div>
                        </div>
                      )
                  })
              )}
            </div>
          )}
        </section>
    </div>
  );
}
