-- Enable Realtime for slots, bookings, and pending_refunds tables
-- This allows clients to receive real-time updates when data changes

-- Enable realtime for slots table
ALTER PUBLICATION supabase_realtime ADD TABLE slots;

-- Enable realtime for bookings table
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;

-- Enable realtime for pending_refunds table
ALTER PUBLICATION supabase_realtime ADD TABLE pending_refunds;

-- Note: If you get an error that the publication doesn't exist, run this first in Supabase SQL Editor:
-- CREATE PUBLICATION supabase_realtime;
-- Then run the ALTER PUBLICATION commands above.

-- Verify realtime is enabled (optional - for checking)
-- SELECT schemaname, tablename
-- FROM pg_publication_tables
-- WHERE pubname = 'supabase_realtime';
