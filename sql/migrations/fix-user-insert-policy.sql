-- Fix: Add INSERT policy for users table so profiles can be created
-- Run this in Supabase SQL Editor

-- Allow users to insert their own profile (needed for registration)
CREATE POLICY "Users can insert own profile" ON public.users
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Update the trigger function to include phone and handle duplicates
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, phone)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'phone'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN others THEN
    -- Log error but don't fail the auth signup
    RAISE WARNING 'Failed to create user profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'User insert policy and trigger updated successfully!' AS message;
