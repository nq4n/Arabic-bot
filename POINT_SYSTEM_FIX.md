# Point System Fix - Documentation

## Problem
After changing point values (Activities: 5→10, Collaborative: 15→10), existing stored point totals in the database were incorrect because they were calculated with old values. This caused different pages to show different point totals.

## Solution

### 1. Always Recalculate from Source of Truth
- Points are now **always recalculated** from the actual tracking data (lessons, activities, evaluations, collaborative)
- The stored `points.total` is updated after recalculation to keep it in sync
- This ensures accuracy even after point value changes

### 2. Updated Tracking Functions
All tracking functions now recalculate points instead of incrementing:
- `trackActivitySubmission()` - Recalculates from all activities
- `trackLessonCompletion()` - Recalculates from all lessons
- `trackEvaluationSubmission()` - Recalculates from all evaluations
- `trackCollaborativeCompletion()` - Recalculates from all collaborative activities

### 3. Unified Point Calculation
- `getStudentPoints()` - Always recalculates by default (forceRecalculate = true)
- `recalculateAndUpdatePoints()` - Recalculates and updates database
- `calculatePointsFromTracking()` - Source of truth calculation

### 4. Point Values (Current)
- **Lessons**: 20 points each
- **Activities**: 10 points each
- **Evaluations**: 10 points each
- **Collaborative**: 10 points each

## How It Works

### When Points Are Updated:
1. Student completes an activity/lesson/evaluation
2. Tracking function updates the tracking data (lessons/activities/evaluations/collaborative)
3. **Recalculates total points** from all tracking data using current point values
4. Updates `tracking_data.points.total` with recalculated value
5. Saves to database

### When Points Are Displayed:
1. Page calls `getStudentPoints(studentId)`
2. Function **recalculates** from tracking data (ensures accuracy)
3. Updates stored total if different
4. Returns calculated value

## Fixing Existing Data

### Option 1: Automatic (Recommended)
Points will be automatically recalculated when:
- Students view their progress page
- New activities are completed
- Any tracking update occurs

### Option 2: Manual Bulk Recalculation
To fix all existing points at once, use the utility function:

```typescript
import { recalculateAllStudentPoints } from './utils/recalculateAllPoints';

// Run this once to fix all existing points
recalculateAllStudentPoints().then(result => {
  console.log(`Fixed ${result.success} students, ${result.errors} errors`);
});
```

You can run this from:
- Browser console (if logged in as admin)
- An admin page
- A one-time migration script

## Database Schema
No schema changes needed. The existing `student_tracking.tracking_data` JSONB structure supports this:
```json
{
  "lessons": { "topic-id": { "completed": true } },
  "activities": { "topic-id": { "completedIds": [1, 2] } },
  "evaluations": { "topic-id": { "score": 85, "timestamp": "..." } },
  "collaborative": { "topic-id": { "discussion": true, "dialogue": true } },
  "points": { "total": 50 }
}
```

## Files Changed
1. `src/utils/pointCalculation.ts` - Always recalculates points
2. `src/utils/studentTracking.ts` - All tracking functions recalculate
3. `src/utils/recalculateAllPoints.ts` - Utility to fix all existing points
4. `edit2_recalculate_points.sql` - Documentation SQL file

## Testing
After deployment:
1. Check that points match across all pages (StudentProgress, Topics, ActivitySubmissions)
2. Complete a new activity and verify points increase correctly
3. Verify existing students' points are recalculated when they view their progress

## Notes
- The recalculation is fast and happens automatically
- No data loss - all tracking data (lessons, activities, etc.) is preserved
- Points are always accurate based on actual completed work
- System is resilient to future point value changes
