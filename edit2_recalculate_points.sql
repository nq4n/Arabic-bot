-- edit2_recalculate_points.sql
-- SQL script to recalculate all student points based on current point values
-- This fixes points that were calculated with old values (5 for activities, 15 for collaborative)
-- New values: Activities = 10, Collaborative = 10

-- This is a one-time fix script
-- The application code now always recalculates points from tracking data

-- Note: This SQL script shows the calculation logic
-- The actual recalculation should be done via the application code (recalculateAllPoints.ts)
-- to ensure consistency with the TypeScript calculation logic

-- For reference, the calculation is:
-- Lessons: 20 points each
-- Activities: 10 points each (changed from 5)
-- Evaluations: 10 points each
-- Collaborative: 10 points each (changed from 15)

-- The application will automatically recalculate points when:
-- 1. A student views their progress page
-- 2. A new activity/lesson/evaluation is completed
-- 3. The recalculateAllStudentPoints() function is called

-- To manually trigger recalculation for all students, use the TypeScript utility:
-- import { recalculateAllStudentPoints } from './utils/recalculateAllPoints';
-- recalculateAllStudentPoints();

-- No database schema changes are needed - the tracking_data JSONB structure supports this
