import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabaseClient";
import { topics } from "../data/topics";
import { LessonVisibility, buildLessonVisibilityFromRows, getLessonVisibility } from "../utils/lessonSettings";
import CollaborativeChat from "../components/CollaborativeChat";
import { SkeletonHeader, SkeletonSection } from "../components/SkeletonBlocks";
import "../styles/Topic.css";
import { SessionTimeTracker, requestTrackingConfirmation } from "../utils/enhancedStudentTracking";
import ConfirmationDialog from "../components/ConfirmationDialog";

export default function CollaborativeActivity() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const topic = topics.find((t) => t.id === topicId);
  const topicIds = useMemo(() => topics.map((t) => t.id), []);
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isVisibilityLoading, setIsVisibilityLoading] = useState(true);
  const [isCompletionLoading, setIsCompletionLoading] = useState(true);
  const [isCaseLoading, setIsCaseLoading] = useState(true);
  const [hasLoadedCases, setHasLoadedCases] = useState(false);
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const [chatId, setChatId] = useState<number | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [lessonVisibility, setLessonVisibility] = useState<LessonVisibility>(() =>
    getLessonVisibility(topicIds)
  );
  const [isCompleted, setIsCompleted] = useState(false);
  const [caseStats, setCaseStats] = useState<
    Record<
      string,
      { chatId: number; count: number; max: number; isParticipant: boolean }
    >
  >({});
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [sessionTimer, setSessionTimer] = useState<SessionTimeTracker | null>(null);

  const isPageLoading =
    isSessionLoading || isVisibilityLoading || isCompletionLoading || isCaseLoading;

  useEffect(() => {
    const timer = new SessionTimeTracker('collaborative_activity');
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

  useEffect(() => {
    setSelectedCase(null);
    setChatId(null);
    setStartError(null);
  }, [topicId]);

  const isDiscussingIssue = topic?.id === "discussing-issue";
  const discussionCases = useMemo(
    () => topic?.writingPrompts?.list ?? [],
    [topic]
  );

  const defaultCaseCapacity = 6;

  const loadCaseCounts = useCallback(async () => {
    if (!topic || !session || !isDiscussingIssue) return;
    if (!hasLoadedCases) {
      setIsCaseLoading(true);
    }

    const { data, error } = await supabase.rpc("get_case_participant_counts", {
      _topic_id: topic.id,
    });

    if (error) {
      setIsCaseLoading(false);
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
    if (!hasLoadedCases) {
      setIsCaseLoading(false);
      setHasLoadedCases(true);
    }
  }, [hasLoadedCases, isDiscussingIssue, session, topic]);

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

  useEffect(() => {
    const loadCompletion = async () => {
      setIsCompletionLoading(true);
      if (!session || !topic) {
        setIsCompletionLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("collaborative_activity_completions")
        .select("id")
        .eq("student_id", session.user.id)
        .eq("topic_id", topic.id)
        .eq("activity_kind", "discussion")
        .maybeSingle();

      if (error) {
        setIsCompletionLoading(false);
        return;
      }
      setIsCompleted(!!data);
      setIsCompletionLoading(false);
    };

    loadCompletion();
  }, [session, topic]);

  useEffect(() => {
    if (!session || !isDiscussingIssue || chatId) return;
    loadCaseCounts();

    const interval = window.setInterval(loadCaseCounts, 8000);
    return () => window.clearInterval(interval);
  }, [chatId, isDiscussingIssue, loadCaseCounts, session]);

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

  const isActivityActive = lessonVisibility[topic.id]?.activity ?? true;
  if (!isActivityActive) {
    return (
      <div className="topic-page" dir="rtl">
        <div className="not-found-container">
          <h1>هذا النشاط غير متاح الآن</h1>
          <p>قد يكون معلمك عطّل نشاط المناقشة لهذا الدرس مؤقتًا. يمكنك العودة لاحقًا.</p>
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
          <h1>أحسنت! أنهيت نشاط المناقشة لهذا الدرس.</h1>
          <button className="button" onClick={() => navigate(`/topic/${topic.id}`)}>
            العودة إلى الدرس
          </button>
        </div>
      </div>
    );
  }

  const handleConfirmStartDiscussion = useCallback(async () => {
    if (!session || !selectedCase || !topic) return;
    setIsStarting(true);
    setStartError(null);

    const sessionDuration = sessionTimer?.endSession() || 0;

    const { data, error } = await supabase.rpc(
      "start_collaborative_chat_session",
      {
        _topic_id: topic.id,
        _case_title: selectedCase,
      }
    );

    if (error) {
      if (error.message?.includes("case full")) {
        setStartError("هذه المجموعة ممتلئة الآن، اختر مجموعة أخرى.");
      } else {
        setStartError("تعذر بدء نشاط المناقشة. حاول مرة أخرى.");
      }
      setIsStarting(false);
      setShowConfirmation(false);
      return;
    }

    await requestTrackingConfirmation({
        studentId: session.user.id,
        activityType: 'collaborative_activity',
        activityId: 'collaborative_activity',
        confirmed: true,
        sessionDuration,
        dataQualityScore: 100
    });

    setChatId(data as number);
    loadCaseCounts();
    setIsStarting(false);
    setShowConfirmation(false);
  }, [session, selectedCase, topic, sessionTimer, loadCaseCounts]);

  const handleStartDiscussion = () => {
      setShowConfirmation(true);
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
              <i className="fas fa-comments icon"></i> مناقشة جماعية موجّهة
            </h2>
            <p className="muted-note">
              اختر قضية للنقاش وشارك بأفكارك وأدلتك، مع احترام آراء زملائك والالتزام بآداب الحوار وتوجيهات المعلم.
            </p>
          </section>

          {!isDiscussingIssue ? (
            <section className="topic-section card sequential-section">
              <p className="muted-note">هذا الدرس لا يتضمن نشاط مناقشة جماعية.</p>
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
                  اختر قضية للانضمام ثم شارك بأفكارك وأدلتك مع زملائك.
                </p>
                {discussionCases.length === 0 ? (
                  <p className="muted-note">لا توجد قضايا متاحة حاليًا.</p>
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
                    {isStarting ? "جاري بدء المناقشة..." : "ابدأ المناقشة"}
                  </button>
                </div>
              </section>
            )
          ) : (
            <section className="topic-section card sequential-section">
              <p className="muted-note">جاري التحقق من الحساب...</p>
            </section>
          )}
        </div>
      </div>
      <ConfirmationDialog
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirmStartDiscussion}
        title="Confirm Start"
        message="Are you sure you want to start the discussion? This will join you with other students."
      />
    </div>
  );
}
