# Social Authentication Setup Guide

## Overview

This guide shows how to set up Google, Facebook, and GitHub authentication with mandatory phone number collection.

## Benefits

✅ **No SMS costs** - Social providers handle authentication
✅ **No email verification** - Already verified by Google/Facebook/GitHub  
✅ **Fast signup** - One-click registration
✅ **Verified identities** - Real user accounts
✅ **Phone number collected** - For club communications
✅ **No rate limits** - No email sending restrictions

## User Flow

### Registration Flow
1. User clicks "Continue with Google/Facebook/GitHub"
2. Redirected to provider (Google/Facebook/GitHub)
3. User authorizes the app
4. Redirected back to `/auth/complete-profile`
5. User enters: Name (unique), Phone Number (mandatory), Sports
6. Profile saved → Redirected to dashboard

### Login Flow
1. User clicks "Continue with Google/Facebook/GitHub"  
2. Redirected to provider
3. User authorizes
4. Redirected directly to dashboard (profile already complete)

## Required Configuration

### 1. Google OAuth Setup

#### Step 1: Create Google Cloud Project
1. Go to https://console.cloud.google.com
2. Create a new project or select existing one
3. Enable **Google+ API**

#### Step 2: Create OAuth Credentials
1. Go to **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth 2.0 Client ID**
3. Application type: **Web application**
4. Name: "Sports Club App"

#### Step 3: Configure Authorized URLs

**Authorized JavaScript origins:**
```
http://localhost:3000
https://yourdomain.com
```

**Authorized redirect URIs:**
```
https://YOUR_SUPABASE_PROJECT_ID.supabase.co/auth/v1/callback
```

Find your Supabase project ID in: **Supabase Dashboard → Settings → API**

Example:
```
https://abcdefghijklmn.supabase.co/auth/v1/callback
```

#### Step 4: Copy Credentials
- Copy **Client ID**
- Copy **Client Secret**

#### Step 5: Configure in Supabase
1. Go to **Supabase Dashboard → Authentication → Providers**
2. Find **Google**
3. Toggle **Enable**
4. Paste **Client ID**
5. Paste **Client Secret**
6. Click **Save**

---

### 2. Facebook OAuth Setup

#### Step 1: Create Facebook App
1. Go to https://developers.facebook.com
2. Click **My Apps → Create App**
3. Select **Consumer** use case
4. App Name: "Sports Club App"
5. Contact Email: your email

#### Step 2: Add Facebook Login Product
1. In app dashboard, click **Add Product**
2. Find **Facebook Login** and click **Set Up**
3. Choose **Web** platform

#### Step 3: Configure OAuth Settings
1. Go to **Facebook Login → Settings**
2. Add **Valid OAuth Redirect URIs:**

```
https://YOUR_SUPABASE_PROJECT_ID.supabase.co/auth/v1/callback
```

3. Click **Save Changes**

#### Step 4: Make App Live
1. Go to **Settings → Basic**
2. Scroll to **App Mode**
3. Toggle from **Development** to **Live**
4. Accept terms

#### Step 5: Copy Credentials
In **Settings → Basic:**
- Copy **App ID**
- Click **Show** on **App Secret** and copy it

#### Step 6: Configure in Supabase
1. Go to **Supabase Dashboard → Authentication → Providers**
2. Find **Facebook**
3. Toggle **Enable**
4. Paste **App ID** (as Client ID)
5. Paste **App Secret** (as Client Secret)
6. Click **Save**

---

### 3. GitHub OAuth Setup

#### Step 1: Create GitHub OAuth App
1. Go to https://github.com/settings/developers
2. Click **New OAuth App**
3. Fill in:
   - **Application name:** Sports Club App
   - **Homepage URL:** `https://yourdomain.com`
   - **Authorization callback URL:** 
     ```
     https://YOUR_SUPABASE_PROJECT_ID.supabase.co/auth/v1/callback
     ```

#### Step 2: Register Application
Click **Register application**

#### Step 3: Generate Client Secret
1. Click **Generate a new client secret**
2. Copy the secret (you can only see it once!)

#### Step 4: Copy Credentials
- Copy **Client ID**
- Copy **Client Secret** (from previous step)

#### Step 5: Configure in Supabase
1. Go to **Supabase Dashboard → Authentication → Providers**
2. Find **GitHub**
3. Toggle **Enable**
4. Paste **Client ID**
5. Paste **Client Secret**
6. Click **Save**

---

## Update Database Schema

Make phone number mandatory and email optional:

```sql
-- Make email nullable (since social auth users might not have email)
ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

-- Make phone required (you'll enforce this in the app, not database)
-- Keep it nullable in DB for flexibility
ALTER TABLE users ALTER COLUMN phone DROP NOT NULL;

-- Add index for faster phone lookups
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
```

---

## Update Existing Pages

