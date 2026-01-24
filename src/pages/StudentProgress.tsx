import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { useSession } from '../hooks/SessionContext';
import { SkeletonSection } from '../components/SkeletonBlocks';
import '../styles/StudentProgress.css';

type TrackingConfirmation = {
    id: number;
    student_id: string;
    tracking_type: string;
    topic_id: string;
    activity_id: number | null;
    is_confirmed: boolean;
    confirmation_timestamp: string | null;
    data_quality_score: number;
    validation_status: string;
    created_at: string;
    profiles: {
        username: string;
        full_name: string;
    } | null;
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
                        tracking_type,
                        topic_id,
                        activity_id,
                        is_confirmed,
                        confirmation_timestamp,
                        data_quality_score,
                        validation_status,
                        created_at,
                        profiles (
                            username,
                            full_name
                        )
                    `)
                    .order('created_at', { ascending: false });

                if (error) {
                    throw error;
                }

                setConfirmations(data as any as TrackingConfirmation[]);
            } catch (err: any) {
                setError(`Error fetching student progress: ${err.message}`);
            } finally {
                setLoading(false);
            }
        };

        fetchConfirmations();
    }, [session]);

    const memoizedConfirmations = useMemo(() => confirmations, [confirmations]);

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
        <div className="student-progress-page" dir="rtl">
            <header className="student-progress-header">
                <h1>تأكيدات النشاط الطلابي</h1>
                <p>مراجعة تأكيدات الطلاب للأنشطة والدروس.</p>
            </header>

            <section className="card">
                {loading ? (
                    <SkeletonSection lines={10} />
                ) : error ? (
                    <p className="error-message">{error}</p>
                ) : memoizedConfirmations.length === 0 ? (
                    <p>لا توجد تأكيدات نشاط.</p>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table>
                            <thead>
                                <tr>
                                    <th>الطالب</th>
                                    <th>نوع النشاط</th>
                                    <th>الموضوع</th>
                                    <th>رقم النشاط</th>
                                    <th>الحالة</th>
                                    <th>تاريخ التأكيد</th>
                                    <th>جودة البيانات</th>
                                    <th>حالة التحقق</th>
                                </tr>
                            </thead>
                            <tbody>
                                {memoizedConfirmations.map((c) => (
                                    <tr key={c.id}>
                                        <td>{c.profiles?.full_name || c.profiles?.username || c.student_id}</td>
                                        <td>{getTrackingTypeLabel(c.tracking_type)}</td>
                                        <td>{c.topic_id}</td>
                                        <td>{c.activity_id || '-'}</td>
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
                                        <td>
                                            <span className={c.data_quality_score >= 80 ? 'quality-high' : c.data_quality_score >= 50 ? 'quality-medium' : 'quality-low'}>
                                                {c.data_quality_score}%
                                            </span>
                                        </td>
                                        <td>
                                            <span className={c.validation_status === 'valid' ? 'validation-valid' : 'validation-invalid'}>
                                                {c.validation_status === 'valid' ? 'صالح' : 'غير صالح'}
                                            </span>
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