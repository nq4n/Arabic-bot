// src/utils/enhancedStudentTracking.ts
import { supabase } from '../supabaseClient';
import {
  trackLessonCompletion,
  trackActivitySubmission,
  trackEvaluationSubmission,
  trackCollaborativeCompletion,
} from './studentTracking';

export type SessionType = 'lesson' | 'review' | 'evaluation' | 'activity' | 'collaborative';
export type TrackingType = 'lesson' | 'activity' | 'evaluation' | 'collaborative';

export interface TrackingPayload {
  studentId: string;
  topicId: string;
  trackingType: TrackingType;
  activityId?: number;
  score?: number;
  activityKind?: 'discussion' | 'dialogue';
  metadata?: Record<string, any>;
}

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
}

// -------------------------
// Session Time Tracking
// -------------------------

export class SessionTimeTracker {
  private startTime: Date | null = null;
  private topicId: string;
  private sessionType: SessionType;
  private studentId: string;
  private sessionId: number | null = null;

  constructor(studentId: string, topicId: string, sessionType: SessionType) {
    this.studentId = studentId;
    this.topicId = topicId;
    this.sessionType = sessionType;
  }

  async startSession(): Promise<void> {
    this.startTime = new Date();
    const { data, error } = await supabase
      .from('session_durations')
      .insert({
        student_id: this.studentId,
        topic_id: this.topicId,
        session_type: this.sessionType,
        start_time: this.startTime.toISOString(),
      })
      .select('id')
      .maybeSingle();

    if (error) {
      console.error('Error starting session:', error);
    } else if (data) {
      this.sessionId = data.id;
    }
  }

  async endSession(isCompleted: boolean = false): Promise<number> {
    if (!this.startTime || this.sessionId === null) return 0;

    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - this.startTime.getTime()) / 1000);

    await this.saveSessionDuration(endTime, duration, isCompleted);
    return duration;
  }

  private async saveSessionDuration(endTime: Date, duration: number, isCompleted: boolean): Promise<void> {
    if (this.sessionId === null) return;
    const { error } = await supabase
      .from('session_durations')
      .update({
        end_time: endTime.toISOString(),
        duration_seconds: duration,
        is_completed: isCompleted,
      })
      .eq('id', this.sessionId);

    if (error) {
      console.error('Error saving session duration:', error);
    }
  }
}

// -------------------------
// Validation & Quality
// -------------------------

export const validateTrackingPayload = (payload: TrackingPayload): ValidationResult => {
  if (!payload.studentId) {
    return { isValid: false, reason: 'Missing student ID' };
  }
  if (!payload.topicId) {
    return { isValid: false, reason: 'Missing topic ID' };
  }
  if (!payload.trackingType) {
    return { isValid: false, reason: 'Missing tracking type' };
  }

  // Type-specific validation
  if (payload.trackingType === 'activity' && !payload.activityId) {
    return { isValid: false, reason: 'Missing activity ID for activity tracking' };
  }
  if (payload.trackingType === 'evaluation' && payload.score === undefined) {
    return { isValid: false, reason: 'Missing score for evaluation tracking' };
  }
  if (payload.trackingType === 'collaborative' && !payload.activityKind) {
    return { isValid: false, reason: 'Missing activity kind for collaborative tracking' };
  }

  return { isValid: true };
};

export const calculateDataQualityScore = (payload: TrackingPayload): number => {
  let score = 100;

  // Reduce score if optional metadata is missing
  if (!payload.metadata) {
    score -= 10;
  }

  // Validation check
  const validation = validateTrackingPayload(payload);
  if (!validation.isValid) {
    score -= 40;
  }

  return Math.max(0, score);
};

// -------------------------
// Tracking Confirmation
// -------------------------

export const requestTrackingConfirmation = async (
  payload: TrackingPayload
): Promise<number | null> => {
  const validation = validateTrackingPayload(payload);
  const qualityScore = calculateDataQualityScore(payload);

  const { data, error } = await supabase
    .from('tracking_confirmations')
    .insert({
      student_id: payload.studentId,
      tracking_type: payload.trackingType,
      topic_id: payload.topicId,
      activity_id: payload.activityId,
      is_confirmed: false,
      data_quality_score: qualityScore,
      validation_status: validation.isValid ? 'valid' : 'invalid',
      validation_message: validation.reason,
      confirmation_data: payload.metadata || {},
    })
    .select('id')
    .maybeSingle();

  if (error) {
    console.error('Failed to request tracking confirmation:', error);
    return null;
  }

  return data?.id || null;
};

