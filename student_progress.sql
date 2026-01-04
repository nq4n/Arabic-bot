-- Student progress table to store per-student progress data.

CREATE TABLE IF NOT EXISTS public.student_progress (
  id BIGSERIAL PRIMARY KEY,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  progress JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (student_id)
);

ALTER TABLE public.student_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view their progress"
  ON public.student_progress
  FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can insert their progress"
  ON public.student_progress
  FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update their progress"
  ON public.student_progress
  FOR UPDATE
  USING (auth.uid() = student_id);

CREATE POLICY "Teachers can view student progress"
  ON public.student_progress
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles
      WHERE profiles.id = auth.uid()
        AND profiles.role IN ('teacher', 'admin')
    )
  );
