import { supabase } from "../supabaseClient";

export type LessonSection =
  | "lesson"
  | "review"
  | "evaluation"
  | "activity"
  | "collaborative";

export type LessonVisibility = Record<
  string,
  {
    lesson: boolean;
    review: boolean;
    evaluation: boolean;
    activity: boolean;
    collaborative: boolean;
  }
>;

export type LessonVisibilitySettingsRow = {
  topic_id: string;
  settings: Partial<Record<LessonSection, boolean>> | null;
};

export type LessonProgress = Record<
  string,
  {
    lessonCompleted: boolean;
  }
>;

export type ActivityProgress = Record<
  string,
  {
    completedActivityIds: number[];
  }
>;

export type StudentTrackingData = {
  lessons?: Record<string, { completed: boolean }>;
  activities?: Record<string, { completedIds: number[] }>;
  collaborative?: Record<string, { discussion?: boolean; dialogue?: boolean }>;
  points?: {
    total: number;
  };
};

export const VISIBILITY_STORAGE_KEY = "lesson_visibility_settings";
const PROGRESS_STORAGE_KEY = "lesson_progress_settings";
const ACTIVITY_STORAGE_KEY = "lesson_activity_progress";

// ✅ CHANGE THIS to your real table name
const LESSON_VISIBILITY_TABLE = "lesson_visibility_settings";

const safeParse = <T,>(value: string | null): T | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn("Failed to parse lesson settings from storage.", error);
    return null;
  }
};

const defaultVisibility = (): LessonVisibility => ({});

const normalizeVisibility = (
  raw: LessonVisibility | null,
  topicIds: string[]
): LessonVisibility => {
  const normalized: LessonVisibility = { ...(raw || defaultVisibility()) };
  topicIds.forEach((topicId) => {
    normalized[topicId] = {
      lesson: normalized[topicId]?.lesson ?? false,
      review: normalized[topicId]?.review ?? false,
      evaluation: normalized[topicId]?.evaluation ?? false,
      activity: normalized[topicId]?.activity ?? false,
      collaborative: normalized[topicId]?.collaborative ?? false,
    };
  });
  return normalized;
};

const normalizeSectionSettings = (
  settings: Partial<Record<LessonSection, boolean>> | null | undefined
) => ({
  lesson: settings?.lesson ?? false,
  review: settings?.review ?? false,
  evaluation: settings?.evaluation ?? false,
  activity: settings?.activity ?? false,
  collaborative: settings?.collaborative ?? false,
});

