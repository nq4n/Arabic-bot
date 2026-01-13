import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { topics } from "../data/topics";
import { getActivityProgress, getLessonProgress } from "../utils/lessonSettings";
import "../styles/StudentProgress.css";

interface SubmissionStatus {
  hasSubmission: boolean;
}

export default function StudentProgress() {
  const topicIds = useMemo(() => topics.map((topic) => topic.id), []);
  const [lessonProgress, setLessonProgress] = useState(() => getLessonProgress(topicIds));
  const [activityProgress, setActivityProgress] = useState(() => getActivityProgress(topicIds));
  const [submissionStatus, setSubmissionStatus] = useState<Record<string, SubmissionStatus>>({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsLoading(false);
        return;
      }

      const { data } = await supabase
        .from("submissions")
        .select("topic_title")
        .eq("student_id", session.user.id);

      const statusMap: Record<string, SubmissionStatus> = {};
      const titleToId = topics.reduce<Record<string, string>>((acc, topic) => {
        acc[topic.title] = topic.id;
        return acc;
      }, {});

      (data || []).forEach((submission) => {
        const topicId = titleToId[submission.topic_title];
        if (!topicId) return;
        statusMap[topicId] = { hasSubmission: true };
      });

      setSubmissionStatus(statusMap);
      setLessonProgress(getLessonProgress(topicIds));
      setActivityProgress(getActivityProgress(topicIds));
      setIsLoading(false);
    };

    fetchSubmissions();
  }, [topicIds]);

  const rows = topics.map((topic) => {
    const completedLesson = lessonProgress[topic.id]?.lessonCompleted ?? false;
    const completedActivities = activityProgress[topic.id]?.completedActivityIds?.length ?? 0;
    const totalActivities = topic.activities.list.length;
    const hasSubmission = submissionStatus[topic.id]?.hasSubmission ?? false;

    const lessonPoints = completedLesson ? 20 : 0;
    const activityPoints = completedActivities * 5;
    const submissionPoints = hasSubmission ? 10 : 0;
    const totalPoints = lessonPoints + activityPoints + submissionPoints;

    return {
      ...topic,
      completedLesson,
      completedActivities,
      totalActivities,
      hasSubmission,
      totalPoints,
    };
  });

  const totalScore = rows.reduce((acc, row) => acc + row.totalPoints, 0);

  return (
    <div className="progress-page" dir="rtl">
      <header className="progress-header">
        <h1>نقاط مشاركتي في الدروس</h1>
        <p>تابع نقاطك من خلال إنجاز الدروس والأنشطة وتسليم الكتابات.</p>
      </header>

      <section className="card progress-summary">
        <div>
          <h2>إجمالي النقاط</h2>
          <p className="progress-total">{totalScore} نقطة</p>
        </div>
        <div className="progress-legend">
          <span>إكمال الدرس: 20 نقطة</span>
          <span>كل نشاط: 5 نقاط</span>
          <span>تسليم الكتابة: 10 نقاط</span>
        </div>
      </section>

      <section className="card progress-table">
        <div className="progress-table-header">
          <h2>تفاصيل النقاط حسب الدرس</h2>
          {isLoading && <span className="progress-loading">...جارٍ التحديث</span>}
        </div>
        <div className="progress-table-grid">
          {rows.map((row) => (
            <div key={row.id} className="progress-row">
              <div>
                <h3>{row.title}</h3>
                <p className="progress-description">{row.description}</p>
              </div>
              <div className="progress-metrics">
                <span className={row.completedLesson ? "done" : "pending"}>
                  {row.completedLesson ? "تم إكمال الدرس" : "لم يُكمل الدرس"}
                </span>
                <span>
                  الأنشطة: {row.completedActivities}/{row.totalActivities}
                </span>
                <span className={row.hasSubmission ? "done" : "pending"}>
                  {row.hasSubmission ? "تم التسليم" : "لم يتم التسليم"}
                </span>
              </div>
              <div className="progress-score">
                <span>المجموع</span>
                <strong>{row.totalPoints} نقطة</strong>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
