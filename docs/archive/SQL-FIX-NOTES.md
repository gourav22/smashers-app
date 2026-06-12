# SQL Fixes Applied

## Issue 1: Reserved Keyword
The original SQL used `time` as a column name, which is a **reserved keyword** in PostgreSQL, causing syntax errors.

## Issue 2: Generated Column with Non-Immutable Expression
PostgreSQL doesn't allow `CURRENT_DATE` in GENERATED ALWAYS columns because it's not immutable (changes every day).

## Solutions

### Fix 1: Renamed `time` to `slot_time`

### Changed in Database Schema
- ✅ `subscriptions.time` → `subscriptions.slot_time`
- ✅ `users.subscription_time` → `users.subscription_slot_time`
- ✅ Function `get_next_subscription_slots()` return column renamed

### Changed in Code
- ✅ API route `/api/subscriptions/create/route.ts`
- ✅ API route `/api/cron/auto-book-subscriptions/route.ts`
- ✅ TypeScript interface in `/subscription/page.tsx`

## How to Apply

The fixed SQL is already in `subscription-system.sql`. Just run it in Supabase SQL Editor.

If you already ran the broken version and got errors:
1. The tables weren't created (error stopped execution)
2. Simply run the **fixed** `subscription-system.sql` - it will work now
3. No cleanup needed

## Verification

After running, verify with:
```sql
-- Check subscriptions table structure
\d public.subscriptions

-- Should see column: slot_time | time
```

### Fix 2: Removed Generated Column
- Removed `weeks_remaining GENERATED ALWAYS AS ...` column
- Created function `get_weeks_remaining(end_date)` instead
- Call function when you need weeks remaining:
  ```sql
  SELECT *, get_weeks_remaining(end_date) as weeks_remaining 
  FROM subscriptions;
  ```

All code is now updated and consistent! ✅