export const confirmTracking = async (
  confirmationId: number,
  applyFn: () => Promise<void>
): Promise<void> => {
  try {
    // Execute the tracking function
    await applyFn();

    // Mark confirmation as confirmed
    const { error } = await supabase
      .from('tracking_confirmations')
      .update({
        is_confirmed: true,
        confirmation_timestamp: new Date().toISOString(),
      })
      .eq('id', confirmationId);

    if (error) {
      console.error('Failed to confirm tracking:', error);
    }
  } catch (error) {
    console.error('Error in confirmTracking:', error);
    throw error;
  }
};

export const rejectTracking = async (confirmationId: number): Promise<void> => {
  const { error } = await supabase
    .from('tracking_confirmations')
    .update({
      is_confirmed: false,
      rejection_timestamp: new Date().toISOString(),
      rejection_metadata: { reason: 'User rejected' },
    })
    .eq('id', confirmationId);

  if (error) {
    console.error('Failed to reject tracking:', error);
  }
};

// -------------------------
// Helper: Apply Tracking
// -------------------------

export const applyTrackingWithConfirmation = async (
  payload: TrackingPayload,
  onShowDialog: (confirmationId: number, details: string[]) => void
): Promise<void> => {
  // Validate
  const validation = validateTrackingPayload(payload);
  if (!validation.isValid) {
    console.error('Invalid tracking payload:', validation.reason);
    return;
  }

  // Create pending confirmation
  const confirmationId = await requestTrackingConfirmation(payload);
  if (!confirmationId) {
    console.error('Failed to create tracking confirmation');
    return;
  }

  // Build details for dialog
  const details: string[] = [];
  details.push(`الموضوع: ${payload.topicId}`);
  if (payload.trackingType === 'activity' && payload.activityId) {
    details.push(`النشاط: ${payload.activityId}`);
  }
  if (payload.trackingType === 'evaluation' && payload.score !== undefined) {
    details.push(`الدرجة: ${payload.score}`);
  }
  if (payload.trackingType === 'collaborative' && payload.activityKind) {
    details.push(`النوع: ${payload.activityKind === 'discussion' ? 'مناقشة' : 'حوار'}`);
  }

  // Show dialog
  onShowDialog(confirmationId, details);
};

// -------------------------
// Wrapper: Execute Tracking
// -------------------------

export const executeTracking = async (payload: TrackingPayload): Promise<void> => {
  const { studentId, topicId, trackingType, activityId, score, activityKind } = payload;

  switch (trackingType) {
    case 'lesson':
      await trackLessonCompletion(studentId, topicId);
      break;
    case 'activity':
      if (activityId !== undefined) {
        await trackActivitySubmission(studentId, topicId, activityId);
      }
      break;
    case 'evaluation':
      if (score !== undefined) {
        await trackEvaluationSubmission(studentId, topicId, score);
      }
      break;
    case 'collaborative':
      if (activityKind) {
        await trackCollaborativeCompletion(studentId, topicId, activityKind);
      }
      break;
    default:
      console.error('Unknown tracking type:', trackingType);
  }
};

// -------------------------
// New Helper: Auto Confirm Tracking
// -------------------------

export const autoConfirmTracking = async (payload: TrackingPayload): Promise<void> => {
  const validation = validateTrackingPayload(payload);
  const qualityScore = calculateDataQualityScore(payload);

  try {
    // 1. Execute the actual tracking (updates student_tracking table and points)
    await executeTracking(payload);

    // 2. Create an already confirmed entry in tracking_confirmations for audit/history
    const { error } = await supabase
      .from('tracking_confirmations')
      .insert({
        student_id: payload.studentId,
        tracking_type: payload.trackingType,
        topic_id: payload.topicId,
        activity_id: payload.activityId,
        is_confirmed: true,
        confirmation_timestamp: new Date().toISOString(),
        data_quality_score: qualityScore,
        validation_status: validation.isValid ? 'valid' : 'invalid',
        validation_message: validation.reason,
        confirmation_data: payload.metadata || {},
      });

    if (error) {
      console.error('Failed to save auto-confirmation:', error);
    }
  } catch (error) {
    console.error('Error in autoConfirmTracking:', error);
    throw error;
  }
};
