import { useEffect, useMemo, useState, useCallback } from "react";
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
import { SkeletonHeader, SkeletonSection } from "../components/SkeletonBlocks";
import "../styles/FreeExpressionActivity.css";
import {
  SessionTimeTracker,
  confirmTracking,
  executeTracking,
  TrackingPayload,
} from "../utils/enhancedStudentTracking";
import ConfirmationDialog from "../components/ConfirmationDialog";

type ActivitySubmissionRow = {
  id: number;
  response_text: string | null;
  status: string | null;
};

type PromptType = "image" | "case" | "scenario" | "free";

type PromptCard = {
  id: string;
  type: PromptType;
  title: string;
  description: string;
  detail?: string;
  detailLabel?: string;
  imageUrl?: string;
  imageAlt?: string;
};

const PROMPT_LABELS: Record<PromptType, string> = {
  image: "صورة",
  case: "قضية",
  scenario: "سيناريو",
  free: "موضوع حر",
};

const PROMPT_PLACEHOLDERS: Record<PromptType, string> = {
  image: "اكتب وصفًا حرًا للمشهد وما يثيره فيك.",
  case: "اكتب رأيك في القضية مع ذكر الأسباب والأمثلة.",
  scenario: "اكتب ردك المناسب على السيناريو.",
  free: "اكتب تعبيرًا حرًا بصوتك الخاص.",
};

const pickPrompt = (items: string[] | undefined, fallback: string) => {
  if (!items || items.length === 0) return fallback;
  const trimmed = items.find((item) => !item.trim().endsWith(":"));
  return trimmed ?? items[0];
};

