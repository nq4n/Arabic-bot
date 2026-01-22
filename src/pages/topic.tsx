import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Activity, topics } from "../data/topics";
import {
  LessonVisibility,
  buildLessonVisibilityFromRows,
  getLessonProgress,
  getLessonVisibility,
  markLessonCompleted,
} from "../utils/lessonSettings";
import { supabase } from "../supabaseClient";
import "../styles/Topic.css";
import type { Session } from "@supabase/supabase-js";
import { logAdminNotification } from "../utils/adminNotifications";
import { emitAchievementToast } from "../utils/achievementToast";
import { trackActivitySubmission, trackLessonCompletion } from "../utils/studentTracking";
import { SkeletonHeader, SkeletonSection } from "../components/SkeletonBlocks";

export default function Topic() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const topic = topics.find((t) => t.id === topicId);
  const topicIds = useMemo(() => topics.map((t) => t.id), []);
  const [lessonVisibility, setLessonVisibility] = useState<LessonVisibility>(() =>
    getLessonVisibility(topicIds)
  );
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [activityResponse, setActivityResponse] = useState("");
  const [activitySubmissions, setActivitySubmissions] = useState<
    Record<number, { id: number; response_text: string | null; status: string }>
  >({});
  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isVisibilityLoading, setIsVisibilityLoading] = useState(true);
  const [isActivityLoading, setIsActivityLoading] = useState(true);
  const [isCollaborativeLoading, setIsCollaborativeLoading] = useState(true);
  const [activityError, setActivityError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [collaborativeCompletion, setCollaborativeCompletion] = useState({
    discussion: false,
    dialogue: false,
  });
  const isPageLoading =
    isSessionLoading || isVisibilityLoading || isActivityLoading || isCollaborativeLoading;
  const completedActivities = useMemo(
    () =>
      Object.entries(activitySubmissions)
        .filter(([, submission]) => submission?.status === "submitted")
        .map(([activityId]) => Number(activityId)),
    [activitySubmissions]
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsSessionLoading(false);
    });
  }, []);

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
    const fetchActivitySubmissions = async () => {
      setIsActivityLoading(true);
      if (!session || !topic) {
        setIsActivityLoading(false);
        return;
      }
      setActivityError(null);
      const { data, error } = await supabase
        .from("activity_submissions")
        .select("id, activity_id, response_text, status")
        .eq("student_id", session.user.id)
        .eq("topic_id", topic.id);

      if (error) {
        setActivityError("تعذر تحميل تسليمات الأنشطة.");
        setIsActivityLoading(false);
        return;
      }

      const mapped = (data || []).reduce<
        Record<number, { id: number; response_text: string | null; status: string }>
      >((acc, item) => {
        acc[item.activity_id] = {
          id: item.id,
          response_text: item.response_text,
          status: item.status,
        };
        return acc;
      }, {});
      setActivitySubmissions(mapped);
      setIsActivityLoading(false);
    };

    fetchActivitySubmissions();
  }, [session, topic]);

  useEffect(() => {
    const fetchCollaborativeCompletion = async () => {
      setIsCollaborativeLoading(true);
      if (!session || !topic) {
        setIsCollaborativeLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from("collaborative_activity_completions")
        .select("activity_kind")
        .eq("student_id", session.user.id)
        .eq("topic_id", topic.id);

      if (error) {
        setIsCollaborativeLoading(false);
        return;
      }

      const next = { discussion: false, dialogue: false };
      (data || []).forEach((row) => {
        if (row.activity_kind === "discussion") next.discussion = true;
        if (row.activity_kind === "dialogue") next.dialogue = true;
      });
      setCollaborativeCompletion(next);
      setIsCollaborativeLoading(false);
    };

    fetchCollaborativeCompletion();
  }, [session, topic]);

  if (!topic) {
    return <div className="topic-page">الموضوع غير متاح.</div>;
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
  const isCollaborativeActive = lessonVisibility[topic.id]?.collaborative ?? false;
  const activityCount = topic.activities.list.length;
  const completedActivityItems = topic.activities.list.filter((activity) =>
    completedActivities.includes(activity.activity)
  );
  const isDiscussingIssue = topic.id === "discussing-issue";
  const isDialogueText = topic.id === "dialogue-text";
  const hasInteractiveActivity = Boolean(topic.interactiveActivity);
  const interactiveActivityId = topic.interactiveActivity?.activityId ?? 0;
  const interactiveSubmission =
    interactiveActivityId > 0
      ? activitySubmissions[interactiveActivityId]
      : null;
  const interactiveTitle = topic.interactiveActivity?.title ?? "نشاط تفاعلي";
  const tutorialTopicIds = new Set([
    "landscape-description",
    "report-writing",
    "discussing-issue",
    "dialogue-text",
    "free-expression",
  ]);
  const hasTutorial = tutorialTopicIds.has(topic.id);
  const interactiveStartPath = hasTutorial
    ? `/activity/${topic.id}/tutorial`
    : `/activity/${topic.id}`;

  const openActivityModal = (activity: Activity) => {
    setSelectedActivity(activity);
    setActivityResponse(activitySubmissions[activity.activity]?.response_text || "");
  };

  const closeActivityModal = () => {
    setSelectedActivity(null);
    setActivityResponse("");
  };

  const handleSubmitActivity = async () => {
    if (!selectedActivity || !session || !topic) return;
    if (!activityResponse.trim()) {
      setActivityError("يرجى كتابة إجابة قبل إرسال النشاط.");
      return;
    }

    setIsSubmitting(true);
    setActivityError(null);
    const hadSubmission = Boolean(activitySubmissions[selectedActivity.activity]);
    const { data, error } = await supabase
      .from("activity_submissions")
      .upsert(
        {
          student_id: session.user.id,
          topic_id: topic.id,
          activity_id: selectedActivity.activity,
          response_text: activityResponse,
          status: "submitted",
        },
        { onConflict: "student_id,topic_id,activity_id" }
      )
      .select("id, activity_id, response_text, status")
      .single();

    if (error) {
      setActivityError("حدث خطأ أثناء حفظ الإجابة.");
    } else if (data) {
      setActivitySubmissions((prev) => ({
        ...prev,
        [data.activity_id]: {
          id: data.id,
          response_text: data.response_text,
          status: data.status,
        },
      }));
      if (!hadSubmission) {
        await logAdminNotification({
          recipientId: session.user.id,
          actorId: session.user.id,
          actorRole: "student",
          message: `تم منحك 5 نقاط لإكمال نشاط: ${selectedActivity.description}.`,
          category: "points",
        });
        await trackActivitySubmission(
          session.user.id,
          topic.id,
          selectedActivity.activity
        );
        emitAchievementToast({
          title: "تم احتساب النقاط",
          message: "تمت إضافة 5 نقاط إلى رصيدك.",
          points: 5,
          tone: "success",
        });
      } else {
        emitAchievementToast({
          title: "تم تحديث الإجابة",
          message: "تم حفظ إجابتك على النشاط.",
          tone: "info",
        });
      }
      closeActivityModal();
    }
    setIsSubmitting(false);
  };

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
      <header className="topic-main-header page-header">
        <h1 className="page-title">{topic.lesson.header}</h1>
        <p className="page-subtitle">{topic.description}</p>
      </header>

      <div className="topic-content-wrapper">
        <div className="vertical-stack">
          {topic.lesson.goals && topic.lesson.goals.length > 0 && (
            <section className="topic-section card goals-card sequential-section">
              <h2 className="section-title">
                <i className="fas fa-bullseye icon"></i> أهداف الدرس
              </h2>
              <ul className="goals-list">
                {topic.lesson.goals.map((goal, index) => (
                  <li key={index}>{goal}</li>
                ))}
              </ul>
            </section>
          )}
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

          {isActivityActive && !isDiscussingIssue && !isDialogueText && (
            <section className="topic-section card sequential-section">
              <h2 className="section-title">
                <i className="fas fa-pencil-ruler icon"></i> {topic.activities.header}
              </h2>
              {activityError && <p className="error-message">{activityError}</p>}
              {!hasInteractiveActivity ? (
                <>
                  <div className="activity-progress">
                    <span>عدد الأنشطة المكتملة</span>
                    <span>
                      {completedActivities.length}/{activityCount}
                    </span>
                  </div>
                  <div className="activity-completed-panel">
                    <h3>الأنشطة المكتملة</h3>
                    {completedActivityItems.length === 0 ? (
                      <p className="muted-note">لا توجد أنشطة مكتملة حتى الآن.</p>
                    ) : (
                      <ul>
                        {completedActivityItems.map((activity) => (
                          <li key={activity.activity}>
                            <i className={`${activity.icon} activity-icon`}></i>
                            {activity.description}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <ul className="activities-list">
                    {topic.activities.list.map((activity) => (
                      <li key={activity.activity}>
                        <label className="activity-item">
                          <input
                            type="checkbox"
                            checked={completedActivities.includes(activity.activity)}
                            onChange={() => openActivityModal(activity)}
                          />
                          <span className="activity-text">
                            <i className={`${activity.icon} activity-icon`}></i>
                            {activity.description}
                          </span>
                        </label>
                        <button
                          type="button"
                          className="button button-compact"
                          onClick={() => openActivityModal(activity)}
                        >
                          إجابة النشاط
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <div className="activity-cta">
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={() => navigate(interactiveStartPath)}
                  >
                    {interactiveTitle}
                  </button>
                  {interactiveSubmission?.status === "submitted" && (
                    <p className="muted-note">تم تسليم {interactiveTitle}.</p>
                  )}
                  <p className="muted-note">
                    يمكنك مراجعة النشاط أو العودة إليه عند الحاجة.
                  </p>
                </div>
              )}
            </section>
          )}
          {isActivityActive && isCollaborativeActive && (isDiscussingIssue || isDialogueText) && (
            <section className="topic-section card sequential-section">
              <h2 className="section-title">
                <i className={isDiscussingIssue ? "fas fa-comments icon" : "fas fa-user-friends icon"}></i>{" "}
                {topic.activities.header}
              </h2>
              <p className="muted-note">
                {isDiscussingIssue
                  ? "هذا النشاط جماعي. شارك بأفكارك مع زملائك في غرفة النقاش."
                  : "هذا النشاط شراكة ثنائية. اختر شريكًا وابدأ الحوار النصي."}
              </p>
              <div className="activity-cta">
                <button
                  type="button"
                  className="button button-primary"
                  onClick={() => navigate(`/activity/${topic.id}`)}
                  disabled={
                    isDiscussingIssue
                      ? collaborativeCompletion.discussion
                      : collaborativeCompletion.dialogue
                  }
                >
                  {isDiscussingIssue ? "الانضمام إلى المناقشة" : "بدء الحوار الثنائي"}
                </button>
                {((isDiscussingIssue && collaborativeCompletion.discussion) ||
                  (isDialogueText && collaborativeCompletion.dialogue)) && (
                    <p className="muted-note">
                      تم إنهاء النشاط التعاوني مسبقًا.
                    </p>
                  )}
              </div>
            </section>
          )}
        </div>
      </div>

      <div className="page-actions">
        <button
          className="button button-primary cta-button"
          onClick={async () => {
            const progress = getLessonProgress(topicIds);
            const wasCompleted = progress[topic.id]?.lessonCompleted ?? false;
            markLessonCompleted(topicIds, topic.id);
            if (session && !wasCompleted) {
              logAdminNotification({
                recipientId: session.user.id,
                actorId: session.user.id,
                actorRole: "student",
                message: `تم منحك 20 نقطة لإكمال درس "${topic.title}".`,
                category: "points",
              });
              await trackLessonCompletion(session.user.id, topic.id);
              emitAchievementToast({
                title: "تم إكمال الدرس",
                message: "رائع! حصلت على 20 نقطة لإكمال الدرس.",
                points: 20,
                tone: "success",
              });
            }
            navigate(`/lesson-review/${topic.id}`);
          }}
          disabled={!isReviewActive}
          aria-disabled={!isReviewActive}
        >
          <i className="fas fa-arrow-left"></i>
          الانتقال إلى مراجعة الدرس
        </button>
        {!isReviewActive && (
          <p className="muted-note">قسم المراجعة غير متاح حاليًا.</p>
        )}
      </div>
      {selectedActivity && (
        <div className="activity-modal-backdrop">
          <div className="activity-modal card">
            <div className="activity-modal-header">
              <h3>إجابة النشاط</h3>
              <button type="button" className="button button-compact" onClick={closeActivityModal}>
                إغلاق
              </button>
            </div>
            <p className="activity-modal-description">{selectedActivity.description}</p>
            <label className="activity-modal-label" htmlFor="activity-response">
              اكتب إجابتك على سؤال النشاط هنا:
            </label>
            <textarea
              id="activity-response"
              value={activityResponse}
              onChange={(event) => setActivityResponse(event.target.value)}
              rows={5}
              placeholder="اكتب إجابتك هنا..."
            />
            <div className="activity-modal-actions">
              <button
                type="button"
                className="button"
                onClick={handleSubmitActivity}
                disabled={isSubmitting}
              >
                {isSubmitting ? "جاري الإرسال..." : "إرسال الإجابة"}
              </button>
              {activitySubmissions[selectedActivity.activity]?.status === "submitted" && (
                <span className="activity-status">تم الإرسال</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
