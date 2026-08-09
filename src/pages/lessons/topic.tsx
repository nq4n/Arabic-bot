import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { topics } from "../../data/topics";
import {
  LessonVisibility,
  getLessonProgress,
  markLessonCompleted,
  isSectionActive,
} from "../../utils/lessonSettings";
import { supabase } from "../../supabaseClient";
import "../../styles/Topic.css";
import type { Session } from "@supabase/supabase-js";
import { logAdminNotification } from "../../utils/adminNotifications";
import { emitAchievementToast } from "../../utils/achievementToast";
import { SkeletonHeader, SkeletonSection } from "../../components/SkeletonBlocks";
import {
  SessionTimeTracker,
  autoConfirmTracking,
} from "../../utils/enhancedStudentTracking";
import ConfirmationDialog from "../../components/ConfirmationDialog";

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
        video: true,
        review: true,
        evaluation: false,
        activity: true,
      };
    });
    return defaults;
  });

  const [lessonStarted] = useState(true);
  const [activeSection, setActiveSection] = useState("goals");
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
        .maybeSingle();

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
          video: settings?.video ?? true,
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
            <div className="skeleton-list">
              <div className="skeleton skeleton-line skeleton-w-50" />
              <div className="skeleton skeleton-line skeleton-w-80" />
              <div className="skeleton skeleton-line skeleton-w-70" />
            </div>
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

  const isLessonActive = isSectionActive(lessonVisibility, topic.id, "lesson", false);
  const isVideoActive = isSectionActive(lessonVisibility, topic.id, "video", true);
  const isReviewActive = isSectionActive(lessonVisibility, topic.id, "review", false);
  const isActivityActive = isSectionActive(lessonVisibility, topic.id, "activity", false);

  const isDiscussingIssue = topic.id === "discussing-issue";
  const isDialogueText = topic.id === "dialogue-text";

  const hasInteractiveActivity = Boolean(topic.interactiveActivity);

  const activityItems = topic.activities?.list ?? [];
  const hasActivityItems = activityItems.length > 0;

  const hasActivityContent =
    hasActivityItems || hasInteractiveActivity || isDiscussingIssue || isDialogueText;

  const sections: { id: string; label: string; icon: string; available: boolean }[] = [
    {
      id: "goals",
      label: "أهداف الدرس",
      icon: "fas fa-bullseye",
      available: Boolean(topic.lesson.goals && topic.lesson.goals.length > 0),
    },
    { id: "intro", label: "مقدمة الدرس", icon: "fas fa-book-open", available: true },
    { id: "steps", label: "خطوات الدرس", icon: "fas fa-shoe-prints", available: true },
    { id: "video", label: "فيديو توضيحي", icon: "fas fa-video", available: isVideoActive },
    {
      id: "activity",
      label: topic.activities.header,
      icon: "fas fa-play",
      available: hasActivityContent,
    },
  ];

  const visibleSections = sections.filter((section) => section.available);

  // Fallback: if the current active section isn't available (e.g. topic has no goals),
  // render the first available section instead.
  const effectiveSection = visibleSections.some((section) => section.id === activeSection)
    ? activeSection
    : (visibleSections[0]?.id ?? "intro");

  const goTo = (sectionId: string) => {
    if (visibleSections.some((section) => section.id === sectionId)) {
      setActiveSection(sectionId);
    }
  };

  const goNext = () => {
    const index = visibleSections.findIndex((section) => section.id === effectiveSection);
    if (index < visibleSections.length - 1) {
      setActiveSection(visibleSections[index + 1].id);
    }
  };

  const goPrev = () => {
    const index = visibleSections.findIndex((section) => section.id === effectiveSection);
    if (index > 0) {
      setActiveSection(visibleSections[index - 1].id);
    }
  };

  const activityStartPath = `/activity/${topic.id}/tutorial`;

  const activityButtonLabel = isDiscussingIssue
    ? "فتح صفحة المناقشة"
    : isDialogueText
      ? "فتح صفحة الحوار"
      : "فتح صفحة النشاط";

  if (!isLessonActive) {
    return (
      <div className="topic-page" dir="rtl">
        <div className="not-found-container">
          <h1>هذا الدرس غير متاح حاليًا</h1>
          <p>هذا القسم غير متاح الآن. حاول لاحقًا.</p>
          <button className="button" onClick={() => navigate("/")}> العودة إلى قائمة الموضوعات </button>
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
          <button className="button" onClick={() => navigate("/")}> العودة إلى قائمة الموضوعات </button>
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

{lessonStarted && (
        <div className="topic-stepper">
          <nav className="topic-stepper-nav" aria-label="أقسام الدرس">
            {visibleSections.map((section, index) => (
              <button
                key={section.id}
                type="button"
                className={`topic-stepper-btn ${effectiveSection === section.id ? "is-active" : ""}`}
                onClick={() => goTo(section.id)}
                aria-current={effectiveSection === section.id}
              >
                <span className="topic-stepper-badge">{index + 1}</span>
                <i className={section.icon}></i>
                <span className="topic-stepper-label">{section.label}</span>
              </button>
            ))}
          </nav>

          <div className="topic-stepper-content">
            {effectiveSection === "goals" && (
              <section className="card topic-section">
                <h2 className="section-title">
                  <i className="fas fa-bullseye icon"></i> أهداف الدرس
                </h2>
                <p className="goals-intro">في نهاية الدرس يُتوقَّع من الطالب أن يكون قادراً على أن:</p>
                <ul className="goals-list">
                  {topic.lesson.goals?.map((goal, index) => (
                    <li key={index}><span className="goal-number">{index + 1}</span>. <strong>{goal}</strong></li>
                  ))}
                </ul>
              </section>
            )}

            {effectiveSection === "intro" && (
              <section className="card topic-section">
                <h2 className="section-title">
                  <i className="fas fa-book-open icon"></i> مقدمة الدرس
                </h2>
                <p className="intro-paragraph">{topic.lesson.introduction.tahdid}</p>
                <p className="intro-paragraph">{topic.lesson.introduction.importance}</p>
              </section>
            )}

            {effectiveSection === "steps" && (
              <section className="card topic-section">
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
            )}

            {effectiveSection === "video" && (
              <section className="card topic-section video-section">
                <h2 className="section-title">
                  <i className="fas fa-video icon"></i> فيديو توضيحي
                </h2>
                {topic.lesson.videoUrl ? (
                  <div className="video-wrapper" style={{ width: '100%', marginBottom: '1rem' }}>
                    <iframe
                      src={topic.lesson.videoUrl}
                      title="فيديو الدرس"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture;"
                      allowFullScreen
                      style={{ width: '100%', aspectRatio: '16/9', borderRadius: '8px', border: 0 }}
                    ></iframe>
                  </div>
                ) : (
                  <>
                    <div className="video-placeholder">
                      <i className="fas fa-play-circle"></i>
                    </div>
                    <p>لا يوجد فيديو مضاف بعد.</p>
                  </>
                )}
              </section>
            )}

            {effectiveSection === "activity" && (
              <section className="card topic-section">
                <h2 className="section-title">
                  <i className="fas fa-play icon"></i> النشاط التطبيقي
                </h2>

                <p className="section-description">
                  {isDiscussingIssue
                    ? "هذا النشاط جماعي. شارك بأفكارك مع زملائك في غرفة النقاش."
                    : isDialogueText
                      ? "هذا النشاط شراكة ثنائية. اختر شريكًا وابدأ الحوار النصي."
                      : "ابدأ النشاط وأكمل جميع المراحل."}
                </p>

                {hasActivityItems && (
                  <ul className="activities-list lesson-activities-list">
                    {activityItems.map((activity) => (
                      <li key={`${topic.id}-activity-${activity.activity}`}>
                        <div className="activity-item lesson-activity-item">
                          <div className="activity-item-header">
                            <span className="activity-number">{activity.activity}</span>
                            <i className={`${activity.icon} activity-icon`} aria-hidden="true"></i>
                            <div>
                              {activity.title && (
                                <h3 className="activity-title">{activity.title}</h3>
                              )}
                              <p className="activity-text">{activity.description}</p>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {!isActivityActive && <p className="muted-note">قسم الأنشطة غير متاح حاليًا.</p>}

                {hasActivityContent && (
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
                )}
              </section>
            )}
          </div>

          <div className="topic-stepper-controls">
            <button
              type="button"
              className="button button-secondary"
              onClick={goPrev}
              disabled={effectiveSection === visibleSections[0]?.id}
              aria-disabled={effectiveSection === visibleSections[0]?.id}
            >
              <i className="fas fa-arrow-right"></i>
              السابق
            </button>
            <button
              type="button"
              className="button button-primary cta-button"
              onClick={goNext}
              disabled={effectiveSection === visibleSections[visibleSections.length - 1]?.id}
              aria-disabled={effectiveSection === visibleSections[visibleSections.length - 1]?.id}
            >
              التالي
              <i className="fas fa-arrow-left"></i>
            </button>
          </div>

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
        </div>
      )}
    </div>
  );
}

