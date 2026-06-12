-- Multi-Club Support Setup
-- Run this in Supabase SQL Editor

-- Create clubs table
CREATE TABLE IF NOT EXISTS public.clubs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3B82F6',
  sports TEXT[] DEFAULT ARRAY['badminton', 'cricket'],
  booking_cost NUMERIC(10, 2) DEFAULT 4,
  waitlist_max INTEGER DEFAULT 10,
  default_elo INTEGER DEFAULT 1200,
  grade_thresholds JSONB DEFAULT '{"A": 1600, "B": 1400, "C": 1200}',
  currency_symbol TEXT DEFAULT '€',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add club_id to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE;

-- Add club_id to other tables
ALTER TABLE public.slots
ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE;

ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE;

ALTER TABLE public.bookings
ADD COLUMN IF NOT EXISTS club_id UUID REFERENCES public.clubs(id) ON DELETE CASCADE;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_club_id ON public.users(club_id);
CREATE INDEX IF NOT EXISTS idx_slots_club_id ON public.slots(club_id);
CREATE INDEX IF NOT EXISTS idx_matches_club_id ON public.matches(club_id);
CREATE INDEX IF NOT EXISTS idx_bookings_club_id ON public.bookings(club_id);
CREATE INDEX IF NOT EXISTS idx_clubs_subdomain ON public.clubs(subdomain);

-- Insert default club (for existing data)
INSERT INTO public.clubs (id, name, subdomain, sports)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Smashers Club',
  'smashers',
  ARRAY['badminton', 'cricket']
)
ON CONFLICT (subdomain) DO NOTHING;

-- Update existing users to default club (if no club_id)
UPDATE public.users
SET club_id = '00000000-0000-0000-0000-000000000001'
WHERE club_id IS NULL;

-- Update existing slots to default club
UPDATE public.slots
SET club_id = '00000000-0000-0000-0000-000000000001'
WHERE club_id IS NULL;

-- Update existing matches to default club
UPDATE public.matches
SET club_id = '00000000-0000-0000-0000-000000000001'
WHERE club_id IS NULL;

-- Update existing bookings to default club
UPDATE public.bookings
SET club_id = '00000000-0000-0000-0000-000000000001'
WHERE club_id IS NULL;

-- Update RLS policies to include club_id checks

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

-- Recreate with club isolation
CREATE POLICY "Users can view profiles in their club"
ON public.users
FOR SELECT
USING (
  club_id = (SELECT club_id FROM public.users WHERE id = auth.uid())
  OR auth.uid() IS NULL -- Allow during registration
);

CREATE POLICY "Users can insert own profile"
ON public.users
FOR INSERT
WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Slots policies with club isolation
DROP POLICY IF EXISTS "Anyone can view slots" ON public.slots;
CREATE POLICY "Users can view slots in their club"
ON public.slots
FOR SELECT
USING (
  club_id = (SELECT club_id FROM public.users WHERE id = auth.uid())
);

-- Matches policies with club isolation
DROP POLICY IF EXISTS "Anyone can view matches" ON public.matches;
CREATE POLICY "Users can view matches in their club"
ON public.matches
FOR SELECT
USING (
  club_id = (SELECT club_id FROM public.users WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Users can create matches" ON public.matches;
CREATE POLICY "Users can create matches in their club"
ON public.matches
FOR INSERT
WITH CHECK (
  created_by = auth.uid() AND
  club_id = (SELECT club_id FROM public.users WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Users can update own matches" ON public.matches;
CREATE POLICY "Users can update matches in their club"
ON public.matches
FOR UPDATE
USING (
  club_id = (SELECT club_id FROM public.users WHERE id = auth.uid())
);

-- Function to auto-assign club_id on user creation
CREATE OR REPLACE FUNCTION public.assign_club_to_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Assign to default club for now
  -- In production, this would be based on subdomain or invite link
  NEW.club_id := '00000000-0000-0000-0000-000000000001';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to assign club on user creation
DROP TRIGGER IF EXISTS on_user_created_assign_club ON public.users;
CREATE TRIGGER on_user_created_assign_club
  BEFORE INSERT ON public.users
  FOR EACH ROW
  WHEN (NEW.club_id IS NULL)
  EXECUTE FUNCTION public.assign_club_to_new_user();

-- Clubs table RLS
ALTER TABLE public.clubs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their club"
ON public.clubs
FOR SELECT
USING (
  id = (SELECT club_id FROM public.users WHERE id = auth.uid())
);

-- Function to get current user's club settings
CREATE OR REPLACE FUNCTION public.get_club_settings()
RETURNS TABLE (
  name TEXT,
  booking_cost NUMERIC,
  waitlist_max INTEGER,
  default_elo INTEGER,
  grade_thresholds JSONB,
  currency_symbol TEXT,
  sports TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.name,
    c.booking_cost,
    c.waitlist_max,
    c.default_elo,
    c.grade_thresholds,
    c.currency_symbol,
    c.sports
  FROM public.clubs c
  INNER JOIN public.users u ON u.club_id = c.id
  WHERE u.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'Multi-club support setup complete!' AS message;
SELECT 'All existing data assigned to default club: Smashers Club' AS note;
