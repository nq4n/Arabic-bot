-- Phase 1: Database Schema Enhancement

-- 1. Create tracking_confirmations table
CREATE TABLE IF NOT EXISTS "public"."tracking_confirmations" (
    "id" bigint NOT NULL,
    "student_id" uuid NOT NULL,
    "tracking_type" text NOT NULL CHECK (tracking_type IN ('lesson', 'activity', 'evaluation', 'collaborative')),
    "topic_id" text NOT NULL,
    "activity_id" integer,
    "confirmation_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
    "is_confirmed" boolean DEFAULT false NOT NULL,
    "confirmation_timestamp" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now()" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now()" NOT NULL
);

-- 2. Create session_durations table
CREATE TABLE IF NOT EXISTS "public"."session_durations" (
    "id" bigint NOT NULL,
    "student_id" uuid NOT NULL,
    "topic_id" text NOT NULL,
    "session_type" text NOT NULL CHECK (session_type IN ('lesson', 'review', 'evaluation', 'activity', 'collaborative')),
    "start_time" timestamp with time zone NOT NULL,
    "end_time" timestamp with time zone,
    "duration_seconds" integer,
    "is_completed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now()" NOT NULL
);

-- 3. Enhanced student_tracking table
ALTER TABLE "public"."student_tracking" 
ADD COLUMN IF NOT EXISTS "last_confirmed_at" timestamp with time zone,
ADD COLUMN IF NOT EXISTS "confirmation_status" text DEFAULT 'pending' CHECK (confirmation_status IN ('pending', 'confirmed', 'rejected')),
ADD COLUMN IF NOT EXISTS "data_quality_score" numeric DEFAULT 100 CHECK (data_quality_score >= 0 AND data_quality_score <= 100);

-- 4. Indexes for Performance
CREATE INDEX IF NOT EXISTS "tracking_confirmations_student_type_idx" 
ON "public"."tracking_confirmations" ("student_id", "tracking_type", "topic_id");

CREATE INDEX IF NOT EXISTS "session_durations_student_topic_idx" 
ON "public"."session_durations" ("student_id", "topic_id", "session_type");

CREATE INDEX IF NOT EXISTS "student_tracking_confirmation_status_idx" 
ON "public"."student_tracking" ("confirmation_status", "last_confirmed_at");

-- Housekeeping for new tables: primary keys, sequences, and foreign keys

-- For tracking_confirmations
CREATE SEQUENCE IF NOT EXISTS "public"."tracking_confirmations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."tracking_confirmations" 
ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."tracking_confirmations_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."tracking_confirmations"
    ADD CONSTRAINT "tracking_confirmations_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."tracking_confirmations"
    ADD CONSTRAINT "tracking_confirmations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

-- For session_durations
CREATE SEQUENCE IF NOT EXISTS "public"."session_durations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER TABLE "public"."session_durations"
ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."session_durations_id_seq"'::"regclass");

ALTER TABLE ONLY "public"."session_durations"
    ADD CONSTRAINT "session_durations_pkey" PRIMARY KEY ("id");

ALTER TABLE ONLY "public"."session_durations"
    ADD CONSTRAINT "session_durations_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;

-- Enable RLS for new tables
ALTER TABLE "public"."tracking_confirmations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."session_durations" ENABLE ROW LEVEL SECURITY;

-- Policies for tracking_confirmations
CREATE POLICY "Students can manage their own tracking confirmations"
ON "public"."tracking_confirmations"
FOR ALL
USING ("student_id" = "auth"."uid"())
WITH CHECK ("student_id" = "auth"."uid"());

CREATE POLICY "Teachers and admins can view tracking confirmations"
ON "public"."tracking_confirmations"
FOR SELECT
USING (EXISTS (
    SELECT 1
    FROM "public"."profiles" "p"
    WHERE ("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['teacher'::"text", 'admin'::"text"]))
));

-- Policies for session_durations
CREATE POLICY "Students can manage their own session durations"
ON "public"."session_durations"
FOR ALL
USING ("student_id" = "auth"."uid"())
WITH CHECK ("student_id" = "auth"."uid"());

CREATE POLICY "Teachers and admins can view session durations"
ON "public"."session_durations"
FOR SELECT
USING (EXISTS (
    SELECT 1
    FROM "public"."profiles" "p"
    WHERE ("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['teacher'::"text", 'admin'::"text"]))
));
