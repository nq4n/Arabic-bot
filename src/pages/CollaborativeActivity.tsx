import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabaseClient";
import { topics } from "../data/topics";
import { isLessonSectionActive } from "../utils/lessonSettings";
import CollaborativeChat from "../components/CollaborativeChat";
import "../styles/Topic.css";

export default function CollaborativeActivity() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const topic = topics.find((t) => t.id === topicId);
  const topicIds = useMemo(() => topics.map((t) => t.id), []);
  const [session, setSession] = useState<Session | null>(null);
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [chatId, setChatId] = useState<number | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isCollaborativeActive, setIsCollaborativeActive] = useState(true);
  const [isCompleted, setIsCompleted] = useState(false);
  const [caseStats, setCaseStats] = useState<
    Record<
      string,
      { chatId: number; count: number; max: number; isParticipant: boolean }
    >
  >({});

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  useEffect(() => {
    setSelectedCase(null);
    setChatId(null);
    setStartError(null);
  }, [topicId]);

  if (!topic) {
    return <div className="topic-page">الموضوع غير موجود.</div>;
  }

  const isActivityActive = isLessonSectionActive(topicIds, topic.id, "activity");
  const isDiscussingIssue = topic.id === "discussing-issue";
  const discussionCases = useMemo(
    () => topic.writingPrompts?.list ?? [],
    [topic]
  );
  const defaultCaseCapacity = 6;

  const loadCaseCounts = useCallback(async () => {
    if (!topic || !session || !isDiscussingIssue) return;

    const { data, error } = await supabase.rpc("get_case_participant_counts", {
      _topic_id: topic.id,
    });

    if (error) {
      return;
    }

    const nextStats: Record<
      string,
      { chatId: number; count: number; max: number; isParticipant: boolean }
    > = {};

    (data as Array<{
      chat_id: number;
      case_title: string;
      participant_count: number;
      max_students: number;
      is_participant: boolean;
    }>).forEach((item) => {
      nextStats[item.case_title] = {
        chatId: item.chat_id,
        count: item.participant_count,
        max: item.max_students,
        isParticipant: item.is_participant,
      };
    });

    setCaseStats(nextStats);
  }, [isDiscussingIssue, session, topic]);

  useEffect(() => {
    const loadCollaborativeVisibility = async () => {
      if (!session) return;

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
  }, [session, topic.id]);

  useEffect(() => {
    const loadCompletion = async () => {
      if (!session || !topic) return;
      const { data, error } = await supabase
        .from("collaborative_activity_completions")
        .select("id")
        .eq("student_id", session.user.id)
        .eq("topic_id", topic.id)
        .eq("activity_kind", "discussion")
        .maybeSingle();

      if (error) return;
      setIsCompleted(!!data);
    };

    loadCompletion();
  }, [session, topic]);

  useEffect(() => {
    if (!session || !isDiscussingIssue || chatId) return;
    loadCaseCounts();

    const interval = window.setInterval(loadCaseCounts, 8000);
    return () => window.clearInterval(interval);
  }, [chatId, isDiscussingIssue, loadCaseCounts, session]);

  if (!isActivityActive || !isCollaborativeActive) {
    return (
      <div className="topic-page" dir="rtl">
        <div className="not-found-container">
          <h1>نشاط المناقشة غير متاح</h1>
          <p>هذا النشاط غير مفعل حالياً، يرجى العودة لاحقاً.</p>
          <button className="button" onClick={() => navigate(-1)}>
            العودة
          </button>
        </div>
      </div>
    );
  }

  if (isCompleted) {
    return (
      <div className="topic-page" dir="rtl">
        <div className="not-found-container">
          <h1>O¦U. OU,OU+OO­ U+O'OOú OU,U.U+OU,O'Oc.</h1>
          <button className="button" onClick={() => navigate(`/topic/${topic.id}`)}>
            OU,O1U^O_Oc
          </button>
        </div>
      </div>
    );
  }

  const handleStartDiscussion = async () => {
    if (!session || !selectedCase) return;
    setIsStarting(true);
    setStartError(null);

    const { data, error } = await supabase.rpc(
      "start_collaborative_chat_session",
      {
        _topic_id: topic.id,
        _case_title: selectedCase,
      }
    );

    if (error) {
      if (error.message?.includes("case full")) {
        setStartError("وصلت القضية للحد الأقصى من الطلاب.");
      } else {
        setStartError("تعذر بدء جلسة المناقشة.");
      }
      setIsStarting(false);
      return;
    }

    setChatId(data as number);
    loadCaseCounts();
    setIsStarting(false);
  };

  return (
    <div className="topic-page" dir="rtl">
      <header className="topic-main-header">
        <h1>نشاط المناقشة: {topic.title}</h1>
      </header>

      <div className="topic-content-wrapper">
        <div className="vertical-stack">
          <section className="topic-section card sequential-section">
            <h2 className="section-title">
              <i className="fas fa-comments icon"></i> مناقشة القضية
            </h2>
            <p className="muted-note">
              هذا النشاط مخصص لمناقشة قضية مع زملائك وفق آداب الحوار وتوجيهات
              المعلم.
            </p>
          </section>

          {!isDiscussingIssue ? (
            <section className="topic-section card sequential-section">
              <p className="muted-note">
                هذا النشاط غير مرتبط بموضوع مناقشة القضية لهذا الدرس.
              </p>
            </section>
          ) : session ? (
            chatId ? (
              <CollaborativeChat topicId={topic.id} chatId={chatId} session={session} />
            ) : (
              <section className="topic-section card sequential-section">
                <h2 className="section-title">
                  <i className="fas fa-list-check icon"></i> اختر قضية للنقاش
                </h2>
                <p className="muted-note">
                  حدد القضية التي تريد مناقشتها، ثم اضغط على زر بدء المناقشة.
                </p>
                {discussionCases.length === 0 ? (
                  <p className="muted-note">لا توجد قضايا متاحة لهذا الموضوع.</p>
                ) : (
                  <div className="case-picker">
                    {discussionCases.map((caseTitle) => {
                      const stats = caseStats[caseTitle];
                      const count = stats?.count ?? 0;
                      const max = stats?.max ?? defaultCaseCapacity;
                      const isParticipant = stats?.isParticipant ?? false;
                      const isFull = count >= max && !isParticipant;

                      return (
                        <button
                          key={caseTitle}
                          type="button"
                          className={`case-option ${
                            selectedCase === caseTitle ? "is-selected" : ""
                          } ${isFull ? "is-full" : ""}`}
                          onClick={() => setSelectedCase(caseTitle)}
                          disabled={isFull}
                        >
                          <span>{caseTitle}</span>
                          <span className="case-count">
                            {count}/{max}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
                {startError && <div className="case-error">{startError}</div>}
                <div className="case-actions">
                  <button
                    className="button"
                    type="button"
                    onClick={handleStartDiscussion}
                    disabled={
                      !selectedCase ||
                      isStarting ||
                      ((caseStats[selectedCase]?.count ?? 0) >=
                        (caseStats[selectedCase]?.max ?? defaultCaseCapacity) &&
                        !(caseStats[selectedCase]?.isParticipant ?? false))
                    }
                  >
                    {isStarting ? "جارٍ بدء النقاش..." : "ابدأ المناقشة"}
                  </button>
                </div>
              </section>
            )
          ) : (
            <section className="topic-section card sequential-section">
              <p className="muted-note">جار تحميل بيانات الحساب...</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
