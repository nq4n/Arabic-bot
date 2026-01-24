import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useNavigate } from "react-router-dom";
import { topics } from "../data/topics";
import { supabase } from "../supabaseClient";
import { getStudentTracking } from "../utils/studentTracking";
import {
  LessonVisibility,
  buildLessonVisibilityFromRows,
  getLessonVisibility,
} from "../utils/lessonSettings";
import { SkeletonHeader } from "../components/SkeletonBlocks";
import "../styles/Topics.css";

type LessonProgressMap = Record<string, { lessonCompleted: boolean }>;

const buildEmptyProgress = (topicIds: string[]): LessonProgressMap =>
  topicIds.reduce((acc, topicId) => {
    acc[topicId] = { lessonCompleted: false };
    return acc;
  }, {} as LessonProgressMap);

export default function Topics() {
  const navigate = useNavigate();
  const topicIds = useMemo(() => topics.map((topic) => topic.id), []);
  const [lessonVisibility, setLessonVisibility] = useState<LessonVisibility>(() =>
    getLessonVisibility(topicIds)
  );
  const [progressMap, setProgressMap] = useState<LessonProgressMap>(() =>
    buildEmptyProgress(topicIds)
  );
  const [activityCounts, setActivityCounts] = useState<Record<string, number>>({});
  const [submissionStatus, setSubmissionStatus] = useState<
    Record<string, { hasSubmission: boolean; hasRating: boolean }>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [rewards, setRewards] = useState<{ title: string; min_points: number }[]>([]);
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

  const [profileName, setProfileName] = useState<string | null>(null);

  useEffect(() => {
    const fetchProgress = async () => {
      setIsLoading(true);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setIsAuthenticated(false);
        setProfileName(null);
        setSubmissionStatus({});
        setActivityCounts({});
        setProgressMap(buildEmptyProgress(topicIds));
        setIsLoading(false);
        return;
      }

      setIsAuthenticated(true);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, added_by_teacher_id, full_name")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileError) {
        console.error("Error fetching profile:", profileError);
      }

      setProfileName(profile?.full_name ?? null);
      const teacherId =
        profile?.role === "teacher" || profile?.role === "admin"
          ? session.user.id
          : profile?.added_by_teacher_id;

      const visibilityQuery = supabase
        .from("lesson_visibility_settings")
        .select("topic_id, settings");

      if (teacherId) {
        visibilityQuery.eq("teacher_id", teacherId);
      } else if (profile?.role === "student") {
        visibilityQuery.is("teacher_id", null);
      }

      const { data: visibilityRows, error: visibilityError } = await visibilityQuery;

      if (visibilityError) {
        console.error("Error fetching lesson visibility:", visibilityError);
      } else {
        const next = buildLessonVisibilityFromRows(topicIds, visibilityRows || []);
        setLessonVisibility(next);
      }

      const { data: rewardsData } = await supabase
        .from("point_rewards")
        .select("title, min_points")
        .order("min_points", { ascending: true });

      setRewards(rewardsData || []);

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
        statusMap[topicId] = statusMap[topicId] || {
          hasSubmission: false,
          hasRating: false,
        };
        statusMap[topicId].hasSubmission = true;
        if (submission.teacher_response) {
          statusMap[topicId].hasRating = true;
        }
      });

      setSubmissionStatus(statusMap);

      const tracking = await getStudentTracking(session.user.id);
      const counts: Record<string, number> = {};

      // Determine if the tracking record contains actual activity completions or collaborative sessions.
      const hasTrackingActivities =
        tracking?.activities &&
        Object.values(tracking.activities).some((entry: any) => {
          return (
            Array.isArray((entry as any).completedIds) &&
            ((entry as any).completedIds as any[]).length > 0
          );
        });
      const hasTrackingCollaborative =
        tracking?.collaborative &&
        Object.values(tracking.collaborative).some((entry: any) => {
          return (entry as any).discussion || (entry as any).dialogue;
        });

      if (hasTrackingActivities || hasTrackingCollaborative) {
        Object.entries(tracking.activities || {}).forEach(([topicId, entry]) => {
          counts[topicId] = (entry as any).completedIds?.length ?? 0;
        });

        Object.entries(tracking.collaborative || {}).forEach(([topicId, entry]) => {
          if ((entry as any).discussion) counts[topicId] = (counts[topicId] || 0) + 1;
          if ((entry as any).dialogue) counts[topicId] = (counts[topicId] || 0) + 1;
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
          // Only count activities that are pending teacher review
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

      setProgressMap(nextProgress);
      setIsLoading(false);
    };

    fetchProgress();
  }, [topicIds]);

  const completedLessonsCount = Object.values(progressMap).filter(
    (item) => item.lessonCompleted
  ).length;
  const submissionsCount = Object.values(submissionStatus).filter(
    (item) => item.hasSubmission
  ).length;
  const ratingsCount = Object.values(submissionStatus).filter(
    (item) => item.hasRating
  ).length;

  const formatProgress = (value: number) => {
    if (isLoading) return "...";
    if (!isAuthenticated) return "--/--";
    return `${value}/${topics.length}`;
  };

  const totalPoints = topics.reduce((total, topic) => {
    const completedLesson = progressMap[topic.id]?.lessonCompleted ?? false;
    const completedActivities = activityCounts[topic.id] ?? 0;
    const hasSubmission = submissionStatus[topic.id]?.hasSubmission ?? false;
    const lessonPoints = completedLesson ? 20 : 0;
    const activityPoints = completedActivities * 5;
    const submissionPoints = hasSubmission ? 10 : 0;
    return total + lessonPoints + activityPoints + submissionPoints;
  }, 0);

  const currentLevel = useMemo(() => {
    if (rewards.length === 0) return null;
    // Find the highest reward with min_points <= totalPoints
    const achieved = rewards
      .filter((r) => r.min_points <= totalPoints)
      .sort((a, b) => b.min_points - a.min_points)[0];
    return achieved || rewards[0]; // Default to first if none
  }, [rewards, totalPoints]);

  const nextLevel = useMemo(() => {
    if (rewards.length === 0) return null;
    return rewards
      .filter((r) => r.min_points > totalPoints)
      .sort((a, b) => a.min_points - b.min_points)[0];
  }, [rewards, totalPoints]);

  const pointsDisplay = isLoading ? "..." : `${totalPoints} نقطة`;

  const progressPercent = useMemo(() => {
    if (!nextLevel || !currentLevel) return 100;
    if (nextLevel.min_points === currentLevel.min_points) return 100;
    // Calculate progress relative to current level bracket
    const range = nextLevel.min_points - currentLevel.min_points;
    const progress = totalPoints - currentLevel.min_points;
    return Math.min(100, Math.max(0, (progress / range) * 100));
  }, [currentLevel, nextLevel, totalPoints]);

  return (
    <div className="topics-page" dir="rtl">
      <header className="topics-header page-header">
        <h1 className="page-title">
          {isAuthenticated && profileName ? `مرحباً، ${profileName}` : "الموضوعات"}
        </h1>
        <p className="page-subtitle">
          {isAuthenticated
            ? "أهلاً بك في منصة اللغة العربية. استعرض الدروس والأنشطة أدناه."
            : "استعرض تقدمك في الدروس والأنشطة والتقييمات ثم اختر موضوعك التالي."}
        </p>
      </header>

      <section className="card topics-overview" aria-busy={isLoading}>
        {isLoading ? (
          <>
            <div className="topics-overview-header">
              <SkeletonHeader titleWidthClass="skeleton-w-30" subtitleWidthClass="skeleton-w-80" />
            </div>
            <div className="topics-overview-body">
              <div className="topic-dashboard-grid">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={`topic-dashboard-skeleton-${index}`} className="topic-dashboard-item">
                    <div className="skeleton skeleton-line skeleton-w-60" />
                    <div className="skeleton skeleton-line skeleton-w-30" />
                  </div>
                ))}
              </div>
              <div className="topic-points-panel">
                <div className="skeleton skeleton-line skeleton-w-40" />
                <div className="skeleton-list">
                  <div className="skeleton skeleton-line skeleton-w-80" />
                  <div className="skeleton skeleton-line skeleton-w-70" />
                </div>
                <div className="skeleton skeleton-line skeleton-w-30" />
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="topics-overview-header">
              <div>
                <h2>لوحة التقدم</h2>
                <p>ملخص تقدمك العام في الدروس والتسليمات والتقييمات.</p>
              </div>
              {!isAuthenticated && (
                <span className="topics-overview-note">سجل الدخول لعرض التقدم.</span>
              )}
            </div>
            <div className="topics-overview-body">
              <div className="topic-dashboard-grid">
                <div className="topic-dashboard-item">
                  <span className="topic-dashboard-label">الدروس المكتملة</span>
                  <span className="topic-dashboard-value">
                    {formatProgress(completedLessonsCount)}
                  </span>
                </div>
                <div className="topic-dashboard-item">
                  <span className="topic-dashboard-label">التسليمات</span>
                  <span className="topic-dashboard-value">
                    {formatProgress(submissionsCount)}
                  </span>
                </div>
                <div className="topic-dashboard-item">
                  <span className="topic-dashboard-label">التقييمات من المعلم</span>
                  <span className="topic-dashboard-value">{formatProgress(ratingsCount)}</span>
                </div>
              </div>

              <div className="topic-points-panel">
                <h3>ملخص النقاط</h3>
                <div className="gamification-summary">
                  <div className="points-badge">
                    <span className="current-title">{currentLevel?.title || "مبتدئ"}</span>
                    <span className="current-points">{pointsDisplay}</span>
                  </div>

                  {nextLevel ? (
                    <div className="level-progress-container">
                      <div className="level-info">
                        <span>المستوى الحالي: {currentLevel?.title}</span>
                        <span>القادم: {nextLevel.title} ({nextLevel.min_points})</span>
                      </div>
                      <div className="progress-bar-track">
                        <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
                      </div>
                      <p className="points-needed">متبقي {nextLevel.min_points - totalPoints} نقطة للوصول للمستوى التالي</p>
                    </div>
                  ) : (
                    <div className="max-level-message">🎉 لقد وصلت إلى أعلى مستوى!</div>
                  )}
                </div>

                <div className="topic-points-action">
                  <button className="button" onClick={() => navigate("/student-progress")}>عرض لوحة النقاط</button>
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      <div className="topics-grid" aria-busy={isLoading}>
        {isLoading
          ? Array.from({ length: Math.min(5, topics.length) }).map((_, index) => (
              <div key={`topic-card-skeleton-${index}`} className="card topic-card skeleton-card">
                <div className="card-content">
                  <div className="skeleton skeleton-line skeleton-w-60" />
                  <div className="skeleton skeleton-line skeleton-w-80" />
                  <div className="topic-status-summary">
                    <span className="skeleton skeleton-line skeleton-w-30" />
                    <span className="skeleton skeleton-line skeleton-w-30" />
                    <span className="skeleton skeleton-line skeleton-w-30" />
                  </div>
                </div>
                <div className="card-actions">
                  <div className="skeleton skeleton-line skeleton-w-30" />
                </div>
              </div>
            ))
          : topics.map((topic) => {
              const lessonCompleted = progressMap[topic.id]?.lessonCompleted ?? false;
              const hasSubmission = submissionStatus[topic.id]?.hasSubmission ?? false;
              const hasRating = submissionStatus[topic.id]?.hasRating ?? false;
              const isLessonActive = lessonVisibility[topic.id]?.lesson ?? false;
              const topicImage = topicImages[topic.id];

              return (
                <div
                  key={topic.id}
                  className="card topic-card"
                  style={
                    topicImage
                      ? ({ ["--topic-image" as string]: `url(${topicImage})` } as CSSProperties)
                      : undefined
                  }
                  role="img"
                  aria-label={`بطاقة موضوع ${topic.title}`}
                >
                  <div className="card-content">
                    <h2>{topic.title}</h2>
                    <p>{topic.description}</p>
                    <div className="topic-status-summary">
                      <span className={lessonCompleted ? "done" : ""}>الدرس</span>
                      <span className={hasSubmission ? "done" : ""}>التسليم</span>
                      <span className={hasRating ? "done" : ""}>التقييم</span>
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
              );
            })}
      </div>
    </div>
  );
}