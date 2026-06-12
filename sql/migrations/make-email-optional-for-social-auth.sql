-- Make email optional for social auth users
-- Some OAuth providers (like GitHub) might not provide email
-- Phone number becomes the primary identifier instead

-- Make email nullable
ALTER TABLE public.users ALTER COLUMN email DROP NOT NULL;

-- Add index for phone lookups (if not exists)
CREATE INDEX IF NOT EXISTS idx_users_phone ON public.users(phone);

-- Add comment explaining the change
COMMENT ON COLUMN public.users.email IS 'Email address - optional for social auth users, phone is primary identifier';
COMMENT ON COLUMN public.users.phone IS 'Phone number - mandatory for all users, collected during profile completion';
