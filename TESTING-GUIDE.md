# Testing Guide - Local Development

## Problem: Email Verification Blocking Local Testing

During local development, Supabase sends real email verification links which blocks testing.

## Quick Fix: Create User Profile Manually

### Step 1: Run the INSERT policy fix
In Supabase SQL Editor, run:
```sql
-- From fix-user-insert-policy.sql
CREATE POLICY "Users can insert own profile" ON public.users
FOR INSERT
WITH CHECK (auth.uid() = id);
```

### Step 2: Find your auth user ID
In Supabase SQL Editor:
```sql
SELECT id, email, created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;
```

Copy your user `id` (UUID format).

### Step 3: Create your profile manually
Replace `YOUR-USER-ID` and `YOUR-EMAIL` with values from Step 2:
```sql
INSERT INTO public.users (id, email, name)
VALUES (
  'YOUR-USER-ID',
  'YOUR-EMAIL',
  'Your Name'
)
ON CONFLICT (id) DO NOTHING;
```

Example:
```sql
INSERT INTO public.users (id, email, name)
VALUES (
  '123e4567-e89b-12d3-a456-426614174000',
  'test@example.com',
  'Test User'
)
ON CONFLICT (id) DO NOTHING;
```

### Step 4: Verify profile exists
```sql
SELECT * FROM public.users WHERE email = 'YOUR-EMAIL';
```

You should see your profile with default values:
- balance: 0
- badminton_elo: 1200
- cricket_elo: 1200
- All grades: D

### Step 5: (Optional) Add test balance
```sql
UPDATE public.users
SET balance = 100
WHERE email = 'YOUR-EMAIL';
```

### Step 6: (Optional) Make yourself admin
```sql
UPDATE public.users
SET role = 'super_admin'
WHERE email = 'YOUR-EMAIL';
```

## Alternative: Disable Email Verification (Supabase Dashboard)

1. Go to Supabase Dashboard → Authentication → Settings
2. Scroll to "Email Auth"
3. Toggle OFF "Enable email confirmations"
4. Click Save

**Note:** This affects ALL users on this project. Re-enable for production!

## Now You Can Test

1. Login with your email and password
2. Dashboard should load successfully
3. You can now:
   - Book slots (if you added balance)
   - Create matches
   - View leaderboard
   - Access admin features (if you set role to super_admin)

## Creating Test Users After Disabling Email Verification

If you disabled email verification:
1. Go to `/register`
2. Fill the form and submit
3. You'll be immediately able to login (no email verification needed)
4. The trigger will automatically create the profile

## Troubleshooting

**Still getting "Error loading profile"?**
- Check if `fix-user-insert-policy.sql` was run successfully
- Verify the profile exists: `SELECT * FROM public.users WHERE id = 'YOUR-USER-ID'`
- Check browser console for detailed error messages

**Profile exists but shows as empty?**
- The default values should populate automatically
- If not, manually set them with UPDATE queries above

**Can't insert profile (permission denied)?**
- Make sure the INSERT policy was created
- Check RLS is enabled: `ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;`
- Verify you're logged in when trying to access dashboard
