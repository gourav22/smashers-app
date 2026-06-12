# Admin Setup Guide

## Quick Start: Make Yourself Admin

After registering with social auth, you need to manually promote yourself to admin.

### Step 1: Register an Account

1. Go to `/register`
2. Click "Continue with Google/Facebook/GitHub"
3. Complete profile with phone number
4. You'll land on `/dashboard` as a regular member

### Step 2: Find Your User ID

**Option A: From Supabase Dashboard**
1. Go to **Supabase Dashboard → Table Editor**
2. Open **`users`** table
3. Find your record (search by email or name)
4. Note your email or phone number

**Option B: From SQL Editor**
```sql
-- Find yourself by email
SELECT id, name, email, phone, role
FROM public.users
WHERE email = 'your@email.com';
```

### Step 3: Make Yourself Super Admin

Run this in **Supabase SQL Editor**:

```sql
UPDATE public.users
SET role = 'super_admin'
WHERE email = 'your@email.com';
```

Or by phone:
```sql
UPDATE public.users
SET role = 'super_admin'
WHERE phone = '+1234567890';
```

Or by name:
```sql
UPDATE public.users
SET role = 'super_admin'
WHERE name = 'Your Name';
```

### Step 4: Verify Admin Access

1. Refresh your dashboard page (`/dashboard`)
2. You should now see the **"⚙️ Admin Panel"** section
3. Click on admin actions to test:
   - ➕ Create Slots
   - 🗑️ Manage Slots
   - 👥 Manage Members
   - 📋 Subscriptions

## Admin Roles

### Super Admin (Full Access)
```sql
UPDATE public.users SET role = 'super_admin' WHERE email = 'admin@example.com';
```

**Can do:**
- ✅ Create and manage slots
- ✅ Manage all members
- ✅ Edit user balances
- ✅ Create subscription templates
- ✅ View all matches
- ✅ View all transactions
- ✅ Full system access

**Dashboard shows:**
- ➕ Create Slots
- 🗑️ Manage Slots
- 👥 Manage Members
- 📋 Subscriptions
- ⚔️ All Matches

### Slot Manager (Slot Management Only)
```sql
UPDATE public.users SET role = 'slot_manager' WHERE email = 'manager@example.com';
```

**Can do:**
- ✅ Create and manage slots
- ✅ View bookings for slots
- ✅ Cancel/reactivate slots
- ❌ Cannot manage members
- ❌ Cannot view financials
- ❌ Cannot create templates

**Dashboard shows:**
- ➕ Create Slots
- 🗑️ Manage Slots

### Finance Manager (Member & Financial Management)
```sql
UPDATE public.users SET role = 'finance_manager' WHERE email = 'finance@example.com';
```

**Can do:**
- ✅ Manage members (view, edit)
- ✅ Top up user balances
- ✅ View transactions
- ❌ Cannot create slots
- ❌ Cannot create templates

**Dashboard shows:**
- 👥 Manage Members

### Member (Default Role)
```sql
UPDATE public.users SET role = 'member' WHERE email = 'user@example.com';
```

**Can do:**
- ✅ Book slots
- ✅ View own bookings
- ✅ Create matches
- ✅ View leaderboard
- ✅ Top up own balance
- ❌ No admin access

**Dashboard shows:**
- Regular user interface only

## Common Tasks

### Make Multiple Users Admin
```sql
UPDATE public.users
SET role = 'super_admin'
WHERE email IN (
  'admin1@example.com',
  'admin2@example.com',
  'admin3@example.com'
);
```

### Find Users to Promote
```sql
-- Find by name
SELECT id, name, email, phone, role
FROM public.users
WHERE name ILIKE '%john%';

-- Find by email
SELECT id, name, email, phone, role
FROM public.users
WHERE email ILIKE '%@gmail.com%';

-- Find recent users
SELECT id, name, email, phone, role, created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10;
```

### List All Admins
```sql
SELECT
  name,
  email,
  phone,
  role,
  created_at
FROM public.users
WHERE role IN ('super_admin', 'slot_manager', 'finance_manager')
ORDER BY role, created_at;
```

