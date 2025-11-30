import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { topics, WritingSection } from "../data/topics";
import { rubrics } from "../data/rubrics";
import { getAIAnalysis } from "../services/aiEvaluationService";
import "../styles/Evaluate.css";
import { Session } from "@supabase/supabase-js";

type WritingValues = { [key: string]: string };

export default function Evaluate() {
  const navigate = useNavigate();
  const { topicId } = useParams<{ topicId: string }>();
  const topic = topics.find((t) => t.id === topicId);
  const rubric = rubrics.find((r) => r.topicId === topicId);

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
      const aiResult = await getAIAnalysis(writingValues, rubric);

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

  const sectionsToRender = topic.writingSections || [{ id: "main", title: "النص الرئيسي", placeholder: "اكتب النص هنا..." }];

  return (
    <div className="evaluate-page" dir="rtl">
      <header className="evaluate-header">
        <h1>تقييم الكتابة: {topic.title}</h1>
        <p>املأ الأقسام أدناه واحصل على تقييم فوري بناءً على المعايير الموضحة.</p>
      </header>

      {rubric && (
        <section className="card rubric-area">
          <h2><i className="fas fa-tasks"></i> معايير التقييم</h2>
          <div className="rubric-criteria">
            {rubric.criteria.map((criterion) => (
              <details key={criterion.id} className="criterion">
                <summary><strong>{criterion.name}</strong></summary>
                <div className="criterion-details">
                  <p>{criterion.description}</p>
                  <ul>
                    {criterion.levels.map(level => (
                      <li key={level.id}><strong>{level.label}:</strong> {level.description}</li>
                    ))}
                  </ul>
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <div className="card evaluation-area">
        {sectionsToRender.map((section) => (
            <div key={section.id} className="writing-section">
                <label htmlFor={section.id}>{section.title}</label>
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
