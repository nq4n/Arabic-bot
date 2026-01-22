import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

import { SkeletonSection } from "../components/SkeletonBlocks";

type UserProfile = {
    id: string;
    username: string | null;
    full_name?: string | null;
    grade?: string | null;
    email: string | null;
    role: string | null;
};

export default function Profile() {
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchSessionAndProfile = async () => {
            setIsLoading(true);
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            
            if (sessionError) {
                console.error("Error fetching session:", sessionError);
                setIsLoading(false);
                return;
            }
            


            if (session) {
                const { data, error } = await supabase
                    .from("profiles")
                    .select("id, username, full_name, role, email, grade")
                    .eq("id", session.user.id)
                    .single();

                if (!error && data) {
                    setProfile(data as UserProfile);
                } else if (error) {
                    console.error("Error fetching profile:", error);
                }
            }
            setIsLoading(false);
        };

        fetchSessionAndProfile();
    }, []);

    if (isLoading) {
        return (
            <div className="container" dir="rtl">
                <header className="page-header">
                    <div className="skeleton skeleton-title skeleton-w-30" />
                </header>
                <div className="card">
                    <SkeletonSection lines={5} />
                </div>
            </div>
        );
    }

    if (!profile) return null;

    return (
        <div className="container" dir="rtl">
            <header className="page-header">
                <h1 className="page-title">الملف الشخصي</h1>
                <p className="page-subtitle">إدارة بياناتك الشخصية</p>
            </header>

            <div className="card" style={{ maxWidth: "600px", margin: "0 auto" }}>
                <div className="vertical-stack">
                    <div className="form-group">
                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
                            الاسم الكامل
                        </label>
                        <input
                            type="text"
                            value={profile.full_name || ""}
                            disabled
                            style={{ opacity: 0.7, cursor: "not-allowed" }}
                        />
                    </div>

                    {profile.role === "student" && (
                        <div className="form-group" style={{ marginTop: "1rem" }}>
                            <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
                                الصف الدراسي
                            </label>
                            <input
                                type="text"
                                value={profile.grade || ""}
                                disabled
                                style={{ opacity: 0.7, cursor: "not-allowed" }}
                            />
                        </div>
                    )}

                    <div className="form-group" style={{ marginTop: "1rem" }}>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
                            البريد الإلكتروني
                        </label>
                        <input
                            type="email"
                            value={profile.email || ""}
                            disabled
                            style={{ opacity: 0.7, cursor: "not-allowed" }}
                        />
                    </div>

                    <div className="form-group" style={{ marginTop: "1rem" }}>
                        <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
                            الدور
                        </label>
                        <input
                            type="text"
                            value={profile.role === "admin" ? "مشرف" : profile.role === "teacher" ? "معلم" : "طالب"}
                            disabled
                            style={{ opacity: 0.7, cursor: "not-allowed" }}
                        />
                    </div>
                </div>
            </div>

            {profile.role === "student" && (
                <LatestFeedbackSection userId={profile.id} />
            )}
        </div>
    );
}

function LatestFeedbackSection({ userId }: { userId: string }) {
    const [latestFeedback, setLatestFeedback] = useState<{ topic: string; feedback: string; score: number } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLatest = async () => {
            const { data } = await supabase
                .from("submissions")
                .select("topic_title, ai_response, ai_grade")
                .eq("student_id", userId)
                .order("created_at", { ascending: false })
                .limit(1)
                .single();

            if (data && data.ai_response) {
                // Safely cast or parse
                const response: any = data.ai_response;
                setLatestFeedback({
                    topic: data.topic_title,
                    feedback: response.feedback || "لا توجد ملاحظات.",
                    score: data.ai_grade || 0
                });
            }
            setLoading(false);
        };
        fetchLatest();
    }, [userId]);

    if (loading) return null;
    if (!latestFeedback) return null;

    return (
        <div className="card" style={{ maxWidth: "600px", margin: "2rem auto 0" }}>
            <h2 style={{ fontSize: "1.25rem", marginBottom: "1rem" }}>
                <i className="fas fa-comment-dots" style={{ marginLeft: "0.5rem" }}></i>
                آخر ملاحظات الذكاء الاصطناعي
            </h2>
            <div style={{ backgroundColor: "var(--bg-primary)", padding: "1rem", borderRadius: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                    <span style={{ fontWeight: "bold" }}>{latestFeedback.topic}</span>
                    <span style={{ fontWeight: "bold", color: "var(--primary)" }}>{latestFeedback.score}/100</span>
                </div>
                <p style={{ lineHeight: "1.6", color: "var(--text-secondary)" }}>
                    {latestFeedback.feedback}
                </p>
            </div>
        </div>
    );
}
