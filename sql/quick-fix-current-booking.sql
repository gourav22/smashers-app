-- Quick fix for your current partial booking issue
-- This will delete the orphaned booking record so you can try again

-- First, let's see what we're dealing with (safe to run)
SELECT
  b.id as booking_id,
  b.user_id,
  u.name as user_name,
  b.slot_id,
  s.date,
  s.time,
  s.sport,
  s.booked_user_ids,
  CASE
    WHEN b.user_id = ANY(s.booked_user_ids) THEN '✅ Complete'
    ELSE '⚠️ Partial - booking exists but user not in slot'
  END as status
FROM bookings b
JOIN users u ON u.id = b.user_id
JOIN slots s ON s.id = b.slot_id
WHERE b.user_id = '3aa912de-7f63-4d91-92d8-f8b91dad4fa2'  -- Your user ID from the logs
  AND b.slot_id = 'f0185582-3e66-426b-a19b-f78bcaeae19b'  -- The slot ID from the logs
  AND b.status = 'confirmed';

-- Now delete the partial booking (run this after reviewing above)
DELETE FROM bookings
WHERE user_id = '3aa912de-7f63-4d91-92d8-f8b91dad4fa2'
  AND slot_id = 'f0185582-3e66-426b-a19b-f78bcaeae19b'
  AND status = 'confirmed'
  AND NOT (user_id = ANY(
    SELECT booked_user_ids FROM slots WHERE id = 'f0185582-3e66-426b-a19b-f78bcaeae19b'
  ));

SELECT 'Partial booking cleaned up. You can now book this slot again.' as message;