### Update Home/Landing Page

Add social login options to your landing page:

```typescript
// src/app/page.tsx
<Link href="/register-social">
  <button>Sign Up with Google/Facebook/GitHub</button>
</Link>

<Link href="/login-social">
  <button>Login</button>
</Link>
```

### Update Dashboard to Handle Missing Phone

Add a check in dashboard to redirect users without phone:

```typescript
// src/app/(member)/dashboard/page.tsx
useEffect(() => {
  const checkProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: profile } = await supabase
        .from('users')
        .select('phone')
        .eq('id', user.id)
        .single();
      
      if (!profile || !profile.phone) {
        // Redirect to complete profile
        router.push('/auth/complete-profile');
      }
    }
  };
  
  checkProfile();
}, []);
```

---

## Testing

### Test Registration
1. Go to `http://localhost:3000/register-social`
2. Click **Continue with Google**
3. Select your Google account
4. You should be redirected to `/auth/complete-profile`
5. Fill in Name, Phone, Sports
6. Click **Complete Registration**
7. Should redirect to `/dashboard`

### Test Login
1. Go to `http://localhost:3000/login-social`
2. Click **Continue with Google** (same account)
3. Should redirect directly to `/dashboard` (no profile form)

### Test Phone Requirement
1. Try accessing `/dashboard` without completing profile
2. Should redirect back to `/auth/complete-profile`

---

## Routes Summary

| Route | Purpose |
|-------|---------|
| `/register-social` | Social signup page (Google/Facebook/GitHub) |
| `/login-social` | Social login page |
| `/auth/complete-profile` | Collect phone + name + sports after social auth |
| `/dashboard` | Main app (redirects if phone missing) |

---

## Migration from Email to Social Auth

If you have existing email-based users:

### Option 1: Keep Both
- Allow users to link social accounts to existing email accounts
- Users can login with either email+password OR social

### Option 2: Migrate to Social Only
1. Announce the change to users
2. Have users login with email one last time
3. Prompt them to link a social account
4. After X days, disable email auth

---

## Phone Number Validation

The `PhoneInput` component should validate:

```typescript
// Ensure E.164 format
const isValidPhone = (phone: string) => {
  return /^\+[1-9]\d{1,14}$/.test(phone);
};

// Example valid formats:
// +14155552671 (US)
// +442071234567 (UK)
// +919876543210 (India)
```

---

## Cost Analysis

**Social Auth: FREE** ✅
- Google OAuth: Free
- Facebook Login: Free
- GitHub OAuth: Free
- No SMS costs
- No email sending costs
- No rate limits

**Traditional Email Auth:**
- Email verification: Free but rate limited (4/hour)
- SMS OTP: ~$0.01 per message
- Password resets: Email rate limits

**Winner: Social Auth** 🏆

---

## Security Benefits

✅ **OAuth 2.0** - Industry standard authentication
✅ **No password storage** - Reduce liability
✅ **Provider-verified emails** - No fake emails
✅ **2FA inherited** - If user has 2FA on Google, you benefit
✅ **Session management** - Handled by Supabase + provider

---

## Troubleshooting

### Error: "redirect_uri_mismatch"
**Cause:** Redirect URI not whitelisted
**Fix:** Add the exact Supabase callback URL to provider settings

### Error: "Access Denied"
**Cause:** App not approved/live (Facebook)
**Fix:** Make Facebook app live in App Settings

### Error: "User profile not found"
**Cause:** User closed the complete-profile page
**Fix:** Redirect to complete-profile if phone is missing (already handled)

### Users Can't Login
**Cause:** Provider not enabled in Supabase
**Fix:** Check Dashboard → Authentication → Providers

---

## Next Steps

1. ✅ Configure Google OAuth
2. ✅ Configure Facebook OAuth  
3. ✅ Configure GitHub OAuth
4. ✅ Update routes and navigation
5. ✅ Test registration flow
6. ✅ Test login flow
7. ✅ Deploy to production
8. ✅ Update provider redirect URLs for production domain

---

## Production Checklist

Before going live:

- [ ] Update OAuth redirect URIs to production domain
- [ ] Test all three providers (Google, Facebook, GitHub)
- [ ] Ensure phone number is mandatory in complete-profile
- [ ] Add phone number validation
- [ ] Test on mobile devices
- [ ] Verify user data is saved correctly
- [ ] Check dashboard redirects users without phone to complete-profile
- [ ] Update privacy policy to mention social login
- [ ] Add "Continue with Email" option as fallback (optional)

---

## Summary

**What You Get:**
- ✅ One-click social login
- ✅ No email verification needed
- ✅ No SMS costs
- ✅ Mandatory phone number collection
- ✅ Fast, secure authentication
- ✅ Better user experience

**Setup Time:** ~30 minutes per provider

**Cost:** FREE forever
