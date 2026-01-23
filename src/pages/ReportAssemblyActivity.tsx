import { useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../supabaseClient";
import { topics } from "../data/topics";
import {
  LessonVisibility,
  buildLessonVisibilityFromRows,
  getLessonVisibility,
} from "../utils/lessonSettings";
import { logAdminNotification } from "../utils/adminNotifications";
import { emitAchievementToast } from "../utils/achievementToast";
import { trackActivitySubmission } from "../utils/studentTracking";
import { SkeletonHeader, SkeletonSection } from "../components/SkeletonBlocks";
import "../styles/ReportAssemblyActivity.css";
import { SessionTimeTracker, requestTrackingConfirmation } from "../utils/enhancedStudentTracking";
import ConfirmationDialog from "../components/ConfirmationDialog";

type ActivitySubmissionRow = {
  id: number;
  response_text: string | null;
  status: string | null;
};

export default function ReportAssemblyActivity() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const topic = topics.find((t) => t.id === topicId);
  const interactiveActivity = topic?.interactiveActivity ?? null;
  const topicIds = useMemo(() => topics.map((t) => t.id), []);

  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isVisibilityLoading, setIsVisibilityLoading] = useState(true);
  const [isSubmissionLoading, setIsSubmissionLoading] = useState(true);
  const [lessonVisibility, setLessonVisibility] = useState<LessonVisibility>(() =>
    getLessonVisibility(topicIds)
  );
  const [parts, setParts] = useState<string[]>([]);
  const [originalParts, setOriginalParts] = useState<string[]>([]);
  const [reportText, setReportText] = useState("");
  const [submission, setSubmission] = useState<ActivitySubmissionRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [sceneIndex, setSceneIndex] = useState(0);
  const [sceneSelections, setSceneSelections] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropPulse, setDropPulse] = useState(false);
  const autoAdvanceTimer = useRef<number | null>(null);
  const pulseTimer = useRef<number | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [timeTracker, setTimeTracker] = useState<SessionTimeTracker | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsSessionLoading(false);
    });
  }, []);

  useEffect(() => {
    if (session && topicId) {
      const tracker = new SessionTimeTracker(session.user.id, topicId, 'activity');
      tracker.startSession();
      setTimeTracker(tracker);

      return () => {
        tracker.endSession();
      };
    }
  }, [session, topicId]);

  useEffect(() => {
    return () => {
      if (autoAdvanceTimer.current !== null) {
        window.clearTimeout(autoAdvanceTimer.current);
        autoAdvanceTimer.current = null;
      }
      if (pulseTimer.current !== null) {
        window.clearTimeout(pulseTimer.current);
        pulseTimer.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!interactiveActivity || interactiveActivity.type !== "assemble") {
      setParts([]);
      setOriginalParts([]);
      return;
    }
    setParts(interactiveActivity.parts);
    setOriginalParts(interactiveActivity.parts);
  }, [interactiveActivity]);

  useEffect(() => {
    if (!interactiveActivity || interactiveActivity.type !== "scene-choice") {
      setSceneIndex(0);
      setSceneSelections([]);
      setTimeLeft(null);
      return;
    }
    setSceneIndex(0);
    setSceneSelections(Array(interactiveActivity.scenes.length).fill(-1));
  }, [interactiveActivity]);

  useEffect(() => {
    setDropPulse(false);
    setIsDragOver(false);
  }, [sceneIndex]);

  useEffect(() => {
    if (!interactiveActivity || interactiveActivity.type !== "scene-choice") return;
    const limit = interactiveActivity.timeLimitSeconds;
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
  }, [interactiveActivity, sceneIndex]);

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
    const loadSubmission = async () => {
      setIsSubmissionLoading(true);
      if (!session || !topic || !interactiveActivity) {
        setIsSubmissionLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("activity_submissions")
        .select("id, response_text, status")
        .eq("student_id", session.user.id)
        .eq("topic_id", topic.id)
        .eq("activity_id", interactiveActivity.activityId)
        .maybeSingle();

      if (error) {
        setIsSubmissionLoading(false);
        return;
      }
      if (data) {
        setSubmission(data as ActivitySubmissionRow);
        setReportText(data.response_text ?? "");
      }
      setIsSubmissionLoading(false);
    };

    loadSubmission();
  }, [session, topic, interactiveActivity]);

  const isSceneChoice = interactiveActivity?.type === "scene-choice";
  const scenes = isSceneChoice ? interactiveActivity.scenes : [];
  const activeScene = isSceneChoice ? scenes[sceneIndex] : null;
  const hasAllSelections =
    isSceneChoice &&
    scenes.length > 0 &&
    sceneSelections.length === scenes.length &&
    sceneSelections.every((index) => index >= 0);
  const selectionCount = isSceneChoice
    ? sceneSelections.filter((index) => index >= 0).length
    : 0;
  const selectionPercent =
    isSceneChoice && scenes.length > 0
      ? Math.round((selectionCount / scenes.length) * 100)
      : 0;
  const isPageLoading = isSessionLoading || isVisibilityLoading || isSubmissionLoading;

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

  const selectedOptionText =
    isSceneChoice && activeScene && sceneSelections[sceneIndex] >= 0
      ? activeScene.options[sceneSelections[sceneIndex]]
      : null;
  const hasSceneSelection =
    isSceneChoice && sceneSelections[sceneIndex] !== undefined && sceneSelections[sceneIndex] >= 0;
  const showFinalSection = !isSceneChoice || hasAllSelections;

  if (!topic) {
    return <div className="topic-page">الموضوع غير متاح.</div>;
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

  if (!interactiveActivity) {
    return (
      <div className="topic-page" dir="rtl">
        <div className="not-found-container">
          <h1>لا يوجد نشاط تفاعلي لهذا الدرس.</h1>
          <button className="button" onClick={() => navigate(-1)}>
            عودة
          </button>
        </div>
      </div>
    );
  }

  const isReportTopic = topic.id === "report-writing";
  const isLandscapeTopic = topic.id === "landscape-description";
  const isFreeExpressionTopic = topic.id === "free-expression";
  const hasTutorial = isLandscapeTopic || isReportTopic;
  const topicPrompts =
    isFreeExpressionTopic ? [] : topic.writingPrompts?.list ?? [];
  const topicPromptHeader = topic.writingPrompts?.header ?? "أفكار إضافية";
  const submissionLabel = isReportTopic
    ? "التقرير"
    : isLandscapeTopic
      ? "الوصف"
      : isFreeExpressionTopic
        ? "التعبير"
        : "النشاط";
  const partsTitle = isReportTopic
    ? "أجزاء التقرير"
    : isLandscapeTopic
      ? "جمل الوصف"
      : isFreeExpressionTopic
        ? "أفكار التعبير"
        : "أجزاء النشاط";
  const finalTitle = isReportTopic
    ? "كتابة التقرير"
    : isLandscapeTopic
      ? "كتابة الوصف"
      : isFreeExpressionTopic
        ? "كتابة التعبير"
        : "النص النهائي";
  const finalPrompt = isFreeExpressionTopic
    ? "اكتب تعبيرك الحر بالاعتماد على أحد المحفزات."
    : interactiveActivity.prompt;
  const partLabel = isReportTopic ? "فقرة" : "جزء";
  const finalPlaceholder = isReportTopic
    ? "اكتب التقرير النهائي هنا..."
    : isLandscapeTopic
      ? "اكتب وصفك هنا..."
      : isFreeExpressionTopic
        ? "اكتب تعبيرك هنا..."
        : "اكتب النص هنا...";
  const sceneHeading = isLandscapeTopic ? "اختيار الوصف" : "اختيار المشهد";

  const formatTime = (value: number | null) => {
    if (value === null) return null;
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };
  const isActivityActive = lessonVisibility[topic.id]?.activity ?? true;

  if (!isActivityActive) {
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

  const movePart = (index: number, direction: -1 | 1) => {
    setParts((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleShuffle = () => {
    setParts((prev) => [...prev].sort(() => Math.random() - 0.5));
    setNotice(null);
  };

  const handleReset = () => {
    setParts(originalParts);
    setNotice("تمت إعادة ترتيب القطع إلى الوضع الأصلي.");
  };

  const handleGenerateDraft = () => {
    setReportText(parts.join("\n\n"));
    setNotice(`تم إنشاء مسودة ${submissionLabel}. يمكنك تعديلها الآن.`);
  };

  const handleSelectSceneOption = (optionIndex: number) => {
    if (!isSceneChoice) return;
    setError(null);
    setSceneSelections((prev) => {
      const next = [...prev];
      next[sceneIndex] = optionIndex;
      return next;
    });
    setDropPulse(true);
    if (pulseTimer.current !== null) {
      window.clearTimeout(pulseTimer.current);
    }
    pulseTimer.current = window.setTimeout(() => {
      setDropPulse(false);
      pulseTimer.current = null;
    }, 500);

    if (sceneIndex < scenes.length - 1) {
      if (autoAdvanceTimer.current !== null) {
        window.clearTimeout(autoAdvanceTimer.current);
      }
      autoAdvanceTimer.current = window.setTimeout(() => {
        setSceneIndex((prev) => Math.min(prev + 1, scenes.length - 1));
        autoAdvanceTimer.current = null;
      }, 3000);
    }
  };

  const handleOptionDragStart =
    (optionIndex: number) => (event: DragEvent<HTMLLabelElement>) => {
      if (!isSceneChoice) return;
      event.dataTransfer.setData("text/plain", optionIndex.toString());
      event.dataTransfer.effectAllowed = "move";
    };

  const handleDragOverImage = (event: DragEvent<HTMLDivElement>) => {
    if (!isSceneChoice) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setIsDragOver(true);
  };

  const handleDragLeaveImage = () => {
    setIsDragOver(false);
  };

  const handleDropOnImage = (event: DragEvent<HTMLDivElement>) => {
    if (!isSceneChoice) return;
    event.preventDefault();
    const data = event.dataTransfer.getData("text/plain");
    const optionIndex = Number.parseInt(data, 10);
    if (Number.isNaN(optionIndex)) return;
    handleSelectSceneOption(optionIndex);
    setIsDragOver(false);
  };

  const handleNextScene = () => {
    if (!isSceneChoice || scenes.length === 0) return;
    if (autoAdvanceTimer.current !== null) {
      window.clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    setSceneIndex((prev) => Math.min(prev + 1, scenes.length - 1));
  };

  const handlePrevScene = () => {
    if (!isSceneChoice || scenes.length === 0) return;
    if (autoAdvanceTimer.current !== null) {
      window.clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    setSceneIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleJumpToScene = (nextIndex: number) => {
    if (!isSceneChoice || scenes.length === 0) return;
    if (autoAdvanceTimer.current !== null) {
      window.clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    setSceneIndex(Math.max(0, Math.min(nextIndex, scenes.length - 1)));
  };

  const handleResetScenes = () => {
    if (!isSceneChoice || scenes.length === 0) return;
    if (autoAdvanceTimer.current !== null) {
      window.clearTimeout(autoAdvanceTimer.current);
      autoAdvanceTimer.current = null;
    }
    setSceneSelections(Array(scenes.length).fill(-1));
    setSceneIndex(0);
    setReportText("");
    setNotice(null);
    setError(null);
  };

  const handleGenerateFromSelections = () => {
    if (!isSceneChoice || scenes.length === 0) return;
    if (!hasAllSelections) {
      setError("يرجى اختيار وصف لكل مشهد قبل إنشاء المسودة.");
      return;
    }
    setError(null);
    setNotice(null);
    setReportText(selectionDraft);
    setNotice(`تم إنشاء ${submissionLabel} من الاختيارات. يمكنك تعديله الآن.`);
  };

  const handleConfirmSubmit = async () => {
    if (!interactiveActivity || !session || !topic) return;
    if (!reportText.trim()) {
      setError(`يرجى كتابة ${submissionLabel} قبل الإرسال.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setNotice(null);
    const hadSubmission = submission?.status === "submitted";

    const { data, error } = await supabase
      .from("activity_submissions")
      .upsert(
        {
          student_id: session.user.id,
          topic_id: topic.id,
          activity_id: interactiveActivity.activityId,
          response_text: reportText,
          status: "submitted",
        },
        { onConflict: "student_id,topic_id,activity_id" }
      )
      .select("id, response_text, status")
      .single();

    if (error) {
      setError(`تعذر حفظ ${submissionLabel}. حاول مرة أخرى.`);
      setIsSubmitting(false);
      return;
    }

    setSubmission(data as ActivitySubmissionRow);
    setNotice(`تم حفظ ${submissionLabel} بنجاح.`);
    if (!hadSubmission) {
      await logAdminNotification({
        recipientId: session.user.id,
        actorId: session.user.id,
        actorRole: "student",
        message: `تم منحك 5 نقاط لإكمال ${submissionLabel}.`,
        category: "points",
      });
      await trackActivitySubmission(session.user.id, topic.id, interactiveActivity.activityId);
      await requestTrackingConfirmation(session.user.id, 'activity', topic.id, interactiveActivity.activityId);
      emitAchievementToast({
        title: "تم احتساب النقاط",
        message: "تمت إضافة 5 نقاط إلى رصيدك.",
        points: 5,
        tone: "success",
      });
    } else {
      emitAchievementToast({
        title: "تم تحديث الإرسال",
        message: `تم تحديث ${submissionLabel} بنجاح.`,
        tone: "info",
      });
    }
    if (timeTracker) {
        await timeTracker.endSession();
    }
    setIsSubmitting(false);
  };

  const handleSubmit = () => {
      setIsConfirmationOpen(true);
  }

  const isSubmitted = submission?.status === "submitted";
  const tutorialPath = `/activity/${topic.id}/tutorial`;
  const showQuickSteps = !hasTutorial;
  const pageClassName = `report-assembly-page${isLandscapeTopic ? " landscape-activity" : ""}`;
  const headerSubtitle = isLandscapeTopic
    ? "اسحب بطاقة الوصف وأسقطها على الصورة، ثم أكمل بقية المشاهد."
    : interactiveActivity.instructions;

  return (
    <div className={pageClassName} dir="rtl">
      <ConfirmationDialog
        isOpen={isConfirmationOpen}
        title={`تأكيد إرسال ${submissionLabel}`}
        message="هل أنت متأكد من أنك تريد إرسال هذا النشاط؟"
        onConfirm={() => {
          setIsConfirmationOpen(false);
          handleConfirmSubmit();
        }}
        onCancel={() => setIsConfirmationOpen(false)}
      />
      <header className="report-assembly-header page-header">
        <div className="report-assembly-header-row">
          <div>
            <h1 className="page-title">
              {interactiveActivity.title}: {topic.title}
            </h1>
            <p className="page-subtitle">{headerSubtitle}</p>
          </div>
          {hasTutorial && (
            <div className="report-assembly-header-actions">
              <button
                type="button"
                className="button button-compact"
                onClick={() => navigate(tutorialPath)}
              >
                شرح النشاط
              </button>
            </div>
          )}
        </div>
      </header>

      {showQuickSteps && (
        <section className="activity-instructions card">
          <div className="activity-instructions-header">
            <h3>خطوات سريعة</h3>
            <p>اتبع هذه الخطوات القصيرة لإكمال النشاط.</p>
          </div>
          {interactiveActivity.type === "assemble" ? (
            <ol className="activity-instructions-list">
              <li>رتّب الأجزاء بالترتيب الصحيح.</li>
              <li>عدّل الصياغة لتحسين الترابط بين الفقرات.</li>
              <li>أنشئ المسودة ثم أرسلها.</li>
            </ol>
          ) : (
            <ol className="activity-instructions-list">
              <li>اختر وصفًا مناسبًا لكل مشهد.</li>
              <li>جمّع اختياراتك لتكوين مسودة كاملة.</li>
              <li>راجع الوصف ثم أرسله.</li>
            </ol>
          )}
        </section>
      )}

      <div className="report-assembly-grid">
        {interactiveActivity.type === "assemble" ? (
          <section className="card report-assembly-card">
            <div className="report-assembly-card-header">
              <h2>{partsTitle}</h2>
              <p>رتّب الأجزاء لتكوين تسلسل منطقي.</p>
            </div>

            <div className="report-parts-list">
              {parts.map((part, index) => (
                <div key={`${interactiveActivity.id}-${index}`} className="report-part">
                  <div className="report-part-header">
                    <span>{partLabel} {index + 1}</span>
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
              <button type="button" className="button button-compact" onClick={handleShuffle}>
                إعادة خلط الأجزاء
              </button>
              <button type="button" className="button button-compact" onClick={handleReset}>
                إعادة الترتيب
              </button>
              <button type="button" className="button button-compact" onClick={handleGenerateDraft}>
                إنشاء مسودة
              </button>
            </div>
          </section>
        ) : (
          <section className="card report-assembly-card">
            <div className="report-assembly-card-header">
              <h2>{sceneHeading}</h2>
            </div>

            {scenes.length > 1 && (
              <div className="scene-nav" aria-label="التنقل بين المشاهد">
                {scenes.map((scene, index) => {
                  const isSelected = sceneSelections[index] !== undefined && sceneSelections[index] >= 0;
                  return (
                    <button
                      key={scene.id}
                      type="button"
                      className={`scene-nav-item${index === sceneIndex ? " active" : ""}${
                        isSelected ? " done" : ""
                      }`}
                      onClick={() => handleJumpToScene(index)}
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
            )}

            {activeScene ? (
              <div className="scene-card">
                <div className="scene-meta">
                  <div className="scene-title">
                    <span>{activeScene.title}</span>
                    <span className="scene-progress">
                      المشهد {sceneIndex + 1}/{scenes.length}
                    </span>
                  </div>
                  <div className="scene-badges">
                    <span className={`scene-status${hasSceneSelection ? " done" : ""}`}>
                      {hasSceneSelection ? "تم الاختيار" : "لم يتم الاختيار"}
                    </span>
                    {timeLeft !== null && (
                      <span className={`scene-timer${timeLeft === 0 ? " expired" : ""}`}>
                        {formatTime(timeLeft)}
                      </span>
                    )}
                  </div>
                </div>
                {scenes.length > 0 && (
                  <div className="scene-progress-bar" role="progressbar" aria-valuenow={selectionPercent}>
                    <span style={{ width: `${selectionPercent}%` }} />
                    <div className="scene-progress-label">
                      تم اختيار {selectionCount}/{scenes.length}
                    </div>
                  </div>
                )}
                <p className="scene-description">{activeScene.scene}</p>
                <div className="scene-bubble-wrap">
                  <div
                    className={`scene-drop${isDragOver ? " drag-over" : ""}${selectedOptionText ? " filled" : ""}${dropPulse ? " success" : ""}`}
                    onDragOver={handleDragOverImage}
                    onDragLeave={handleDragLeaveImage}
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
                        اسحب الوصف وضعه هنا
                      </div>
                    )}
                  </div>
                  <div className="scene-options">
                    <div className="scene-options-header">
                      <span className="scene-options-title">الخيارات</span>
                      <span className="scene-options-hint">اسحب للاختيار</span>
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
            ) : (
              <div className="muted-note">لا توجد مشاهد متاحة.</div>
            )}

            <div className="scene-actions">
              <button
                type="button"
                className="button button-compact"
                onClick={handlePrevScene}
                disabled={sceneIndex === 0}
              >
                السابق
              </button>
              <button
                type="button"
                className="button button-compact"
                onClick={handleNextScene}
                disabled={
                  sceneIndex >= scenes.length - 1 ||
                  sceneSelections[sceneIndex] === undefined ||
                  sceneSelections[sceneIndex] < 0
                }
              >
                التالي
              </button>
              <button
                type="button"
                className="button button-compact"
                onClick={handleResetScenes}
              >
                إعادة التعيين
              </button>
              <button
                type="button"
                className="button button-compact"
                onClick={handleGenerateFromSelections}
                disabled={!hasAllSelections}
              >
                إنشاء مسودة
              </button>
            </div>
          </section>
        )}

        {showFinalSection && (
          <section className="card report-assembly-card">
            <div className="report-assembly-card-header">
              <h2>{finalTitle}</h2>
              <p>{finalPrompt}</p>
            </div>

            {topicPrompts.length > 0 && (
              <div className="report-prompts">
                <h3>{topicPromptHeader}</h3>
                <p>استخدم أحد المحفزات لصياغة نصك.</p>
                <ul>
                  {topicPrompts.map((prompt, index) => (
                    <li key={`${topic.id}-prompt-${index}`}>{prompt}</li>
                  ))}
                </ul>
              </div>
            )}

            <textarea
              className="report-output"
              value={reportText}
              onChange={(event) => setReportText(event.target.value)}
              rows={14}
              placeholder={finalPlaceholder}
            />

            {error && <div className="case-error">{error}</div>}
            {notice && <div className="case-success">{notice}</div>}
            {isSubmitted && (
              <div className="muted-note">تم إرسال {submissionLabel}.</div>
            )}

            <div className="report-submit-actions">
              <button type="button" className="button" onClick={() => navigate(-1)}>
                رجوع
              </button>
              <button
                type="button"
                className="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? "جاري الإرسال..." : `إرسال ${submissionLabel}`}
              </button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
