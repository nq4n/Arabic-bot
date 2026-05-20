import { useEffect, useMemo, useState, type DragEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../supabaseClient";
import { topics } from "../../data/topics";
import { summarizationInteractiveActivity } from "../../data/semester2Activities/summarizationActivity";
import {
  LessonVisibility,
  buildLessonVisibilityFromRows,
  getLessonVisibility,
} from "../../utils/lessonSettings";
import { logAdminNotification } from "../../utils/adminNotifications";
import { emitAchievementToast } from "../../utils/achievementToast";
import { SkeletonHeader, SkeletonSection } from "../../components/SkeletonBlocks";
import {
  SessionTimeTracker,
  confirmTracking,
  executeTracking,
  TrackingPayload,
} from "../../utils/enhancedStudentTracking";
import ConfirmationDialog from "../../components/ConfirmationDialog";
import "../../styles/ReportAssemblyActivity.css";

type ActivitySubmissionRow = {
  id: number;
  response_text: string | null;
  status: string | null;
};

const quickSteps = [
  "اقرأ النص وحدد فكرته الأساسية.",
  "اختر التلخيص الذي يحذف الزائد ويحافظ على المعنى.",
  "اجمع اختياراتك ثم أعد صياغتها بأسلوبك.",
];

export default function SummarizationActivity() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const topic = topics.find((item) => item.id === topicId);
  const topicIds = useMemo(() => topics.map((item) => item.id), []);
  const activity = summarizationInteractiveActivity;
  const scenes = activity.scenes;

  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isVisibilityLoading, setIsVisibilityLoading] = useState(true);
  const [isSubmissionLoading, setIsSubmissionLoading] = useState(true);
  const [lessonVisibility, setLessonVisibility] = useState<LessonVisibility>(() =>
    getLessonVisibility(topicIds)
  );
  const [sceneIndex, setSceneIndex] = useState(0);
  const [sceneSelections, setSceneSelections] = useState<number[]>(
    Array(scenes.length).fill(-1)
  );
  const [summaryText, setSummaryText] = useState("");
  const [submission, setSubmission] = useState<ActivitySubmissionRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(activity.timeLimitSeconds ?? null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [timeTracker, setTimeTracker] = useState<SessionTimeTracker | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsSessionLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!session || !topicId) return;

    const tracker = new SessionTimeTracker(session.user.id, topicId, "activity");
    tracker.startSession();
    setTimeTracker(tracker);

    return () => {
      tracker.endSession();
    };
  }, [session, topicId]);

  useEffect(() => {
    const limit = activity.timeLimitSeconds;
    if (!limit) {
      setTimeLeft(null);
      return;
    }

    setTimeLeft(limit);
    const timerId = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return prev;
        return prev > 0 ? prev - 1 : 0;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [activity.timeLimitSeconds, sceneIndex]);

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

      if (!teacherId) {
        setIsVisibilityLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("lesson_visibility_settings")
        .select("topic_id, settings")
        .eq("teacher_id", teacherId);

      if (!error) {
        setLessonVisibility(buildLessonVisibilityFromRows(topicIds, data || []));
      }

      setIsVisibilityLoading(false);
    };

    loadLessonVisibilitySettings();
  }, [session, topic, topicIds]);

  useEffect(() => {
    const loadSubmission = async () => {
      setIsSubmissionLoading(true);
      if (!session || !topic) {
        setIsSubmissionLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("activity_submissions")
        .select("id, response_text, status")
        .eq("student_id", session.user.id)
        .eq("topic_id", topic.id)
        .eq("activity_id", activity.activityId)
        .maybeSingle();

      if (!error && data) {
        setSubmission(data as ActivitySubmissionRow);
        setSummaryText(data.response_text ?? "");
      }

      setIsSubmissionLoading(false);
    };

    loadSubmission();
  }, [session, topic, activity.activityId]);

  const activeScene = scenes[sceneIndex];
  const selectedOptionText =
    activeScene && sceneSelections[sceneIndex] >= 0
      ? activeScene.options[sceneSelections[sceneIndex]]
      : null;
  const selectionCount = sceneSelections.filter((index) => index >= 0).length;
  const hasAllSelections =
    scenes.length > 0 && sceneSelections.every((index) => index >= 0);
  const selectionPercent =
    scenes.length > 0 ? Math.round((selectionCount / scenes.length) * 100) : 0;
  const isSubmitted = submission?.status === "submitted";
  const isPageLoading = isSessionLoading || isVisibilityLoading || isSubmissionLoading;

  const selectionDraft = useMemo(
    () =>
      scenes
        .map((scene, index) => {
          const selectedIndex = sceneSelections[index];
          return selectedIndex >= 0 ? scene.options[selectedIndex] : null;
        })
        .filter((segment): segment is string => Boolean(segment))
        .join("\n\n"),
    [sceneSelections, scenes]
  );

  const formatTime = (value: number | null) => {
    if (value === null) return null;
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleSelectSceneOption = (optionIndex: number) => {
    setSceneSelections((prev) => {
      const next = [...prev];
      next[sceneIndex] = optionIndex;
      return next;
    });
    setError(null);
    setNotice(null);
  };

  const handleOptionDragStart =
    (optionIndex: number) => (event: DragEvent<HTMLLabelElement>) => {
      event.dataTransfer.setData("text/plain", optionIndex.toString());
      event.dataTransfer.effectAllowed = "move";
    };

  const handleDragOverImage = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDropOnImage = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const optionIndex = Number.parseInt(event.dataTransfer.getData("text/plain"), 10);
    if (!Number.isNaN(optionIndex)) {
      handleSelectSceneOption(optionIndex);
    }
    setIsDragOver(false);
  };

  const handleGenerateDraft = () => {
    if (!hasAllSelections) {
      setError("يرجى اختيار أفضل تلخيص لكل نص قبل إنشاء المسودة.");
      return;
    }

    setSummaryText(selectionDraft);
    setError(null);
    setNotice("تم إنشاء مسودة التلخيص. أعد صياغتها بأسلوبك قبل الإرسال.");
  };

  const handleConfirmSubmit = async () => {
    if (!session || !topic) return;
    if (!summaryText.trim()) {
      setError("يرجى كتابة التلخيص قبل الإرسال.");
      setIsConfirmationOpen(false);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setNotice(null);
    const hadSubmission = submission?.status === "submitted";

    try {
      const payload: TrackingPayload = {
        studentId: session.user.id,
        topicId: topic.id,
        trackingType: "activity",
        activityId: activity.activityId,
        metadata: {
          activityTitle: activity.title,
          timestamp: new Date().toISOString(),
        },
      };

      const { data: confirmData, error: confirmError } = await supabase
        .from("tracking_confirmations")
        .insert({
          student_id: payload.studentId,
          tracking_type: payload.trackingType,
          topic_id: payload.topicId,
          activity_id: payload.activityId,
          is_confirmed: false,
          data_quality_score: 100,
          validation_status: "valid",
          confirmation_data: payload.metadata || {},
        })
        .select("id")
        .maybeSingle();

      if (confirmError || !confirmData) {
        console.error("Failed to create tracking confirmation:", confirmError);
      }

      const { data, error } = await supabase
        .from("activity_submissions")
        .upsert(
          {
            student_id: session.user.id,
            topic_id: topic.id,
            activity_id: activity.activityId,
            response_text: summaryText,
            status: "submitted",
          },
          { onConflict: "student_id,topic_id,activity_id" }
        )
        .select("id, response_text, status")
        .maybeSingle();

      if (error) {
        setError("تعذر حفظ التلخيص. حاول مرة أخرى.");
        return;
      }

      setSubmission(data as ActivitySubmissionRow);
      setNotice("تم حفظ التلخيص بنجاح.");

      if (!hadSubmission) {
        await executeTracking({
          studentId: session.user.id,
          topicId: topic.id,
          trackingType: "activity",
          activityId: activity.activityId,
        });

        if (confirmData) {
          await confirmTracking(confirmData.id, async () => {});
        }

        await logAdminNotification({
          recipientId: session.user.id,
          actorId: session.user.id,
          actorRole: "student",
          message: `تم منحك 10 نقاط لإكمال نشاط "${activity.title}".`,
          category: "points",
        });

        emitAchievementToast({
          title: "تم احتساب النقاط",
          message: "تمت إضافة 10 نقاط إلى رصيدك.",
          points: 10,
          tone: "success",
        });
      } else {
        emitAchievementToast({
          title: "تم تحديث الإرسال",
          message: "تم تحديث التلخيص بنجاح.",
          tone: "info",
        });
      }

      if (timeTracker) {
        await timeTracker.endSession(true);
      }
    } catch (error) {
      console.error("Error in summarization submission:", error);
      setError("حدث خطأ أثناء الإرسال. حاول مرة أخرى.");
    } finally {
      setIsSubmitting(false);
      setIsConfirmationOpen(false);
    }
  };

  if (!topic || topic.id !== "summarization") {
    return (
      <div className="topic-page" dir="rtl">
        <div className="not-found-container">
          <h1>النشاط غير متاح لهذا الدرس.</h1>
          <button className="button" onClick={() => navigate(-1)}>
            عودة
          </button>
        </div>
      </div>
    );
  }

  if (isPageLoading) {
    return (
      <div className="report-assembly-page" dir="rtl">
        <header className="report-assembly-header page-header">
          <SkeletonHeader titleWidthClass="skeleton-w-40" subtitleWidthClass="skeleton-w-70" />
        </header>
        <div className="report-assembly-grid">
          <SkeletonSection lines={3} gridItems={2} />
          <SkeletonSection lines={4} />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="topic-page" dir="rtl">
        <div className="not-found-container">
          <h1>جاري تحميل البيانات...</h1>
        </div>
      </div>
    );
  }

  if (!(lessonVisibility[topic.id]?.activity ?? true)) {
    return (
      <div className="topic-page" dir="rtl">
        <div className="not-found-container">
          <h1>هذا النشاط غير متاح حاليًا.</h1>
          <button className="button" onClick={() => navigate(-1)}>
            عودة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="report-assembly-page" dir="rtl">
      <ConfirmationDialog
        isOpen={isConfirmationOpen}
        title="تأكيد إرسال التلخيص"
        message="هل أنت متأكد من أنك تريد إرسال التلخيص؟"
        onConfirm={handleConfirmSubmit}
        onCancel={() => setIsConfirmationOpen(false)}
      />

      <header className="report-assembly-header page-header">
        <div className="report-assembly-header-row">
          <div>
            <h1 className="page-title">
              {activity.title}: {topic.title}
            </h1>
            <p className="page-subtitle">{activity.instructions}</p>
          </div>
        </div>
      </header>

      <section className="activity-instructions card">
        <div className="activity-instructions-header">
          <h3>خطوات سريعة</h3>
          <p>اتبع هذه الخطوات حتى يكون التلخيص موجزًا ودقيقًا.</p>
        </div>
        <ol className="activity-instructions-list">
          {quickSteps.map((step, index) => (
            <li key={`summarization-quick-step-${index}`}>{step}</li>
          ))}
        </ol>
      </section>

      <div className="report-assembly-grid">
        <section className="card report-assembly-card">
          <div className="report-assembly-card-header">
            <h2>اختيار أفضل تلخيص</h2>
            <p>اختر التلخيص الذي يحافظ على الفكرة الأساسية ويحذف التفاصيل الزائدة.</p>
          </div>

          <div className="scene-nav" aria-label="التنقل بين نصوص التلخيص">
            {scenes.map((scene, index) => {
              const isSelected = sceneSelections[index] >= 0;
              return (
                <button
                  key={scene.id}
                  type="button"
                  className={`scene-nav-item${index === sceneIndex ? " active" : ""}${
                    isSelected ? " done" : ""
                  }`}
                  onClick={() => setSceneIndex(index)}
                >
                  <span className="scene-nav-index">{index + 1}</span>
                  <span className="scene-nav-title">{scene.title}</span>
                  <span className="scene-nav-status" aria-hidden="true">
                    {isSelected ? "تم" : ""}
                  </span>
                </button>
              );
            })}
          </div>

          {activeScene && (
            <div className="scene-card">
              <div className="scene-meta">
                <div className="scene-title">
                  <span>{activeScene.title}</span>
                  <span className="scene-progress">
                    النص {sceneIndex + 1}/{scenes.length}
                  </span>
                </div>
                <div className="scene-badges">
                  <span className={`scene-status${selectedOptionText ? " done" : ""}`}>
                    {selectedOptionText ? "تم الاختيار" : "لم يتم الاختيار"}
                  </span>
                  {timeLeft !== null && (
                    <span className={`scene-timer${timeLeft === 0 ? " expired" : ""}`}>
                      {formatTime(timeLeft)}
                    </span>
                  )}
                </div>
              </div>

              <div className="scene-progress-bar" role="progressbar" aria-valuenow={selectionPercent}>
                <span style={{ width: `${selectionPercent}%` }} />
                <div className="scene-progress-label">
                  تم اختيار {selectionCount}/{scenes.length}
                </div>
              </div>

              <p className="scene-description">{activeScene.scene}</p>
              <div className="scene-bubble-wrap">
                <div
                  className={`scene-drop${isDragOver ? " drag-over" : ""}${
                    selectedOptionText ? " filled" : ""
                  }`}
                  onDragOver={handleDragOverImage}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={handleDropOnImage}
                >
                  <div className="scene-image">
                    <img
                      src={activeScene.imageUrl}
                      alt={activeScene.imageAlt}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="scene-drop-check" aria-hidden="true">
                    تم
                  </div>
                  {selectedOptionText ? (
                    <div className="scene-drop-selected">{selectedOptionText}</div>
                  ) : (
                    <div className="scene-drop-hint">اسحب التلخيص المناسب هنا</div>
                  )}
                </div>

                <div className="scene-options">
                  <div className="scene-options-header">
                    <span className="scene-options-title">التلخيصات المقترحة</span>
                    <span className="scene-options-hint">اسحب التلخيص أو انقر عليه</span>
                  </div>
                  <div className="scene-bubbles">
                    {activeScene.options.map((option, optionIndex) => (
                      <label
                        key={`${activeScene.id}-${optionIndex}`}
                        className={`scene-option${
                          sceneSelections[sceneIndex] === optionIndex ? " selected" : ""
                        }`}
                        draggable
                        onDragStart={handleOptionDragStart(optionIndex)}
                      >
                        <input
                          type="radio"
                          name={`scene-${activeScene.id}`}
                          checked={sceneSelections[sceneIndex] === optionIndex}
                          onChange={() => handleSelectSceneOption(optionIndex)}
                        />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="scene-actions">
            <button
              type="button"
              className="button button-compact"
              onClick={() => setSceneIndex((prev) => Math.max(prev - 1, 0))}
              disabled={sceneIndex === 0}
            >
              السابق
            </button>
            <button
              type="button"
              className="button button-compact"
              onClick={() => setSceneIndex((prev) => Math.min(prev + 1, scenes.length - 1))}
              disabled={sceneIndex >= scenes.length - 1 || sceneSelections[sceneIndex] < 0}
            >
              التالي
            </button>
            <button
              type="button"
              className="button button-compact"
              onClick={() => {
                setSceneSelections(Array(scenes.length).fill(-1));
                setSceneIndex(0);
                setSummaryText("");
                setError(null);
                setNotice(null);
              }}
            >
              إعادة التعيين
            </button>
            <button
              type="button"
              className="button button-compact"
              onClick={handleGenerateDraft}
              disabled={!hasAllSelections}
            >
              إنشاء مسودة
            </button>
          </div>
        </section>

        <section className="card report-assembly-card">
          <div className="report-assembly-card-header">
            <h2>كتابة التلخيص النهائي</h2>
            <p>{activity.prompt}</p>
          </div>

          {topic.writingPrompts?.list?.length > 0 && (
            <div className="report-prompts">
              <h3>{topic.writingPrompts.header}</h3>
              <p>يمكنك التدرب على تلخيص نصوص أخرى من هذه الموضوعات.</p>
              <ul>
                {topic.writingPrompts.list.slice(0, 3).map((prompt, index) => (
                  <li key={`${topic.id}-prompt-${index}`}>{prompt}</li>
                ))}
              </ul>
            </div>
          )}

          <textarea
            className="report-output"
            value={summaryText}
            onChange={(event) => setSummaryText(event.target.value)}
            rows={14}
            placeholder="اكتب التلخيص النهائي هنا..."
          />

          {error && <div className="case-error">{error}</div>}
          {notice && <div className="case-success">{notice}</div>}
          {isSubmitted && <div className="muted-note">تم إرسال التلخيص.</div>}

          <div className="report-submit-actions">
            <button type="button" className="button" onClick={() => navigate(-1)}>
              رجوع
            </button>
            <button
              type="button"
              className="button"
              onClick={() => setIsConfirmationOpen(true)}
              disabled={isSubmitting}
            >
              {isSubmitting ? "جاري الإرسال..." : "إرسال التلخيص"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
