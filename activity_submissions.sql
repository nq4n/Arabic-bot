-- Activity submissions table to store student activity notes sent to teachers.

CREATE TABLE IF NOT EXISTS public.activity_submissions (
  id BIGSERIAL PRIMARY KEY,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  topic_id TEXT NOT NULL,
  activity_id INTEGER NOT NULL,
  response_text TEXT,
  status TEXT NOT NULL DEFAULT 'submitted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id, topic_id, activity_id)
);

ALTER TABLE public.activity_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their activity submissions"
  ON public.activity_submissions
  FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their activity submissions"
  ON public.activity_submissions
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their activity submissions"
  ON public.activity_submissions
  FOR UPDATE
  USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view activity submissions"
  ON public.activity_submissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('teacher', 'admin')
    )
  );
