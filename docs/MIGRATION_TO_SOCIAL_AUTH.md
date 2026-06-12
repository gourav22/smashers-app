# Migration to Social Auth - Cleanup Summary

## What Was Removed

### ❌ Deleted Files (Email Auth)
1. `src/app/(auth)/login/page.tsx` - Old email + password login
2. `src/app/(auth)/register/page.tsx` - Old email registration with verification
3. `src/app/auth/callback/route.ts` - Email verification callback handler
4. `docs/EMAIL_RATE_LIMIT_FIX.md` - Email rate limit troubleshooting
5. `docs/SUPABASE_EMAIL_SETUP.md` - Email configuration guide
6. `docs/PHONE_AUTH_SETUP.md` - SMS OTP setup (decided against SMS)
7. `sql/dev-scripts/delete-user-completely.sql` - Old user cleanup script

### ✅ Renamed Files (Social Auth)
1. `src/app/(auth)/login-social/page.tsx` → `src/app/(auth)/login/page.tsx`
2. `src/app/(auth)/register-social/page.tsx` → `src/app/(auth)/register/page.tsx`

### ✅ New Files Added
1. `src/app/auth/complete-profile/page.tsx` - Collects phone + name + sports after social login
2. `docs/SOCIAL_AUTH_SETUP.md` - Complete OAuth setup guide for Google/Facebook/GitHub
3. `sql/RESET_AUTH_AND_USERS.sql` - Comprehensive reset script for migration
4. `sql/migrations/make-email-optional-for-social-auth.sql` - Make email nullable

## Current Auth Flow

### Registration
```
/register 
→ Click "Continue with Google/Facebook/GitHub"
→ OAuth provider login
→ /auth/complete-profile (collect phone, name, sports)
→ /dashboard
```

### Login
```
/login
→ Click "Continue with Google/Facebook/GitHub"
→ OAuth provider login
→ /dashboard (if profile complete)
→ /auth/complete-profile (if phone missing)
```

## Migration Steps

### 1. Run Database Migration
```sql
-- In Supabase SQL Editor, run:
-- sql/migrations/make-email-optional-for-social-auth.sql
```

This makes email nullable since social auth users might not have email.

### 2. Reset All User Data
```sql
-- In Supabase SQL Editor, run:
-- sql/RESET_AUTH_AND_USERS.sql
```

This completely clears:
- All auth accounts (auth.users)
- All user profiles (public.users)
- All bookings, transactions, subscriptions
- All matches and notifications

But preserves:
- Slots (your created slots remain)
- Subscription templates

### 3. Configure OAuth Providers

Follow the guide in `docs/SOCIAL_AUTH_SETUP.md`:

**Google:**
- Create OAuth app in Google Cloud Console
- Get Client ID + Secret
- Add to Supabase Dashboard

**Facebook:**
- Create Facebook App
- Get App ID + Secret
- Add to Supabase Dashboard

**GitHub:**
- Create OAuth App on GitHub
- Get Client ID + Secret
- Add to Supabase Dashboard

### 4. Test the Flow

1. Go to `/register`
2. Click "Continue with Google"
3. Authorize the app
4. Fill in phone number, name, sports
5. Should redirect to `/dashboard`

Then test login:
1. Go to `/login`
2. Click "Continue with Google"
3. Should go directly to `/dashboard`

## What Users Will Experience

### For New Users (After Migration)
✅ One-click signup with Google/Facebook/GitHub
✅ Fill in phone number (mandatory)
✅ No email verification needed
✅ Instant access to the app

### For Existing Users (Before Reset)
⚠️ All accounts will be deleted during reset
📧 You should notify users before running the reset:
- Send email/SMS to all users
- Announce the switch to social auth
- Give them advance notice
- After reset, they'll need to register again with social auth

## Benefits of the Change

✅ **FREE** - No SMS costs, no email rate limits
✅ **Fast** - One-click registration
✅ **Secure** - OAuth 2.0, verified by providers
✅ **Better UX** - No passwords to remember
✅ **No verification delays** - Already verified by Google/Facebook/GitHub
✅ **Phone collected** - For club communications
✅ **Mobile-friendly** - Most users already logged into Google/Facebook

## Code Changes Summary

### Before (Email Auth)
- User registers with email + password
- Verification email sent (rate limited)
- User clicks link in email
- Callback handler verifies token
- User can login

### After (Social Auth)
- User clicks "Continue with Google"
- Google authenticates user
- Redirected to complete-profile
- User enters phone + name + sports
- Done - logged in

## Routes

| Old Route | New Route | Purpose |
|-----------|-----------|---------|
| `/register` | `/register` | Now shows social auth buttons |
| `/login` | `/login` | Now shows social auth buttons |
| `/auth/callback` | ❌ Removed | No longer needed |
| - | `/auth/complete-profile` | Collect phone after social auth |

## Database Changes

```sql
-- Email is now optional
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Phone index for faster lookups
CREATE INDEX idx_users_phone ON users(phone);
```

## Environment Variables

No new environment variables needed!

You only need to configure OAuth providers in Supabase Dashboard.

## Rollback Plan

If you need to revert to email auth:

1. Keep the old git commit with email auth code
2. Revert the migration
3. Re-enable email confirmation in Supabase
4. Restore user data from backup (if you made one)

But honestly, social auth is better in every way, so you won't want to roll back!

## Next Steps

1. ✅ Review this document
2. ✅ Backup your database (optional but recommended)
3. ✅ Run migration: `make-email-optional-for-social-auth.sql`
4. ✅ Run reset: `RESET_AUTH_AND_USERS.sql`
5. ✅ Configure OAuth providers (Google/Facebook/GitHub)
6. ✅ Test registration flow
7. ✅ Test login flow
8. ✅ Deploy to production
9. ✅ Update production OAuth redirect URLs

## Support

If you run into issues:

1. Check `docs/SOCIAL_AUTH_SETUP.md` for detailed OAuth setup
2. Verify redirect URLs are correct in OAuth provider settings
3. Check Supabase logs for authentication errors
4. Test with different browsers/incognito mode
5. Ensure OAuth providers are enabled in Supabase Dashboard

## Summary

**Removed:** Email-based authentication (password + verification)
**Added:** Social authentication (Google/Facebook/GitHub)
**Required:** Phone number (mandatory for all users)
**Cost:** FREE (no SMS, no email limits)
**Result:** Faster, better, more secure authentication!
