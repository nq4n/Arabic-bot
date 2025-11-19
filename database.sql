-- Create a table for public user profiles
-- This links to auth.users and stores public data.
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  username TEXT UNIQUE,
  role TEXT,
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- Function to create a profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, role)
  VALUES (new.id, new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'role');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to run the function on new user creation
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Policies for 'profiles' table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone." ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert their own profile." ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile." ON profiles FOR UPDATE USING (auth.uid() = id);


-- Create topics table
CREATE TABLE topics (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    grade TEXT,
    description TEXT,
    lesson TEXT,
    sample TEXT,
    questions TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Policies for 'topics' table
ALTER TABLE topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Topics are viewable by everyone." ON topics FOR SELECT USING (true);


-- Create submissions table
CREATE TABLE submissions (
    id SERIAL PRIMARY KEY,
    student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    topic_id INTEGER REFERENCES public.topics(id) ON DELETE CASCADE,
    text TEXT,
    ai_fixed_text TEXT,
    ai_grade NUMERIC,
    ai_response JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Policies for 'submissions' table
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own submissions." ON submissions FOR SELECT USING (auth.uid() = student_id);
CREATE POLICY "Users can insert their own submissions." ON submissions FOR INSERT WITH CHECK (auth.uid() = student_id);


-- Create messages table
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Policies for 'messages' table
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own messages." ON messages FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own messages." ON messages FOR INSERT WITH CHECK (auth.uid() = user_id);


-- Create ratings table
CREATE TABLE ratings (
    id SERIAL PRIMARY KEY,
    submission_id INTEGER REFERENCES public.submissions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE, -- The user who *gave* the rating
    value NUMERIC,
    feedback_type TEXT, -- e.g., 'teacher', 'ai', 'self'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Policies for 'ratings' table
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view ratings on their submissions." ON ratings
    FOR SELECT USING (
        auth.uid() = user_id OR
        EXISTS (SELECT 1 FROM submissions WHERE submissions.id = ratings.submission_id AND submissions.student_id = auth.uid())
    );
CREATE POLICY "Users can insert ratings." ON ratings FOR INSERT WITH CHECK (auth.uid() = user_id);
