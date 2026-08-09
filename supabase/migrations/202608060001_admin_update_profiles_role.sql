-- Allow admins to update any user's profile (role changes, etc.).
-- Previously the only UPDATE policy on profiles was "Users can update own profile"
-- (auth.uid() = id), so handleChangeRole was silently blocked by RLS.
-- Additive and safe to rerun.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'Admins can update any profile'
  ) THEN
    CREATE POLICY "Admins can update any profile"
      ON public.profiles
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles pr
          WHERE pr.id = auth.uid() AND pr.role = 'admin'
        )
      );
  END IF;
END $$;
