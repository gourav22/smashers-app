-- Quick cleanup for your specific booking issue
-- This removes the orphaned booking record so you can rebook

-- Step 1: See what we're cleaning up (safe to run first)
SELECT
  b.id as booking_id,
  b.user_id,
  u.name as user_name,
  b.slot_id,
  s.date,
  s.time,
  s.sport,
  b.status,
  CASE
    WHEN b.user_id = ANY(s.booked_user_ids) THEN '✅ Complete - user is in slot'
    ELSE '⚠️ Orphaned - booking exists but user not in slot array'
  END as booking_state
FROM bookings b
JOIN users u ON u.id = b.user_id
JOIN slots s ON s.id = b.slot_id
WHERE b.user_id = '3aa912de-7f63-4d91-92d8-f8b91dad4fa2'
  AND b.slot_id = 'f0185582-3e66-426b-a19b-f78bcaeae19b';

-- Step 2: Delete the orphaned booking
DELETE FROM bookings
WHERE user_id = '3aa912de-7f63-4d91-92d8-f8b91dad4fa2'
  AND slot_id = 'f0185582-3e66-426b-a19b-f78bcaeae19b'
  AND status = 'confirmed'
  AND NOT EXISTS (
    SELECT 1 FROM slots
    WHERE id = 'f0185582-3e66-426b-a19b-f78bcaeae19b'
    AND '3aa912de-7f63-4d91-92d8-f8b91dad4fa2' = ANY(booked_user_ids)
  );

SELECT 'Cleanup complete! You can now book this slot again.' as message;