export default function FreeExpressionActivity() {
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
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>(null);
  const [slideIndex, setSlideIndex] = useState(0);
  const [responseText, setResponseText] = useState("");
  const [submission, setSubmission] = useState<ActivitySubmissionRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [sessionTimer, setSessionTimer] = useState<SessionTimeTracker | null>(null);

  useEffect(() => {
    if (session && topicId) {
      const tracker = new SessionTimeTracker(session.user.id, topicId, 'activity');
      tracker.startSession();
      setSessionTimer(tracker);

      return () => {
        tracker.endSession(false);
      };
    }
  }, [session, topicId]);

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

  const promptCards = useMemo(() => {
    const landscapeTopic = topics.find((t) => t.id === "landscape-description");
    const landscapeScene =
      landscapeTopic?.interactiveActivity?.type === "scene-choice"
        ? landscapeTopic.interactiveActivity.scenes[0]
        : null;

    const discussionTopic = topics.find((t) => t.id === "discussing-issue");
    const dialogueTopic = topics.find((t) => t.id === "dialogue-text");
    const freeTopic = topics.find((t) => t.id === "free-expression");

    const casePrompt = pickPrompt(
      discussionTopic?.writingPrompts?.list,
      "اختر قضية وعبّر عن رأيك فيها."
    );
    const scenarioPrompt = pickPrompt(
      dialogueTopic?.writingPrompts?.list,
      "اقرأ السيناريو ثم اكتب ردك المناسب."
    );
    const freePrompt = pickPrompt(
      freeTopic?.writingPrompts?.list,
      "اكتب تعبيرًا حرًا عن تجربة أو موقف أثر فيك."
    );

    return [
      {
        id: "image",
        type: "image",
        title: "تعبير عن صورة",
        description: "تأمل الصورة ثم اكتب تعبيرًا حرًا يصف المشهد ومشاعرك.",
        detail: landscapeScene?.scene,
        detailLabel: "المشهد",
        imageUrl: landscapeScene?.imageUrl,
        imageAlt: landscapeScene?.imageAlt ?? "صورة طبيعية",
      },
      {
        id: "case",
        type: "case",
        title: "قضية للنقاش",
        description: "اكتب رأيك في القضية مع ذكر أسبابك وأمثلتك.",
        detail: casePrompt,
        detailLabel: "القضية",
      },
      {
        id: "scenario",
        type: "scenario",
        title: "سيناريو حواري",
        description: "اقرأ السيناريو ثم اكتب ردك بأسلوب واضح ومحترم.",
        detail: scenarioPrompt,
        detailLabel: "السيناريو",
      },
      {
        id: "free",
        type: "free",
        title: "موضوع حر",
        description: "اختر الفكرة ثم اكتب تعبيرًا حرًا بصوتك الخاص.",
        detail: freePrompt,
        detailLabel: "فكرة مقترحة",
      },
    ] as PromptCard[];
  }, []);

  useEffect(() => {
    if (promptCards.length === 0) return;
    if (!selectedPromptId || !promptCards.some((prompt) => prompt.id === selectedPromptId)) {
      setSelectedPromptId(promptCards[0].id);
    }
  }, [promptCards, selectedPromptId]);

  const selectedPrompt = useMemo(
    () => promptCards.find((prompt) => prompt.id === selectedPromptId) ?? promptCards[0],
    [promptCards, selectedPromptId]
  );
  const promptIndex = Math.max(
    0,
    promptCards.findIndex((prompt) => prompt.id === selectedPrompt?.id)
  );
  const slideSteps = useMemo(
    () => [
      { id: "choose", title: "اختيار المحفز" },
      { id: "preview", title: "معاينة المحفز" },
      { id: "write", title: "كتابة التعبير" },
    ],
    []
  );

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
        setResponseText(data.response_text ?? "");
      }
      setIsSubmissionLoading(false);
    };

    loadSubmission();
  }, [session, topic, interactiveActivity]);

  const submissionLabel = "التعبير الحر";
  const placeholderMap = PROMPT_PLACEHOLDERS;
  const isSubmitted = submission?.status === "submitted";
  const isPageLoading = isSessionLoading || isVisibilityLoading || isSubmissionLoading;

  const handleConfirmSubmit = useCallback(async () => {
    if (!interactiveActivity || !session || !topic) return;
    if (!responseText.trim()) {
      setError("يرجى كتابة التعبير قبل الإرسال.");
      setShowConfirmation(false);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setNotice(null);
    const hadSubmission = submission?.status === "submitted";

    try {
      // Create tracking confirmation
      const payload: TrackingPayload = {
        studentId: session.user.id,
        topicId: topic.id,
        trackingType: 'activity',
        activityId: interactiveActivity.activityId,
        metadata: {
          activityTitle: interactiveActivity.title,
          timestamp: new Date().toISOString(),
        },
      };

      const { data: confirmData, error: confirmError } = await supabase
        .from('tracking_confirmations')
        .insert({
          student_id: payload.studentId,
          tracking_type: payload.trackingType,
          topic_id: payload.topicId,
          activity_id: payload.activityId,
          is_confirmed: false,
          data_quality_score: 100,
          validation_status: 'valid',
          confirmation_data: payload.metadata || {},
        })
        .select('id')
        .single();

      if (confirmError || !confirmData) {
        console.error('Failed to create tracking confirmation:', confirmError);
      }

      // Save submission
      const { data, error } = await supabase
        .from("activity_submissions")
        .upsert(
          {
            student_id: session.user.id,
            topic_id: topic.id,
            activity_id: interactiveActivity.activityId,
            response_text: responseText,
            status: "submitted",
          },
          { onConflict: "student_id,topic_id,activity_id" }
        )
        .select("id, response_text, status")
        .single();

      if (error) {
        setError("حدث خطأ أثناء حفظ التعبير.");
        setIsSubmitting(false);
        setShowConfirmation(false);
        return;
      }

      setSubmission(data as ActivitySubmissionRow);
      setNotice("تم حفظ التعبير بنجاح.");

      if (!hadSubmission) {
        // Execute tracking
        await executeTracking({
          studentId: session.user.id,
          topicId: topic.id,
          trackingType: 'activity',
          activityId: interactiveActivity.activityId,
        });

        // Confirm tracking
        if (confirmData) {
          await confirmTracking(confirmData.id, async () => {
            // Additional confirmation logic if needed
          });
        }

        await logAdminNotification({
          recipientId: session.user.id,
          actorId: session.user.id,
          actorRole: "student",
          message: `تم منحك 5 نقاط لإكمال ${submissionLabel}.`,
          category: "points",
        });

        emitAchievementToast({
          title: "تم احتساب النقاط",
          message: "تمت إضافة 5 نقاط إلى رصيدك.",
          points: 5,
          tone: "success",
        });
      } else {
        emitAchievementToast({
          title: "تم تحديث التعبير",
          message: "تم تحديث التعبير بنجاح.",
          tone: "info",
        });
      }

      if (sessionTimer) {
        await sessionTimer.endSession(true);
      }

      setShowConfirmation(false);
    } catch (error) {
      console.error('Error in submission:', error);
      setError('حدث خطأ أثناء الإرسال. حاول مرة أخرى.');
    } finally {
      setIsSubmitting(false);
    }
  }, [interactiveActivity, session, topic, responseText, submission, sessionTimer, submissionLabel]);

  const handleSubmit = () => {
    setShowConfirmation(true);
  }

  const handlePrevPrompt = () => {
    if (promptCards.length === 0 || promptIndex <= 0) return;
    setSelectedPromptId(promptCards[promptIndex - 1].id);
  };

  const handleNextPrompt = () => {
    if (promptCards.length === 0 || promptIndex >= promptCards.length - 1) return;
    setSelectedPromptId(promptCards[promptIndex + 1].id);
  };

  const handlePrevSlide = () => {
    setSlideIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleNextSlide = () => {
    setSlideIndex((prev) => Math.min(prev + 1, slideSteps.length - 1));
  };

  if (!topic) {
    return (
      <div className="free-expression-page" dir="rtl">
        <div className="card">
          <h1 className="page-title">الدرس غير متاح.</h1>
          <button className="button" onClick={() => navigate(-1)}>
            رجوع
          </button>
        </div>
      </div>
    );
  }

  if (isPageLoading) {
    return (
      <div className="free-expression-page" dir="rtl">
        <header className="free-expression-header page-header">
          <SkeletonHeader titleWidthClass="skeleton-w-40" subtitleWidthClass="skeleton-w-70" />
        </header>
        <div className="free-expression-slide-frame">
          <SkeletonSection lines={4} />
          <SkeletonSection lines={3} />
        </div>
      </div>
    );
  }

  if (!interactiveActivity) {
    return (
      <div className="free-expression-page" dir="rtl">
        <div className="card">
          <h1 className="page-title">لا يوجد نشاط تفاعلي لهذا الدرس.</h1>
          <button className="button" onClick={() => navigate(-1)}>
            رجوع
          </button>
        </div>
      </div>
    );
  }

  const isActivityActive = lessonVisibility[topic.id]?.activity ?? true;
  if (!isActivityActive) {
    return (
      <div className="free-expression-page" dir="rtl">
        <div className="card">
          <h1 className="page-title">هذا النشاط غير متاح حاليًا.</h1>
          <button className="button" onClick={() => navigate(-1)}>
            رجوع
          </button>
        </div>
      </div>
    );
  }

  const tutorialPath = `/activity/${topic.id}/tutorial`;

  return (
    <div className="free-expression-page" dir="rtl">
      <header className="free-expression-header page-header">
        <div className="free-expression-header-row">
          <div>
            <h1 className="page-title">
              {topic.interactiveActivity?.title ?? "نشاط التعبير الحر"}: {topic.title}
            </h1>
            <p className="page-subtitle">
              اختر محفزًا من الأنواع المختلفة ثم اكتب تعبيرًا حرًا يعكس رأيك أو وصفك.
            </p>
          </div>
          <div className="free-expression-header-actions">
            <button
              type="button"
              className="button button-compact"
              onClick={() => navigate(tutorialPath)}
            >
              شرح النشاط
            </button>
          </div>
        </div>
      </header>

      <nav className="free-expression-stepper" aria-label="مراحل نشاط التعبير الحر">
        {slideSteps.map((step, index) => (
          <button
            key={step.id}
            type="button"
            className={`free-expression-step-btn${index === slideIndex ? " active" : ""}`}
            onClick={() => setSlideIndex(index)}
            aria-pressed={index === slideIndex}
          >
            <span className="free-expression-step-index">{index + 1}</span>
            <span className="free-expression-step-title">{step.title}</span>
          </button>
        ))}
      </nav>

      <div className="free-expression-slide-frame" aria-live="polite">
        {slideIndex === 0 && (
          <section className="card free-expression-card free-expression-slide" aria-label="اختيار المحفز">
            <h2 className="free-expression-slide-title">اختيار المحفز</h2>
            <div className="prompt-carousel">
              <div className="prompt-carousel-actions">
                <button
                  type="button"
                  className="button button-compact free-expression-arrow"
                  onClick={handlePrevPrompt}
                  disabled={promptIndex <= 0}
                  aria-label={"\u0627\u0644\u0633\u0627\u0628\u0642"}
                  title={"\u0627\u0644\u0633\u0627\u0628\u0642"}
                >
                  {"\u2192"}
                </button>
                <span className="prompt-carousel-count">
                  المحفز {promptIndex + 1}/{promptCards.length}
                </span>
                <button
                  type="button"
                  className="button button-compact free-expression-arrow"
                  onClick={handleNextPrompt}
                  disabled={promptIndex >= promptCards.length - 1}
                  aria-label={"\u0627\u0644\u062a\u0627\u0644\u064a"}
                  title={"\u0627\u0644\u062a\u0627\u0644\u064a"}
                >
                  {"\u2190"}
                </button>
              </div>
              <div className="prompt-carousel-card">
                <button
                  type="button"
                  className="prompt-card active"
                  onClick={() => setSelectedPromptId(selectedPrompt.id)}
                  aria-pressed="true"
                >
                  <div className="prompt-card-row">
                    <span className={`prompt-type ${selectedPrompt.type}`}>
                      {PROMPT_LABELS[selectedPrompt.type]}
                    </span>
                    <span className="prompt-title">{selectedPrompt.title}</span>
                  </div>
                  <div className="prompt-description">{selectedPrompt.description}</div>
                  {selectedPrompt.imageUrl && (
                    <img
                      className="prompt-thumb"
                      src={selectedPrompt.imageUrl}
                      alt={selectedPrompt.imageAlt ?? ""}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  )}
                </button>
              </div>
            </div>
          </section>
        )}

        {slideIndex === 1 && (
          <section className="card free-expression-card free-expression-slide" aria-label="معاينة المحفز">
            <h2 className="free-expression-slide-title">معاينة المحفز</h2>
            <div className="prompt-preview">
              <div className="prompt-preview-header">
                <span className={`prompt-type ${selectedPrompt.type}`}>
                  {PROMPT_LABELS[selectedPrompt.type]}
                </span>
                <div className="prompt-title">{selectedPrompt.title}</div>
                <div className="prompt-description">{selectedPrompt.description}</div>
              </div>
              {selectedPrompt.detail && (
                <div className="prompt-detail">
                  <span className="prompt-detail-label">
                    {selectedPrompt.detailLabel ?? "المحفز"}
                  </span>
                  <span>{selectedPrompt.detail}</span>
                </div>
              )}
              {selectedPrompt.imageUrl && (
                <img
                  className="prompt-preview-image"
                  src={selectedPrompt.imageUrl}
                  alt={selectedPrompt.imageAlt ?? ""}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
          </section>
        )}

        {slideIndex === 2 && (
          <section className="card free-expression-card free-expression-slide" aria-label="كتابة التعبير">
            <h2 className="free-expression-slide-title">كتابة التعبير</h2>
            <div className="free-expression-editor">
              <label className="free-expression-label" htmlFor="free-expression-text">
                مساحة الكتابة
              </label>
              <textarea
                id="free-expression-text"
                value={responseText}
                onChange={(event) => setResponseText(event.target.value)}
                placeholder={placeholderMap[selectedPrompt.type]}
              />
              {error && <div className="free-expression-alert is-error">{error}</div>}
              {notice && <div className="free-expression-alert is-success">{notice}</div>}
              {isSubmitted && <div className="prompt-description">تم إرسال التعبير.</div>}
              <div className="free-expression-actions">
                <button type="button" className="button" onClick={() => navigate(-1)}>
                  رجوع
                </button>
                <button
                  type="button"
                  className="button button-primary"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "جاري الإرسال..." : "إرسال التعبير"}
                </button>
              </div>
            </div>
          </section>
        )}
      </div>

      <div className="free-expression-slide-actions">
        <button
          type="button"
          className="button button-compact"
          onClick={handlePrevSlide}
          disabled={slideIndex === 0}
        >
          {"\u0627\u0644\u0633\u0627\u0628\u0642"}
        </button>
        <span className="free-expression-slide-count">
          المرحلة {slideIndex + 1}/{slideSteps.length}
        </span>
        <button
          type="button"
          className="button button-compact"
          onClick={handleNextSlide}
          disabled={slideIndex === slideSteps.length - 1}
        >
          {"\u0627\u0644\u062a\u0627\u0644\u064a"}
        </button>
      </div>

      <ConfirmationDialog
        isOpen={showConfirmation}
        onCancel={() => setShowConfirmation(false)}
        onConfirm={handleConfirmSubmit}
        title="تأكيد إرسال التعبير"
        message="هل أنت متأكد من أنك تريد إرسال هذا التعبير؟"
        loading={isSubmitting}
      />
    </div>
  );
}
