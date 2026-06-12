-- Cleanup partial bookings where the user is in bookings table but not in slot's booked_user_ids
-- This can happen when the booking transaction partially completes

-- Find and display orphaned bookings
SELECT
  b.id as booking_id,
  b.user_id,
  b.slot_id,
  b.status,
  s.booked_user_ids,
  CASE
    WHEN b.user_id = ANY(s.booked_user_ids) THEN 'Complete'
    ELSE 'Partial (needs cleanup)'
  END as booking_state
FROM bookings b
JOIN slots s ON s.id = b.slot_id
WHERE b.status = 'confirmed'
  AND NOT (b.user_id = ANY(s.booked_user_ids));

-- Option 1: Delete partial bookings (safer - just removes the orphaned record)
-- Uncomment to run:
-- DELETE FROM bookings b
-- WHERE b.status = 'confirmed'
--   AND NOT EXISTS (
--     SELECT 1 FROM slots s
--     WHERE s.id = b.slot_id
--     AND b.user_id = ANY(s.booked_user_ids)
--   );

-- Option 2: Complete the partial bookings (adds user to slot)
-- Uncomment to run:
-- UPDATE slots s
-- SET booked_user_ids = array_append(booked_user_ids, b.user_id),
--     status = CASE
--       WHEN array_length(booked_user_ids, 1) + 1 >= total_spots THEN 'full'
--       ELSE 'open'
--     END
-- FROM bookings b
-- WHERE s.id = b.slot_id
--   AND b.status = 'confirmed'
--   AND NOT (b.user_id = ANY(s.booked_user_ids));

SELECT 'Partial booking check complete. Review results and uncomment cleanup option if needed.' as message;
