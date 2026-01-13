import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { topics } from "../data/topics"; // استيراد البيانات الجديدة
import { supabase } from "../supabaseClient";
import { getLessonProgress, isLessonSectionActive } from "../utils/lessonSettings";
import "../styles/Topics.css";

export default function Topics() {
  const navigate = useNavigate();
  const topicIds = useMemo(() => topics.map((topic) => topic.id), []);
  const [progressMap, setProgressMap] = useState(() => getLessonProgress(topicIds));
  const [submissionStatus, setSubmissionStatus] = useState<Record<string, { hasSubmission: boolean; hasRating: boolean }>>({});
  const [isLoading, setIsLoading] = useState(true);
  const topicImages: Record<string, string> = {
    "landscape-description":
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    "discussing-issue":
      "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80",
    "report-writing":
      "https://images.unsplash.com/photo-1491841573634-28140fc7ced7?auto=format&fit=crop&w=1200&q=80",
    "free-expression":
      "https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&w=1200&q=80",
    "dialogue-text":
      "https://images.unsplash.com/photo-1529070538774-1843cb3265df?auto=format&fit=crop&w=1200&q=80",
  };

  useEffect(() => {
    const fetchProgress = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from("submissions")
        .select("topic_title, teacher_response")
        .eq("student_id", session.user.id);

      const statusMap: Record<string, { hasSubmission: boolean; hasRating: boolean }> = {};
      const titleToId = topics.reduce<Record<string, string>>((acc, topic) => {
        acc[topic.title] = topic.id;
        return acc;
      }, {});

      (data || []).forEach((submission) => {
        const topicId = titleToId[submission.topic_title];
        if (!topicId) return;
        statusMap[topicId] = statusMap[topicId] || { hasSubmission: false, hasRating: false };
        statusMap[topicId].hasSubmission = true;
        if (submission.teacher_response) {
          statusMap[topicId].hasRating = true;
        }
      });

      setSubmissionStatus(statusMap);
      setProgressMap(getLessonProgress(topicIds));
      setIsLoading(false);
    };

    fetchProgress();
  }, [topicIds]);

  return (
    <div className="topics-page" dir="rtl">
      <header className="topics-header">
        <h1>موضوعات الكتابة</h1>
        <p>اختر موضوعًا لتبدأ رحلتك في عالم التعبير والإبداع.</p>
      </header>

      <section className="topic-dashboard card">
        <h2>لوحة التقدم</h2>
        <p>ملخص تقدّمك العام في الدروس والتسليمات والتقييمات.</p>
        <div className="topic-dashboard-grid">
          <div className="topic-dashboard-item">
            <span className="topic-dashboard-label">الدروس المكتملة</span>
            <span className="topic-dashboard-value">
              {Object.values(progressMap).filter((item) => item.lessonCompleted).length}/{topics.length}
            </span>
          </div>
          <div className="topic-dashboard-item">
            <span className="topic-dashboard-label">التسليمات</span>
            <span className="topic-dashboard-value">
              {Object.values(submissionStatus).filter((item) => item.hasSubmission).length}/{topics.length}
            </span>
          </div>
          <div className="topic-dashboard-item">
            <span className="topic-dashboard-label">التقييمات من المعلم</span>
            <span className="topic-dashboard-value">
              {Object.values(submissionStatus).filter((item) => item.hasRating).length}/{topics.length}
            </span>
          </div>
        </div>
      </section>

      <div className="topics-grid">
        {topics.map((topic) => {
          const lessonCompleted = progressMap[topic.id]?.lessonCompleted ?? false;
          const hasSubmission = submissionStatus[topic.id]?.hasSubmission ?? false;
          const hasRating = submissionStatus[topic.id]?.hasRating ?? false;
          const isLessonActive = isLessonSectionActive(topicIds, topic.id, "lesson");
          const topicImage = topicImages[topic.id];

          return (
          <div key={topic.id} className="card topic-card">
            {topicImage && (
              <div
                className="topic-card-image"
                style={{ backgroundImage: `url(${topicImage})` }}
                role="img"
                aria-label={`صورة توضيحية لموضوع ${topic.title}`}
              />
            )}
            <div className="card-content">
              <h2>{topic.title}</h2>
              <p>{topic.description}</p>
              <div className="topic-status-summary">
                <span className={lessonCompleted ? "done" : ""}>الدرس</span>
                <span className={hasSubmission ? "done" : ""}>التسليم</span>
                <span className={hasRating ? "done" : ""}>التقييم</span>
                {isLoading && <span className="topic-status-loading">...</span>}
              </div>
            </div>
            <div className="card-actions">
              <button
                className="button"
                onClick={() => navigate(`/topic/${topic.id}`)}
                disabled={!isLessonActive}
                aria-disabled={!isLessonActive}
              >
                عرض الدرس
              </button>
              {!isLessonActive && (
                <span className="topic-disabled-note">غير متاح حاليًا</span>
              )}
            </div>
          </div>
        )})}
      </div>
    </div>
  );
}
