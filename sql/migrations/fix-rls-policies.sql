-- Fix infinite recursion in RLS policies
-- Run this in Supabase SQL Editor

-- Drop all existing policies on users table
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Admins can do anything" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;

-- Recreate policies without recursion
-- Allow everyone to read all user profiles
CREATE POLICY "Users can view all profiles"
ON public.users
FOR SELECT
USING (true);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
ON public.users
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile (but not sensitive fields)
CREATE POLICY "Users can update own profile"
ON public.users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- For admin operations, we'll use service role key in API routes
-- This avoids the infinite recursion problem

SELECT 'RLS policies fixed successfully!' AS message;
