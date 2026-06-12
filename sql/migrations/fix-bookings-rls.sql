-- Fix: Add missing RLS policies for bookings and verify users table
-- Run this in Supabase SQL Editor

-- First, drop ALL existing policies on users table to avoid conflicts
DROP POLICY IF EXISTS "Admins can do anything" ON public.users;
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Recreate users policies without recursion
CREATE POLICY "Users can view all profiles"
ON public.users
FOR SELECT
USING (true);

CREATE POLICY "Users can insert own profile"
ON public.users
FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Drop ALL existing bookings policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can create bookings" ON public.bookings;
DROP POLICY IF EXISTS "Users can cancel own bookings" ON public.bookings;

-- Create new bookings policies
CREATE POLICY "Users can view own bookings"
ON public.bookings
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Admins can view all bookings"
ON public.bookings
FOR SELECT
USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'slot_manager', 'finance_manager'))
);

-- ADD MISSING INSERT POLICY FOR BOOKINGS - This is the main fix!
CREATE POLICY "Users can create bookings"
ON public.bookings
FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Add UPDATE policy for bookings (for cancellation)
CREATE POLICY "Users can cancel own bookings"
ON public.bookings
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Drop ALL existing slots policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can view slots" ON public.slots;
DROP POLICY IF EXISTS "Admins can manage slots" ON public.slots;
DROP POLICY IF EXISTS "Admins can create slots" ON public.slots;
DROP POLICY IF EXISTS "Admins can update slots" ON public.slots;
DROP POLICY IF EXISTS "Admins can delete slots" ON public.slots;

CREATE POLICY "Anyone can view slots"
ON public.slots
FOR SELECT
USING (true);

CREATE POLICY "Admins can create slots"
ON public.slots
FOR INSERT
WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'slot_manager'))
);

CREATE POLICY "Admins can update slots"
ON public.slots
FOR UPDATE
USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'slot_manager'))
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'slot_manager'))
);

CREATE POLICY "Admins can delete slots"
ON public.slots
FOR DELETE
USING (
  EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('super_admin', 'slot_manager'))
);

SELECT 'RLS policies fixed for bookings and slots successfully!' AS message;
