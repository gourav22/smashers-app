-- ============================================================================
-- RESET AUTH AND USER DATA - Complete Clean Slate for Social Auth Migration
-- ============================================================================
-- This script completely resets all authentication and user data
-- Use this when switching from email auth to social auth
--
-- ⚠️ EXTREME CAUTION: This will DELETE:
-- ❌ All auth.users (authentication accounts)
-- ❌ All public.users (user profiles)
-- ❌ All bookings
-- ❌ All transactions
-- ❌ All pending refunds
-- ❌ All subscriptions
-- ❌ All matches
-- ❌ All notifications
-- ❌ All audit logs
--
-- ✅ PRESERVES:
-- ✓ Slots (all created slots remain)
-- ✓ Subscription templates (admin-created templates remain)
-- ✓ Database schema and RLS policies
--
-- Run this in your Supabase SQL Editor
-- ============================================================================

BEGIN;

-- ====================
-- STEP 1: DELETE ALL TRANSACTIONAL DATA
-- ====================

-- Clear bookings
DELETE FROM public.bookings;
SELECT 'Step 1.1: Cleared all bookings' AS status;

-- Clear pending refunds
DELETE FROM public.pending_refunds;
SELECT 'Step 1.2: Cleared all pending refunds' AS status;

-- Clear transactions
DELETE FROM public.transactions;
SELECT 'Step 1.3: Cleared all transactions' AS status;

-- Clear subscriptions
DELETE FROM public.subscription_cancellations;
DELETE FROM public.auto_booking_logs;
DELETE FROM public.subscriptions;
SELECT 'Step 1.4: Cleared all subscriptions' AS status;

-- Clear matches (before clearing created_by reference)
DELETE FROM public.matches;
SELECT 'Step 1.5: Cleared all matches' AS status;

-- Clear notifications
DELETE FROM public.notifications;
SELECT 'Step 1.6: Cleared all notifications' AS status;

-- Clear audit logs (before clearing admin_user_id reference)
DELETE FROM public.audit_logs;
SELECT 'Step 1.7: Cleared all audit logs' AS status;

-- ====================
-- STEP 2: RESET SLOTS
-- ====================

-- Reset all slots to empty and clear created_by reference
UPDATE public.slots
SET
  booked_user_ids = '{}',
  status = 'open',
  waitlist = '[]',
  created_by = NULL;
SELECT 'Step 2: Reset all slots to empty and clear created_by' AS status;

-- ====================
-- STEP 3: RESET SUBSCRIPTION TEMPLATES
-- ====================

-- Reset subscription template counts
UPDATE public.subscription_templates
SET
  current_subscribers = 0,
  status = CASE
    WHEN status = 'full' THEN 'active'
    ELSE status
  END;
SELECT 'Step 3: Reset subscription templates' AS status;

-- ====================
-- STEP 4: DELETE ALL USER PROFILES (PUBLIC.USERS)
-- ====================

-- This removes all user profiles from your app's users table
DELETE FROM public.users;
SELECT 'Step 4: Deleted all user profiles (public.users)' AS status;

-- ====================
-- STEP 5: DELETE ALL AUTH USERS (AUTH.USERS)
-- ====================

-- ⚠️ CRITICAL: This removes all authentication accounts
-- Users will need to register again with social auth
DELETE FROM auth.users;
SELECT 'Step 5: Deleted all auth accounts (auth.users)' AS status;

-- ====================
-- VERIFICATION
-- ====================

-- Check counts to verify everything is clean
SELECT
  'Verification Results' AS check_type,
  (SELECT COUNT(*) FROM auth.users) AS auth_users_count,
  (SELECT COUNT(*) FROM public.users) AS public_users_count,
  (SELECT COUNT(*) FROM public.bookings) AS bookings_count,
  (SELECT COUNT(*) FROM public.transactions) AS transactions_count,
  (SELECT COUNT(*) FROM public.subscriptions) AS subscriptions_count,
  (SELECT COUNT(*) FROM public.matches) AS matches_count,
  (SELECT COUNT(*) FROM public.notifications) AS notifications_count,
  (SELECT COUNT(*) FROM public.slots) AS slots_count,
  (SELECT COUNT(*) FROM public.subscription_templates) AS templates_count;

-- All counts except slots and templates should be 0

COMMIT;

-- ============================================================================
-- POST-RESET CHECKLIST
-- ============================================================================

-- After running this script:
--
-- 1. ✅ Configure OAuth providers in Supabase Dashboard:
--    - Google: Authentication → Providers → Google
--    - Facebook: Authentication → Providers → Facebook
--    - GitHub: Authentication → Providers → GitHub
--
-- 2. ✅ Update redirect URLs for all providers:
--    - https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback
--
-- 3. ✅ Update your app routes:
--    - /login now points to social login
--    - /register now points to social register
--    - /auth/complete-profile collects phone number
--
-- 4. ✅ Test registration flow:
--    - Go to /register
--    - Click "Continue with Google/Facebook/GitHub"
--    - Complete profile with phone number
--    - Verify redirect to dashboard
--
-- 5. ✅ Test login flow:
--    - Go to /login
--    - Click social provider
--    - Should go directly to dashboard (profile already complete)
--
-- 6. ✅ Verify phone number requirement:
--    - Try to access dashboard without completing profile
--    - Should redirect to /auth/complete-profile
--
-- ============================================================================
