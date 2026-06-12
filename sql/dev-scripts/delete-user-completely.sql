-- ⚠️  DEVELOPMENT ONLY - Complete User Deletion Script
-- This removes a user from BOTH auth system and your users table
-- Run this in Supabase SQL Editor

-- INSTRUCTIONS:
-- 1. Replace 'user@example.com' with the actual email address
-- 2. Run this script in Supabase SQL Editor
-- 3. Wait 1-2 minutes before trying to register again

-- Step 1: Find the user (optional - just to confirm)
SELECT
  'Auth User' as source,
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
WHERE email = 'user@example.com'

UNION ALL

SELECT
  'App User' as source,
  id::text,
  email,
  created_at::timestamptz as email_confirmed_at,
  created_at
FROM users
WHERE email = 'user@example.com';

-- Step 2: Delete from auth.users (this is the important one for rate limits)
-- Note: If you have ON DELETE CASCADE, this will also delete from users table
DELETE FROM auth.users WHERE email = 'user@example.com';

-- Step 3: Delete from users table (if cascade didn't work)
DELETE FROM users WHERE email = 'user@example.com';

-- Step 4: Also clean up any orphaned bookings (optional)
DELETE FROM bookings WHERE user_id NOT IN (SELECT id FROM users);

-- Step 5: Clean up orphaned transactions (optional)
DELETE FROM transactions WHERE user_id NOT IN (SELECT id FROM users);

-- Step 6: Clean up orphaned pending refunds (optional)
DELETE FROM pending_refunds WHERE user_id NOT IN (SELECT id FROM users);

-- Verify deletion
SELECT COUNT(*) as auth_users_with_email FROM auth.users WHERE email = 'user@example.com';
SELECT COUNT(*) as app_users_with_email FROM users WHERE email = 'user@example.com';

-- If both return 0, the user is completely removed and you can register again!
