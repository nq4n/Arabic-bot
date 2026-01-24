// src/utils/pointCalculation.ts
import { supabase } from '../supabaseClient';
import { StudentTrackingData } from './studentTracking';
import { topics } from '../data/topics';

/**
 * Point values for different activities
 */
export const POINT_VALUES = {
  LESSON: 20,
  ACTIVITY: 10,
  EVALUATION: 10,
  COLLABORATIVE: 10,
} as const;

/**
 * Calculate points from tracking data
 */
export const calculatePointsFromTracking = (trackingData: StudentTrackingData | null): number => {
  if (!trackingData) return 0;

  let points = 0;

  // Lessons: 20 points each
  if (trackingData.lessons) {
    const completedLessons = Object.values(trackingData.lessons).filter(
      (lesson) => lesson?.completed === true
    ).length;
    points += completedLessons * POINT_VALUES.LESSON;
  }

  // Activities: 10 points each
  if (trackingData.activities) {
    Object.values(trackingData.activities).forEach((topicActivities) => {
      const completedIds = topicActivities?.completedIds || [];
      points += completedIds.length * POINT_VALUES.ACTIVITY;
    });
  }

  // Evaluations: 10 points each
  if (trackingData.evaluations) {
    const completedEvaluations = Object.keys(trackingData.evaluations).length;
    points += completedEvaluations * POINT_VALUES.EVALUATION;
  }

  // Collaborative: 10 points each (discussion or dialogue)
  if (trackingData.collaborative) {
    Object.values(trackingData.collaborative).forEach((collab) => {
      if (collab?.discussion) points += POINT_VALUES.COLLABORATIVE;
      if (collab?.dialogue) points += POINT_VALUES.COLLABORATIVE;
    });
  }

  return points;
};

/**
 * Get student points from database (preferred method - uses stored total)
 */
export const getStudentPoints = async (studentId: string): Promise<number> => {
  const { data, error } = await supabase
    .from('student_tracking')
    .select('tracking_data')
    .eq('student_id', studentId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching student tracking data:', error);
    return 0;
  }

  const trackingData = (data?.tracking_data as StudentTrackingData) || null;

  // Use stored points total if available, otherwise calculate
  if (trackingData?.points?.total !== undefined) {
    return trackingData.points.total;
  }

  // Fallback: calculate from tracking data
  return calculatePointsFromTracking(trackingData);
};

/**
 * Calculate points from raw data (for leaderboards and fallback scenarios)
 */
export interface PointCalculationData {
  lessons?: Record<string, { completed: boolean }>;
  activities?: Record<string, { completedIds: number[] }>;
  evaluations?: Record<string, any>;
  collaborative?: Record<string, { discussion?: boolean; dialogue?: boolean }>;
  activitySubmissions?: Array<{ topic_id: string; activity_id: number }>;
  collaborativeCompletions?: Array<{ topic_id: string; activity_kind: string }>;
  submissions?: Array<{ topic_title?: string }>;
}

export const calculatePointsFromData = (data: PointCalculationData): number => {
  let points = 0;

  // Lessons: 20 points each
  if (data.lessons) {
    const completedLessons = Object.values(data.lessons).filter(
      (lesson) => lesson?.completed === true
    ).length;
    points += completedLessons * POINT_VALUES.LESSON;
  }

  // Activities: 10 points each
  if (data.activities) {
    Object.values(data.activities).forEach((topicActivities) => {
      const completedIds = topicActivities?.completedIds || [];
      points += completedIds.length * POINT_VALUES.ACTIVITY;
    });
  } else if (data.activitySubmissions) {
    // Fallback: count unique activity submissions
    const uniqueActivities = new Set(
      data.activitySubmissions.map((a) => `${a.topic_id}-${a.activity_id}`)
    );
    points += uniqueActivities.size * POINT_VALUES.ACTIVITY;
  }

  // Evaluations: 10 points each
  if (data.evaluations) {
    const completedEvaluations = Object.keys(data.evaluations).length;
    points += completedEvaluations * POINT_VALUES.EVALUATION;
  } else if (data.submissions) {
    // Fallback: count submissions with topic titles
    const uniqueTopics = new Set(
      data.submissions
        .filter((s) => s.topic_title)
        .map((s) => {
          const topic = topics.find((t) => t.title === s.topic_title);
          return topic?.id;
        })
        .filter((id): id is string => id !== undefined)
    );
    points += uniqueTopics.size * POINT_VALUES.EVALUATION;
  }

  // Collaborative: 10 points each
  if (data.collaborative) {
    Object.values(data.collaborative).forEach((collab) => {
      if (collab?.discussion) points += POINT_VALUES.COLLABORATIVE;
      if (collab?.dialogue) points += POINT_VALUES.COLLABORATIVE;
    });
  } else if (data.collaborativeCompletions) {
    // Fallback: count collaborative completions
    points += data.collaborativeCompletions.length * POINT_VALUES.COLLABORATIVE;
  }

  return points;
};
