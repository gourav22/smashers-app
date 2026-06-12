# Email Rate Limit Error - Solutions

## Why This Happens
Supabase Auth tracks email rate limits separately from your users table.
Even if you delete a user from the `users` table, the `auth.users` table and 
email rate limits still remember the email address.

## Quick Solutions

### Solution 1: Delete from Auth System (Recommended)
Go to **Supabase Dashboard → Authentication → Users**

1. Find the user by email
2. Click the three dots (•••) next to the user
3. Click "Delete User"
4. Confirm deletion

This removes the user from `auth.users` AND resets rate limits for that email.

### Solution 2: Wait for Rate Limit to Reset
Supabase email rate limits reset after:
- **1 hour** for normal rate limits
- **24 hours** for severe violations

### Solution 3: Use a Different Email
If you need to test immediately:
- Use a different email address
- Or use email aliases:
  - Gmail: `youremail+test1@gmail.com`
  - Gmail: `youremail+test2@gmail.com`
  - Gmail: `youremail+test3@gmail.com`

### Solution 4: Clear Auth User via SQL
Run in **Supabase SQL Editor**:

```sql
-- BE CAREFUL: This deletes from auth system permanently
-- Find the user ID first
SELECT id, email, created_at FROM auth.users WHERE email = 'user@example.com';

-- Delete the auth user (this cascades to your users table if you have triggers)
DELETE FROM auth.users WHERE email = 'user@example.com';
```

⚠️ **Warning**: This permanently deletes the user from authentication. Only use for development/testing.

### Solution 5: Increase Rate Limits (Pro Plan Only)
**Supabase Dashboard → Project Settings → Authentication → Rate Limits**
- Adjust email sending limits
- Note: Only available on paid plans

## Understanding the Error

When you see "Email rate limit exceeded", it means:
- You've sent too many emails to that address in a short time
- Common causes:
  - Multiple registration attempts
  - Repeated password reset requests
  - Testing with the same email repeatedly

## Current Rate Limits

Default Supabase free tier limits:
- **4 emails per hour** per email address
- **30 emails per hour** per IP address

Exceeding these triggers the rate limit error.

## Prevention Tips

### For Development/Testing

1. **Use Test Email Aliases**
   ```
   test1@example.com
   test2@example.com
   test+1@gmail.com
   test+2@gmail.com
   ```

2. **Enable Email Confirmations in Development**
   - Supabase Dashboard → Authentication → Email Auth
   - Toggle "Enable email confirmations" OFF for testing
   - ⚠️ Remember to turn it back ON for production

3. **Use Supabase Local Development**
   ```bash
   npx supabase start
   ```
   - Local Supabase has no rate limits
   - Emails are shown in logs instead of sent

### For Production

1. **Use Custom SMTP Provider**
   - SendGrid, Mailgun, or AWS SES
   - Much higher rate limits
   - Configuration: Dashboard → Project Settings → Auth → SMTP Settings

2. **Monitor Email Usage**
   - Check Dashboard → Logs for email sending patterns
   - Set up alerts for unusual activity

## Checking Your Current Status

Run this in Supabase SQL Editor to see all auth users:

```sql
-- See all auth users (not your users table)
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at,
  last_sign_in_at
FROM auth.users
ORDER BY created_at DESC;
```

To check if a specific email exists in auth:

```sql
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users 
WHERE email = 'your@email.com';
```

## Common Mistakes

❌ **Deleting from `users` table only**
```sql
-- This does NOT remove from auth or reset rate limits
DELETE FROM users WHERE email = 'user@example.com';
```

✅ **Correct: Delete from auth system**
```sql
-- This removes from auth AND triggers cascade to users table
DELETE FROM auth.users WHERE email = 'user@example.com';
```

## Testing Registration Without Hitting Limits

### Option 1: Disable Email Confirmation (Dev Only)
Supabase Dashboard → Authentication → Providers → Email
- Uncheck "Confirm email"
- Users can register without email verification
- ⚠️ Only for development!

### Option 2: Use Unique Emails Each Time
```typescript
const testEmail = `test+${Date.now()}@example.com`;
// or
const testEmail = `test+${Math.random().toString(36).substring(7)}@example.com`;
```

### Option 3: Catch and Handle the Error
```typescript
try {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  
  if (error) {
    if (error.message.includes('rate limit')) {
      alert('Too many emails sent. Please wait 1 hour or use a different email.');
    } else {
      alert(error.message);
    }
  }
} catch (err) {
  console.error(err);
}
```

## Still Having Issues?

1. **Check Supabase Logs**
   - Dashboard → Logs → Auth Logs
   - Look for failed email attempts

2. **Verify SMTP Settings**
   - Dashboard → Project Settings → Auth → SMTP
   - Check if custom SMTP is configured correctly

3. **Contact Supabase Support**
   - For persistent issues
   - They can manually reset rate limits

## Summary

**Quick Fix:**
1. Go to Supabase Dashboard → Authentication → Users
2. Delete the user with the problematic email
3. Wait a few minutes
4. Try registering again

**Or:**
- Wait 1 hour for rate limit to reset
- Use a different email address (test+1@gmail.com, test+2@gmail.com, etc.)
