-- Add approval tracking fields to matches table
-- Run this in Supabase SQL Editor

ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.users(id),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- Add comment for clarity
COMMENT ON COLUMN public.matches.approved_by IS 'Admin who approved the match score';
COMMENT ON COLUMN public.matches.approved_at IS 'Timestamp when match was approved';

SELECT 'Match approval fields added successfully!' AS message;
