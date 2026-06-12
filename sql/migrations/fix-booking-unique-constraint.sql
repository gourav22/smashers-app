-- Fix: Allow rebooking after cancellation
-- The current unique constraint prevents rebooking the same slot after cancellation
-- Solution: Replace with a partial unique index that only applies to active bookings

-- Step 1: Drop the existing unique constraint
ALTER TABLE bookings
DROP CONSTRAINT IF EXISTS bookings_user_id_slot_id_key;

-- Step 2: Create a partial unique index that excludes cancelled bookings
-- This allows the same user to book, cancel, and rebook the same slot
CREATE UNIQUE INDEX bookings_user_slot_active_unique
ON bookings (user_id, slot_id)
WHERE status != 'cancelled';

-- Explanation:
-- - The old constraint prevented ANY duplicate (user_id, slot_id) combination
-- - The new partial index only prevents duplicates WHERE status != 'cancelled'
-- - This means:
--   ✅ User can book slot A (creates record with status='confirmed')
--   ✅ User can cancel booking (updates status='cancelled')
--   ✅ User can rebook slot A (creates new record with status='confirmed')
--   ❌ User cannot have two active bookings for the same slot

SELECT 'Booking constraint updated! Users can now rebook after cancellation.' AS message;
