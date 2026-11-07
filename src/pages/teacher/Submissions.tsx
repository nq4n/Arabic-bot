import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../supabaseClient';
import { rubrics } from '../../data/rubrics';
import { topics } from '../../data/topics';
import { SkeletonSection } from '../../components/SkeletonBlocks';
import { getAIErrorLocations } from '../../services/aiEvaluationService';
import '../../styles/Submissions.css';

type BackfillState = {
  running: boolean;
  total: number;
  done: number;
  updated: number;
  message: string | null;
};

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [backfill, setBackfill] = useState<BackfillState>({
    running: false,
    total: 0,
    done: 0,
    updated: 0,
    message: null,
  });

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

  useEffect(() => {
    const loadRole = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle();
      setIsAdmin(data?.role === 'admin');
    };
    loadRole();
  }, []);

  const handleBackfillErrors = async () => {
    if (backfill.running) return;
    const confirmed = window.confirm(
      'سيحلّل الذكاء الاصطناعي مواضع الأخطاء لكل التسليمات التي لم تُحلَّل بعد (دون تغيير الدرجات). ' +
      'كل تسليم = نداء ذكاء اصطناعي واحد وقد يستغرق وقتًا ويستهلك رصيدًا. هل تريد المتابعة؟'
    );
    if (!confirmed) return;

    setBackfill({ running: true, total: 0, done: 0, updated: 0, message: 'جارٍ جلب التسليمات...' });

    const { data, error: fetchError } = await supabase
      .from('submissions')
      .select('id, submission_data, topic_title, ai_errors');

    if (fetchError || !data) {
      setBackfill({ running: false, total: 0, done: 0, updated: 0, message: 'تعذّر جلب التسليمات.' });
      return;
    }

    // Only process submissions that have text and have not been analyzed yet.
    const pending = data.filter((row) => {
      const hasText = row.submission_data && Object.values(row.submission_data as Record<string, string>)
        .some((v) => typeof v === 'string' && v.trim());
      const alreadyDone = Array.isArray(row.ai_errors) && row.ai_errors.length > 0;
      return hasText && !alreadyDone;
    });

    setBackfill({ running: true, total: pending.length, done: 0, updated: 0, message: null });

    let done = 0;
    let updated = 0;
    for (const row of pending) {
      const topic = topics.find((t) => t.title === row.topic_title);
      try {
        const errors = await getAIErrorLocations(
          row.submission_data as Record<string, string>,
          { writingSections: topic?.writingSections }
        );
        const { error: updateError } = await supabase
          .from('submissions')
          .update({ ai_errors: errors })
          .eq('id', row.id);
        if (!updateError) updated += 1;
      } catch (e) {
        console.error('Backfill failed for submission', row.id, e);
      }
      done += 1;
      setBackfill({ running: true, total: pending.length, done, updated, message: null });
    }

    setBackfill({
      running: false,
      total: pending.length,
      done,
      updated,
      message: `اكتمل التحليل: ${updated} تسليمًا تم تحديثه من ${pending.length}.`,
    });
  };

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

          {isAdmin && (
            <div className='admin-backfill' style={{ marginBottom: '1.5rem' }}>
              <button
                type='button'
                className='button button-compact'
                onClick={handleBackfillErrors}
                disabled={backfill.running}
              >
                <i className='fas fa-magnifying-glass'></i>{' '}
                {backfill.running ? 'جارٍ تحليل مواضع الأخطاء...' : 'تحليل مواضع الأخطاء لكل التسليمات'}
              </button>
              {backfill.running && backfill.total > 0 && (
                <p className='text-note' style={{ margin: '0.5rem 0 0' }}>
                  تمّت معالجة {backfill.done} من {backfill.total}...
                </p>
              )}
              {!backfill.running && backfill.message && (
                <p className='text-note' style={{ margin: '0.5rem 0 0' }}>{backfill.message}</p>
              )}
            </div>
          )}

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

