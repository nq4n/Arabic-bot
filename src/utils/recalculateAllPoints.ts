// src/utils/recalculateAllPoints.ts
// Utility function to recalculate all student points in the database
// Run this once after changing point values to fix existing data

import { supabase } from '../supabaseClient';
import { recalculateAndUpdatePoints } from './pointCalculation';

/**
 * Recalculate points for all students in the database
 * This should be run once after changing point values
 */
export const recalculateAllStudentPoints = async (): Promise<{
  success: number;
  errors: number;
  results: Array<{ studentId: string; oldPoints: number; newPoints: number; error?: string }>;
}> => {
  const results: Array<{ studentId: string; oldPoints: number; newPoints: number; error?: string }> = [];
  let success = 0;
  let errors = 0;

  try {
    // Fetch all student tracking records
    const { data: allTracking, error: fetchError } = await supabase
      .from('student_tracking')
      .select('student_id, tracking_data');

    if (fetchError) {
      console.error('Error fetching student tracking data:', fetchError);
      return { success: 0, errors: 0, results: [] };
    }

    if (!allTracking || allTracking.length === 0) {
      console.log('No student tracking records found');
      return { success: 0, errors: 0, results: [] };
    }

    console.log(`Recalculating points for ${allTracking.length} students...`);

    // Recalculate points for each student
    for (const record of allTracking) {
      try {
        const oldPoints = (record.tracking_data as any)?.points?.total || 0;
        const newPoints = await recalculateAndUpdatePoints(record.student_id);
        
        results.push({
          studentId: record.student_id,
          oldPoints,
          newPoints,
        });
        
        if (oldPoints !== newPoints) {
          console.log(`Student ${record.student_id}: ${oldPoints} → ${newPoints} points`);
        }
        success++;
      } catch (error: any) {
        errors++;
        results.push({
          studentId: record.student_id,
          oldPoints: 0,
          newPoints: 0,
          error: error.message,
        });
        console.error(`Error recalculating points for student ${record.student_id}:`, error);
      }
    }

    console.log(`\nRecalculation complete: ${success} successful, ${errors} errors`);
    return { success, errors, results };
  } catch (error: any) {
    console.error('Fatal error in recalculateAllStudentPoints:', error);
    return { success, errors, results };
  }
};

/**
 * Run this function from browser console or create an admin page to trigger it
 * Example: import { recalculateAllStudentPoints } from './utils/recalculateAllPoints'; recalculateAllStudentPoints();
 */