### Demote Admin to Regular Member
```sql
UPDATE public.users
SET role = 'member'
WHERE email = 'former-admin@example.com';
```

### Change Admin Type
```sql
-- From super_admin to slot_manager
UPDATE public.users
SET role = 'slot_manager'
WHERE email = 'admin@example.com';
```

## Troubleshooting

### Admin Panel Not Showing After Update

**Problem:** Updated role but admin panel doesn't appear

**Solutions:**
1. **Hard refresh** the page (Ctrl+F5 or Cmd+Shift+R)
2. **Clear browser cache** and refresh
3. **Logout and login again**
4. Verify the role was actually updated:
   ```sql
   SELECT name, email, role FROM public.users WHERE email = 'your@email.com';
   ```

### Can't Find My User

**Problem:** Don't know your email or can't find yourself

**Solution:** List recent users:
```sql
SELECT
  id,
  name,
  email,
  phone,
  role,
  created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 20;
```

Look for your name or registration time.

### Role Update Doesn't Take Effect

**Problem:** Updated role but features still restricted

**Possible causes:**
1. User is cached in the app
2. User needs to refresh/re-login
3. RLS policies need refresh

**Solutions:**
1. Clear browser cache
2. Logout and login again
3. Check if RLS policies exist:
   ```sql
   SELECT * FROM pg_policies WHERE tablename IN ('users', 'slots', 'bookings');
   ```

### Multiple People Need Admin Access

**Problem:** Need to make several team members admin

**Solution:** Bulk update:
```sql
-- Option 1: By email list
UPDATE public.users
SET role = 'super_admin'
WHERE email IN (
  'person1@example.com',
  'person2@example.com',
  'person3@example.com'
);

-- Option 2: By domain
UPDATE public.users
SET role = 'super_admin'
WHERE email LIKE '%@yourcompany.com';

-- Option 3: By phone numbers
UPDATE public.users
SET role = 'super_admin'
WHERE phone IN (
  '+1234567890',
  '+0987654321'
);
```

## Security Best Practices

### ⚠️ Important Security Notes

1. **Limit Super Admins**
   - Only give `super_admin` to trusted people
   - Most staff should be `slot_manager` or `finance_manager`

2. **Audit Admin Actions**
   - Check `audit_logs` table regularly
   - Review who has admin access:
     ```sql
     SELECT COUNT(*), role
     FROM public.users
     GROUP BY role;
     ```

3. **Demote When Leaving**
   - Remove admin access immediately when someone leaves:
     ```sql
     UPDATE public.users
     SET role = 'member'
     WHERE email = 'ex-employee@example.com';
     ```

4. **Regular Reviews**
   - Monthly review of all admin users
   - Remove unused admin accounts

## Quick Reference

| Task | SQL |
|------|-----|
| Make super admin | `UPDATE users SET role = 'super_admin' WHERE email = '...'` |
| Make slot manager | `UPDATE users SET role = 'slot_manager' WHERE email = '...'` |
| Make finance manager | `UPDATE users SET role = 'finance_manager' WHERE email = '...'` |
| Demote to member | `UPDATE users SET role = 'member' WHERE email = '...'` |
| List all admins | `SELECT * FROM users WHERE role != 'member'` |
| Find by email | `SELECT * FROM users WHERE email = '...'` |
| Find by name | `SELECT * FROM users WHERE name ILIKE '%...%'` |

## First-Time Setup Checklist

After migrating to social auth:

- [ ] Register yourself via `/register`
- [ ] Complete profile with phone number
- [ ] Run SQL to make yourself `super_admin`
- [ ] Refresh dashboard - verify admin panel appears
- [ ] Test creating a slot
- [ ] Test managing members
- [ ] Register other team members
- [ ] Make them admin (appropriate role)
- [ ] Test their access
- [ ] Document who has admin access

## Support

See the full SQL script: `sql/admin/make-user-admin.sql`

For role permissions reference, check the RLS policies in `sql/migrations/01-base-schema.sql`
