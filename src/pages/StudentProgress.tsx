import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useSession } from '../hooks/SessionContext';
import { SkeletonSection } from '../components/SkeletonBlocks';
import '../styles/StudentProgress.css';

type TrackingConfirmation = {
    id: number;
    student_id: string;
    activity_type: string;
    activity_id: string;
    confirmed: boolean;
    confirmed_at: string;
    session_duration: number;
    data_quality_score: number;
    profiles: {
        username: string;
        full_name: string;
    };
};

export default function StudentProgress() {
    const { session } = useSession();
    const [confirmations, setConfirmations] = useState<TrackingConfirmation[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchConfirmations = async () => {
            if (!session?.user?.id) {
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('tracking_confirmations')
                    .select(`
                        id,
                        student_id,
                        activity_type,
                        activity_id,
                        confirmed,
                        confirmed_at,
                        session_duration,
                        data_quality_score,
                        profiles (
                            username,
                            full_name
                        )
                    `);

                if (error) {
                    throw error;
                }

                setConfirmations(data as TrackingConfirmation[]);
            } catch (err: any) {
                setError(`Error fetching student progress: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchConfirmations();
    }, [session]);

    const memoizedConfirmations = useMemo(() => confirmations, [confirmations]);

    return (
        <div className="student-progress-page" dir="rtl">
            <header className="student-progress-header">
                <h1>Student Activity Confirmations</h1>
                <p>Review student confirmations for activities and lessons.</p>
            </header>

            <section className="card">
                {loading ? (
                    <SkeletonSection lines={10} />
                ) : error ? (
                    <p className="error-message">{error}</p>
                ) : memoizedConfirmations.length === 0 ? (
                    <p>No activity confirmations found.</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Activity Type</th>
                                    <th>Activity ID</th>
                                    <th>Duration (s)</th>
                                    <th>Confirmed At</th>
                                    <th>Data Quality</th>
                                </tr>
                            </thead>
                            <tbody>
                                {memoizedConfirmations.map((c) => (
                                    <tr key={c.id}>
                                        <td>{c.profiles?.full_name || c.profiles?.username || c.student_id}</td>
                                        <td>{c.activity_type}</td>
                                        <td>{c.activity_id}</td>
                                        <td>{c.session_duration}</td>
                                        <td>{new Date(c.confirmed_at).toLocaleString()}</td>
                                        <td>{c.data_quality_score}</td>
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