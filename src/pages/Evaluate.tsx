import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { topics, WritingSection } from "../data/topics";
import { rubrics } from "../data/rubrics";
import { getAIAnalysis } from "../services/aiEvaluationService";
import { LessonVisibility } from "../utils/lessonSettings";
import "../styles/Evaluate.css";
import { Session } from "@supabase/supabase-js";
import { logAdminNotification } from "../utils/adminNotifications";
import { emitAchievementToast } from "../utils/achievementToast";
import { SkeletonHeader, SkeletonSection } from "../components/SkeletonBlocks";
import {
  SessionTimeTracker,
  confirmTracking,
  rejectTracking,
  executeTracking,
  TrackingPayload,
} from "../utils/enhancedStudentTracking";
import ConfirmationDialog from "../components/ConfirmationDialog";

type WritingValues = { [key: string]: string };

export default function Evaluate() {
  const navigate = useNavigate();
  const { topicId } = useParams<{ topicId: string }>();
  const topic = topics.find((t) => t.id === topicId);
  const rubric = rubrics.find((r) => r.topicId === topicId);
  const topicIds = useMemo(() => topics.map((t) => t.id), []);

  const [lessonVisibility, setLessonVisibility] = useState<LessonVisibility>(() => {
    const defaults: LessonVisibility = {};
    topicIds.forEach((id) => {
      defaults[id] = {
        lesson: false,
        review: false,
        evaluation: true,
        activity: false
      };
    });
    return defaults;
  });

  const initialWritingValues = topic?.writingSections
    ? topic.writingSections.reduce((acc: WritingValues, section: WritingSection) => ({ ...acc, [section.id]: "" }), {})
    : { main: "" };
  const [writingValues, setWritingValues] = useState<WritingValues>(initialWritingValues);

  const [isEvaluating, setIsEvaluating] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<{ full_name: string; grade: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeTracker, setTimeTracker] = useState<SessionTimeTracker | null>(null);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [pendingConfirmationId, setPendingConfirmationId] = useState<number | null>(null);
  const [confirmationDetails, setConfirmationDetails] = useState<string[]>([]);
  const [isConfirming, setIsConfirming] = useState(false);
  const [pendingEvaluationData, setPendingEvaluationData] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

  useEffect(() => {
    if (session && topicId) {
      const tracker = new SessionTimeTracker(session.user.id, topicId, 'evaluation');
      tracker.startSession();
      setTimeTracker(tracker);

      return () => {
        tracker.endSession(false);
      };
    }
  }, [session, topicId]);

  useEffect(() => {
    const loadLessonVisibilitySettings = async () => {
      setIsLoading(true);
      if (!session || !topic) {
        setIsLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, added_by_teacher_id, full_name, grade")
        .eq("id", session.user.id)
        .single();

      if (profileError) {
        setIsLoading(false);
        return;
      }

      setUserProfile({ full_name: profile.full_name, grade: profile.grade });

      const teacherId =
        profile?.role === "teacher" || profile?.role === "admin"
          ? session.user.id
          : profile?.added_by_teacher_id;

      if (!teacherId) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("lesson_visibility_settings")
        .select("topic_id, settings")
        .eq("teacher_id", teacherId);

      if (error) {
        setIsLoading(false);
        return;
      }

      const updatedVisibility: LessonVisibility = {
        ...lessonVisibility,
      };

      (data || []).forEach((row) => {
        updatedVisibility[row.topic_id] = {
          lesson: row.settings?.lesson ?? false,
          review: row.settings?.review ?? false,
          evaluation: row.settings?.evaluation ?? true,
          activity: row.settings?.activity ?? false,
        };
      });

      setLessonVisibility(updatedVisibility);
      setIsLoading(false);
    };

    loadLessonVisibilitySettings();
  }, [session, topic, topicIds]);

  const handleInputChange = (id: string, value: string) => {
    setWritingValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleEvaluate = async () => {
    if (!session) {
      alert("الرجاء تسجيل الدخول أولاً للمتابعة.");
      return;
    }
    if (!topic || !rubric) {
      alert("لم يتم العثور على الموضوع أو معايير التقييم. لا يمكن المتابعة.");
      return;
    }

    const isTextProvided = Object.values(writingValues).some(value => value.trim() !== "");
    if (!isTextProvided) {
      alert("الرجاء إدخال النص أولاً في قسم واحد على الأقل.");
      return;
    }

    setIsEvaluating(true);

    try {
      const aiResult = await getAIAnalysis(writingValues, rubric, {
        topicTitle: topic.title,
        evaluationTask: topic.evaluationTask.description,
        evaluationMode: topic.evaluationTask.mode,
        writingSections: topic.writingSections,
        studentName: userProfile?.full_name,
        studentGrade: userProfile?.grade,
      });

      // Store evaluation data for confirmation
      setPendingEvaluationData({
        writingValues,
        aiResult,
        topicTitle: topic.title,
        topicId: topic.id,
      });

      // Create tracking confirmation
      const payload: TrackingPayload = {
        studentId: session.user.id,
        topicId: topic.id,
        trackingType: 'evaluation',
        score: aiResult.score,
        metadata: {
          topicTitle: topic.title,
          timestamp: new Date().toISOString(),
        },
      };

      const { data, error } = await supabase
        .from('tracking_confirmations')
        .insert({
          student_id: payload.studentId,
          tracking_type: payload.trackingType,
          topic_id: payload.topicId,
          is_confirmed: false,
          data_quality_score: 100,
          validation_status: 'valid',
          confirmation_data: payload.metadata || {},
        })
        .select('id')
        .single();

      if (error || !data) {
        console.error('Failed to create tracking confirmation:', error);
        setIsEvaluating(false);
        return;
      }

      setPendingConfirmationId(data.id);
      setConfirmationDetails([
        `الموضوع: ${topic.title}`,
        `الدرجة: ${aiResult.score}`,
        `النقاط: 10`,
      ]);
      setIsConfirmationOpen(true);
      setIsEvaluating(false);

    } catch (error: any) {
      console.error("Evaluation process failed:", error);
      alert(`فشلت عملية التقييم. يرجى المحاولة مرة أخرى. الخطأ: ${error.message}`);
      setIsEvaluating(false);
    }
  };

  const handleConfirmEvaluation = async () => {
    if (!session || !topic || !pendingConfirmationId || !pendingEvaluationData) return;

    setIsConfirming(true);

    try {
      // Save submission
      const { data: newSubmission, error: submissionError } = await supabase
        .from("submissions")
        .insert({
          student_id: session.user.id,
          topic_title: pendingEvaluationData.topicTitle,
          submission_data: pendingEvaluationData.writingValues,
          ai_response: pendingEvaluationData.aiResult,
          ai_grade: pendingEvaluationData.aiResult.score
        })
        .select("id")
        .single();

      if (submissionError) {
        throw submissionError;
      }

      // Execute tracking
      await executeTracking({
        studentId: session.user.id,
        topicId: topic.id,
        trackingType: 'evaluation',
        score: pendingEvaluationData.aiResult.score,
      });

      // Confirm in database
      await confirmTracking(pendingConfirmationId, async () => {
        // Additional confirmation logic if needed
      });

      // Log notification
      await logAdminNotification({
        recipientId: session.user.id,
        actorId: session.user.id,
        actorRole: "student",
        message: "تم تسليم الكتابة وحصلت على 10 نقاط.",
        category: "points",
      });

      emitAchievementToast({
        title: "تم احتساب النقاط",
        message: "تم منحك 10 نقاط لإكمال التقييم.",
        points: 10,
        tone: "success",
      });

      if (typeof pendingEvaluationData.aiResult.score === "number" && pendingEvaluationData.aiResult.score >= 85) {
        emitAchievementToast({
          title: "نتيجة مميزة",
          message: `درجة ممتازة! حصلت على ${pendingEvaluationData.aiResult.score} في التقييم.`,
          tone: "info",
        });
      }

      // End session
      if (timeTracker) {
        await timeTracker.endSession(true);
      }

      setIsConfirmationOpen(false);
      if (newSubmission) {
        navigate(`/submission/${newSubmission.id}`);
      }
    } catch (error: any) {
      console.error("Confirmation failed:", error);
      alert(`فشلت عملية التأكيد. يرجى المحاولة مرة أخرى. الخطأ: ${error.message}`);
    } finally {
      setIsConfirming(false);
    }
  };

  const handleCancelConfirmation = async () => {
    if (pendingConfirmationId) {
      await rejectTracking(pendingConfirmationId);
    }
    setIsConfirmationOpen(false);
    setPendingConfirmationId(null);
    setPendingEvaluationData(null);
  };

  if (!topic) {
    return <div className="evaluate-page" dir="rtl">الموضوع غير موجود</div>;
  }

  if (isLoading) {
    return (
      <div className="evaluate-page" dir="rtl">
        <header className="evaluate-header page-header">
          <SkeletonHeader titleWidthClass="skeleton-w-40" subtitleWidthClass="skeleton-w-70" />
        </header>
        <div className="evaluate-content-wrapper">
          <div className="vertical-stack">
            <SkeletonSection lines={4} />
            <SkeletonSection lines={4} />
          </div>
          <div className="vertical-stack">
            <SkeletonSection lines={5} />
          </div>
        </div>
      </div>
    );
  }

  if (!(lessonVisibility[topic.id]?.evaluation ?? true)) {
    return (
      <div className="evaluate-page" dir="rtl">
        <header className="evaluate-header page-header">
          <h1>قسم الكتابة والتقييم غير متاح حاليًا</h1>
          <p>تم إيقاف هذا القسم من قبل المعلم. يرجى الرجوع لاحقًا.</p>
        </header>
        <div className="page-actions">
          <button className="button button-secondary" onClick={() => navigate("/")}>
            <i className="fas fa-arrow-right"></i> العودة إلى قائمة المواضيع
          </button>
        </div>
      </div>
    );
  }

  const evaluationTitle =
    topic.evaluationTask.mode === "discussion"
      ? "تقييم المناقشة"
      : topic.evaluationTask.mode === "dialogue"
        ? "تقييم الحوار"
        : topic.evaluationTask.mode === "report"
          ? "تقييم التقرير"
          : "تقييم الكتابة";

  const sectionsToRender = topic.writingSections || [{ id: "main", title: "النص الرئيسي", placeholder: "اكتب النص هنا...", description: "" }];

  return (
    <div className="evaluate-page" dir="rtl">
      <ConfirmationDialog
        isOpen={isConfirmationOpen}
        title="تأكيد تسليم التقييم"
        message="هل أنت متأكد من أنك تريد تسليم التقييم؟"
        details={confirmationDetails}
        onConfirm={handleConfirmEvaluation}
        onCancel={handleCancelConfirmation}
        loading={isConfirming}
      />

      <header className="evaluate-header page-header">
        <h1 className="page-title">{evaluationTitle}: {topic.title}</h1>
        <p>املأ الأقسام أدناه واحصل على تقييم فوري بناءً على المعايير الموضحة.</p>
      </header>

      <div className="evaluate-content-wrapper">
        <div className="vertical-stack">
          <section className="card rubric-area evaluate-section">
            <h2><i className="fas fa-clipboard-check"></i> {topic.evaluationTask.title}</h2>
            <p>{topic.evaluationTask.description}</p>
            {topic.evaluationTask.mode === "discussion" && (
              <p className="text-note">هذه المهمة تركّز على وضوح الحجة والاحترام في عرض الرأي.</p>
            )}
            {topic.evaluationTask.mode === "dialogue" && (
              <p className="text-note">هذه المهمة تركّز على سلاسة الحوار ووضوح الأصوات.</p>
            )}
            {topic.evaluationTask.mode === "report" && (
              <p className="text-note">هذه المهمة تركّز على التنظيم والموضوعية في عرض المعلومات.</p>
            )}
          </section>

          <div className="card evaluation-area evaluate-section">
            {sectionsToRender.map((section) => (
              <div key={section.id} className="writing-section">
                <label htmlFor={section.id}>{section.title}</label>
                {section.description && (
                  <p className="writing-section-description">{section.description}</p>
                )}
                <textarea
                  id={section.id}
                  className="text-editor"
                  placeholder={section.placeholder}
                  value={writingValues[section.id] || ""}
                  onChange={(e) => handleInputChange(section.id, e.target.value)}
                  rows={section.id === "main" ? 15 : 5}
                  disabled={isEvaluating}
                ></textarea>
              </div>
            ))}
            <button onClick={handleEvaluate} disabled={isEvaluating} className="button button-primary cta-button">
              {isEvaluating ? "...جاري التقييم" : "قيّم النص الآن"}
            </button>
          </div>
        </div>

        <div className="vertical-stack">
          {rubric && (
            <section className="card rubric-area evaluate-section">
              <h2><i className="fas fa-tasks"></i> معايير التقييم</h2>
              <div className="rubric-table-wrapper">
                <table className="rubric-table">
                  <thead>
                    <tr>
                      <th>المعيار</th>
                      {rubric.criteria[0]?.levels.map((level) => (
                        <th key={level.id}>
                          {level.label}
                          <span className="rubric-level-score">({level.score})</span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rubric.criteria.map((criterion) => (
                      <tr key={criterion.id}>
                        <td className="rubric-criterion-cell">
                          <strong>{criterion.name}</strong>
                          <p>{criterion.description}</p>
                        </td>
                        {criterion.levels.map((level) => (
                          <td key={level.id}>
                            <div className="rubric-level-info">
                              <span className="rubric-level-label">{level.label}</span>
                              <span className="rubric-level-description">{level.description}</span>
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </div>

      {isEvaluating && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>...يتم الآن تحليل النص بواسطة الذكاء الاصطناعي</p>
        </div>
      )}

      <div className="page-actions">
        <button className="button button-secondary" onClick={() => navigate(-1)}><i className="fas fa-arrow-right"></i> رجوع</button>
        <button className="button button-light" onClick={() => navigate(`/my-submissions`)}>عرض كل كتاباتي</button>
      </div>
    </div>
  );
}
