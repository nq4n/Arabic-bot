-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.activity_submissions (
  id bigint NOT NULL DEFAULT nextval('activity_submissions_id_seq'::regclass),
  student_id uuid,
  topic_id text NOT NULL,
  activity_id integer NOT NULL,
  response_text text,
  status text NOT NULL DEFAULT 'submitted'::text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT activity_submissions_pkey PRIMARY KEY (id),
  CONSTRAINT activity_submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.admin_notifications (
  id bigint NOT NULL DEFAULT nextval('admin_notifications_id_seq'::regclass),
  recipient_id uuid,
  actor_id uuid,
  actor_role text,
  message text NOT NULL,
  category text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_notifications_pkey PRIMARY KEY (id),
  CONSTRAINT admin_notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(id),
  CONSTRAINT admin_notifications_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.collaborative_activity_completions (
  id bigint NOT NULL DEFAULT nextval('collaborative_activity_completions_id_seq'::regclass),
  student_id uuid NOT NULL,
  topic_id text NOT NULL,
  activity_kind text NOT NULL,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT collaborative_activity_completions_pkey PRIMARY KEY (id),
  CONSTRAINT collaborative_activity_completions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.collaborative_chat (
  id bigint NOT NULL DEFAULT nextval('collaborative_chat_id_seq'::regclass),
  topic_id text NOT NULL,
  case_title text NOT NULL,
  created_by uuid,
  conversation_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  max_students integer DEFAULT 6,
  CONSTRAINT collaborative_chat_pkey PRIMARY KEY (id),
  CONSTRAINT collaborative_chat_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.collaborative_chat_participants (
  room_id bigint NOT NULL,
  student_id uuid NOT NULL,
  joined_at timestamp with time zone DEFAULT now(),
  id bigint NOT NULL DEFAULT nextval('collaborative_chat_participants_id_seq'::regclass),
  chat_id bigint,
  user_id uuid,
  CONSTRAINT collaborative_chat_participants_pkey PRIMARY KEY (room_id, student_id),
  CONSTRAINT collaborative_chat_participants_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id),
  CONSTRAINT collaborative_chat_participants_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.collaborative_chat(id),
  CONSTRAINT collaborative_chat_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.dialogue_peer_participants (
  id bigint NOT NULL DEFAULT nextval('dialogue_peer_participants_id_seq'::regclass),
  session_id bigint NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT dialogue_peer_participants_pkey PRIMARY KEY (id),
  CONSTRAINT dialogue_peer_participants_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.dialogue_peer_sessions(id),
  CONSTRAINT dialogue_peer_participants_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.dialogue_peer_queue (
  id bigint NOT NULL DEFAULT nextval('dialogue_peer_queue_id_seq'::regclass),
  topic_id text NOT NULL,
  user_id uuid NOT NULL,
  joined_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT dialogue_peer_queue_pkey PRIMARY KEY (id),
  CONSTRAINT dialogue_peer_queue_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.dialogue_peer_scenarios (
  id bigint NOT NULL DEFAULT nextval('dialogue_peer_scenarios_id_seq'::regclass),
  topic_id text NOT NULL,
  scenario_text text NOT NULL,
  role_a text NOT NULL,
  role_b text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT dialogue_peer_scenarios_pkey PRIMARY KEY (id)
);
CREATE TABLE public.dialogue_peer_sessions (
  id bigint NOT NULL DEFAULT nextval('dialogue_peer_sessions_id_seq'::regclass),
  topic_id text NOT NULL,
  scenario_text text NOT NULL,
  role_a text NOT NULL,
  role_b text NOT NULL,
  status text NOT NULL DEFAULT 'active'::text,
  conversation_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT dialogue_peer_sessions_pkey PRIMARY KEY (id)
);
CREATE TABLE public.lesson_section_visibility (
  teacher_id uuid NOT NULL,
  topic_id text NOT NULL,
  section text NOT NULL CHECK (section = ANY (ARRAY['lesson'::text, 'review'::text, 'evaluation'::text, 'activity'::text, 'collaborative'::text])),
  is_enabled boolean NOT NULL DEFAULT true,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lesson_section_visibility_pkey PRIMARY KEY (teacher_id, topic_id, section),
  CONSTRAINT lesson_section_visibility_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.lesson_visibility_settings (
  teacher_id uuid NOT NULL,
  topic_id text NOT NULL,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT lesson_visibility_settings_pkey PRIMARY KEY (teacher_id, topic_id),
  CONSTRAINT lesson_visibility_settings_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.point_rewards (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  title text NOT NULL,
  min_points integer NOT NULL UNIQUE,
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  CONSTRAINT point_rewards_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  username text UNIQUE CHECK (char_length(username) >= 3),
  role text,
  must_change_password boolean NOT NULL DEFAULT true,
  email text UNIQUE,
  added_by_teacher_id uuid,
  full_name text,
  grade text,
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_added_by_teacher_id_fkey FOREIGN KEY (added_by_teacher_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.session_durations (
  id bigint NOT NULL DEFAULT nextval('session_durations_id_seq'::regclass),
  student_id uuid NOT NULL,
  topic_id text NOT NULL,
  session_type text NOT NULL CHECK (session_type = ANY (ARRAY['lesson'::text, 'review'::text, 'evaluation'::text, 'activity'::text, 'collaborative'::text])),
  start_time timestamp with time zone NOT NULL,
  end_time timestamp with time zone,
  duration_seconds integer,
  is_completed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT session_durations_pkey PRIMARY KEY (id),
  CONSTRAINT session_durations_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.student_tracking (
  id bigint NOT NULL DEFAULT nextval('student_tracking_id_seq'::regclass),
  student_id uuid NOT NULL,
  student_name text NOT NULL,
  tracking_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_confirmed_at timestamp with time zone,
  confirmation_status text DEFAULT 'pending'::text CHECK (confirmation_status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'rejected'::text])),
  data_quality_score numeric DEFAULT 100 CHECK (data_quality_score >= 0::numeric AND data_quality_score <= 100::numeric),
  CONSTRAINT student_tracking_pkey PRIMARY KEY (id),
  CONSTRAINT student_tracking_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.submissions (
  id integer NOT NULL DEFAULT nextval('submissions_id_seq'::regclass),
  student_id uuid,
  submission_data jsonb,
  ai_fixed_text text,
  ai_grade numeric,
  ai_response jsonb,
  created_at timestamp with time zone DEFAULT now(),
  teacher_response jsonb,
  topic_title text,
  teacher_grade numeric,
  CONSTRAINT submissions_pkey PRIMARY KEY (id),
  CONSTRAINT submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.teacher_chat_global_settings (
  teacher_id uuid NOT NULL,
  is_enabled boolean DEFAULT true,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT teacher_chat_global_settings_pkey PRIMARY KEY (teacher_id),
  CONSTRAINT teacher_chat_global_settings_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.teacher_chat_messages (
  id bigint NOT NULL DEFAULT nextval('teacher_chat_messages_id_seq'::regclass),
  teacher_id uuid,
  student_id uuid,
  sender_id uuid,
  sender_name text,
  message text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT teacher_chat_messages_pkey PRIMARY KEY (id),
  CONSTRAINT teacher_chat_messages_teacher_id_fkey FOREIGN KEY (teacher_id) REFERENCES public.profiles(id),
  CONSTRAINT teacher_chat_messages_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id),
  CONSTRAINT teacher_chat_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.tracking_confirmations (
  id bigint NOT NULL DEFAULT nextval('tracking_confirmations_id_seq'::regclass),
  student_id uuid NOT NULL,
  tracking_type text NOT NULL CHECK (tracking_type = ANY (ARRAY['lesson'::text, 'activity'::text, 'evaluation'::text, 'collaborative'::text])),
  topic_id text NOT NULL,
  activity_id integer,
  confirmation_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_confirmed boolean NOT NULL DEFAULT false,
  confirmation_timestamp timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  data_quality_score numeric DEFAULT 100 CHECK (data_quality_score >= 0::numeric AND data_quality_score <= 100::numeric),
  validation_status text DEFAULT 'valid'::text CHECK (validation_status = ANY (ARRAY['valid'::text, 'invalid'::text])),
  validation_message text,
  rejection_timestamp timestamp with time zone,
  rejection_metadata jsonb DEFAULT '{}'::jsonb,
  CONSTRAINT tracking_confirmations_pkey PRIMARY KEY (id),
  CONSTRAINT tracking_confirmations_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.user_feedback (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid,
  user_name text,
  email text,
  message_type text CHECK (message_type = ANY (ARRAY['suggestion'::text, 'content_contribution'::text, 'technical_issue'::text, 'other'::text])),
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_feedback_pkey PRIMARY KEY (id)
);