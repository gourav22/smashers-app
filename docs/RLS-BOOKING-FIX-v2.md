# Booking API 500 Error - Quick Fix

## Problem
After deploying the authentication changes, bookings fail with 500 error because:
1. `SUPABASE_SERVICE_ROLE_KEY` is not set in Vercel environment variables
2. Using anon key with user token hits RLS restrictions on balance updates

## Solution Options

### Option 1: Add Service Role Key (Recommended)
1. Go to Vercel project settings
2. Add environment variable: `SUPABASE_SERVICE_ROLE_KEY`
3. Value: Get from Supabase Dashboard → Settings → API → service_role key
4. Redeploy

### Option 2: Use Database Function (More Secure)
Run the SQL in `sql/migrations/fix-balance-update-rls.sql` which creates a secure database function that handles the entire booking transaction with elevated permissions.

Then update the API to call this function instead of manual steps.

### Option 3: Quick Rollback
Temporarily revert to the simpler booking API that doesn't require service role key while we implement Option 2.

## Recommended: Option 1 + Option 2
1. Add service role key to Vercel (immediate fix)
2. Migrate to database function approach (better long-term solution)
