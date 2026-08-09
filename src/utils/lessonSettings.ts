
export type LessonSection =
  | "lesson"
  | "review"
  | "evaluation"
  | "activity"
  | "video";

export type LessonVisibility = Record<
  string,
  {
    lesson: boolean;
    review: boolean;
    evaluation: boolean;
    activity: boolean;
    video: boolean;
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

export const VISIBILITY_STORAGE_KEY = "lesson_visibility_settings";
const PROGRESS_STORAGE_KEY = "lesson_progress_settings";
const ACTIVITY_STORAGE_KEY = "lesson_activity_progress";
export const PREVIEW_MODE_KEY = "teacher_preview_mode";

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
      review: normalized[topicId]?.review ?? false,
      evaluation: normalized[topicId]?.evaluation ?? false,
      activity: normalized[topicId]?.activity ?? false,
      video: normalized[topicId]?.video ?? true,
    };
  });
  return normalized;
};

export const isPreviewMode = (): boolean => {
  try {
    return localStorage.getItem(PREVIEW_MODE_KEY) === "true";
  } catch {
    return false;
  }
};

export const setPreviewMode = (value: boolean): boolean => {
  try {
    localStorage.setItem(PREVIEW_MODE_KEY, value ? "true" : "false");
  } catch {
    return false;
  }
  return true;
};

// Returns whether a given section should be treated as active for the current
// viewer. During teacher preview mode every section is unlocked so the teacher
// can browse the site exactly as a student with everything enabled.
export const isSectionActive = (
  visibility: LessonVisibility,
  topicId: string,
  section: LessonSection,
  fallback: boolean
): boolean => {
  if (isPreviewMode()) return true;
  return visibility[topicId]?.[section] ?? fallback;
};

export const isSectionUnlockedInPreview = (section: LessonSection): boolean => {
  return section !== "lesson" || isPreviewMode();
};

const normalizeSectionSettings = (
  settings: Partial<Record<LessonSection, boolean>> | null | undefined
) => ({
  lesson: settings?.lesson ?? false,
  review: settings?.review ?? false,
  evaluation: settings?.evaluation ?? false,
  activity: settings?.activity ?? false,
  video: settings?.video ?? true,
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
  return current[topicId]?.[section] ?? false;
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
