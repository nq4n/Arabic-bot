import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useSession } from '../hooks/SessionContext';
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

                // 1. Fetch points and stats from student_tracking
                const { data: trackData, error: trackError } = await supabase
                    .from('student_tracking')
                    .select('tracking_data')
                    .eq('student_id', session.user.id)
                    .single();

                if (!trackError && trackData?.tracking_data) {
                    const data = trackData.tracking_data as any;
                    setTotalPoints(data.points?.total || 0);

                    // Calculate stats
                    const lessons = Object.keys(data.lessons || {}).length;

                    let activities = 0;
                    if (data.activities) {
                        Object.values(data.activities).forEach((topicActivities: any) => {
                            activities += topicActivities.completedIds?.length || 0;
                        });
                    }

                    const evaluations = Object.keys(data.evaluations || {}).length;

                    setStats({
                        lessonsCompleted: lessons,
                        activitiesCompleted: activities,
                        totalEvaluations: evaluations
                    });
                }

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