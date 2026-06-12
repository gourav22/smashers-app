# Supabase Email Configuration Guide

## Problem
Email confirmation links were redirecting to localhost instead of your production domain.

## Solution
The app now has a proper auth callback handler at `/auth/callback` that processes email verification tokens.

## Required Supabase Configuration

To make email confirmation work properly, you need to configure redirect URLs in your Supabase dashboard:

### 1. Add Redirect URLs

Go to **Supabase Dashboard** → **Authentication** → **URL Configuration**

Add these URLs to **Redirect URLs** (Site URL whitelist):

**For Development:**
```
http://localhost:3000/auth/callback
```

**For Production:**
```
https://yourdomain.com/auth/callback
```

Replace `yourdomain.com` with your actual production domain.

### 2. Update Site URL

Set the **Site URL** to your production domain:
```
https://yourdomain.com
```

For development, you can keep it as:
```
http://localhost:3000
```

### 3. Email Template Configuration (Optional)

By default, Supabase uses `{{ .SiteURL }}` in email templates which respects the Site URL setting. If you've customized email templates, ensure they use:

```
{{ .ConfirmationURL }}
```

This token will automatically point to `/auth/callback` with the verification code.

## How It Works

1. **User registers** → `emailRedirectTo` is set to `/auth/callback`
2. **Supabase sends email** with confirmation link pointing to `/auth/callback?code=...`
3. **User clicks link** → Next.js route handler at `/auth/callback` receives the request
4. **Code exchange** → The handler exchanges the code for a session using `exchangeCodeForSession()`
5. **Redirect to login** → User is redirected to login page with success message

## Testing

1. Register a new user
2. Check the confirmation email
3. Click the link - it should redirect to your domain (not localhost)
4. You should see "Email verified successfully!" on the login page
5. Login with your credentials

## Environment Variables

Make sure these are set in your `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## Troubleshooting

**Issue:** Still getting localhost links in emails
- **Fix:** Double-check the Redirect URLs in Supabase dashboard include your production domain

**Issue:** "Invalid redirect URL" error
- **Fix:** The redirect URL must be whitelisted in Supabase dashboard

**Issue:** Code exchange fails
- **Fix:** Ensure the verification link hasn't expired (default: 24 hours)
