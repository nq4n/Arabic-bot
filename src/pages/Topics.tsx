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

      <div className="topics-grid">
        {topics.map((topic) => {
          const lessonCompleted = progressMap[topic.id]?.lessonCompleted ?? false;
          const hasSubmission = submissionStatus[topic.id]?.hasSubmission ?? false;
          const hasRating = submissionStatus[topic.id]?.hasRating ?? false;
          const completionCount = [lessonCompleted, hasSubmission, hasRating].filter(Boolean).length;
          const progressPercent = (completionCount / 3) * 100;
          const isLessonActive = isLessonSectionActive(topicIds, topic.id, "lesson");

          return (
          <div key={topic.id} className="card topic-card">
            <div className="card-content">
              <h2>{topic.title}</h2>
              <p>{topic.description}</p>
              <div className="topic-progress">
                <div className="topic-progress-header">
                  <span>تقدمك في الدرس</span>
                  <span>{isLoading ? "..." : `${completionCount}/3`}</span>
                </div>
                <div className="topic-progress-bar" aria-label="progress">
                  <div className="topic-progress-fill" style={{ width: `${progressPercent}%` }}></div>
                </div>
                <ul className="topic-progress-steps">
                  <li className={lessonCompleted ? "done" : ""}>الدرس</li>
                  <li className={hasSubmission ? "done" : ""}>التسليم</li>
                  <li className={hasRating ? "done" : ""}>التقييم</li>
                </ul>
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
