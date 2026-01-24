import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useSession } from '../hooks/SessionContext';
import { getStudentPoints } from '../utils/pointCalculation';
import '../styles/StudentProgress.css';

type TrackingStats = {
    lessonsCompleted: number;
    activitiesCompleted: number;
    totalEvaluations: number;
};

type PointReward = {
    id: string;
    title: string;
    min_points: number;
    description: string;
};

export default function StudentProgress() {
    const { session } = useSession();
    const [totalPoints, setTotalPoints] = useState(0);
    const [rewards, setRewards] = useState<PointReward[]>([]);
    const [stats, setStats] = useState<TrackingStats>({ lessonsCompleted: 0, activitiesCompleted: 0, totalEvaluations: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!session?.user?.id) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);

                // 1. Fetch points using unified calculation
                const totalPointsValue = await getStudentPoints(session.user.id);
                setTotalPoints(totalPointsValue);

                // 2. Fetch stats from student_tracking
                const { data: trackData, error: trackError } = await supabase
                    .from('student_tracking')
                    .select('tracking_data')
                    .eq('student_id', session.user.id)
                    .maybeSingle();

                let trackedLessons = 0;
                let trackedActivities = 0;
                let trackedEvaluations = 0;
                let trackedCollaborative = 0;

                if (!trackError && trackData?.tracking_data) {
                    const data = trackData.tracking_data as any;

                    // Calculate stats from tracking_data
                    trackedLessons = Object.keys(data.lessons || {}).length;

                    if (data.activities) {
                        Object.values(data.activities).forEach((topicActivities: any) => {
                            trackedActivities += topicActivities.completedIds?.length || 0;
                        });
                    }

                    trackedEvaluations = Object.keys(data.evaluations || {}).length;

                    // Calculate collaborative completions
                    if (data.collaborative) {
                        Object.values(data.collaborative).forEach((topic: any) => {
                            if (topic.discussion) trackedCollaborative += 1;
                            if (topic.dialogue) trackedCollaborative += 1;
                        });
                    }
                }

                // Fallback counts (computed only if tracking_data count for that metric is zero)
                let lessonsFallback = 0;
                let activitiesFallback = 0;
                let evaluationsFallback = 0;
                let collaborativeFallback = 0;

                // Compute fallback lessons if none tracked
                if (trackedLessons === 0) {
                    const { data: sessionRows, error: sessionError } = await supabase
                        .from('session_durations')
                        .select('topic_id')
                        .eq('student_id', session.user.id)
                        .eq('session_type', 'lesson')
                        .eq('is_completed', true);

                    if (!sessionError && sessionRows) {
                        const lessonSet = new Set<string>();
                        (sessionRows as any[]).forEach((row) => {
                            if (row.topic_id) lessonSet.add(row.topic_id as string);
                        });
                        lessonsFallback = lessonSet.size;
                    }
                }

                // Compute fallback activities if none tracked
                if (trackedActivities === 0) {
                    const { data: activityRows, error: activityError } = await supabase
                        .from('activity_submissions')
                        .select('topic_id, activity_id, status')
                        .eq('student_id', session.user.id);

                    if (!activityError && activityRows) {
                        const activitySet = new Set<string>();
                        (activityRows as any[]).forEach((row) => {
                            // Count each unique topic/activity pair that has not been rejected
                            if (!row.status || row.status !== 'rejected') {
                                activitySet.add(`${row.topic_id}|${row.activity_id}`);
                            }
                        });
                        activitiesFallback = activitySet.size;
                    }
                }

                // Compute fallback evaluations if none tracked
                if (trackedEvaluations === 0) {
                    const { data: evalRows, error: evalError } = await supabase
                        .from('submissions')
                        .select('teacher_response')
                        .eq('student_id', session.user.id);

                    if (!evalError && evalRows) {
                        evaluationsFallback = (evalRows as any[]).filter((row) => row.teacher_response).length;
                    }
                }

                // Compute fallback collaborative completions if none tracked
                if (trackedCollaborative === 0) {
                    const { data: collabRows, error: collabError } = await supabase
                        .from('collaborative_activity_completions')
                        .select('id')
                        .eq('student_id', session.user.id);
                    if (!collabError && collabRows) {
                        collaborativeFallback = (collabRows as any[]).length;
                    }
                }

                // Determine final counts by using tracked counts when available, otherwise fallback counts
                const lessonsFinal = trackedLessons || lessonsFallback;
                const activitiesFinal = trackedActivities || activitiesFallback;
                const evaluationsFinal = trackedEvaluations || evaluationsFallback;
                const collaborativeFinal = trackedCollaborative || collaborativeFallback;

                // Combine interactive and collaborative into a single activities count for display
                const totalActivitiesFinal = activitiesFinal + collaborativeFinal;

                setStats({
                    lessonsCompleted: lessonsFinal,
                    activitiesCompleted: totalActivitiesFinal,
                    totalEvaluations: evaluationsFinal,
                });

                // 2. Fetch rewards to show progress
                const { data: rewardsData } = await supabase
                    .from('point_rewards')
                    .select('*')
                    .order('min_points', { ascending: true });

                if (rewardsData) setRewards(rewardsData as PointReward[]);

            } catch (err: any) {
                setError(`Error fetching achievement data: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [session]);

    return (
        <div className="student-progress-page" dir="rtl">
            <header className="student-progress-header">
                <h1>نقاطي وإنجازاتي</h1>
                <p>تتبع تقدمك في التعلم والمكافآت التي حصلت عليها.</p>
            </header>

            {!loading && !error && (
                <section className="points-summary-card card">
                    <div className="points-main">
                        <div className="points-display">
                            <span className="points-value">{totalPoints}</span>
                            <span className="points-label">نقطة</span>
                        </div>
                        <div className="points-description">
                            <h3>رصيد نقاطك الحالي</h3>
                            <p>استمر في إكمال الدروس والأنشطة لزيادة نقاطك!</p>
                        </div>
                    </div>
                    {rewards.length > 0 && (
                        <div className="rewards-progress">
                            <h4>الهدف القادم:</h4>
                            {(() => {
                                const nextReward = rewards.find(r => r.min_points > totalPoints) || rewards[rewards.length - 1];
                                const prevPoints = rewards.filter(r => r.min_points <= totalPoints).slice(-1)[0]?.min_points || 0;
                                const progress = Math.min(100, Math.max(0, ((totalPoints - prevPoints) / (nextReward.min_points - prevPoints)) * 100));

                                return (
                                    <div className="reward-item">
                                        <div className="reward-info">
                                            <span>{nextReward.title}</span>
                                            <span>{totalPoints} / {nextReward.min_points}</span>
                                        </div>
                                        <div className="progress-bar-container">
                                            <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    )}
                </section>
            )}

            <section className="achievements-grid">
                <div className="card achievement-stat-card">
                    <i className="fas fa-book-open stat-icon"></i>
                    <div className="stat-content">
                        <span className="stat-value">{stats.lessonsCompleted}</span>
                        <span className="stat-label">دروس مكتملة</span>
                    </div>
                </div>
                <div className="card achievement-stat-card">
                    <i className="fas fa-tasks stat-icon"></i>
                    <div className="stat-content">
                        <span className="stat-value">{stats.activitiesCompleted}</span>
                        <span className="stat-label">أنشطة تفاعلية</span>
                    </div>
                </div>
                <div className="card achievement-stat-card">
                    <i className="fas fa-pen-nib stat-icon"></i>
                    <div className="stat-content">
                        <span className="stat-value">{stats.totalEvaluations}</span>
                        <span className="stat-label">تقييمات كتابية</span>
                    </div>
                </div>
            </section>

            <section className="rewards-list-section card">
                <h3><i className="fas fa-award"></i> المستويات والمكافآت</h3>
                <div className="rewards-grid">
                    {rewards.map((reward) => {
                        const isUnlocked = totalPoints >= reward.min_points;
                        return (
                            <div key={reward.id} className={`reward-card ${isUnlocked ? 'unlocked' : 'locked'}`}>
                                <div className="reward-icon-wrapper">
                                    <i className={`fas ${isUnlocked ? 'fa-medal' : 'fa-lock'} reward-medal`}></i>
                                </div>
                                <div className="reward-details">
                                    <h4>{reward.title}</h4>
                                    <p>{reward.description}</p>
                                    <span className="reward-requirement">{reward.min_points} نقطة</span>
                                </div>
                                {isUnlocked && <span className="unlocked-badge">تم الإنجاز</span>}
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}