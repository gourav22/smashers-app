# Fix: Refund Status Not Correctly Reflected on Cancelled Bookings

## Problem Summary
When a member cancels a booking, the refund status was not being displayed or updated correctly. This was caused by:
1. Missing RLS policies (INSERT, UPDATE, DELETE) on the `pending_refunds` table
2. No error handling when creating pending refunds, causing failures to be silent
3. Status field not explicitly set in the insert operation

## Changes Made

### 1. Fixed Cancel API Error Handling
**File**: `src/app/api/bookings/cancel/route.ts`
- Added error handling for pending_refunds insert
- Explicitly set `status: 'pending'` in the insert
- Added console logging for debugging

### 2. Created RLS Policy Migration
**File**: `sql/migrations/fix-pending-refunds-rls.sql`
- Added INSERT policy to allow service role to create pending refunds
- Added UPDATE policy to allow service role to update refund status
- Added DELETE policy to allow service role to delete refunds
- Added user-specific UPDATE policy for user's own refunds
- Added user-specific DELETE policy for user's own refunds

## How to Apply the Fix

### Step 1: Apply the RLS Migration
1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to SQL Editor
3. Open a new query
4. Copy and paste the contents of `sql/migrations/fix-pending-refunds-rls.sql`
5. Run the query

OR if you have Supabase CLI:
```bash
supabase db push
```

### Step 2: Restart Development Server
```bash
npm run dev
```

## Testing the Fix

1. Create a booking on a slot
2. Cancel the booking
3. Check the browser console logs - you should see:
   - "✅ Pending refund created for booking: [booking-id]"
4. Navigate back to bookings page
5. The cancelled booking should now show:
   - "⏳ Refund Pending"
   - Refund amount (€4)
   - Expiration date

## Troubleshooting

If refund status still doesn't show:
1. Check browser console for errors
2. Check server logs for "⚠️ Error creating pending refund" messages
3. Verify RLS policies were applied by checking Supabase dashboard:
   - Go to SQL Editor
   - Run: `SELECT * FROM pg_policies WHERE tablename = 'pending_refunds';`
4. Check that pending_refunds table has records:
   - Query: `SELECT * FROM pending_refunds WHERE user_id = '[your-user-id]';`

## Database Schema Verification

The pending_refunds table structure should be:
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key to users)
- `slot_id` (UUID, foreign key to slots)
- `booking_id` (UUID, foreign key to bookings)
- `amount` (INTEGER)
- `reason` (TEXT)
- `status` (TEXT) - should be 'pending', 'processed', or 'expired'
- `expires_at` (TIMESTAMP WITH TIME ZONE)
- `processed_at` (TIMESTAMP WITH TIME ZONE, nullable)
- `created_at` (TIMESTAMP WITH TIME ZONE)
- `updated_at` (TIMESTAMP WITH TIME ZONE)
