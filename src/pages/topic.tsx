import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { topics } from "../data/topics";
import {
  LessonVisibility,
  getLessonProgress,
  markLessonCompleted,
} from "../utils/lessonSettings";
import { supabase } from "../supabaseClient";
import "../styles/Topic.css";
import type { Session } from "@supabase/supabase-js";
import { logAdminNotification } from "../utils/adminNotifications";
import { emitAchievementToast } from "../utils/achievementToast";
import { SkeletonHeader, SkeletonSection } from "../components/SkeletonBlocks";
import {
  SessionTimeTracker,
  autoConfirmTracking,
} from "../utils/enhancedStudentTracking";
import ConfirmationDialog from "../components/ConfirmationDialog";

export default function Topic() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const topic = topics.find((t) => t.id === topicId);
  const topicIds = useMemo(() => topics.map((t) => t.id), []);

  const [lessonVisibility, setLessonVisibility] = useState<LessonVisibility>(() => {
    const defaults: LessonVisibility = {};
    topicIds.forEach((id) => {
      defaults[id] = {
        lesson: true,
        review: true,
        evaluation: false,
        activity: true,
      };
    });
    return defaults;
  });

  const [lessonStarted, setLessonStarted] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isVisibilityLoading, setIsVisibilityLoading] = useState(true);
  const [isActivityLoading, setIsActivityLoading] = useState(true);
  const [isCollaborativeLoading, setIsCollaborativeLoading] = useState(true);
  const [timeTracker, setTimeTracker] = useState<SessionTimeTracker | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const isPageLoading =
    isSessionLoading || isVisibilityLoading || isActivityLoading || isCollaborativeLoading;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsSessionLoading(false);
    });
  }, []);

  useEffect(() => {
    if (session && topicId && lessonStarted) {
      const tracker = new SessionTimeTracker(session.user.id, topicId, 'lesson');
      tracker.startSession();
      setTimeTracker(tracker);

      return () => {
        tracker.endSession();
      };
    }
  }, [session, topicId, lessonStarted]);

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

      // If no teacher ID, use defaults (don't query database)
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

      const updatedVisibility: LessonVisibility = {
        ...lessonVisibility,
      };

      (data || []).forEach((row) => {
        const settings = typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings;
        updatedVisibility[row.topic_id] = {
          lesson: settings?.lesson ?? true,
          review: settings?.review ?? true,
          evaluation: settings?.evaluation ?? false,
          activity: settings?.activity ?? true,
        };
      });

      setLessonVisibility(updatedVisibility);
      setIsVisibilityLoading(false);
    };

    loadLessonVisibilitySettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, topic, topicIds]);

  useEffect(() => {
    setIsActivityLoading(false);
    setIsCollaborativeLoading(false);
  }, []);

  const handleCompleteLesson = async () => {
    if (!topic || !session) return;

    const progress = getLessonProgress(topicIds);
    const wasCompleted = progress[topic.id]?.lessonCompleted ?? false;

    if (wasCompleted) {
      if (timeTracker) {
        await timeTracker.endSession(true);
      }
      navigate(`/lesson-review/${topic.id}`);
      return;
    }

    setIsConfirming(true);

    try {
      // Mark lesson as completed locally
      markLessonCompleted(topicIds, topic.id);

      // Auto-confirm tracking and award points
      await autoConfirmTracking({
        studentId: session.user.id,
        topicId: topic.id,
        trackingType: 'lesson',
        metadata: {
          topicTitle: topic.title,
          timestamp: new Date().toISOString(),
        }
      });

      // Log notification and achievement
      await logAdminNotification({
        recipientId: session.user.id,
        actorId: session.user.id,
        actorRole: "student",
        message: `تم منحك 20 نقطة لإكمال درس "${topic.title}".`,
        category: "points",
      });

      emitAchievementToast({
        title: "تم إكمال الدرس",
        message: "رائع! حصلت على 20 نقطة لإكمال الدرس.",
        points: 20,
        tone: "success",
      });

      // End session
      if (timeTracker) {
        await timeTracker.endSession(true);
      }

      navigate(`/lesson-review/${topic.id}`);
    } catch (error) {
      console.error('Error completing lesson:', error);
    } finally {
      setIsConfirming(false);
    }
  };

  if (!topic) {
    return <div className="topic-page">الموضوع غير متاح.</div>;
  }

  if (isPageLoading) {
    return (
      <div className="topic-page" dir="rtl">
        <header className="topic-main-header page-header">
          <SkeletonHeader titleWidthClass="skeleton-w-40" subtitleWidthClass="skeleton-w-70" />
        </header>
        {topic.lesson.goals && topic.lesson.goals.length > 0 && (
          <section className="card goals-card lesson-entry-card">
            <h2 className="section-title">
              <i className="fas fa-bullseye icon"></i> أهداف الدرس
            </h2>
            <ul className="goals-list  direction-rtl">
              {topic.lesson.goals.map((goal, index) => (
                <li key={index}><span className="goal-number">{index + 1}</span>. <strong>{goal}</strong></li>
              ))}
            </ul>
            <button
              className="button button-primary cta-button"
              onClick={() => {
                document.querySelector('.intro-card')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <i className="fas fa-arrow-down"></i>
              ابدأ الدرس
            </button>
          </section>
        )}
        <div className="topic-content-wrapper">
          <div className="vertical-stack">
            <SkeletonSection lines={3} />
            <SkeletonSection lines={2} gridItems={1} />
          </div>
          <div className="vertical-stack">
            <SkeletonSection lines={3} gridItems={3} />
            <SkeletonSection lines={4} />
          </div>
        </div>
      </div>
    );
  }

  const isLessonActive = lessonVisibility[topic.id]?.lesson ?? false;
  const isReviewActive = lessonVisibility[topic.id]?.review ?? false;
  const isActivityActive = lessonVisibility[topic.id]?.activity ?? false;

  const isDiscussingIssue = topic.id === "discussing-issue";
  const isDialogueText = topic.id === "dialogue-text";

  const hasInteractiveActivity = Boolean(topic.interactiveActivity);

  const tutorialTopicIds = new Set([
    "landscape-description",
    "report-writing",
    "discussing-issue",
    "dialogue-text",
    "free-expression",
  ]);
  const hasTutorial = tutorialTopicIds.has(topic.id);
  const interactiveStartPath = hasTutorial ? `/activity/${topic.id}/tutorial` : `/activity/${topic.id}`;

  const activityStartPath =
    isDiscussingIssue || isDialogueText ? `/activity/${topic.id}` : interactiveStartPath;

  const activityButtonLabel = isDiscussingIssue
    ? "الانضمام إلى المناقشة"
    : isDialogueText
      ? "بدء الحوار الثنائي"
      : topic.interactiveActivity?.title ?? "بدء النشاط";

  if (!isLessonActive) {
    return (
      <div className="topic-page" dir="rtl">
        <div className="not-found-container">
          <h1>هذا الدرس غير متاح حاليًا</h1>
          <p>هذا القسم غير متاح الآن. حاول لاحقًا.</p>
          <button className="button" onClick={() => navigate("/")}>
            العودة إلى قائمة الموضوعات
          </button>
        </div>
      </div>
    );
  }

  if (!topic.lesson.header) {
    return (
      <div className="topic-page" dir="rtl">
        <div className="not-found-container">
          <h1>لا توجد معلومات لهذا الدرس</h1>
          <p>يرجى المحاولة لاحقًا أو التواصل مع المعلم.</p>
          <button className="button" onClick={() => navigate("/")}>
            العودة إلى قائمة الموضوعات
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="topic-page" dir="rtl">
      {/* Confirmation dialog for transitions that might still need it in the future, currently hidden */}
      {false && (
        <ConfirmationDialog
          isOpen={false}
          title=""
          message=""
          onConfirm={() => { }}
          onCancel={() => { }}
        />
      )}
      <header className="topic-main-header page-header">
        <h1 className="page-title">{topic.lesson.header}</h1>
        <p className="page-subtitle">{topic.description}</p>
      </header>

      {!lessonStarted && topic.lesson.goals && topic.lesson.goals.length > 0 ? (
        <section className="card goals-card lesson-entry-card">
          <h2 className="section-title">
            <i className="fas fa-bullseye icon"></i> أهداف الدرس
          </h2>
          <ul className="goals-list">
            {topic.lesson.goals.map((goal, index) => (
              <li key={index}><span className="goal-number">{index + 1}</span>. <strong>{goal}</strong></li>
            ))}
          </ul>
          <button
            className="button button-primary cta-button"
            onClick={() => setLessonStarted(true)}
          >
            <i className="fas fa-arrow-down"></i>
            ابدأ الدرس
          </button>
        </section>
      ) : null}

      {lessonStarted && (
        <div className="topic-content-wrapper">
          <div className="vertical-stack">
            <section className="topic-section card intro-card sequential-section">
              <h2 className="section-title">
                <i className="fas fa-book-open icon"></i> مقدمة الدرس
              </h2>
              <p className="intro-paragraph">{topic.lesson.introduction.tahdid}</p>
              <p className="intro-paragraph">{topic.lesson.introduction.importance}</p>
            </section>

            <section className="topic-section card video-section sequential-section">
              <h2 className="section-title">
                <i className="fas fa-video icon"></i> فيديو توضيحي
              </h2>
              <div className="video-placeholder">
                <i className="fas fa-play-circle"></i>
              </div>
              <p>لا يوجد فيديو مضاف بعد.</p>
            </section>
          </div>

          <div className="vertical-stack">
            <section className="topic-section card sequential-section">
              <h2 className="section-title">
                <i className="fas fa-shoe-prints icon"></i> خطوات الدرس
              </h2>
              <div className="steps-grid">
                {topic.lesson.steps.map((step) => (
                  <div key={step.step} className="step-card">
                    <div className="step-header">
                      <i className={`${step.icon} step-icon`}></i>
                      <span className="step-number">الخطوة {step.step}</span>
                    </div>
                    <h3 className="step-title">{step.title}</h3>
                    <p>{step.description}</p>
                    {step.options && (
                      <ul className="options-list">
                        {step.options.map((option, index) => (
                          <li key={index}>{option}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {(hasInteractiveActivity || isDiscussingIssue || isDialogueText) && (
              <section className="topic-section card sequential-section">
                <h2 className="section-title">
                  <i className="fas fa-play icon"></i> {topic.activities.header}
                </h2>

                <p className="section-description">
                  {isDiscussingIssue
                    ? "هذا النشاط جماعي. شارك بأفكارك مع زملائك في غرفة النقاش."
                    : isDialogueText
                      ? "هذا النشاط شراكة ثنائية. اختر شريكًا وابدأ الحوار النصي."
                      : "ابدأ النشاط وأكمل جميع المراحل."}
                </p>

                {!isActivityActive && <p className="muted-note">قسم الأنشطة غير متاح حاليًا.</p>}

                <div className="activity-cta">
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => navigate(activityStartPath)}
                    disabled={!isActivityActive}
                    aria-disabled={!isActivityActive}
                    title={!isActivityActive ? "النشاط غير متاح حاليًا" : undefined}
                  >
                    <i className="fas fa-play"></i>
                    {activityButtonLabel}
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>
      )}

      {lessonStarted && (
        <div className="page-actions">
          <button
            className="button button-primary cta-button"
            onClick={handleCompleteLesson}
            disabled={!isReviewActive || isConfirming}
            aria-disabled={!isReviewActive || isConfirming}
          >
            <i className="fas fa-arrow-left"></i>
            {isConfirming ? "جاري الحفظ..." : "الانتقال إلى مراجعة الدرس"}
          </button>

          {!isReviewActive && <p className="muted-note">قسم المراجعة غير متاح حاليًا.</p>}
        </div>
      )}
    </div>
  );
}
