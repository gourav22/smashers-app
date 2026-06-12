# Booking & Member Management Issues - Diagnosis & Fix

## Problems Identified

### 1. **Booking Creation Fails**
**Error**: Users cannot create bookings when trying to book a slot

**Root Cause**: 
- The `bookings` table is missing an **INSERT RLS policy**
- Current policies only allow SELECT operations (view bookings)
- No policy permits users to create new bookings
- The booking API uses the Supabase anonymous client, which requires explicit INSERT permission

**Impact**: All booking requests fail with permission denied error

### 2. **Admin Members Page Shows No Members**
**Issue**: The manage members page loads but displays zero members

**Root Cause**: 
- The `users` table had recursive RLS policies that could cause issues
- The "Admins can do anything" policy was overly broad and could cause query problems
- While the SELECT policy allows viewing all profiles, the complexity of recursive checks might prevent data from loading

**Impact**: Admin cannot see or manage members

## Solution

### SQL Migration File
A new migration file has been created: `sql/migrations/fix-bookings-rls.sql`

This migration:
1. **Removes recursive policies** from the users table
2. **Adds missing INSERT policy for bookings** - allows users to create bookings
3. **Adds UPDATE policy for bookings** - allows users to cancel bookings
4. **Simplifies slots policies** - adds explicit INSERT, UPDATE, DELETE policies for admins
5. **Ensures users can view all profiles** - important for admin member management

### How to Apply the Fix

**Step 1**: Go to your Supabase dashboard
- Navigate to your project → SQL Editor

**Step 2**: Copy and run the SQL from this file:
```
sql/migrations/fix-bookings-rls.sql
```

**Step 3**: Test the fixes:

For Booking Creation:
- Navigate to book a slot
- Select a slot and confirm booking
- Should succeed with balance deduction

For Member Management:
- Log in as super_admin or slot_manager
- Go to "Manage Members" (⚙️ Admin Panel → 👥 Manage Members)
- Should see list of all members with stats

## Technical Details

### What was wrong with the original RLS policies:

**Original bookings policies:**
```sql
-- Only these existed:
CREATE POLICY "Users can view own bookings" FOR SELECT
CREATE POLICY "Admins can view all bookings" FOR SELECT
-- But NO INSERT policy!
```

**Fixed bookings policies:**
```sql
-- Now includes INSERT:
CREATE POLICY "Users can create bookings" FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can cancel own bookings" FOR UPDATE
  USING (user_id = auth.uid());
```

### Why the members page wasn't working:

The recursive check in the old "Admins can do anything" policy:
```sql
-- PROBLEMATIC - causes infinite recursion:
CREATE POLICY "Admins can do anything" ON public.users FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('super_admin', 'slot_manager', 'finance_manager'))
  );
```

This policy checks the same table it's protecting, which can cause query failures.

**Fixed approach:**
- Removed the recursive ALL policy
- Kept simple non-recursive policies for SELECT, INSERT, UPDATE

## Verification Checklist

After running the migration:

- [ ] Go to `/slots` and try to book a slot
- [ ] Balance should be deducted on successful booking
- [ ] New booking appears in `/bookings`
- [ ] Log in as admin
- [ ] Navigate to "Manage Members"
- [ ] Should see list of all club members
- [ ] Can edit member details, balance, and role
