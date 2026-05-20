-- Required for Supabase upsert calls that use:
--   onConflict: "student_id,topic_id,activity_id"
--   onConflict: "student_id,topic_id,activity_kind"
--   onConflict: "student_id"
--
-- If this migration fails, check for duplicate rows with the same conflict keys,
-- keep the newest row, and remove older duplicates before rerunning.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'student_tracking_student_id_key'
  ) THEN
    ALTER TABLE public.student_tracking
    ADD CONSTRAINT student_tracking_student_id_key
    UNIQUE (student_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'activity_submissions_student_topic_activity_key'
  ) THEN
    ALTER TABLE public.activity_submissions
    ADD CONSTRAINT activity_submissions_student_topic_activity_key
    UNIQUE (student_id, topic_id, activity_id);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'collaborative_activity_completions_student_topic_kind_key'
  ) THEN
    ALTER TABLE public.collaborative_activity_completions
    ADD CONSTRAINT collaborative_activity_completions_student_topic_kind_key
    UNIQUE (student_id, topic_id, activity_kind);
  END IF;
END $$;
