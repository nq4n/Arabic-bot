-- Indexes for the query patterns used by the React app.
-- These are additive and safe to rerun.

CREATE INDEX IF NOT EXISTS profiles_role_username_idx
  ON public.profiles (role, username);

CREATE INDEX IF NOT EXISTS profiles_teacher_role_username_idx
  ON public.profiles (added_by_teacher_id, role, username);

CREATE INDEX IF NOT EXISTS submissions_student_created_at_idx
  ON public.submissions (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS submissions_created_at_idx
  ON public.submissions (created_at DESC);

CREATE INDEX IF NOT EXISTS activity_submissions_student_created_at_idx
  ON public.activity_submissions (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS collaborative_completions_student_completed_at_idx
  ON public.collaborative_activity_completions (student_id, completed_at DESC);

CREATE INDEX IF NOT EXISTS tracking_confirmations_student_created_at_idx
  ON public.tracking_confirmations (student_id, created_at DESC);

CREATE INDEX IF NOT EXISTS session_durations_student_type_completed_topic_idx
  ON public.session_durations (student_id, session_type, is_completed, topic_id);

CREATE INDEX IF NOT EXISTS teacher_chat_messages_thread_created_at_idx
  ON public.teacher_chat_messages (teacher_id, student_id, created_at);

CREATE INDEX IF NOT EXISTS admin_notifications_recipient_created_at_idx
  ON public.admin_notifications (recipient_id, created_at);

CREATE INDEX IF NOT EXISTS collaborative_chat_topic_created_at_idx
  ON public.collaborative_chat (topic_id, created_at DESC);

CREATE INDEX IF NOT EXISTS collaborative_chat_conversation_log_gin_idx
  ON public.collaborative_chat USING gin (conversation_log jsonb_path_ops);

CREATE INDEX IF NOT EXISTS collaborative_chat_participants_student_joined_idx
  ON public.collaborative_chat_participants (student_id, joined_at DESC);

CREATE INDEX IF NOT EXISTS collaborative_chat_participants_chat_id_idx
  ON public.collaborative_chat_participants (chat_id);

CREATE INDEX IF NOT EXISTS dialogue_peer_participants_user_joined_idx
  ON public.dialogue_peer_participants (user_id, joined_at DESC);

CREATE INDEX IF NOT EXISTS dialogue_peer_participants_session_id_idx
  ON public.dialogue_peer_participants (session_id);

CREATE INDEX IF NOT EXISTS dialogue_peer_sessions_topic_created_at_idx
  ON public.dialogue_peer_sessions (topic_id, created_at DESC);

CREATE INDEX IF NOT EXISTS dialogue_peer_queue_topic_joined_idx
  ON public.dialogue_peer_queue (topic_id, joined_at);
