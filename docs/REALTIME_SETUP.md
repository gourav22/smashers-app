# Real-time Updates Setup

## Overview
The app now uses Supabase Realtime to automatically update slot availability across all users in real-time. When any user books a slot, all other users viewing the slots page will see the update immediately without refreshing.

## How It Works

### Client-side Implementation
The app subscribes to database changes using Supabase Realtime:

1. **Member Slots Page** (`/slots`) - Listens to:
   - `slots` table changes (inserts, updates, deletes)
   - `bookings` table changes (new bookings, cancellations)

2. **Member Bookings Page** (`/bookings`) - Listens to:
   - `bookings` table changes (status updates, cancellations)
   - `pending_refunds` table changes (refund status updates)
   - `slots` table changes (slot cancellations by admin)

3. **Admin Manage Slots** (`/admin/slots/manage`) - Listens to:
   - `slots` table changes
   - `bookings` table changes

When a change is detected, the page automatically reloads the relevant data.

### Database Configuration

Run the migration to enable realtime:

```sql
-- In Supabase SQL Editor, run:
ALTER PUBLICATION supabase_realtime ADD TABLE slots;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE pending_refunds;
```

Or apply the migration file:
```bash
# Connect to Supabase and run:
psql $DATABASE_URL -f sql/migrations/enable-realtime-replication.sql
```

## Required Supabase Settings

### 1. Enable Realtime in Supabase Dashboard

Go to **Supabase Dashboard** → **Database** → **Replication**

Ensure that Realtime is enabled for:
- ✅ `slots` table
- ✅ `bookings` table
- ✅ `pending_refunds` table

### 2. Verify Realtime is Working

In the Supabase SQL Editor, run:

```sql
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
```

You should see `slots`, `bookings`, and `pending_refunds` in the results.

## Testing Real-time Updates

### Test Scenario 1: Multiple Users Booking
1. Open the slots page (`/slots`) in two different browsers
2. Log in as different users in each browser
3. Book a slot in browser 1
4. Browser 2 should immediately show:
   - Updated booking count (e.g., 2/4 → 3/4)
   - Updated progress bar
   - "HOT SLOT!" badge if only 2 spots left

### Test Scenario 2: Admin Managing Slots
1. Open admin slots page (`/admin/slots/manage`) in one browser
2. Open member slots page (`/slots`) in another browser
3. Delete or cancel a slot from admin page
4. Member page should immediately reflect the change

### Test Scenario 3: Slot Becomes Full
1. Have multiple users viewing the slots page
2. Book the last available spot
3. All users should see the slot change to "Full" status
4. Book button should become disabled

### Test Scenario 4: Booking Cancellations
1. Open bookings page (`/bookings`) in two browsers (same user)
2. Cancel a booking in browser 1
3. Browser 2 should immediately show:
   - Booking moved from "Confirmed" to "Cancelled" section
   - Pending refund status displayed
   - "Undo Cancellation" button appears

### Test Scenario 5: Refund Processing
1. Have user viewing their bookings page
2. Admin or another user books the slot that was cancelled
3. User's page should immediately update:
   - Refund status changes from "Pending" to "Processed"
   - Shows refund amount
   - "Undo" button disappears

## Troubleshooting

### Issue: Updates not appearing in real-time

**Check 1: Realtime enabled in Supabase**
```sql
-- Verify tables are in realtime publication
SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
```

**Check 2: Check browser console**
Look for messages like:
- `"Slot change detected:"` 
- `"Booking change detected:"`

**Check 3: Verify subscription status**
Open browser console and run:
```javascript
// Should show active subscriptions
console.log(supabase.getChannels());
```

**Check 4: Network connectivity**
- Realtime requires WebSocket connections
- Check that WebSockets aren't blocked by firewall/proxy
- Look for WebSocket errors in Network tab

### Issue: Too many reloads / Performance concerns

The current implementation reloads ALL slot data when ANY change occurs. This is simple but can be optimized:

**Optimization 1: Update specific slot only**
```javascript
.on('postgres_changes', { ... }, (payload) => {
  if (payload.eventType === 'UPDATE') {
    // Update only the changed slot instead of reloading all
    setSlots(prevSlots => 
      prevSlots.map(slot => 
        slot.id === payload.new.id ? payload.new : slot
      )
    );
  }
})
```

**Optimization 2: Debounce reloads**
```javascript
const debouncedLoadData = debounce(loadData, 500);
// Use debouncedLoadData in subscription callbacks
```

## Benefits

✅ **Instant updates** - No need to refresh the page
✅ **Prevents double bookings** - Users see real-time availability
✅ **Better UX** - "HOT SLOT!" badges appear immediately as slots fill
✅ **Admin visibility** - Admins see bookings happening in real-time
✅ **Accurate capacity** - Always shows current booking count

## Technical Details

### Subscription Lifecycle
- Subscriptions are created when component mounts
- Automatically cleaned up when component unmounts
- Each page uses unique channel names to avoid conflicts

### Channel Names
- Member slots page: `slots-changes`, `bookings-changes`
- Member bookings page: `user-bookings-changes`, `user-refunds-changes`, `user-slots-changes`
- Admin slots page: `admin-slots-changes`, `admin-bookings-changes`

### Events Listened
- `INSERT` - New records
- `UPDATE` - Modified records  
- `DELETE` - Removed records

All events trigger a full data reload to ensure consistency.

## Future Enhancements

- [ ] Optimistic UI updates (update UI before server confirms)
- [ ] Presence indicators (show "3 users viewing this slot")
- [ ] Live booking animations
- [ ] Toast notifications for slot changes
- [ ] Conflict resolution for simultaneous bookings
