-- ============================================================================
-- RESET DATA - Clean slate for fresh start
-- ============================================================================
-- This script clears all transactional data while preserving:
-- ✅ Users (keeps all user accounts and profiles)
-- ✅ Slots (keeps all created slots)
-- ✅ Subscription Templates (keeps admin-created templates)
--
-- ⚠️ CAUTION: This will DELETE:
-- ❌ All bookings
-- ❌ All transactions
-- ❌ All pending refunds
-- ❌ All subscriptions
-- ❌ All matches
-- ❌ All notifications
-- ❌ All audit logs
--
-- Run this in your Supabase SQL Editor
-- ============================================================================

BEGIN;

-- Step 1: Clear all bookings and related data
DELETE FROM public.bookings;
SELECT 'Cleared all bookings' AS step;

-- Step 2: Clear all pending refunds
DELETE FROM public.pending_refunds;
SELECT 'Cleared all pending refunds' AS step;

-- Step 3: Clear all transactions
DELETE FROM public.transactions;
SELECT 'Cleared all transactions' AS step;

-- Step 4: Clear all subscriptions and related data
DELETE FROM public.subscription_cancellations;
DELETE FROM public.auto_booking_logs;
DELETE FROM public.subscriptions;
SELECT 'Cleared all subscriptions and logs' AS step;

-- Step 5: Clear all matches
DELETE FROM public.matches;
SELECT 'Cleared all matches' AS step;

-- Step 6: Clear all notifications
DELETE FROM public.notifications;
SELECT 'Cleared all notifications' AS step;

-- Step 7: Clear all audit logs
DELETE FROM public.audit_logs;
SELECT 'Cleared all audit logs' AS step;

-- Step 8: Reset slot statuses and booked_user_ids
UPDATE public.slots
SET
  booked_user_ids = '{}',
  status = 'open',
  waitlist = '[]';
SELECT 'Reset all slots to open with no bookings' AS step;

-- Step 9: Reset subscription template counts
UPDATE public.subscription_templates
SET
  current_subscribers = 0,
  status = CASE
    WHEN status = 'full' THEN 'active'
    ELSE status
  END;
SELECT 'Reset subscription template counts' AS step;

-- Step 10: Optional - Reset user balances to 0 (uncomment if needed)
-- UPDATE public.users SET balance = 0 WHERE role = 'member';
-- SELECT 'Reset all member balances to 0' AS step;

-- Step 11: Optional - Reset user stats (uncomment if needed)
-- UPDATE public.users SET
--   badminton_games_played = 0,
--   badminton_wins = 0,
--   badminton_losses = 0,
--   badminton_elo = 1200,
--   badminton_grade = 'D',
--   cricket_games_played = 0,
--   cricket_wins = 0,
--   cricket_losses = 0,
--   cricket_elo = 1200,
--   cricket_grade = 'D',
--   current_win_streak = 0,
--   longest_win_streak = 0,
--   achievements = '[]'
-- WHERE role = 'member';
-- SELECT 'Reset all user stats' AS step;

COMMIT;

-- Verification queries
SELECT 'Data reset complete!' AS status;

SELECT
  (SELECT COUNT(*) FROM public.bookings) as bookings_count,
  (SELECT COUNT(*) FROM public.transactions) as transactions_count,
  (SELECT COUNT(*) FROM public.pending_refunds) as pending_refunds_count,
  (SELECT COUNT(*) FROM public.subscriptions) as subscriptions_count,
  (SELECT COUNT(*) FROM public.matches) as matches_count,
  (SELECT COUNT(*) FROM public.notifications) as notifications_count,
  (SELECT COUNT(*) FROM public.users) as users_preserved,
  (SELECT COUNT(*) FROM public.slots) as slots_preserved,
  (SELECT COUNT(*) FROM public.subscription_templates) as templates_preserved;

SELECT '✅ All transactional data cleared. Users, slots, and templates preserved.' AS message;
