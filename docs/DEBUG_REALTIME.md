# Debug Real-time Updates Not Working

## Problem
- When admin books → members see update ✅
- When member books → nobody sees update (including themselves) ❌

## Root Cause
Most likely: **Realtime replication is not enabled in Supabase**

## Solution

### Step 1: Enable Realtime Replication in Supabase

Run this SQL in **Supabase SQL Editor**:

```sql
-- Check if realtime is currently enabled
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
```

**If the result is empty or doesn't include `slots`, `bookings`, `pending_refunds`:**

```sql
-- Enable realtime for required tables
ALTER PUBLICATION supabase_realtime ADD TABLE slots;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE pending_refunds;
```

**If you get an error "publication does not exist":**

```sql
-- Create the publication first
CREATE PUBLICATION supabase_realtime;

-- Then add the tables
ALTER PUBLICATION supabase_realtime ADD TABLE slots;
ALTER PUBLICATION supabase_realtime ADD TABLE bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE pending_refunds;
```

### Step 2: Enable Realtime in Supabase Dashboard

1. Go to **Supabase Dashboard**
2. Navigate to **Database → Replication**
3. Find the tables: `slots`, `bookings`, `pending_refunds`
4. Toggle **Realtime** ON for each table
5. Click **Save**

### Step 3: Verify Realtime is Working

Open browser console on the slots page and look for these messages:

**✅ Good signs:**
```
Slot change detected: {eventType: "UPDATE", ...}
Booking change detected: {eventType: "INSERT", ...}
```

**❌ Bad signs:**
```
(No messages appear when someone books)
```

### Step 4: Test Real-time

1. Open `/slots` page in **two different browsers**
2. Login as different users in each
3. Book a slot in browser 1
4. **Browser 2 should immediately show:**
   - Updated booking count (2/4 → 3/4)
   - Progress bar update
   - If almost full, "HOT SLOT!" badge appears

### Step 5: Check Subscriptions in Console

In the browser console, run:

```javascript
// Check active channels
console.log(window.supabase?.getChannels());
```

**You should see:**
```javascript
[
  {name: "slots-changes", state: "joined"},
  {name: "bookings-changes", state: "joined"}
]
```

**If state is "closed" or "failed":**
- Realtime is not enabled
- Check Supabase logs for errors

## Why Admin Bookings Work But Member Bookings Don't

This suggests:
- Admin might be using a different method to book
- Or admin uses service role key which bypasses some checks
- Member bookings use the API which updates the database
- But if realtime isn't enabled, the UI won't receive the update

**Both should fail if realtime isn't enabled!**

Let me check if there's a difference...

## Common Issues

### Issue 1: Realtime Not Enabled
**Symptom:** No updates appear for anyone

**Fix:** Run the SQL above to enable realtime

### Issue 2: RLS Blocking Realtime
**Symptom:** Some users see updates, others don't

**Fix:** Check RLS policies:
```sql
-- Verify slots table has public SELECT policy
SELECT * FROM pg_policies WHERE tablename = 'slots';
```

Should show: `"Anyone can view slots" ... USING (true)`

### Issue 3: Client Not Subscribing
**Symptom:** Console shows no subscription messages

**Fix:** Check the slots page code has:
```typescript
const channel = supabase.channel('slots-changes')
  .on('postgres_changes', {...}, (payload) => {
    console.log('Slot change detected:', payload);
    loadData();
  })
  .subscribe();
```

### Issue 4: Network/Firewall Blocking WebSockets
**Symptom:** Subscription state shows "closed" or "failed"

**Fix:** 
- Realtime uses WebSocket connections
- Check if firewall/proxy blocks WebSockets
- Try on different network

### Issue 5: Too Many Open Channels
**Symptom:** Subscriptions work initially then stop

**Fix:**
```typescript
// Make sure to cleanup on unmount
useEffect(() => {
  const channel = supabase.channel('...');
  // ... subscribe
  
  return () => {
    supabase.removeChannel(channel); // ← Important!
  };
}, []);
```

## Manual Testing Steps

### Test 1: Check If Realtime is Enabled
```sql
SELECT schemaname, tablename
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime';
```

Expected result:
```
| schemaname | tablename        |
|------------|------------------|
| public     | slots            |
| public     | bookings         |
| public     | pending_refunds  |
```

### Test 2: Monitor Database Changes
In Supabase Dashboard → Table Editor:
1. Open `slots` table
2. Leave it open
3. Book a slot from the app
4. **Watch if `booked_user_ids` updates in the table view**

If table updates but UI doesn't → Realtime not enabled
If table doesn't update → API issue (check logs)

### Test 3: Check Supabase Logs
Dashboard → Logs → Realtime Logs
- Look for subscription attempts
- Look for authorization errors
- Look for WebSocket connection issues

### Test 4: Test With Direct SQL Update
```sql
-- Manually update a slot
UPDATE slots
SET booked_user_ids = array_append(booked_user_ids, 'test-user-id')
WHERE id = 'some-slot-id';
```

If UI updates → API might not be updating correctly
If UI doesn't update → Realtime not working

## Quick Fix Script

Run this in Supabase SQL Editor to enable everything:

```sql
-- Enable realtime replication
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS slots;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE IF NOT EXISTS pending_refunds;

-- Verify it worked
SELECT 
  schemaname, 
  tablename,
  'Realtime enabled' as status
FROM pg_publication_tables
WHERE pubname = 'supabase_realtime'
  AND tablename IN ('slots', 'bookings', 'pending_refunds');
```

Expected output:
```
| schemaname | tablename       | status            |
|------------|-----------------|-------------------|
| public     | slots           | Realtime enabled  |
| public     | bookings        | Realtime enabled  |
| public     | pending_refunds | Realtime enabled  |
```

## After Enabling Realtime

1. **No app restart needed** - It works immediately
2. **Refresh the browser** - Clear any cached connections
3. **Test booking** - Should now work in real-time
4. **Check console** - Should see subscription messages

## Still Not Working?

If realtime is enabled but still not working:

1. **Check browser console for errors**
   ```javascript
   // Look for subscription errors
   supabase.channel('test').subscribe((status) => {
     console.log('Subscription status:', status);
   });
   ```

2. **Verify Supabase project settings**
   - Dashboard → Settings → API
   - Check if Realtime is enabled at project level

3. **Test with simple example**
   ```typescript
   supabase
     .channel('any-channel')
     .on('postgres_changes', 
       { event: '*', schema: 'public', table: 'slots' },
       payload => console.log('Change:', payload)
     )
     .subscribe();
   ```

4. **Check Supabase status page**
   - https://status.supabase.com
   - Realtime service might be down

## Expected Behavior After Fix

**When ANY user books a slot:**
- ✅ All users on `/slots` page see instant update
- ✅ Booking count changes (2/4 → 3/4)
- ✅ Progress bar updates
- ✅ "HOT SLOT!" appears when almost full
- ✅ "Full" status when last spot taken
- ✅ Book button disables when full

**When ANY user cancels:**
- ✅ All users on `/bookings` page see instant update
- ✅ Booking moves from "Confirmed" to "Cancelled"
- ✅ Refund status appears
- ✅ All users on `/slots` page see spot open up (3/4 → 2/4)

**No refresh required!** Everything updates live.
