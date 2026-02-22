-- Create a public profiles table that mirrors auth.users for web routing
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Turn on Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow public read access to profiles for URL routing (e.g., /username/project-slug)
CREATE POLICY "Public profiles are viewable by everyone."
  ON public.profiles FOR SELECT
  USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile."
  ON public.profiles FOR UPDATE
  USING ((select auth.uid()) = id);

-- Function to automatically capture auth.users changes into public.profiles
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER AS $$
DECLARE
  extracted_username TEXT;
  base_username TEXT;
  suffix INTEGER := 1;
BEGIN
  -- Attempt to get specialized 'username' from metadata
  extracted_username := NEW.raw_user_meta_data->>'username';

  -- Fallback: Use email prefix (e.g. xyz@gmail.com -> xyz)
  IF extracted_username IS NULL OR extracted_username = '' THEN
    base_username := SPLIT_PART(NEW.email, '@', 1);
    extracted_username := base_username;

    -- Collision handler: If the auto-generated username exists, increment a suffix
    WHILE EXISTS (SELECT 1 FROM public.profiles WHERE username = extracted_username) LOOP
      extracted_username := base_username || '-' || suffix;
      suffix := suffix + 1;
    END LOOP;
  END IF;

  -- Insert or Update the profile
  INSERT INTO public.profiles (id, username, avatar_url)
  VALUES (
    NEW.id,
    extracted_username,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    username = EXCLUDED.username,
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to watch auth.users on INSERT (Sign Up) and UPDATE (user_metadata changes)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();
