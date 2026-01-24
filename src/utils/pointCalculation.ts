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
 * Calculate points from tracking data (source of truth)
 */
export const calculatePointsFromTracking = (trackingData: StudentTrackingData | null): number => {
  if (!trackingData) return 0;

  let points = 0;
  let debugInfo: any = {};

  // Lessons: 20 points each
  if (trackingData.lessons) {
    const completedLessons = Object.values(trackingData.lessons).filter(
      (lesson) => lesson?.completed === true
    ).length;
    const lessonPoints = completedLessons * POINT_VALUES.LESSON;
    points += lessonPoints;
    debugInfo.lessons = { count: completedLessons, points: lessonPoints };
  }

  // Activities: 10 points each
  if (trackingData.activities) {
    let activityCount = 0;
    Object.values(trackingData.activities).forEach((topicActivities) => {
      const completedIds = topicActivities?.completedIds || [];
      activityCount += completedIds.length;
    });
    const activityPoints = activityCount * POINT_VALUES.ACTIVITY;
    points += activityPoints;
    debugInfo.activities = { count: activityCount, points: activityPoints };
  }

  // Evaluations: 10 points each
  if (trackingData.evaluations) {
    const completedEvaluations = Object.keys(trackingData.evaluations).length;
    const evaluationPoints = completedEvaluations * POINT_VALUES.EVALUATION;
    points += evaluationPoints;
    debugInfo.evaluations = { count: completedEvaluations, points: evaluationPoints };
  }

  // Collaborative: 10 points each (discussion or dialogue)
  if (trackingData.collaborative) {
    let collaborativeCount = 0;
    Object.values(trackingData.collaborative).forEach((collab) => {
      if (collab?.discussion) collaborativeCount += 1;
      if (collab?.dialogue) collaborativeCount += 1;
    });
    const collaborativePoints = collaborativeCount * POINT_VALUES.COLLABORATIVE;
    points += collaborativePoints;
    debugInfo.collaborative = { count: collaborativeCount, points: collaborativePoints };
  }

  // Only log in development to avoid console spam
  if (process.env.NODE_ENV === 'development') {
    console.log('Point calculation breakdown:', debugInfo, 'Total:', points);
  }
  return points;
};

/**
 * Recalculate and update points in database to ensure consistency
 */
export const recalculateAndUpdatePoints = async (studentId: string): Promise<number> => {
  const { data, error } = await supabase
    .from('student_tracking')
    .select('tracking_data, student_name')
    .eq('student_id', studentId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching student tracking data:', error);
    return 0;
  }

  if (!data) return 0;

  const trackingData = (data.tracking_data as StudentTrackingData) || {};
  
  // Debug: Log what we're calculating from
  console.log('Recalculating points for student:', studentId);
  console.log('Tracking data:', {
    lessons: trackingData.lessons ? Object.keys(trackingData.lessons).length : 0,
    activities: trackingData.activities ? Object.values(trackingData.activities).reduce((sum: number, act: any) => sum + (act?.completedIds?.length || 0), 0) : 0,
    evaluations: trackingData.evaluations ? Object.keys(trackingData.evaluations).length : 0,
    collaborative: trackingData.collaborative ? Object.keys(trackingData.collaborative).length : 0,
  });
  
  // Always recalculate from actual tracking data (source of truth)
  const calculatedPoints = calculatePointsFromTracking(trackingData);
  const oldPoints = trackingData.points?.total || 0;

  console.log(`Points: ${oldPoints} → ${calculatedPoints}`);

  // Update the stored total to match calculated value
  const updatedTrackingData: StudentTrackingData = {
    ...trackingData,
    points: {
      total: calculatedPoints,
    },
  };

  // Update database with recalculated points
  const { error: updateError } = await supabase
    .from('student_tracking')
    .update({
      tracking_data: updatedTrackingData,
      updated_at: new Date().toISOString(),
    })
    .eq('student_id', studentId);

  if (updateError) {
    console.error('Error updating recalculated points:', updateError);
    // Return calculated value even if update fails
    return calculatedPoints;
  }

  console.log('Successfully updated points in database');
  return calculatedPoints;
};

/**
 * Get student points from database
 * Always recalculates to ensure accuracy (especially after point value changes)
 */
export const getStudentPoints = async (studentId: string, forceRecalculate: boolean = true): Promise<number> => {
  // Always recalculate to ensure consistency, especially after point value changes
  if (forceRecalculate) {
    const recalculated = await recalculateAndUpdatePoints(studentId);
    console.log('getStudentPoints: Recalculated and returned', recalculated);
    return recalculated;
  }

  // Fallback: use stored value (not recommended after point value changes)
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

  // Even in fallback mode, recalculate to ensure accuracy
  const calculated = calculatePointsFromTracking(trackingData);
  console.log('getStudentPoints: Fallback mode, calculated', calculated);
  return calculated;
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
