import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../supabaseClient";
import { topics, type Topic } from "../../data/topics";
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

type Semester2Activity = NonNullable<Topic["interactiveActivity"]>;

type ActivitySubmissionRow = {
  id: number;
  response_text: string | null;
  status: string | null;
};

type Semester2ActivityCopy = {
  submissionLabel: string;
  partsTitle?: string;
  finalTitle: string;
  finalPlaceholder: string;
  partLabel?: string;
  assembleHint?: string;
  sceneHeading?: string;
  sceneCounterLabel?: string;
  sceneHint?: string;
  sceneDropHint?: string;
  sceneOptionsTitle?: string;
  sceneOptionsHint?: string;
  selectionRequiredError?: string;
  quickIntro: string;
  quickSteps: string[];
  promptsHint?: string;
  resetSelectionNotice?: string;
  draftNotice?: string;
};

type Semester2ActivityShellProps = {
  expectedTopicId: string;
  activity: Semester2Activity;
  copy: Semester2ActivityCopy;
};

export default function Semester2ActivityShell({
  expectedTopicId,
  activity,
  copy,
}: Semester2ActivityShellProps) {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const topic = topics.find((item) => item.id === topicId);
  const topicIds = useMemo(() => topics.map((item) => item.id), []);

  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isVisibilityLoading, setIsVisibilityLoading] = useState(true);
  const [isSubmissionLoading, setIsSubmissionLoading] = useState(true);
  const [lessonVisibility, setLessonVisibility] = useState<LessonVisibility>(() =>
    getLessonVisibility(topicIds)
  );
  const [parts, setParts] = useState<string[]>(
    activity.type === "assemble" ? activity.parts : []
  );
  const [finalText, setFinalText] = useState("");
  const [submission, setSubmission] = useState<ActivitySubmissionRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [sceneSelections, setSceneSelections] = useState<number[]>(
    activity.type === "scene-choice" ? Array(activity.scenes.length).fill(-1) : []
  );
  const [timeLeft, setTimeLeft] = useState<number | null>(
    activity.type === "scene-choice" ? activity.timeLimitSeconds ?? null : null
  );
  const [isDragOver, setIsDragOver] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [timeTracker, setTimeTracker] = useState<SessionTimeTracker | null>(null);
  const originalPartsRef = useRef<string[]>(
    activity.type === "assemble" ? activity.parts : []
  );

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
    if (activity.type !== "scene-choice") {
      setTimeLeft(null);
      return;
    }

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
  }, [activity, sceneIndex]);

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
        setFinalText(data.response_text ?? "");
      }

      setIsSubmissionLoading(false);
    };

    loadSubmission();
  }, [session, topic, activity.activityId]);

  const isSceneChoice = activity.type === "scene-choice";
  const scenes = isSceneChoice ? activity.scenes : [];
  const activeScene = isSceneChoice ? scenes[sceneIndex] : null;
  const selectedOptionText =
    activeScene && sceneSelections[sceneIndex] >= 0
      ? activeScene.options[sceneSelections[sceneIndex]]
      : null;
  const selectionCount = sceneSelections.filter((index) => index >= 0).length;
  const hasAllSelections =
    isSceneChoice && scenes.length > 0 && sceneSelections.every((index) => index >= 0);
  const selectionPercent =
    isSceneChoice && scenes.length > 0
      ? Math.round((selectionCount / scenes.length) * 100)
      : 0;
  const selectionDraft = useMemo(() => {
    if (!isSceneChoice) return "";
    return scenes
      .map((scene, index) => {
        const selectedIndex = sceneSelections[index];
        return selectedIndex >= 0 ? scene.options[selectedIndex] : null;
      })
      .filter((segment): segment is string => Boolean(segment))
      .join("\n\n");
  }, [isSceneChoice, scenes, sceneSelections]);

  const isSubmitted = submission?.status === "submitted";
  const isPageLoading = isSessionLoading || isVisibilityLoading || isSubmissionLoading;

  const formatTime = (value: number | null) => {
    if (value === null) return null;
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const movePart = (index: number, direction: -1 | 1) => {
    setParts((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
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
    if (!isSceneChoice) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDropOnImage = (event: DragEvent<HTMLDivElement>) => {
    if (!isSceneChoice) return;
    event.preventDefault();
    const optionIndex = Number.parseInt(event.dataTransfer.getData("text/plain"), 10);
    if (!Number.isNaN(optionIndex)) {
      handleSelectSceneOption(optionIndex);
    }
    setIsDragOver(false);
  };

  const handleGenerateDraft = () => {
    if (isSceneChoice) {
      if (!hasAllSelections) {
        setError(
          copy.selectionRequiredError ?? `يرجى إكمال الاختيارات قبل إنشاء ${copy.submissionLabel}.`
        );
        return;
      }
      setFinalText(selectionDraft);
    } else {
      setFinalText(parts.join("\n"));
    }

    setError(null);
    setNotice(copy.draftNotice ?? `تم إنشاء مسودة ${copy.submissionLabel}. يمكنك تعديلها الآن.`);
  };

  const handleConfirmSubmit = async () => {
    if (!session || !topic) return;
    if (!finalText.trim()) {
      setError(`يرجى كتابة ${copy.submissionLabel} قبل الإرسال.`);
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
            response_text: finalText,
            status: "submitted",
          },
          { onConflict: "student_id,topic_id,activity_id" }
        )
        .select("id, response_text, status")
        .maybeSingle();

      if (error) {
        setError(`تعذر حفظ ${copy.submissionLabel}. حاول مرة أخرى.`);
        return;
      }

      setSubmission(data as ActivitySubmissionRow);
      setNotice(`تم حفظ ${copy.submissionLabel} بنجاح.`);

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
          message: `تم تحديث ${copy.submissionLabel} بنجاح.`,
          tone: "info",
        });
      }

      if (timeTracker) {
        await timeTracker.endSession(true);
      }
    } catch (error) {
      console.error("Error in semester 2 activity submission:", error);
      setError("حدث خطأ أثناء الإرسال. حاول مرة أخرى.");
    } finally {
      setIsSubmitting(false);
      setIsConfirmationOpen(false);
    }
  };

  if (!topic || topic.id !== expectedTopicId) {
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
        title={`تأكيد إرسال ${copy.submissionLabel}`}
        message={`هل أنت متأكد من أنك تريد إرسال ${copy.submissionLabel}؟`}
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
          <p>{copy.quickIntro}</p>
        </div>
        <ol className="activity-instructions-list">
          {copy.quickSteps.map((step, index) => (
            <li key={`${expectedTopicId}-quick-step-${index}`}>{step}</li>
          ))}
        </ol>
      </section>

      <div className="report-assembly-grid">
        {isSceneChoice ? (
          <section className="card report-assembly-card">
            <div className="report-assembly-card-header">
              <h2>{copy.sceneHeading ?? "اختيار العناصر"}</h2>
              <p>{copy.sceneHint ?? "اختر العنصر الأنسب لكل مرحلة."}</p>
            </div>

            <div className="scene-nav" aria-label={copy.sceneHeading ?? "التنقل بين المراحل"}>
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
                      {copy.sceneCounterLabel ?? "المرحلة"} {sceneIndex + 1}/{scenes.length}
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
                      <div className="scene-drop-hint">
                        {copy.sceneDropHint ?? "اسحب الاختيار المناسب هنا"}
                      </div>
                    )}
                  </div>

                  <div className="scene-options">
                    <div className="scene-options-header">
                      <span className="scene-options-title">
                        {copy.sceneOptionsTitle ?? "الخيارات"}
                      </span>
                      <span className="scene-options-hint">
                        {copy.sceneOptionsHint ?? "اسحب الاختيار أو انقر عليه"}
                      </span>
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
                  setFinalText("");
                  setError(null);
                  setNotice(copy.resetSelectionNotice ?? null);
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
        ) : (
          <section className="card report-assembly-card">
            <div className="report-assembly-card-header">
              <h2>{copy.partsTitle ?? "بطاقات النشاط"}</h2>
              <p>{copy.assembleHint ?? "رتّب البطاقات لتكوين تسلسل منطقي."}</p>
            </div>

            <div className="report-parts-list">
              {parts.map((part, index) => (
                <div key={`${expectedTopicId}-part-${index}`} className="report-part">
                  <div className="report-part-header">
                    <span>{copy.partLabel ?? "بطاقة"} {index + 1}</span>
                    <div className="report-part-actions">
                      <button
                        type="button"
                        className="button button-compact"
                        onClick={() => movePart(index, -1)}
                        disabled={index === 0}
                      >
                        أعلى
                      </button>
                      <button
                        type="button"
                        className="button button-compact"
                        onClick={() => movePart(index, 1)}
                        disabled={index === parts.length - 1}
                      >
                        أسفل
                      </button>
                    </div>
                  </div>
                  <textarea
                    value={part}
                    onChange={(event) => {
                      const next = [...parts];
                      next[index] = event.target.value;
                      setParts(next);
                    }}
                    rows={3}
                  />
                </div>
              ))}
            </div>

            <div className="report-actions">
              <button
                type="button"
                className="button button-compact"
                onClick={() => setParts(originalPartsRef.current)}
              >
                إعادة الترتيب
              </button>
              <button type="button" className="button button-compact" onClick={handleGenerateDraft}>
                إنشاء مسودة
              </button>
            </div>
          </section>
        )}

        <section className="card report-assembly-card">
          <div className="report-assembly-card-header">
            <h2>{copy.finalTitle}</h2>
            <p>{activity.prompt}</p>
          </div>

          {topic.writingPrompts?.list?.length > 0 && (
            <div className="report-prompts">
              <h3>{topic.writingPrompts.header}</h3>
              <p>{copy.promptsHint ?? "يمكنك الاستفادة من هذه الموضوعات في صياغة عملك."}</p>
              <ul>
                {topic.writingPrompts.list.slice(0, 3).map((prompt, index) => (
                  <li key={`${topic.id}-prompt-${index}`}>{prompt}</li>
                ))}
              </ul>
            </div>
          )}

          <textarea
            className="report-output"
            value={finalText}
            onChange={(event) => setFinalText(event.target.value)}
            rows={14}
            placeholder={copy.finalPlaceholder}
          />

          {error && <div className="case-error">{error}</div>}
          {notice && <div className="case-success">{notice}</div>}
          {isSubmitted && <div className="muted-note">تم إرسال {copy.submissionLabel}.</div>}

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
              {isSubmitting ? "جاري الإرسال..." : `إرسال ${copy.submissionLabel}`}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