export const applyLessonVisibility = (
  topicIds: string[],
  visibility: LessonVisibility
) => {
  const normalized = normalizeVisibility(visibility, topicIds);
  localStorage.setItem(VISIBILITY_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
};

export const buildLessonVisibilityFromRows = (
  topicIds: string[],
  rows: LessonVisibilitySettingsRow[]
) => {
  const next: LessonVisibility = {};
  rows.forEach((row) => {
    next[row.topic_id] = normalizeSectionSettings(row.settings ?? {});
  });
  return applyLessonVisibility(topicIds, next);
};

// -------------------------
// ✅ DB (Supabase) retrieval
// -------------------------

/**
 * Fetch visibility settings from DB.
 * If teacherId is not provided, it will try to use the logged-in user id.
 */
export const fetchLessonVisibilityRowsFromDB = async (
  topicIds: string[],
  teacherId?: string
): Promise<LessonVisibilitySettingsRow[]> => {
  if (!topicIds.length) return [];

  // If teacherId not passed, try current logged in user
  let resolvedTeacherId = teacherId;
  if (!resolvedTeacherId) {
    const { data } = await supabase.auth.getUser();
    resolvedTeacherId = data.user?.id;
  }

  // Build query
  let q = supabase
    .from(LESSON_VISIBILITY_TABLE)
    .select("topic_id, settings")
    .in("topic_id", topicIds);

  // If your table is per-teacher (like screenshot), filter by teacher_id.
  // If your app should load "global" settings, you can remove this.
  if (resolvedTeacherId) {
    q = q.eq("teacher_id", resolvedTeacherId);
  }

  const { data, error } = await q;

  if (error) {
    console.error("Failed to fetch lesson visibility from DB:", error);
    return [];
  }

  // Supabase returns jsonb already as object (not string), so this should match your type.
  return (data ?? []) as LessonVisibilitySettingsRow[];
};

/**
 * Sync DB -> localStorage and return the computed LessonVisibility.
 * Falls back to localStorage if DB returns nothing.
 */
export const syncLessonVisibilityFromDB = async (
  topicIds: string[],
  teacherId?: string
): Promise<LessonVisibility> => {
  const rows = await fetchLessonVisibilityRowsFromDB(topicIds, teacherId);

  // If DB returns empty, fallback to localStorage (so UI still works)
  if (!rows.length) {
    return getLessonVisibility(topicIds);
  }

  return buildLessonVisibilityFromRows(topicIds, rows);
};

// -------------------------
// local getters/updaters
// -------------------------

export const getLessonVisibility = (topicIds: string[]): LessonVisibility => {
  const stored = localStorage.getItem(VISIBILITY_STORAGE_KEY);
  const parsed = safeParse<LessonVisibility>(stored);
  return normalizeVisibility(parsed, topicIds);
};

export const updateLessonVisibility = (
  topicIds: string[],
  topicId: string,
  section: LessonSection,
  value: boolean
) => {
  const current = getLessonVisibility(topicIds);
  const updated: LessonVisibility = {
    ...current,
    [topicId]: {
      ...current[topicId],
      [section]: value,
    },
  };
  localStorage.setItem(VISIBILITY_STORAGE_KEY, JSON.stringify(updated));
  return updated;
};

export const isLessonSectionActive = (
  topicIds: string[],
  topicId: string,
  section: LessonSection
): boolean => {
  const current = getLessonVisibility(topicIds);
  return current[topicId]?.[section] ?? false;
};

const normalizeProgress = (
  raw: LessonProgress | null,
  topicIds: string[]
): LessonProgress => {
  const normalized: LessonProgress = { ...(raw || {}) };
  topicIds.forEach((topicId) => {
    normalized[topicId] = {
      lessonCompleted: normalized[topicId]?.lessonCompleted ?? false,
    };
  });
  return normalized;
};

const normalizeActivityProgress = (
  raw: ActivityProgress | null,
  topicIds: string[]
): ActivityProgress => {
  const normalized: ActivityProgress = { ...(raw || {}) };
  topicIds.forEach((topicId) => {
    normalized[topicId] = {
      completedActivityIds: normalized[topicId]?.completedActivityIds ?? [],
    };
  });
  return normalized;
};

export const getLessonProgress = (topicIds: string[]): LessonProgress => {
  const stored = localStorage.getItem(PROGRESS_STORAGE_KEY);
  const parsed = safeParse<LessonProgress>(stored);
  return normalizeProgress(parsed, topicIds);
};

export const markLessonCompleted = (topicIds: string[], topicId: string) => {
  const current = getLessonProgress(topicIds);
  const updated: LessonProgress = {
    ...current,
    [topicId]: {
      lessonCompleted: true,
    },
  };
  localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(updated));
  return updated;
};

export const getActivityProgress = (topicIds: string[]): ActivityProgress => {
  const stored = localStorage.getItem(ACTIVITY_STORAGE_KEY);
  const parsed = safeParse<ActivityProgress>(stored);
  return normalizeActivityProgress(parsed, topicIds);
};

export const toggleActivityCompletion = (
  topicIds: string[],
  topicId: string,
  activityId: number
) => {
  const current = getActivityProgress(topicIds);
  const currentIds = current[topicId]?.completedActivityIds ?? [];
  const nextIds = currentIds.includes(activityId)
    ? currentIds.filter((id) => id !== activityId)
    : [...currentIds, activityId];
  const updated: ActivityProgress = {
    ...current,
    [topicId]: {
      completedActivityIds: nextIds,
    },
  };
  localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(updated));
  return updated;
};

// -------------------------
// Student Tracking (DB)
// -------------------------



export const getStudentTracking = async (
  studentId: string
): Promise<StudentTrackingData | null> => {
  const { data, error } = await supabase
    .from("student_tracking")
    .select("tracking_data")
    .eq("student_id", studentId)
    .single();

  if (error && error.code !== "PGRST116") { // PGRST116 means no rows found
    console.error("Error fetching student tracking data:", error);
    return null;
  }

  return data?.tracking_data || null;
};

export const trackActivitySubmission = async (
  studentId: string,
  topicId: string,
  activityId: number
) => {
  const { data: currentTracking, error: fetchError } = await supabase
    .from("student_tracking")
    .select("tracking_data")
    .eq("student_id", studentId)
    .single();

  if (fetchError && fetchError.code !== "PGRST116") { // PGRST116 means no rows found
    console.error("Error fetching current tracking data:", fetchError);
    return;
  }

  const trackingData = currentTracking?.tracking_data || {};
  const currentActivities = trackingData.activities || {};
  const currentCompletedIds = currentActivities[topicId]?.completedIds || [];

  if (!currentCompletedIds.includes(activityId)) {
    currentCompletedIds.push(activityId);
  }

  const currentPoints = trackingData.points?.total || 0;
  const updatedPoints = currentCompletedIds.includes(activityId) && !currentTracking?.tracking_data?.activities?.[topicId]?.completedIds?.includes(activityId)
    ? currentPoints + 5
    : currentPoints;

  const updatedTrackingData = {
    ...trackingData,
    activities: {
      ...currentActivities,
      [topicId]: {
        completedIds: currentCompletedIds,
      },
    },
    points: {
      total: updatedPoints
    }
  };

  const { error: updateError } = await supabase
    .from("student_tracking")
    .upsert(
      { student_id: studentId, tracking_data: updatedTrackingData, updated_at: new Date().toISOString() },
      { onConflict: "student_id" }
    );

  if (updateError) {
    console.error("Error updating activity tracking data:", updateError);
  }
};

