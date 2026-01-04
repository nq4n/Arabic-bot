export type LessonSection = "lesson" | "review" | "evaluation";

export type LessonVisibility = Record<
  string,
  {
    lesson: boolean;
    review: boolean;
    evaluation: boolean;
  }
>;

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

const VISIBILITY_STORAGE_KEY = "lesson_visibility_settings";
const PROGRESS_STORAGE_KEY = "lesson_progress_settings";
const ACTIVITY_STORAGE_KEY = "lesson_activity_progress";

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
      lesson: normalized[topicId]?.lesson ?? true,
      review: normalized[topicId]?.review ?? true,
      evaluation: normalized[topicId]?.evaluation ?? true,
    };
  });
  return normalized;
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
  return current[topicId]?.[section] ?? true;
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
