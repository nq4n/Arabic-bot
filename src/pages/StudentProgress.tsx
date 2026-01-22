import { useEffect, useMemo, useState } from "react";
import { supabase } from "../supabaseClient";
import { getStudentTracking, type StudentTrackingData } from "../utils/studentTracking";
import { topics } from "../data/topics";
import "../styles/StudentProgress.css";

interface SubmissionStatus {
  hasSubmission: boolean;
}

type LessonProgressMap = Record<string, { lessonCompleted: boolean }>;

const buildEmptyProgress = (topicIds: string[]): LessonProgressMap =>
  topicIds.reduce((acc, topicId) => {
    acc[topicId] = { lessonCompleted: false };
    return acc;
  }, {} as LessonProgressMap);

export default function StudentProgress() {
  const topicIds = useMemo(() => topics.map((topic) => topic.id), []);
  const [lessonProgress, setLessonProgress] = useState<LessonProgressMap>(() =>
    buildEmptyProgress(topicIds)
  );
  const [activityCounts, setActivityCounts] = useState<Record<string, number>>({});
  const [submissionStatus, setSubmissionStatus] = useState<Record<string, SubmissionStatus>>({});
  const [trackingPoints, setTrackingPoints] = useState<StudentTrackingData["points"] | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSubmissions = async () => {
      setIsLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setLessonProgress(buildEmptyProgress(topicIds));
        setActivityCounts({});
        setSubmissionStatus({});
        setTrackingPoints(null);
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

      const tracking = await getStudentTracking(session.user.id);
      setTrackingPoints(tracking?.points ?? null);

      const counts: Record<string, number> = {};
      const hasTrackingActivities = Object.keys(tracking?.activities ?? {}).length > 0;
      const hasTrackingCollaborative = Object.keys(tracking?.collaborative ?? {}).length > 0;

      if (hasTrackingActivities || hasTrackingCollaborative) {
        Object.entries(tracking?.activities || {}).forEach(([topicId, entry]) => {
          counts[topicId] = entry.completedIds?.length ?? 0;
        });

        Object.entries(tracking?.collaborative || {}).forEach(([topicId, entry]) => {
          if (entry.discussion) counts[topicId] = (counts[topicId] || 0) + 1;
          if (entry.dialogue) counts[topicId] = (counts[topicId] || 0) + 1;
        });
      } else {
        const { data: activityRows } = await supabase
          .from("activity_submissions")
          .select("topic_id, activity_id, status")
          .eq("student_id", session.user.id);

        const { data: collaborativeRows } = await supabase
          .from("collaborative_activity_completions")
          .select("topic_id, activity_kind")
          .eq("student_id", session.user.id);

        const activitySets: Record<string, Set<number>> = {};
        (activityRows || []).forEach((row) => {
          if (row.status && row.status !== "submitted") return;
          const set = activitySets[row.topic_id] ?? new Set<number>();
          set.add(row.activity_id);
          activitySets[row.topic_id] = set;
        });

        Object.entries(activitySets).forEach(([topicId, set]) => {
          counts[topicId] = set.size;
        });

        (collaborativeRows || []).forEach((row) => {
          counts[row.topic_id] = (counts[row.topic_id] || 0) + 1;
        });
      }

      setActivityCounts(counts);

      const nextProgress = buildEmptyProgress(topicIds);
      if (tracking?.lessons) {
        topicIds.forEach((id) => {
          if (tracking.lessons?.[id]?.completed !== undefined) {
            nextProgress[id].lessonCompleted = Boolean(tracking.lessons?.[id]?.completed);
          }
        });
      }

      setLessonProgress(nextProgress);
      setIsLoading(false);
    };

    fetchSubmissions();
  }, [topicIds]);

  const rows = topics.map((topic) => {
    const completedLesson = lessonProgress[topic.id]?.lessonCompleted ?? false;
    const completedActivities = activityCounts[topic.id] ?? 0;
    const hasCollaborativeActivity =
      topic.id === "discussing-issue" || topic.id === "dialogue-text";
    const totalActivities = hasCollaborativeActivity
      ? 1
      : topic.activities.list.length + (topic.interactiveActivity ? 1 : 0);
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

  const computedTotalScore = rows.reduce((acc, row) => acc + row.totalPoints, 0);
  const totalScore =
    typeof trackingPoints?.total === "number" ? trackingPoints.total : computedTotalScore;

  const skeletonRows = isLoading ? Array.from({ length: 3 }) : [];

  return (
    <div className="progress-page" dir="rtl">
      <header className="progress-header page-header">
        <h1 className="page-title">نقاط مشاركتي في الدروس</h1>
        <p className="page-subtitle">
          تابع نقاطك من خلال إنجاز الدروس والأنشطة وتسليم الكتابات.
        </p>
      </header>

      <section className="card progress-summary" aria-busy={isLoading}>
        {isLoading ? (
          <>
            <div className="progress-summary-total">
              <div className="skeleton skeleton-title skeleton-w-40" />
              <div className="skeleton skeleton-line skeleton-w-30" />
            </div>
            <div className="progress-summary-breakdown">
              <div className="skeleton skeleton-line skeleton-w-60" />
              <div className="skeleton skeleton-line skeleton-w-70" />
              <div className="skeleton skeleton-line skeleton-w-60" />
            </div>
          </>
        ) : (
          <>
            <div className="progress-summary-total">
              <h2>إجمالي النقاط</h2>
              <p className="progress-total">{`${totalScore} نقطة`}</p>
            </div>
            <div className="progress-summary-breakdown progress-legend">
              <span>إكمال الدرس: 20 نقطة</span>
              <span>كل نشاط: 5 نقاط</span>
              <span>تسليم الكتابة: 10 نقاط</span>
            </div>
          </>
        )}
      </section>

      <section className="card progress-table" aria-busy={isLoading}>
        <div className="progress-table-header">
          <h2>تفاصيل النقاط حسب الدرس</h2>
          {isLoading ? (
            <span className="skeleton skeleton-line skeleton-w-30" aria-hidden="true" />
          ) : null}
        </div>
        <div className="progress-table-grid">
          {isLoading
            ? skeletonRows.map((_, index) => (
                <div
                  key={`skeleton-row-${index}`}
                  className="progress-row progress-row-skeleton"
                  aria-hidden="true"
                >
                  <div className="progress-skeleton-block">
                    <div className="skeleton skeleton-line skeleton-w-60" />
                    <div className="skeleton skeleton-line skeleton-w-80" />
                  </div>
                  <div className="progress-skeleton-block">
                    <div className="skeleton skeleton-line skeleton-w-70" />
                    <div className="skeleton skeleton-line skeleton-w-60" />
                    <div className="skeleton skeleton-line skeleton-w-60" />
                  </div>
                  <div className="progress-skeleton-block">
                    <div className="skeleton skeleton-line skeleton-w-40" />
                    <div className="skeleton skeleton-line skeleton-w-30" />
                  </div>
                </div>
              ))
            : rows.map((row) => (
                <div key={row.id} className="progress-row">
                  <div>
                    <h3>{row.title}</h3>
                    <p className="progress-description">{row.description}</p>
                  </div>
                  <div className="progress-metrics">
                    <span className={row.completedLesson ? "done" : "pending"}>
                      {row.completedLesson ? "تم إكمال الدرس" : "لم يتم إكمال الدرس"}
                    </span>
                    <span>
                      الأنشطة: {row.completedActivities}/{row.totalActivities}
                    </span>
                    <span className={row.hasSubmission ? "done" : "pending"}>
                      {row.hasSubmission ? "تم تسليم الكتابة" : "لم يتم تسليم الكتابة"}
                    </span>
                  </div>
                  <div className="progress-score">
                    <span>النقاط</span>
                    <strong>{row.totalPoints} نقطة</strong>
                  </div>
                </div>
              ))}
        </div>
      </section>
    </div>
  );
}
