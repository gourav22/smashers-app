-- Add sports preference field to users table
-- Run this in Supabase SQL Editor

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS sports_played TEXT[] DEFAULT ARRAY['badminton', 'cricket'];

-- Set default for existing users (they play both)
UPDATE public.users
SET sports_played = ARRAY['badminton', 'cricket']
WHERE sports_played IS NULL;

-- Add comment
COMMENT ON COLUMN public.users.sports_played IS 'Array of sports user plays: badminton, cricket, or both';

SELECT 'Sports preference field added successfully\!' AS message;
