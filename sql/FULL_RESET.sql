-- ============================================================================
-- FULL RESET - Complete fresh start
-- ============================================================================
-- ⚠️⚠️⚠️ EXTREME CAUTION ⚠️⚠️⚠️
-- This script clears EVERYTHING except the schema:
-- ❌ All users (will need to re-register)
-- ❌ All slots
-- ❌ All bookings
-- ❌ All transactions
-- ❌ All subscriptions
-- ❌ All matches
-- ❌ All notifications
-- ❌ All templates
--
-- Only use this if you want a COMPLETELY FRESH START
-- Run this in your Supabase SQL Editor
-- ============================================================================

BEGIN;

-- Step 1: Clear all dependent data first
DELETE FROM public.subscription_cancellations;
DELETE FROM public.auto_booking_logs;
DELETE FROM public.pending_refunds;
DELETE FROM public.bookings;
DELETE FROM public.transactions;
DELETE FROM public.subscriptions;
DELETE FROM public.matches;
DELETE FROM public.notifications;
DELETE FROM public.audit_logs;
SELECT 'Cleared all transactional data' AS step;

-- Step 2: Clear subscription templates
DELETE FROM public.subscription_templates;
SELECT 'Cleared all subscription templates' AS step;

-- Step 3: Clear all slots
DELETE FROM public.slots;
SELECT 'Cleared all slots' AS step;

-- Step 4: Clear all users (this will also delete auth.users via CASCADE)
-- ⚠️ CAUTION: This removes all user accounts!
DELETE FROM public.users;
SELECT 'Cleared all users' AS step;

COMMIT;

-- Verification
SELECT 'Full reset complete! Database is now empty.' AS status;

SELECT
  (SELECT COUNT(*) FROM public.users) as users_count,
  (SELECT COUNT(*) FROM public.slots) as slots_count,
  (SELECT COUNT(*) FROM public.bookings) as bookings_count,
  (SELECT COUNT(*) FROM public.transactions) as transactions_count,
  (SELECT COUNT(*) FROM public.subscriptions) as subscriptions_count,
  (SELECT COUNT(*) FROM public.subscription_templates) as templates_count,
  (SELECT COUNT(*) FROM public.matches) as matches_count,
  (SELECT COUNT(*) FROM public.notifications) as notifications_count;

SELECT '✅ Complete database reset. All data cleared. Ready for fresh start.' AS message;
SELECT '⚠️ You will need to register new users and create slots again.' AS note;
