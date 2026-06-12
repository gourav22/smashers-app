-- Add push subscription support to users table
-- Run this in Supabase SQL Editor

ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS push_subscription JSONB DEFAULT NULL;

-- Add index for faster lookups when sending notifications
CREATE INDEX IF NOT EXISTS idx_users_push_subscription
ON public.users(id)
WHERE push_subscription IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.users.push_subscription IS 'Web Push API subscription object for push notifications (includes endpoint, keys, etc.)';

SELECT 'push_subscription column added successfully!' AS message;
