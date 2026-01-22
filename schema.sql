


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."append_collaborative_chat_message"("_chat_id" bigint, "_message" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not exists (
    select 1
    from public.collaborative_chat_participants
    where room_id = _chat_id
      and student_id = auth.uid()
  ) and not exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role in ('teacher', 'admin')
  ) then
    raise exception 'not a participant';
  end if;

  update public.collaborative_chat
     set conversation_log = coalesce(conversation_log, '[]'::jsonb) || jsonb_build_array(_message),
         updated_at = now()
   where id = _chat_id;

  if not found then
    raise exception 'chat not found';
  end if;
end;
$$;


ALTER FUNCTION "public"."append_collaborative_chat_message"("_chat_id" bigint, "_message" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."append_dialogue_peer_message"("_session_id" bigint, "_message" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if not exists (
    select 1
    from public.dialogue_peer_participants
    where session_id = _session_id
      and user_id = auth.uid()
  ) then
    raise exception 'not a participant';
  end if;

  update public.dialogue_peer_sessions
     set conversation_log = coalesce(conversation_log, '[]'::jsonb) || jsonb_build_array(_message),
         updated_at = now()
   where id = _session_id;

  if not found then
    raise exception 'session not found';
  end if;
end;
$$;


ALTER FUNCTION "public"."append_dialogue_peer_message"("_session_id" bigint, "_message" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_case_participant_counts"("_topic_id" "text") RETURNS TABLE("chat_id" bigint, "case_title" "text", "participant_count" integer, "max_students" integer, "is_participant" boolean)
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select
    sessions.id as chat_id,
    sessions.case_title,
    count(participants.student_id)::int as participant_count,
    sessions.max_students,
    bool_or(participants.student_id = auth.uid()) as is_participant
  from public.collaborative_chat sessions
  left join public.collaborative_chat_participants participants
    on participants.room_id = sessions.id
  where sessions.topic_id = _topic_id
  group by sessions.id, sessions.case_title, sessions.max_students;
$$;


ALTER FUNCTION "public"."get_case_participant_counts"("_topic_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_dialogue_peer_session"("_topic_id" "text") RETURNS TABLE("session_id" bigint, "role" "text", "scenario_text" "text", "status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  select s.id, p.role, s.scenario_text
    into session_id, role, scenario_text
    from public.dialogue_peer_participants p
    join public.dialogue_peer_sessions s on s.id = p.session_id
   where p.user_id = auth.uid()
     and s.topic_id = _topic_id
     and s.status = 'active'
   order by s.id desc
   limit 1;

  if session_id is null then
    status := 'none';
    return next;
    return;
  end if;

  status := 'active';
  return next;
end;
$$;


ALTER FUNCTION "public"."get_dialogue_peer_session"("_topic_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"("user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN (
    SELECT role
    FROM public.profiles
    WHERE id = user_id
  );
END;
$$;


ALTER FUNCTION "public"."get_user_role"("user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, full_name, role, must_change_password)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'username',
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'role',
    true
  );
  RETURN new;
END;
$$;


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_room_member"("_room_id" bigint, "_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.collaborative_chat_participants
    WHERE room_id = _room_id AND student_id = _user_id
  );
$$;


ALTER FUNCTION "public"."is_room_member"("_room_id" bigint, "_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."room_has_space"("_room_id" bigint) RETURNS boolean
    LANGUAGE "sql" SECURITY DEFINER
    SET "search_path" TO 'public'
    SET "row_security" TO 'off'
    AS $$
  SELECT (
    SELECT COUNT(*) FROM public.collaborative_chat_participants
    WHERE room_id = _room_id
  ) < (
    SELECT r.max_size FROM public.collaborative_chat_rooms AS r
    WHERE r.id = _room_id
  );
$$;


ALTER FUNCTION "public"."room_has_space"("_room_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."start_collaborative_chat_session"("_topic_id" "text", "_case_title" "text") RETURNS bigint
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  target_chat_id bigint;
  max_capacity integer;
  participant_count integer;
  is_participant boolean;
begin
  select id, max_students
    into target_chat_id, max_capacity
    from public.collaborative_chat
   where topic_id = _topic_id
     and case_title = _case_title
   order by id desc
   limit 1;

  if target_chat_id is null then
    insert into public.collaborative_chat (topic_id, case_title, created_by)
    values (_topic_id, _case_title, auth.uid())
    returning id, max_students into target_chat_id, max_capacity;
  end if;

  select count(*)::int
    into participant_count
    from public.collaborative_chat_participants
   where room_id = target_chat_id;

  select exists (
    select 1
    from public.collaborative_chat_participants
    where room_id = target_chat_id
      and student_id = auth.uid()
  )
  into is_participant;

  if participant_count >= max_capacity and not is_participant then
    raise exception 'case full';
  end if;

  insert into public.collaborative_chat_participants (room_id, student_id)
  values (target_chat_id, auth.uid())
  on conflict do nothing;

  return target_chat_id;
end;
$$;


ALTER FUNCTION "public"."start_collaborative_chat_session"("_topic_id" "text", "_case_title" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."start_dialogue_peer_session"("_topic_id" "text") RETURNS TABLE("session_id" bigint, "role" "text", "scenario_text" "text", "status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  existing_session_id bigint;
  existing_role text;
  existing_scenario text;
  waiting_user uuid;
  scenario_role_a text;
  scenario_role_b text;
  assigned_role_self text;
  assigned_role_other text;
begin
  select s.id, p.role, s.scenario_text
    into existing_session_id, existing_role, existing_scenario
    from public.dialogue_peer_participants p
    join public.dialogue_peer_sessions s on s.id = p.session_id
   where p.user_id = auth.uid()
     and s.topic_id = _topic_id
     and s.status = 'active'
   order by s.id desc
   limit 1;

  if existing_session_id is not null then
    session_id := existing_session_id;
    role := existing_role;
    scenario_text := existing_scenario;
    status := 'active';
    return next;
    return;
  end if;

  delete from public.dialogue_peer_queue
   where topic_id = _topic_id
     and user_id = auth.uid();

  select user_id
    into waiting_user
    from public.dialogue_peer_queue
   where topic_id = _topic_id
     and user_id <> auth.uid()
   order by joined_at
   limit 1
   for update skip locked;

  if waiting_user is null then
    insert into public.dialogue_peer_queue (topic_id, user_id)
    values (_topic_id, auth.uid())
    on conflict do nothing;

    session_id := null;
    role := null;
    scenario_text := null;
    status := 'waiting';
    return next;
    return;
  end if;

  delete from public.dialogue_peer_queue
   where topic_id = _topic_id
     and user_id = waiting_user;

  select dps.scenario_text, dps.role_a, dps.role_b
    into scenario_text, scenario_role_a, scenario_role_b
    from public.dialogue_peer_scenarios dps
   where topic_id = _topic_id
     and is_active = true
   order by random()
   limit 1;

  if scenario_text is null then
    scenario_text := 'أعمل حوار بين معلم وطالبته';
    scenario_role_a := 'معلمة';
    scenario_role_b := 'طالبة';
  end if;

  if random() < 0.5 then
    assigned_role_self := scenario_role_a;
    assigned_role_other := scenario_role_b;
  else
    assigned_role_self := scenario_role_b;
    assigned_role_other := scenario_role_a;
  end if;

  insert into public.dialogue_peer_sessions (topic_id, scenario_text, role_a, role_b)
  values (_topic_id, scenario_text, scenario_role_a, scenario_role_b)
  returning id into session_id;

  insert into public.dialogue_peer_participants (session_id, user_id, role)
  values
    (session_id, auth.uid(), assigned_role_self),
    (session_id, waiting_user, assigned_role_other);

  role := assigned_role_self;
  status := 'matched';
  return next;
end;
$$;


ALTER FUNCTION "public"."start_dialogue_peer_session"("_topic_id" "text") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."activity_submissions" (
    "id" bigint NOT NULL,
    "student_id" "uuid",
    "topic_id" "text" NOT NULL,
    "activity_id" integer NOT NULL,
    "response_text" "text",
    "status" "text" DEFAULT 'submitted'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."activity_submissions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."activity_submissions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."activity_submissions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."activity_submissions_id_seq" OWNED BY "public"."activity_submissions"."id";



CREATE TABLE IF NOT EXISTS "public"."admin_notifications" (
    "id" bigint NOT NULL,
    "recipient_id" "uuid",
    "actor_id" "uuid",
    "actor_role" "text",
    "message" "text" NOT NULL,
    "category" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."admin_notifications" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."admin_notifications_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."admin_notifications_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."admin_notifications_id_seq" OWNED BY "public"."admin_notifications"."id";



CREATE TABLE IF NOT EXISTS "public"."collaborative_activity_completions" (
    "id" bigint NOT NULL,
    "student_id" "uuid" NOT NULL,
    "topic_id" "text" NOT NULL,
    "activity_kind" "text" NOT NULL,
    "completed_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."collaborative_activity_completions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."collaborative_activity_completions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."collaborative_activity_completions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."collaborative_activity_completions_id_seq" OWNED BY "public"."collaborative_activity_completions"."id";



CREATE TABLE IF NOT EXISTS "public"."collaborative_chat" (
    "id" bigint NOT NULL,
    "topic_id" "text" NOT NULL,
    "case_title" "text" NOT NULL,
    "created_by" "uuid",
    "conversation_log" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "max_students" integer DEFAULT 6
);


ALTER TABLE "public"."collaborative_chat" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."collaborative_chat_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."collaborative_chat_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."collaborative_chat_id_seq" OWNED BY "public"."collaborative_chat"."id";



CREATE TABLE IF NOT EXISTS "public"."collaborative_chat_participants" (
    "room_id" bigint NOT NULL,
    "student_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"(),
    "id" bigint NOT NULL,
    "chat_id" bigint,
    "user_id" "uuid"
);


ALTER TABLE "public"."collaborative_chat_participants" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."collaborative_chat_participants_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."collaborative_chat_participants_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."collaborative_chat_participants_id_seq" OWNED BY "public"."collaborative_chat_participants"."id";



CREATE TABLE IF NOT EXISTS "public"."dialogue_peer_participants" (
    "id" bigint NOT NULL,
    "session_id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "text" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."dialogue_peer_participants" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."dialogue_peer_participants_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."dialogue_peer_participants_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."dialogue_peer_participants_id_seq" OWNED BY "public"."dialogue_peer_participants"."id";



CREATE TABLE IF NOT EXISTS "public"."dialogue_peer_queue" (
    "id" bigint NOT NULL,
    "topic_id" "text" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."dialogue_peer_queue" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."dialogue_peer_queue_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."dialogue_peer_queue_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."dialogue_peer_queue_id_seq" OWNED BY "public"."dialogue_peer_queue"."id";



CREATE TABLE IF NOT EXISTS "public"."dialogue_peer_scenarios" (
    "id" bigint NOT NULL,
    "topic_id" "text" NOT NULL,
    "scenario_text" "text" NOT NULL,
    "role_a" "text" NOT NULL,
    "role_b" "text" NOT NULL,
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."dialogue_peer_scenarios" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."dialogue_peer_scenarios_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."dialogue_peer_scenarios_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."dialogue_peer_scenarios_id_seq" OWNED BY "public"."dialogue_peer_scenarios"."id";



CREATE TABLE IF NOT EXISTS "public"."dialogue_peer_sessions" (
    "id" bigint NOT NULL,
    "topic_id" "text" NOT NULL,
    "scenario_text" "text" NOT NULL,
    "role_a" "text" NOT NULL,
    "role_b" "text" NOT NULL,
    "status" "text" DEFAULT 'active'::"text" NOT NULL,
    "conversation_log" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."dialogue_peer_sessions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."dialogue_peer_sessions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."dialogue_peer_sessions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."dialogue_peer_sessions_id_seq" OWNED BY "public"."dialogue_peer_sessions"."id";



CREATE TABLE IF NOT EXISTS "public"."lesson_section_visibility" (
    "teacher_id" "uuid" NOT NULL,
    "topic_id" "text" NOT NULL,
    "section" "text" NOT NULL,
    "is_enabled" boolean DEFAULT true NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "lesson_section_visibility_section_check" CHECK (("section" = ANY (ARRAY['lesson'::"text", 'review'::"text", 'evaluation'::"text", 'activity'::"text", 'collaborative'::"text"])))
);


ALTER TABLE "public"."lesson_section_visibility" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lesson_visibility_settings" (
    "teacher_id" "uuid" NOT NULL,
    "topic_id" "text" NOT NULL,
    "settings" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."lesson_visibility_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."point_rewards" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "title" "text" NOT NULL,
    "min_points" integer NOT NULL,
    "description" "text",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."point_rewards" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "username" "text",
    "role" "text",
    "must_change_password" boolean DEFAULT true NOT NULL,
    "email" "text",
    "added_by_teacher_id" "uuid",
    "full_name" "text",
    "grade" "text",
    CONSTRAINT "username_length" CHECK (("char_length"("username") >= 3))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."student_tracking" (
    "id" bigint NOT NULL,
    "student_id" "uuid" NOT NULL,
    "student_name" "text" NOT NULL,
    "tracking_data" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."student_tracking" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."student_tracking_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."student_tracking_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."student_tracking_id_seq" OWNED BY "public"."student_tracking"."id";



CREATE TABLE IF NOT EXISTS "public"."submissions" (
    "id" integer NOT NULL,
    "student_id" "uuid",
    "submission_data" "jsonb",
    "ai_fixed_text" "text",
    "ai_grade" numeric,
    "ai_response" "jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "teacher_response" "jsonb",
    "topic_title" "text",
    "teacher_grade" numeric
);


ALTER TABLE "public"."submissions" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."submissions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."submissions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."submissions_id_seq" OWNED BY "public"."submissions"."id";



CREATE TABLE IF NOT EXISTS "public"."teacher_chat_global_settings" (
    "teacher_id" "uuid" NOT NULL,
    "is_enabled" boolean DEFAULT true,
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."teacher_chat_global_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."teacher_chat_messages" (
    "id" bigint NOT NULL,
    "teacher_id" "uuid",
    "student_id" "uuid",
    "sender_id" "uuid",
    "sender_name" "text",
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."teacher_chat_messages" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."teacher_chat_messages_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."teacher_chat_messages_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."teacher_chat_messages_id_seq" OWNED BY "public"."teacher_chat_messages"."id";



CREATE TABLE IF NOT EXISTS "public"."user_feedback" (
    "id" bigint NOT NULL,
    "user_id" "uuid",
    "user_name" "text",
    "email" "text",
    "message_type" "text",
    "message" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_feedback_message_type_check" CHECK (("message_type" = ANY (ARRAY['suggestion'::"text", 'content_contribution'::"text", 'technical_issue'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."user_feedback" OWNER TO "postgres";


ALTER TABLE "public"."user_feedback" ALTER COLUMN "id" ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME "public"."user_feedback_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



ALTER TABLE ONLY "public"."activity_submissions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."activity_submissions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."admin_notifications" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."admin_notifications_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."collaborative_activity_completions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."collaborative_activity_completions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."collaborative_chat" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."collaborative_chat_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."collaborative_chat_participants" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."collaborative_chat_participants_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."dialogue_peer_participants" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."dialogue_peer_participants_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."dialogue_peer_queue" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."dialogue_peer_queue_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."dialogue_peer_scenarios" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."dialogue_peer_scenarios_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."dialogue_peer_sessions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."dialogue_peer_sessions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."student_tracking" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."student_tracking_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."submissions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."submissions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."teacher_chat_messages" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."teacher_chat_messages_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."activity_submissions"
    ADD CONSTRAINT "activity_submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."activity_submissions"
    ADD CONSTRAINT "activity_submissions_student_id_topic_id_activity_id_key" UNIQUE ("student_id", "topic_id", "activity_id");



ALTER TABLE ONLY "public"."admin_notifications"
    ADD CONSTRAINT "admin_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collaborative_activity_completions"
    ADD CONSTRAINT "collaborative_activity_comple_student_id_topic_id_activity__key" UNIQUE ("student_id", "topic_id", "activity_kind");



ALTER TABLE ONLY "public"."collaborative_activity_completions"
    ADD CONSTRAINT "collaborative_activity_completions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."collaborative_chat_participants"
    ADD CONSTRAINT "collaborative_chat_participants_pkey" PRIMARY KEY ("room_id", "student_id");



ALTER TABLE ONLY "public"."collaborative_chat_participants"
    ADD CONSTRAINT "collaborative_chat_participants_unique" UNIQUE ("chat_id", "user_id");



ALTER TABLE ONLY "public"."collaborative_chat"
    ADD CONSTRAINT "collaborative_chat_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dialogue_peer_participants"
    ADD CONSTRAINT "dialogue_peer_participants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dialogue_peer_participants"
    ADD CONSTRAINT "dialogue_peer_participants_session_id_user_id_key" UNIQUE ("session_id", "user_id");



ALTER TABLE ONLY "public"."dialogue_peer_queue"
    ADD CONSTRAINT "dialogue_peer_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dialogue_peer_queue"
    ADD CONSTRAINT "dialogue_peer_queue_topic_id_user_id_key" UNIQUE ("topic_id", "user_id");



ALTER TABLE ONLY "public"."dialogue_peer_scenarios"
    ADD CONSTRAINT "dialogue_peer_scenarios_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."dialogue_peer_sessions"
    ADD CONSTRAINT "dialogue_peer_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lesson_section_visibility"
    ADD CONSTRAINT "lesson_section_visibility_pkey" PRIMARY KEY ("teacher_id", "topic_id", "section");



ALTER TABLE ONLY "public"."lesson_visibility_settings"
    ADD CONSTRAINT "lesson_visibility_settings_pkey" PRIMARY KEY ("teacher_id", "topic_id");



ALTER TABLE ONLY "public"."point_rewards"
    ADD CONSTRAINT "point_rewards_min_points_key" UNIQUE ("min_points");



ALTER TABLE ONLY "public"."point_rewards"
    ADD CONSTRAINT "point_rewards_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_email_unique" UNIQUE ("email");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_username_key" UNIQUE ("username");



ALTER TABLE ONLY "public"."student_tracking"
    ADD CONSTRAINT "student_tracking_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."teacher_chat_global_settings"
    ADD CONSTRAINT "teacher_chat_global_settings_pkey" PRIMARY KEY ("teacher_id");



ALTER TABLE ONLY "public"."teacher_chat_messages"
    ADD CONSTRAINT "teacher_chat_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_feedback"
    ADD CONSTRAINT "user_feedback_pkey" PRIMARY KEY ("id");



CREATE INDEX "collaborative_chat_participants_chat_idx" ON "public"."collaborative_chat_participants" USING "btree" ("chat_id");



CREATE INDEX "collaborative_chat_participants_user_idx" ON "public"."collaborative_chat_participants" USING "btree" ("user_id");



CREATE INDEX "collaborative_chat_topic_case_idx" ON "public"."collaborative_chat" USING "btree" ("topic_id", "case_title");



CREATE INDEX "dialogue_peer_participants_session_idx" ON "public"."dialogue_peer_participants" USING "btree" ("session_id");



CREATE INDEX "dialogue_peer_participants_user_idx" ON "public"."dialogue_peer_participants" USING "btree" ("user_id");



CREATE INDEX "dialogue_peer_queue_topic_idx" ON "public"."dialogue_peer_queue" USING "btree" ("topic_id");



CREATE INDEX "dialogue_peer_sessions_topic_idx" ON "public"."dialogue_peer_sessions" USING "btree" ("topic_id");



CREATE UNIQUE INDEX "student_tracking_student_id_idx" ON "public"."student_tracking" USING "btree" ("student_id");



ALTER TABLE ONLY "public"."activity_submissions"
    ADD CONSTRAINT "activity_submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."admin_notifications"
    ADD CONSTRAINT "admin_notifications_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."admin_notifications"
    ADD CONSTRAINT "admin_notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collaborative_activity_completions"
    ADD CONSTRAINT "collaborative_activity_completions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collaborative_chat"
    ADD CONSTRAINT "collaborative_chat_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."collaborative_chat_participants"
    ADD CONSTRAINT "collaborative_chat_participants_chat_id_fkey" FOREIGN KEY ("chat_id") REFERENCES "public"."collaborative_chat"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collaborative_chat_participants"
    ADD CONSTRAINT "collaborative_chat_participants_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."collaborative_chat_participants"
    ADD CONSTRAINT "collaborative_chat_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dialogue_peer_participants"
    ADD CONSTRAINT "dialogue_peer_participants_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "public"."dialogue_peer_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dialogue_peer_participants"
    ADD CONSTRAINT "dialogue_peer_participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."dialogue_peer_queue"
    ADD CONSTRAINT "dialogue_peer_queue_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_section_visibility"
    ADD CONSTRAINT "lesson_section_visibility_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."lesson_visibility_settings"
    ADD CONSTRAINT "lesson_visibility_settings_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_added_by_teacher_id_fkey" FOREIGN KEY ("added_by_teacher_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."student_tracking"
    ADD CONSTRAINT "student_tracking_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."submissions"
    ADD CONSTRAINT "submissions_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id");



ALTER TABLE ONLY "public"."teacher_chat_global_settings"
    ADD CONSTRAINT "teacher_chat_global_settings_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teacher_chat_messages"
    ADD CONSTRAINT "teacher_chat_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teacher_chat_messages"
    ADD CONSTRAINT "teacher_chat_messages_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."teacher_chat_messages"
    ADD CONSTRAINT "teacher_chat_messages_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



CREATE POLICY "Admin notifications insert by actor." ON "public"."admin_notifications" FOR INSERT WITH CHECK (("auth"."uid"() = "actor_id"));



CREATE POLICY "Admin notifications viewable by recipient or admin." ON "public"."admin_notifications" FOR SELECT USING ((("auth"."uid"() = "recipient_id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "Collaborative chat participants can view membership" ON "public"."collaborative_chat_participants" FOR SELECT USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Collaborative chat participants can view sessions" ON "public"."collaborative_chat" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."collaborative_chat_participants" "participants"
  WHERE (("participants"."chat_id" = "collaborative_chat"."id") AND ("participants"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['teacher'::"text", 'admin'::"text"])))))));



CREATE POLICY "Collaborative chat participants insert by self" ON "public"."collaborative_chat_participants" FOR INSERT WITH CHECK (("auth"."uid"() = "student_id"));



CREATE POLICY "Collaborative chat participants viewable by room members" ON "public"."collaborative_chat_participants" FOR SELECT USING ((("student_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['teacher'::"text", 'admin'::"text"])))))));



CREATE POLICY "Collaborative chat sessions insert by creator." ON "public"."collaborative_chat" FOR INSERT WITH CHECK (("auth"."uid"() = "created_by"));



CREATE POLICY "Collaborative chat sessions viewable by authenticated users." ON "public"."collaborative_chat" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Dialogue participants insert by self" ON "public"."dialogue_peer_participants" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Dialogue participants viewable by members" ON "public"."dialogue_peer_participants" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['teacher'::"text", 'admin'::"text"])))))));



CREATE POLICY "Dialogue queue delete by self" ON "public"."dialogue_peer_queue" FOR DELETE USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Dialogue queue insert by self" ON "public"."dialogue_peer_queue" FOR INSERT WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Dialogue scenarios viewable by authenticated" ON "public"."dialogue_peer_scenarios" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Dialogue sessions viewable by participants" ON "public"."dialogue_peer_sessions" FOR SELECT USING (((EXISTS ( SELECT 1
   FROM "public"."dialogue_peer_participants" "participants"
  WHERE (("participants"."session_id" = "dialogue_peer_sessions"."id") AND ("participants"."user_id" = "auth"."uid"())))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['teacher'::"text", 'admin'::"text"])))))));



CREATE POLICY "Enable teachers and admins to update teacher feedback" ON "public"."submissions" FOR UPDATE USING ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = ANY (ARRAY['teacher'::"text", 'admin'::"text"]))) WITH CHECK ((( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = ANY (ARRAY['teacher'::"text", 'admin'::"text"])));



CREATE POLICY "Lesson section visibility insert by teacher/admin." ON "public"."lesson_section_visibility" FOR INSERT WITH CHECK ((("auth"."uid"() = "teacher_id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "Lesson section visibility update by teacher/admin." ON "public"."lesson_section_visibility" FOR UPDATE USING ((("auth"."uid"() = "teacher_id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "Lesson section visibility viewable by participants." ON "public"."lesson_section_visibility" FOR SELECT USING ((("auth"."uid"() IS NOT NULL) AND (("auth"."uid"() = "teacher_id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'student'::"text") AND ("profiles"."added_by_teacher_id" = "lesson_section_visibility"."teacher_id")))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))))));



CREATE POLICY "Lesson visibility settings insert by teacher/admin." ON "public"."lesson_visibility_settings" FOR INSERT WITH CHECK ((("auth"."uid"() = "teacher_id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "Lesson visibility settings update by teacher/admin." ON "public"."lesson_visibility_settings" FOR UPDATE USING ((("auth"."uid"() = "teacher_id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text"))))));



CREATE POLICY "Lesson visibility settings viewable by participants." ON "public"."lesson_visibility_settings" FOR SELECT USING ((("auth"."uid"() IS NOT NULL) AND (("auth"."uid"() = "teacher_id") OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'student'::"text") AND ("profiles"."added_by_teacher_id" = "lesson_visibility_settings"."teacher_id")))) OR (EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = 'admin'::"text")))))));



CREATE POLICY "Public profiles are viewable by everyone." ON "public"."profiles" FOR SELECT USING (true);



CREATE POLICY "Students can insert own collaborative completions" ON "public"."collaborative_activity_completions" FOR INSERT WITH CHECK (("student_id" = "auth"."uid"()));



CREATE POLICY "Students can insert their activity submissions" ON "public"."activity_submissions" FOR INSERT WITH CHECK (("auth"."uid"() = "student_id"));



CREATE POLICY "Students can insert their tracking" ON "public"."student_tracking" FOR INSERT WITH CHECK (("auth"."uid"() = "student_id"));



CREATE POLICY "Students can update their activity submissions" ON "public"."activity_submissions" FOR UPDATE USING (("auth"."uid"() = "student_id"));



CREATE POLICY "Students can update their tracking" ON "public"."student_tracking" FOR UPDATE USING (("auth"."uid"() = "student_id")) WITH CHECK (("auth"."uid"() = "student_id"));



CREATE POLICY "Students can view own collaborative completions" ON "public"."collaborative_activity_completions" FOR SELECT USING (("student_id" = "auth"."uid"()));



CREATE POLICY "Students can view their activity submissions" ON "public"."activity_submissions" FOR SELECT USING (("auth"."uid"() = "student_id"));



CREATE POLICY "Students can view their tracking" ON "public"."student_tracking" FOR SELECT USING (("auth"."uid"() = "student_id"));



CREATE POLICY "Teacher chat global settings manageable by teacher." ON "public"."teacher_chat_global_settings" FOR INSERT WITH CHECK (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Teacher chat global settings update by teacher." ON "public"."teacher_chat_global_settings" FOR UPDATE USING (("auth"."uid"() = "teacher_id"));



CREATE POLICY "Teacher chat global settings viewable by participants." ON "public"."teacher_chat_global_settings" FOR SELECT USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Teacher chat messages insert by participants." ON "public"."teacher_chat_messages" FOR INSERT WITH CHECK ((("auth"."uid"() = "sender_id") AND (("sender_id" = "teacher_id") OR ("sender_id" = "student_id"))));



CREATE POLICY "Teacher chat messages viewable by participants." ON "public"."teacher_chat_messages" FOR SELECT USING ((("auth"."uid"() = "teacher_id") OR ("auth"."uid"() = "student_id")));



CREATE POLICY "Teachers and admins can view student tracking" ON "public"."student_tracking" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles" "p"
  WHERE (("p"."id" = "auth"."uid"()) AND ("p"."role" = ANY (ARRAY['teacher'::"text", 'admin'::"text"])) AND (("p"."role" = 'admin'::"text") OR (EXISTS ( SELECT 1
           FROM "public"."profiles" "s"
          WHERE (("s"."id" = "student_tracking"."student_id") AND ("s"."added_by_teacher_id" = "auth"."uid"())))))))));



CREATE POLICY "Teachers can manage collaborative completions" ON "public"."collaborative_activity_completions" FOR DELETE USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['teacher'::"text", 'admin'::"text"]))))));



