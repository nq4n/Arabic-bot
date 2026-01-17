import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabaseClient";
import { topics } from "../data/topics";
import { isLessonSectionActive } from "../utils/lessonSettings";
import PeerDialogueChat from "../components/PeerDialogueChat";
import "../styles/Topic.css";

export default function PeerDialogueActivity() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const topic = topics.find((t) => t.id === topicId);
  const topicIds = useMemo(() => topics.map((t) => t.id), []);
  const [session, setSession] = useState<Session | null>(null);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [scenarioText, setScenarioText] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "waiting" | "matched">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isCollaborativeActive, setIsCollaborativeActive] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  const isActivityActive = topic
    ? isLessonSectionActive(topicIds, topic.id, "activity")
    : false;

  useEffect(() => {
    const loadCollaborativeVisibility = async () => {
      if (!session || !topic) return;

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, added_by_teacher_id")
        .eq("id", session.user.id)
        .single();

      if (profileError) {
        setIsCollaborativeActive(true);
        return;
      }

      const teacherId =
        profile?.role === "teacher" || profile?.role === "admin"
          ? session.user.id
          : profile?.added_by_teacher_id;

      if (!teacherId) {
        setIsCollaborativeActive(true);
        return;
      }

      const { data, error } = await supabase
        .from("lesson_section_visibility")
        .select("is_enabled")
        .eq("teacher_id", teacherId)
        .eq("topic_id", topic.id)
        .eq("section", "collaborative")
        .limit(1);

      if (error) {
        setIsCollaborativeActive(true);
        return;
      }

      setIsCollaborativeActive(data?.[0]?.is_enabled ?? true);
    };

    loadCollaborativeVisibility();
  }, [session, topic]);

  const loadCompletion = useCallback(async () => {
    if (!session || !topic) return;
    const { data, error: completionError } = await supabase
      .from("collaborative_activity_completions")
      .select("id")
      .eq("student_id", session.user.id)
      .eq("topic_id", topic.id)
      .eq("activity_kind", "dialogue")
      .maybeSingle();

    if (completionError) return;
    setIsCompleted(!!data);
  }, [session, topic]);

  useEffect(() => {
    loadCompletion();
  }, [loadCompletion]);

  const loadExistingSession = useCallback(async () => {
    if (!session || !topic) return;
    const { data, error: sessionError } = await supabase.rpc(
      "get_dialogue_peer_session",
      { _topic_id: topic.id }
    );

    if (sessionError) {
      return;
    }

    const payload = Array.isArray(data) ? data[0] : data;
    if (payload?.session_id) {
      setSessionId(payload.session_id);
      setRole(payload.role ?? null);
      setScenarioText(payload.scenario_text ?? null);
      setStatus("matched");
    }
  }, [session, topic]);

  useEffect(() => {
    loadExistingSession();
  }, [loadExistingSession]);

  const handleStart = async () => {
    if (!session || !topic) return;
    setIsStarting(true);
    setError(null);

    const { data, error: startError } = await supabase.rpc(
      "start_dialogue_peer_session",
      { _topic_id: topic.id }
    );

    if (startError) {
      setError("تعذر بدء الحوار.");
      setIsStarting(false);
      return;
    }

    const payload = Array.isArray(data) ? data[0] : data;
    if (!payload) {
      setError("تعذر بدء الحوار.");
      setIsStarting(false);
      return;
    }

    setSessionId(payload.session_id ?? null);
    setRole(payload.role ?? null);
    setScenarioText(payload.scenario_text ?? null);
    setStatus(payload.session_id ? "matched" : "waiting");
    setIsStarting(false);
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
    return <div className="topic-page">الموضوع غير متوفر.</div>;
  }

  if (!session) {
    return (
      <div className="topic-page" dir="rtl">
        <div className="not-found-container">
          <h1>جاري تحميل الجلسة...</h1>
        </div>
      </div>
    );
  }

  if (!isActivityActive || !isCollaborativeActive) {
    return (
      <div className="topic-page" dir="rtl">
        <div className="not-found-container">
          <h1>النشاط غير متاح.</h1>
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
          <h1>تم إنهاء نشاط الحوار.</h1>
          <button className="button" onClick={() => navigate(`/topic/${topic.id}`)}>
            العودة إلى الدرس
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="topic-page" dir="rtl">
      <header className="topic-main-header">
        <h1>حوار زميل: {topic.title}</h1>
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
              <h2 className="section-title">ابدأ الحوار مع زميل</h2>
              <p className="muted-note">
                سيتم اختيار زميل وسيناريو بشكل عشوائي عند البدء.
              </p>
              {status === "waiting" && (
                <p className="muted-note">بانتظار طالب آخر...</p>
              )}
              {error && <div className="case-error">{error}</div>}
              <div className="case-actions">
                <button
                  className="button"
                  type="button"
                  onClick={handleStart}
                  disabled={isStarting || status === "waiting"}
                >
                  {isStarting ? "جاري البدء..." : "بدء الحوار"}
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
