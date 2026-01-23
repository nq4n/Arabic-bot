// src/utils/enhancedStudentTracking.ts
import { supabase } from '../supabaseClient';

export interface ConfirmationData {
  action: string;
  timestamp: string;
  metadata?: Record<string, any>;
  validation?: {
    isValid: boolean;
    reason?: string;
  };
}

export interface TrackingWithConfirmation {
  studentId: string;
  topicId: string;
  trackingType: 'lesson' | 'activity' | 'evaluation' | 'collaborative';
  confirmationData: ConfirmationData;
  requiresConfirmation: boolean;
}

export class SessionTimeTracker {
  private startTime: Date | null = null;
  private topicId: string;
  private sessionType: 'lesson' | 'review' | 'evaluation' | 'activity' | 'collaborative';
  private studentId: string;
  private sessionId: number | null = null;

  constructor(studentId: string, topicId: string, sessionType: 'lesson' | 'review' | 'evaluation' | 'activity' | 'collaborative') {
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
      .single();

    if (error) {
      console.error('Error starting session:', error);
    } else if (data) {
      this.sessionId = data.id;
    }
  }

  async endSession(): Promise<number> {
    if (!this.startTime || this.sessionId === null) return 0;
    
    const endTime = new Date();
    const duration = Math.floor((endTime.getTime() - this.startTime.getTime()) / 1000);
    
    await this.saveSessionDuration(endTime, duration, true);
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

export const validateTrackingData = (data: any): { isValid: boolean, reason?: string } => {
  if (!data.studentId || !data.topicId || !data.trackingType) {
    return { isValid: false, reason: 'Missing required fields' };
  }
  // Implement more specific validation logic based on trackingType
  return { isValid: true };
};

export const calculateDataQualityScore = (trackingData: any): number => {
  // Example: score is 100 if validation passed, 50 otherwise.
  const { isValid } = validateTrackingData(trackingData);
  return isValid ? 100 : 50;
};

export async function requestTrackingConfirmation(
  studentId: string,
  trackingType: 'lesson' | 'activity' | 'evaluation' | 'collaborative',
  topicId: string,
  activityId?: number,
  confirmationData?: Record<string, any>
) {
  const { error } = await supabase
    .from('tracking_confirmations')
    .insert({
      student_id: studentId,
      tracking_type: trackingType,
      topic_id: topicId,
      activity_id: activityId,
      confirmation_data: confirmationData,
      is_confirmed: false, // Starts as unconfirmed
    });

  if (error) {
    console.error('Failed to request tracking confirmation:', error);
  }
}

export async function confirmTracking(confirmationId: number) {
    const { error } = await supabase
      .from('tracking_confirmations')
      .update({ 
        is_confirmed: true,
        confirmation_timestamp: new Date().toISOString()
      })
      .eq('id', confirmationId);

    if (error) {
        console.error('Failed to confirm tracking:', error);
    } else {
        // Potentially update the student_tracking table as well
    }
}
