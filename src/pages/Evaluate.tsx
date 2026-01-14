import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { topics, WritingSection } from "../data/topics";
import { rubrics } from "../data/rubrics";
import { getAIAnalysis } from "../services/aiEvaluationService";
import { isLessonSectionActive } from "../utils/lessonSettings";
import "../styles/Evaluate.css";
import { Session } from "@supabase/supabase-js";
import { logAdminNotification } from "../utils/adminNotifications";

type WritingValues = { [key: string]: string };

export default function Evaluate() {
  const navigate = useNavigate();
  const { topicId } = useParams<{ topicId: string }>();
  const topic = topics.find((t) => t.id === topicId);
  const rubric = rubrics.find((r) => r.topicId === topicId);
  const topicIds = useMemo(() => topics.map((t) => t.id), []);

  const initialWritingValues = topic?.writingSections
    ? topic.writingSections.reduce((acc: WritingValues, section: WritingSection) => ({ ...acc, [section.id]: "" }), {})
    : { main: "" };
  const [writingValues, setWritingValues] = useState<WritingValues>(initialWritingValues);

  const [isEvaluating, setIsEvaluating] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });
  }, []);

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
      // 1. Get the real AI analysis
      const aiResult = await getAIAnalysis(writingValues, rubric, {
        topicTitle: topic.title,
        evaluationTask: topic.evaluationTask.description,
        evaluationMode: topic.evaluationTask.mode,
        writingSections: topic.writingSections,
      });

      // 2. Save submission with the correct schema and get the new ID
      const { data: newSubmission, error: submissionError } = await supabase
        .from("submissions")
        .insert({
          student_id: session.user.id,
          topic_title: topic.title, // Use topic_title instead of topic_id
          submission_data: writingValues,
          ai_response: aiResult,
          ai_grade: aiResult.score
        })
        .select("id")
        .single();

      if (submissionError) {
        // Throw the specific error from Supabase to be caught below
        throw submissionError;
      }
      
      // 3. Navigate to the new submission review page on success
      if (newSubmission) {
          await logAdminNotification({
            recipientId: session.user.id,
            actorId: session.user.id,
            actorRole: "student",
            message: "تم تسليم الكتابة وحصلت على 10 نقاط.",
            category: "points",
          });
          navigate(`/submission/${newSubmission.id}`);
      }

    } catch (error: any) {
      // Catch and log the specific error
      console.error("Evaluation process failed:", error);
      alert(`فشلت عملية التقييم. يرجى المحاولة مرة أخرى. الخطأ: ${error.message}`);
    } finally {
      setIsEvaluating(false);
    }
  };

  if (!topic) {
    return <div className="evaluate-page" dir="rtl">الموضوع غير موجود</div>;
  }

  if (!isLessonSectionActive(topicIds, topic.id, "evaluation")) {
    return (
      <div className="evaluate-page" dir="rtl">
        <header className="evaluate-header">
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
      <header className="evaluate-header">
        <h1>{evaluationTitle}: {topic.title}</h1>
        <p>املأ الأقسام أدناه واحصل على تقييم فوري بناءً على المعايير الموضحة.</p>
      </header>

      <section className="card rubric-area">
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

      {rubric && (
        <section className="card rubric-area">
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

      <div className="card evaluation-area">
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
                    value={writingValues[section.id] || ''}
                    onChange={(e) => handleInputChange(section.id, e.target.value)}
                    rows={section.id === 'main' ? 15 : 5}
                    disabled={isEvaluating}
                ></textarea>
            </div>
        ))}
        <button onClick={handleEvaluate} disabled={isEvaluating} className="button button-primary cta-button">
          {isEvaluating ? "...جاري التقييم" : "قيّم النص الآن"}
        </button>
      </div>

      {isEvaluating && <div className="loading-indicator"><div className="spinner"></div><p>...يتم الآن تحليل النص بواسطة الذكاء الاصطناعي</p></div>}

      <div className="page-actions">
        <button className="button button-secondary" onClick={() => navigate(-1)}><i className="fas fa-arrow-right"></i> رجوع</button>
        <button className="button button-light" onClick={() => navigate(`/my-submissions`)}>عرض كل كتاباتي</button>
      </div>
    </div>
  );
}
