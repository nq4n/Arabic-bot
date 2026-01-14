--
-- This is a clean database schema for a standard email/password login.
-- It removes all the complex functions from previous attempts.
--

-- STEP 1: Drop everything to be certain we have a clean slate.
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- STEP 2: Recreate the database schema correctly.

-- Create profiles table. It will store the user's role and a public username for display.
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  username TEXT UNIQUE,
  role TEXT,
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- Function to create a profile automatically when a new user signs up in Supabase Auth.
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, role)
  VALUES (new.id, new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'role');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run the function after a new user is created.
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Set Row Level Security for the profiles table.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);


-- Create all other application tables (topics, submissions, etc.)
CREATE TABLE public.topics (id SERIAL PRIMARY KEY, title TEXT NOT NULL, grade TEXT, description TEXT, lesson TEXT, sample TEXT, questions TEXT[], created_at TIMESTAMPTZ DEFAULT NOW());
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Topics are viewable by everyone." ON public.topics FOR SELECT USING (true);

CREATE TABLE public.submissions (id SERIAL PRIMARY KEY, student_id UUID REFERENCES public.profiles(id), topic_id INTEGER REFERENCES public.topics(id), text TEXT, ai_fixed_text TEXT, ai_grade NUMERIC, ai_response JSONB, created_at TIMESTAMPTZ DEFAULT NOW());
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Submissions are viewable by owners." ON public.submissions FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Users can insert their own submissions." ON public.submissions FOR INSERT WITH CHECK (auth.uid() = student_id);

-- Teacher/student private chat tables
CREATE TABLE public.teacher_chat_settings (
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_enabled BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (teacher_id, student_id)
);

ALTER TABLE public.teacher_chat_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teacher chat settings viewable by participants." ON public.teacher_chat_settings
  FOR SELECT USING (auth.uid() = teacher_id OR auth.uid() = student_id);
CREATE POLICY "Teacher chat settings manageable by teacher." ON public.teacher_chat_settings
  FOR INSERT WITH CHECK (auth.uid() = teacher_id);
CREATE POLICY "Teacher chat settings update by teacher." ON public.teacher_chat_settings
  FOR UPDATE USING (auth.uid() = teacher_id);

CREATE TABLE public.teacher_chat_messages (
  id BIGSERIAL PRIMARY KEY,
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_name TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.teacher_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teacher chat messages viewable by participants." ON public.teacher_chat_messages
  FOR SELECT USING (auth.uid() = teacher_id OR auth.uid() = student_id);
CREATE POLICY "Teacher chat messages insert by participants." ON public.teacher_chat_messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND (sender_id = teacher_id OR sender_id = student_id)
  );

-- Collaborative student chat tables
CREATE TABLE public.collaborative_chat_messages (
  id BIGSERIAL PRIMARY KEY,
  topic_id TEXT NOT NULL,
  room_key TEXT NOT NULL,
  room_type TEXT NOT NULL CHECK (room_type IN ('group', 'pair')),
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  sender_name TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.collaborative_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Collaborative chat viewable by authenticated users." ON public.collaborative_chat_messages
  FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Collaborative chat insert by sender." ON public.collaborative_chat_messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);