export const trackLessonCompletion = async (
  studentId: string,
  topicId: string
) => {
  const { data: currentTracking, error: fetchError } = await supabase
    .from("student_tracking")
    .select("tracking_data")
    .eq("student_id", studentId)
    .single();

  if (fetchError && fetchError.code !== "PGRST116") { // PGRST116 means no rows found
    console.error("Error fetching current tracking data:", fetchError);
    return;
  }

  const trackingData = currentTracking?.tracking_data || {};
  const currentLessons = trackingData.lessons || {};

  const currentPoints = trackingData.points?.total || 0;
  const wasCompleted = currentLessons[topicId]?.completed || false;
  const updatedPoints = !wasCompleted ? currentPoints + 20 : currentPoints;

  const updatedTrackingData = {
    ...trackingData,
    lessons: {
      ...currentLessons,
      [topicId]: {
        completed: true,
      },
    },
    points: {
      total: updatedPoints
    }
  };

  const { error: updateError } = await supabase
    .from("student_tracking")
    .upsert(
      { student_id: studentId, tracking_data: updatedTrackingData, updated_at: new Date().toISOString() },
      { onConflict: "student_id" }
    );

  if (updateError) {
    console.error("Error updating lesson completion tracking data:", updateError);
  }
};

export const trackEvaluationSubmission = async (
  studentId: string,
  topicId: string,
  score: number
) => {
  const { data: currentTracking, error: fetchError } = await supabase
    .from("student_tracking")
    .select("tracking_data")
    .eq("student_id", studentId)
    .single();

  if (fetchError && fetchError.code !== "PGRST116") { // PGRST116 means no rows found
    console.error("Error fetching current tracking data:", fetchError);
    return;
  }

  const trackingData = currentTracking?.tracking_data || {};
  const currentEvaluations = trackingData.evaluations || {};

  const currentPoints = trackingData.points?.total || 0;
  const wasEvaluated = !!currentEvaluations[topicId];
  const updatedPoints = !wasEvaluated ? currentPoints + 10 : currentPoints;

  const updatedTrackingData = {
    ...trackingData,
    evaluations: {
      ...currentEvaluations,
      [topicId]: {
        score: score,
        timestamp: new Date().toISOString(),
      },
    },
    points: {
      total: updatedPoints
    }
  };

  const { error: updateError } = await supabase
    .from("student_tracking")
    .upsert(
      { student_id: studentId, tracking_data: updatedTrackingData, updated_at: new Date().toISOString() },
      { onConflict: "student_id" }
    );

  if (updateError) {
    console.error("Error updating evaluation tracking data:", updateError);
  }
};

export const trackCollaborativeCompletion = async (
  studentId: string,
  topicId: string,
  activityKind: "discussion" | "dialogue"
) => {
  const { data: currentTracking, error: fetchError } = await supabase
    .from("student_tracking")
    .select("tracking_data")
    .eq("student_id", studentId)
    .single();

  if (fetchError && fetchError.code !== "PGRST116") { // PGRST116 means no rows found
    console.error("Error fetching current tracking data:", fetchError);
    return;
  }

  const trackingData = currentTracking?.tracking_data || {};
  const currentCollaborative = trackingData.collaborative || {};

  const currentPoints = trackingData.points?.total || 0;
  const wasCompleted = currentCollaborative[topicId]?.[activityKind] || false;
  const updatedPoints = !wasCompleted ? currentPoints + 15 : currentPoints; // Collaborative gives 15 points

  const updatedCollaborative = {
    ...currentCollaborative,
    [topicId]: {
      ...currentCollaborative[topicId],
      [activityKind]: true,
      timestamp: new Date().toISOString(),
    },
  };

  const updatedTrackingData = {
    ...trackingData,
    collaborative: updatedCollaborative,
    points: {
      total: updatedPoints
    }
  };

  const { error: updateError } = await supabase
    .from("student_tracking")
    .upsert(
      { student_id: studentId, tracking_data: updatedTrackingData, updated_at: new Date().toISOString() },
      { onConflict: "student_id" }
    );

  if (updateError) {
    console.error("Error updating collaborative completion tracking data:", updateError);
  }
};
