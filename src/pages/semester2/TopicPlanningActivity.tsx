import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../supabaseClient";
import { topics } from "../../data/topics";
import { topicPlanningInteractiveActivity } from "../../data/semester2Activities/topicPlanningActivity";
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
  "ابدأ بالعنوان والمقدمة لتحديد مدخل الموضوع.",
  "رتّب عناصر العرض مع مثال أو شاهد مناسب لكل عنصر.",
  "اختم بتوصية أو رأي مرتبط بما سبق.",
];

export default function TopicPlanningActivity() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const topic = topics.find((item) => item.id === topicId);
  const topicIds = useMemo(() => topics.map((item) => item.id), []);
  const activity = topicPlanningInteractiveActivity;

  const [session, setSession] = useState<Session | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [isVisibilityLoading, setIsVisibilityLoading] = useState(true);
  const [isSubmissionLoading, setIsSubmissionLoading] = useState(true);
  const [lessonVisibility, setLessonVisibility] = useState<LessonVisibility>(() =>
    getLessonVisibility(topicIds)
  );
  const [parts, setParts] = useState<string[]>(activity.parts);
  const [originalParts] = useState<string[]>(activity.parts);
  const [planText, setPlanText] = useState("");
  const [submission, setSubmission] = useState<ActivitySubmissionRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
        setPlanText(data.response_text ?? "");
      }

      setIsSubmissionLoading(false);
    };

    loadSubmission();
  }, [session, topic, activity.activityId]);

  const movePart = (index: number, direction: -1 | 1) => {
    setParts((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleGenerateDraft = () => {
    setPlanText(parts.join("\n"));
    setError(null);
    setNotice("تم إنشاء مسودة التصميم. راجع ترتيب العناصر وأضف أمثلة من عندك.");
  };

  const handleConfirmSubmit = async () => {
    if (!session || !topic) return;
    if (!planText.trim()) {
      setError("يرجى كتابة تصميم الموضوع قبل الإرسال.");
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
            response_text: planText,
            status: "submitted",
          },
          { onConflict: "student_id,topic_id,activity_id" }
        )
        .select("id, response_text, status")
        .maybeSingle();

      if (error) {
        setError("تعذر حفظ تصميم الموضوع. حاول مرة أخرى.");
        return;
      }

      setSubmission(data as ActivitySubmissionRow);
      setNotice("تم حفظ تصميم الموضوع بنجاح.");

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
          message: "تم تحديث تصميم الموضوع بنجاح.",
          tone: "info",
        });
      }

      if (timeTracker) {
        await timeTracker.endSession(true);
      }
    } catch (error) {
      console.error("Error in topic planning submission:", error);
      setError("حدث خطأ أثناء الإرسال. حاول مرة أخرى.");
    } finally {
      setIsSubmitting(false);
      setIsConfirmationOpen(false);
    }
  };

  const isSubmitted = submission?.status === "submitted";
  const isPageLoading = isSessionLoading || isVisibilityLoading || isSubmissionLoading;

  if (!topic || topic.id !== "topic-planning") {
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
        title="تأكيد إرسال تصميم الموضوع"
        message="هل أنت متأكد من أنك تريد إرسال تصميم الموضوع؟"
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
          <p>اتبع هذه الخطوات لبناء تصميم موضوع واضح قبل الكتابة.</p>
        </div>
        <ol className="activity-instructions-list">
          {quickSteps.map((step, index) => (
            <li key={`topic-planning-quick-step-${index}`}>{step}</li>
          ))}
        </ol>
      </section>

      <div className="report-assembly-grid">
        <section className="card report-assembly-card">
          <div className="report-assembly-card-header">
            <h2>بطاقات التصميم</h2>
            <p>رتّب العناصر حتى تصبح خطة الموضوع واضحة البداية والوسط والنهاية.</p>
          </div>

          <div className="report-parts-list">
            {parts.map((part, index) => (
              <div key={`topic-planning-part-${index}`} className="report-part">
                <div className="report-part-header">
                  <span>بطاقة {index + 1}</span>
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
              onClick={() => setParts(originalParts)}
            >
              إعادة الترتيب
            </button>
            <button type="button" className="button button-compact" onClick={handleGenerateDraft}>
              إنشاء مسودة
            </button>
          </div>
        </section>

        <section className="card report-assembly-card">
          <div className="report-assembly-card-header">
            <h2>كتابة تصميم الموضوع</h2>
            <p>{activity.prompt}</p>
          </div>

          {topic.writingPrompts?.list?.length > 0 && (
            <div className="report-prompts">
              <h3>{topic.writingPrompts.header}</h3>
              <p>يمكنك اختيار موضوع آخر وتطبيق التصميم عليه.</p>
              <ul>
                {topic.writingPrompts.list.slice(0, 3).map((prompt, index) => (
                  <li key={`${topic.id}-prompt-${index}`}>{prompt}</li>
                ))}
              </ul>
            </div>
          )}

          <textarea
            className="report-output"
            value={planText}
            onChange={(event) => setPlanText(event.target.value)}
            rows={14}
            placeholder="اكتب تصميم الموضوع هنا..."
          />

          {error && <div className="case-error">{error}</div>}
          {notice && <div className="case-success">{notice}</div>}
          {isSubmitted && <div className="muted-note">تم إرسال تصميم الموضوع.</div>}

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
              {isSubmitting ? "جاري الإرسال..." : "إرسال تصميم الموضوع"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