CREATE POLICY "Teachers can view activity submissions" ON "public"."activity_submissions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['teacher'::"text", 'admin'::"text"]))))));



CREATE POLICY "Teachers can view collaborative completions" ON "public"."collaborative_activity_completions" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."profiles"
  WHERE (("profiles"."id" = "auth"."uid"()) AND ("profiles"."role" = ANY (ARRAY['teacher'::"text", 'admin'::"text"]))))));



CREATE POLICY "Users can insert their own profile." ON "public"."profiles" FOR INSERT WITH CHECK (("auth"."uid"() = "id"));



CREATE POLICY "Users can insert their own submissions." ON "public"."submissions" FOR INSERT WITH CHECK (("auth"."uid"() = "student_id"));



CREATE POLICY "Users can update own profile." ON "public"."profiles" FOR UPDATE USING (("auth"."uid"() = "id"));



CREATE POLICY "Users can view own submissions, teachers can view all." ON "public"."submissions" FOR SELECT USING ((("auth"."uid"() = "student_id") OR (( SELECT "profiles"."role"
   FROM "public"."profiles"
  WHERE ("profiles"."id" = "auth"."uid"())) = ANY (ARRAY['teacher'::"text", 'admin'::"text"]))));



ALTER TABLE "public"."activity_submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."admin_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."collaborative_activity_completions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."collaborative_chat" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."collaborative_chat_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dialogue_peer_participants" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dialogue_peer_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dialogue_peer_scenarios" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."dialogue_peer_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lesson_section_visibility" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lesson_visibility_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."student_tracking" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."submissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teacher_chat_global_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."teacher_chat_messages" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."append_collaborative_chat_message"("_chat_id" bigint, "_message" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."append_collaborative_chat_message"("_chat_id" bigint, "_message" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."append_collaborative_chat_message"("_chat_id" bigint, "_message" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."append_dialogue_peer_message"("_session_id" bigint, "_message" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."append_dialogue_peer_message"("_session_id" bigint, "_message" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."append_dialogue_peer_message"("_session_id" bigint, "_message" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_case_participant_counts"("_topic_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_case_participant_counts"("_topic_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_case_participant_counts"("_topic_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_dialogue_peer_session"("_topic_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_dialogue_peer_session"("_topic_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_dialogue_peer_session"("_topic_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"("user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"("user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"("user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_room_member"("_room_id" bigint, "_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_room_member"("_room_id" bigint, "_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_room_member"("_room_id" bigint, "_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."room_has_space"("_room_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."room_has_space"("_room_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."room_has_space"("_room_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."start_collaborative_chat_session"("_topic_id" "text", "_case_title" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."start_collaborative_chat_session"("_topic_id" "text", "_case_title" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."start_collaborative_chat_session"("_topic_id" "text", "_case_title" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."start_dialogue_peer_session"("_topic_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."start_dialogue_peer_session"("_topic_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."start_dialogue_peer_session"("_topic_id" "text") TO "service_role";



GRANT ALL ON TABLE "public"."activity_submissions" TO "anon";
GRANT ALL ON TABLE "public"."activity_submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."activity_submissions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."activity_submissions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."activity_submissions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."activity_submissions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."admin_notifications" TO "anon";
GRANT ALL ON TABLE "public"."admin_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."admin_notifications" TO "service_role";



GRANT ALL ON SEQUENCE "public"."admin_notifications_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."admin_notifications_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."admin_notifications_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."collaborative_activity_completions" TO "anon";
GRANT ALL ON TABLE "public"."collaborative_activity_completions" TO "authenticated";
GRANT ALL ON TABLE "public"."collaborative_activity_completions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."collaborative_activity_completions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."collaborative_activity_completions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."collaborative_activity_completions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."collaborative_chat" TO "anon";
GRANT ALL ON TABLE "public"."collaborative_chat" TO "authenticated";
GRANT ALL ON TABLE "public"."collaborative_chat" TO "service_role";



GRANT ALL ON SEQUENCE "public"."collaborative_chat_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."collaborative_chat_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."collaborative_chat_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."collaborative_chat_participants" TO "anon";
GRANT ALL ON TABLE "public"."collaborative_chat_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."collaborative_chat_participants" TO "service_role";



GRANT ALL ON SEQUENCE "public"."collaborative_chat_participants_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."collaborative_chat_participants_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."collaborative_chat_participants_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."dialogue_peer_participants" TO "anon";
GRANT ALL ON TABLE "public"."dialogue_peer_participants" TO "authenticated";
GRANT ALL ON TABLE "public"."dialogue_peer_participants" TO "service_role";



GRANT ALL ON SEQUENCE "public"."dialogue_peer_participants_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."dialogue_peer_participants_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."dialogue_peer_participants_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."dialogue_peer_queue" TO "anon";
GRANT ALL ON TABLE "public"."dialogue_peer_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."dialogue_peer_queue" TO "service_role";



GRANT ALL ON SEQUENCE "public"."dialogue_peer_queue_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."dialogue_peer_queue_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."dialogue_peer_queue_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."dialogue_peer_scenarios" TO "anon";
GRANT ALL ON TABLE "public"."dialogue_peer_scenarios" TO "authenticated";
GRANT ALL ON TABLE "public"."dialogue_peer_scenarios" TO "service_role";



GRANT ALL ON SEQUENCE "public"."dialogue_peer_scenarios_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."dialogue_peer_scenarios_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."dialogue_peer_scenarios_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."dialogue_peer_sessions" TO "anon";
GRANT ALL ON TABLE "public"."dialogue_peer_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."dialogue_peer_sessions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."dialogue_peer_sessions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."dialogue_peer_sessions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."dialogue_peer_sessions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."lesson_section_visibility" TO "anon";
GRANT ALL ON TABLE "public"."lesson_section_visibility" TO "authenticated";
GRANT ALL ON TABLE "public"."lesson_section_visibility" TO "service_role";



GRANT ALL ON TABLE "public"."lesson_visibility_settings" TO "anon";
GRANT ALL ON TABLE "public"."lesson_visibility_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."lesson_visibility_settings" TO "service_role";



GRANT ALL ON TABLE "public"."point_rewards" TO "anon";
GRANT ALL ON TABLE "public"."point_rewards" TO "authenticated";
GRANT ALL ON TABLE "public"."point_rewards" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."student_tracking" TO "anon";
GRANT ALL ON TABLE "public"."student_tracking" TO "authenticated";
GRANT ALL ON TABLE "public"."student_tracking" TO "service_role";



GRANT ALL ON SEQUENCE "public"."student_tracking_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."student_tracking_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."student_tracking_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."submissions" TO "anon";
GRANT ALL ON TABLE "public"."submissions" TO "authenticated";
GRANT ALL ON TABLE "public"."submissions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."submissions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."submissions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."submissions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."teacher_chat_global_settings" TO "anon";
GRANT ALL ON TABLE "public"."teacher_chat_global_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."teacher_chat_global_settings" TO "service_role";



GRANT ALL ON TABLE "public"."teacher_chat_messages" TO "anon";
GRANT ALL ON TABLE "public"."teacher_chat_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."teacher_chat_messages" TO "service_role";



GRANT ALL ON SEQUENCE "public"."teacher_chat_messages_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."teacher_chat_messages_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."teacher_chat_messages_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_feedback" TO "anon";
GRANT ALL ON TABLE "public"."user_feedback" TO "authenticated";
GRANT ALL ON TABLE "public"."user_feedback" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_feedback_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_feedback_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_feedback_id_seq" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







