# Database Schema Updates for Enhanced Student Tracking System

## Overview
This document describes the database schema updates required for the enhanced student tracking confirmation system.

## Existing Tables (Already in Database)

### 1. `session_durations`
**Status:** ✅ Already exists - No changes needed

Tracks time spent in each session type (lesson, review, evaluation, activity, collaborative).

**Columns:**
- `id` - Primary key
- `student_id` - Foreign key to profiles
- `topic_id` - Topic identifier
- `session_type` - Type of session (lesson/review/evaluation/activity/collaborative)
- `start_time` - When session started
- `end_time` - When session ended
- `duration_seconds` - Total duration in seconds
- `is_completed` - Whether session was completed successfully
- `created_at` - Record creation timestamp

### 2. `student_tracking`
**Status:** ✅ Already exists - No changes needed

Main tracking table with confirmation fields already present.

**Columns:**
- `id` - Primary key
- `student_id` - Foreign key to profiles
- `student_name` - Student's name
- `tracking_data` - JSONB data containing lessons, activities, evaluations, etc.
- `created_at` - Record creation timestamp
- `updated_at` - Last update timestamp
- `last_confirmed_at` - When last confirmed
- `confirmation_status` - pending/confirmed/rejected
- `data_quality_score` - Quality score (0-100)

### 3. `tracking_confirmations`
**Status:** ⚠️ Exists but needs updates

Stores individual tracking confirmation requests.

## Required Updates

### Update to `tracking_confirmations` Table

**New Columns Added:**

1. **`data_quality_score`** (numeric, default 100)
   - Quality score based on data completeness
   - Range: 0-100
   - Default: 100 (perfect quality)
   - Reduced for missing optional fields

2. **`validation_status`** (text, default 'valid')
   - Validation result: 'valid' or 'invalid'
   - Set during payload validation
   - Used to track data integrity

3. **`validation_message`** (text, nullable)
   - Error message if validation failed
   - Explains what required fields are missing
   - NULL if validation passed

4. **`rejection_timestamp`** (timestamp with time zone, nullable)
   - When user rejected/cancelled the confirmation
   - NULL if not rejected
   - Used for tracking user cancellations

5. **`rejection_metadata`** (jsonb, default '{}')
   - Additional data about rejection
   - Can store user reason, context, etc.
   - Useful for analytics

**New Indexes Added:**

1. `idx_tracking_confirmations_student_tracking` - On (student_id, tracking_type)
   - Speeds up queries filtering by student and type

2. `idx_tracking_confirmations_confirmed` - On (is_confirmed)
   - Speeds up queries filtering confirmed vs pending

3. `idx_tracking_confirmations_created` - On (created_at DESC)
   - Speeds up time-based queries and recent confirmations

## Migration Instructions

### Step 1: Review the Migration File
The migration SQL is in: `edit1_tracking_confirmations.sql`

### Step 2: Apply to Database
Run the migration file against your Supabase database:

```bash
# Option 1: Using Supabase CLI
supabase db push

# Option 2: Using psql
psql -h your-db-host -U postgres -d postgres -f edit1_tracking_confirmations.sql

# Option 3: Using Supabase Dashboard
# Copy the contents of edit1_tracking_confirmations.sql
# Paste into SQL Editor in Supabase Dashboard
# Execute the query
```

### Step 3: Verify Changes
After running the migration, verify the columns exist:

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'tracking_confirmations'
ORDER BY ordinal_position;
```

## Data Flow

### Tracking Confirmation Flow:

1. **User Action** (e.g., completes lesson)
   ↓
2. **Validation** - `validateTrackingPayload()`
   - Checks required fields
   - Sets `validation_status` and `validation_message`
   ↓
3. **Quality Scoring** - `calculateDataQualityScore()`
   - Calculates `data_quality_score` (0-100)
   ↓
4. **Create Confirmation** - Insert into `tracking_confirmations`
   - `is_confirmed = false` (pending)
   - All validation and quality data stored
   ↓
5. **Show Dialog** - User sees confirmation dialog
   ↓
6. **User Decision:**
   - **Confirm** → `confirmTracking()`
     - Sets `is_confirmed = true`
     - Sets `confirmation_timestamp`
     - Executes actual tracking
     - Updates `student_tracking`
   
   - **Cancel** → `rejectTracking()`
     - Sets `is_confirmed = false`
     - Sets `rejection_timestamp`
     - Stores `rejection_metadata`
     - No tracking applied

## Backward Compatibility

✅ **All changes are backward compatible:**
- New columns have default values
- Existing queries will continue to work
- Old records will have NULL for new optional fields
- No breaking changes to existing functionality

## Testing Checklist

After applying the migration:

- [ ] Verify all columns exist in `tracking_confirmations`
- [ ] Test lesson completion with confirmation
- [ ] Test activity submission with confirmation
- [ ] Test evaluation submission with confirmation
- [ ] Test collaborative activity with confirmation
- [ ] Verify session duration tracking works
- [ ] Check that confirmations are stored correctly
- [ ] Verify rejection flow works
- [ ] Check indexes are created
- [ ] Confirm no errors in application logs

## Rollback Plan

If needed, to rollback the changes:

```sql
-- Remove new columns (WARNING: This will delete data in these columns)
ALTER TABLE public.tracking_confirmations
DROP COLUMN IF EXISTS data_quality_score,
DROP COLUMN IF EXISTS validation_status,
DROP COLUMN IF EXISTS validation_message,
DROP COLUMN IF EXISTS rejection_timestamp,
DROP COLUMN IF EXISTS rejection_metadata;

-- Remove indexes
DROP INDEX IF EXISTS idx_tracking_confirmations_student_tracking;
DROP INDEX IF EXISTS idx_tracking_confirmations_confirmed;
DROP INDEX IF EXISTS idx_tracking_confirmations_created;
```

## Summary

**Files Created:**
1. `edit1_tracking_confirmations.sql` - Migration file to run on database
2. `DATABASE_UPDATES.md` - This documentation file

**Files Updated:**
1. `schema.sql` - Updated with new column definitions for reference

**Action Required:**
Run `edit1_tracking_confirmations.sql` on your Supabase database to add the missing columns.
