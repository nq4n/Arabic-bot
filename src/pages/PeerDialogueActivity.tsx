import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabaseClient";
import { topics } from "../data/topics";
import { LessonVisibility, buildLessonVisibilityFromRows, getLessonVisibility } from "../utils/lessonSettings";
import PeerDialogueChat from "../components/PeerDialogueChat";
import { SkeletonHeader, SkeletonSection } from "../components/SkeletonBlocks";
import "../styles/Topic.css";
import { SessionTimeTracker, requestTrackingConfirmation } from "../utils/enhancedStudentTracking";
import ConfirmationDialog from "../components/ConfirmationDialog";

export default function PeerDialogueActivity() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const topic = topics.find((t) => t.id === topicId);
  const topicIds = useMemo(() => topics.map((t) => t.id), []);
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isVisibilityLoading, setIsVisibilityLoading] = useState(true);
  const [isCompletionLoading, setIsCompletionLoading] = useState(true);
  const [isMatchLoading, setIsMatchLoading] = useState(true);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [scenarioText, setScenarioText] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "waiting" | "matched">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [lessonVisibility, setLessonVisibility] = useState<LessonVisibility>(() =>
    getLessonVisibility(topicIds)
  );
  const [isCompleted, setIsCompleted] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [sessionTimer, setSessionTimer] = useState<SessionTimeTracker | null>(null);

  const isPageLoading =
    isSessionLoading || isVisibilityLoading || isCompletionLoading || isMatchLoading;

  useEffect(() => {
    const timer = new SessionTimeTracker('peer_dialogue_activity');
    setSessionTimer(timer);

    return () => {
        timer.endSession();
    };
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsSessionLoading(false);
    });
  }, []);

  const isActivityActive = topic
    ? lessonVisibility[topic.id]?.activity ?? true
    : false;

  useEffect(() => {
    const loadLessonVisibilitySettings = async () => {
      setIsVisibilityLoading(true);
      if (!session || !topic) {
        setIsVisibilityLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, added_by_teacher_id")
        .eq("id", session.user.id)
        .single();

      if (profileError) {
        setIsVisibilityLoading(false);
        return;
      }

      const teacherId =
        profile?.role === "teacher" || profile?.role === "admin"
          ? session.user.id
          : profile?.added_by_teacher_id;

      if (!teacherId) {
        setIsVisibilityLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("lesson_visibility_settings")
        .select("topic_id, settings")
        .eq("teacher_id", teacherId);

      if (error) {
        setIsVisibilityLoading(false);
        return;
      }

      const next = buildLessonVisibilityFromRows(topicIds, data || []);
      setLessonVisibility(next);
      setIsVisibilityLoading(false);
    };

    loadLessonVisibilitySettings();
  }, [session, topic, topicIds]);

  const loadCompletion = useCallback(async () => {
    setIsCompletionLoading(true);
    if (!session || !topic) {
      setIsCompletionLoading(false);
      return;
    }
    const { data, error: completionError } = await supabase
      .from("collaborative_activity_completions")
      .select("id")
      .eq("student_id", session.user.id)
      .eq("topic_id", topic.id)
      .eq("activity_kind", "dialogue")
      .maybeSingle();

    if (completionError) {
      setIsCompletionLoading(false);
      return;
    }
    setIsCompleted(!!data);
    setIsCompletionLoading(false);
  }, [session, topic]);

  useEffect(() => {
    loadCompletion();
  }, [loadCompletion]);

  const loadExistingSession = useCallback(async () => {
    if (!session || !topic) {
      setIsMatchLoading(false);
      return;
    }
    setIsMatchLoading(true);
    const { data, error: sessionError } = await supabase.rpc(
      "get_dialogue_peer_session",
      { _topic_id: topic.id }
    );

    if (sessionError) {
      setIsMatchLoading(false);
      return;
    }

    const payload = Array.isArray(data) ? data[0] : data;
    if (payload?.session_id) {
      setSessionId(payload.session_id);
      setRole(payload.role ?? null);
      setScenarioText(payload.scenario_text ?? null);
      setStatus("matched");
    }
    setIsMatchLoading(false);
  }, [session, topic]);

  useEffect(() => {
    loadExistingSession();
  }, [loadExistingSession]);

  const handleConfirmStart = useCallback(async () => {
    if (!session || !topic) return;
    setIsStarting(true);
    setError(null);
    
    const sessionDuration = sessionTimer?.endSession() || 0;

    const { data, error: startError } = await supabase.rpc(
      "start_dialogue_peer_session",
      { _topic_id: topic.id }
    );

    if (startError) {
      setError("تعذر بدء الحوار. حاول مرة أخرى.");
      setIsStarting(false);
      setShowConfirmation(false);
      return;
    }

    await requestTrackingConfirmation({
        studentId: session.user.id,
        activityType: 'peer_dialogue_activity',
        activityId: 'peer_dialogue_activity',
        confirmed: true,
        sessionDuration,
        dataQualityScore: 100
    });

    const payload = Array.isArray(data) ? data[0] : data;
    if (!payload) {
      setError("تعذر بدء الحوار. حاول مرة أخرى.");
      setIsStarting(false);
      setShowConfirmation(false);
      return;
    }

    setSessionId(payload.session_id ?? null);
    setRole(payload.role ?? null);
    setScenarioText(payload.scenario_text ?? null);
    setStatus(payload.session_id ? "matched" : "waiting");
    setIsStarting(false);
    setShowConfirmation(false);
  },[session, topic, sessionTimer]);

  const handleStart = () => {
    setShowConfirmation(true);
  };

  useEffect(() => {
    if (!session || !topic || status !== "waiting") return;

    const pollSession = async () => {
      const { data, error: sessionError } = await supabase.rpc(
        "get_dialogue_peer_session",
        { _topic_id: topic.id }
      );

      if (sessionError) return;
      const payload = Array.isArray(data) ? data[0] : data;
      if (payload?.session_id) {
        setSessionId(payload.session_id);
        setRole(payload.role ?? null);
        setScenarioText(payload.scenario_text ?? null);
        setStatus("matched");
      }
    };

    pollSession();
    const interval = window.setInterval(pollSession, 8000);
    return () => window.clearInterval(interval);
  }, [session, status, topic]);

  if (!topic) {
    return <div className="topic-page">عذرًا، الدرس غير موجود.</div>;
  }

  if (isPageLoading) {
    return (
      <div className="topic-page" dir="rtl">
        <header className="topic-main-header page-header">
          <SkeletonHeader titleWidthClass="skeleton-w-40" subtitleWidthClass="skeleton-w-70" />
        </header>
        <div className="topic-content-wrapper">
          <div className="vertical-stack">
            <SkeletonSection lines={3} />
            <SkeletonSection lines={3} />
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="topic-page" dir="rtl">
        <div className="not-found-container">
          <h1>جاري التحقق من الحساب...</h1>
        </div>
      </div>
    );
  }

  const isCollaborativeActive = topic
    ? lessonVisibility[topic.id]?.activity ?? true
    : true;

  if (!isActivityActive || !isCollaborativeActive) {
    return (
      <div className="topic-page" dir="rtl">
        <div className="not-found-container">
          <h1>هذا النشاط غير متاح الآن.</h1>
          <button className="button" onClick={() => navigate(-1)}>
            رجوع
          </button>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="topic-page" dir="rtl">
        <div className="not-found-container">
          <h1>أحسنت! أنهيت نشاط الحوار لهذا الدرس.</h1>
          <button className="button" onClick={() => navigate(`/topic/${topic.id}`)}>
            العودة إلى الدرس
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="topic-page" dir="rtl">
      <header className="topic-main-header page-header">
        <h1 className="page-title">نشاط الحوار: {topic.title}</h1>
        <p className="page-subtitle">حوار ثنائي منظّم مع زميلك لاستخلاص الأفكار وتبادل الأدوار.</p>
      </header>

      <div className="topic-content-wrapper">
        <div className="vertical-stack">
          {sessionId && role ? (
            <PeerDialogueChat
              topicId={topic.id}
              sessionId={sessionId}
              session={session}
              role={role}
              scenarioText={scenarioText}
            />
          ) : (
            <section className="topic-section card sequential-section">
              <h2 className="section-title">ابدأ الحوار مع زميلك</h2>
              <p className="muted-note">
                ستدخلون غرفة حوار ثنائية، وعند انضمام زميلك ستظهر لكم فكرة الحوار والأدوار. التزم بآداب النقاش وتبادل الأدوار حتى تكتمل المهمة.
              </p>
              {status === "waiting" && (
                <p className="muted-note">بانتظار انضمام طالب آخر...</p>
              )}
              {error && <div className="case-error">{error}</div>}
              <div className="case-actions">
                <button
                  className="button"
                  type="button"
                  onClick={handleStart}
                  disabled={isStarting || status === "waiting"}
                >
                  {isStarting ? "جاري بدء الحوار..." : "ابدأ الحوار"}
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
      <ConfirmationDialog
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirmStart}
        title="Confirm Start"
        message="Are you sure you want to start the peer dialogue? This will match you with another student."
      />
    </div>
  );
}
