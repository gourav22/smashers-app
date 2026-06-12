# Admin & Role Setup Guide

## How to Make Yourself Admin

### Option 1: During Registration (Easiest)
Currently, all users register as regular members. To become admin, follow Option 2.

### Option 2: Update Existing User via SQL (Recommended)

**Step 1:** Login to Supabase Dashboard → SQL Editor

**Step 2:** Run this query with your email:

```sql
-- Make yourself Super Admin
UPDATE public.users
SET role = 'super_admin'
WHERE email = 'your-email@example.com';
```

**Step 3:** Refresh your dashboard - you'll now see the Admin Panel section!

---

## Available Roles

### 1. Super Admin
**Access:** Everything
- Create/manage slots
- Manage all members
- Update balances
- Change user roles
- View all bookings and matches
- Resolve disputes

**SQL:**
```sql
UPDATE public.users SET role = 'super_admin' WHERE email = 'admin@club.com';
```

### 2. Slot Manager
**Access:** Slot management + member viewing
- Create/manage slots
- View all members
- View bookings
- Cannot edit balances or roles

**SQL:**
```sql
UPDATE public.users SET role = 'slot_manager' WHERE email = 'manager@club.com';
```

### 3. Finance Manager
**Access:** Financial operations
- View all members
- Update member balances
- View transactions
- Cannot create slots or change roles

**SQL:**
```sql
UPDATE public.users SET role = 'finance_manager' WHERE email = 'finance@club.com';
```

### 4. Member (Default)
**Access:** Standard features only
- Book slots
- Create matches
- View own stats
- View leaderboard

---

## Quick Setup for Your Club

### Step 1: Create Admin Accounts

```sql
-- Create main admin (you)
UPDATE public.users
SET role = 'super_admin'
WHERE email = 'your-email@example.com';

-- Create slot manager
UPDATE public.users
SET role = 'slot_manager'
WHERE email = 'slot-manager@example.com';

-- Create finance manager
UPDATE public.users
SET role = 'finance_manager'
WHERE email = 'finance@example.com';
```

### Step 2: Verify Roles

```sql
-- Check all admin users
SELECT name, email, role
FROM public.users
WHERE role IN ('super_admin', 'slot_manager', 'finance_manager');
```

### Step 3: Test Admin Access

1. Logout and login again
2. Go to dashboard
3. Scroll down - you should see **"⚙️ Admin Panel"** section
4. Click buttons to access admin features

---

## Admin Panel Features by Role

| Feature | Super Admin | Slot Manager | Finance Manager | Member |
|---------|-------------|--------------|-----------------|--------|
| Create Slots | ✅ | ✅ | ❌ | ❌ |
| Manage Members | ✅ | ✅ (view only) | ✅ | ❌ |
| Edit Balances | ✅ | ❌ | ✅ | ❌ |
| Change Roles | ✅ | ❌ | ❌ | ❌ |
| View All Matches | ✅ | ✅ | ❌ | Own only |
| Resolve Disputes | ✅ | ❌ | ❌ | ❌ |

---

## Match Score Approval System

### Current System (To Be Updated):
- Any member can create a match
- All players must confirm before ELO updates

### New System (Your Request):
- Any member can create a match
- **Only admins can approve scores**
- Prevents cheating and disputes

This will be implemented in the next update.

---

## Adding Test Balance to Users

As admin, you can add balance via the Member Management UI or SQL:

```sql
-- Add €100 to a user
UPDATE public.users
SET balance = balance + 100
WHERE email = 'user@example.com';
```

Or use the Admin UI:
1. Go to `/admin/members`
2. Click "Edit" on any member
3. Change balance amount
4. Click "Save Changes"
5. Transaction record auto-created

---

## Troubleshooting

**Problem:** Don't see Admin Panel after role change
- Solution: Clear browser cache and logout/login again

**Problem:** "Permission denied" when accessing admin pages
- Solution: Verify role in database:
  ```sql
  SELECT role FROM public.users WHERE email = 'your-email@example.com';
  ```

**Problem:** Role change not working
- Solution: Make sure you're updating the correct email address

---

## Security Notes

- Super Admin role has full access - only give to trusted people
- Finance Manager should be different from Slot Manager for accountability
- Always use SQL to change roles, not the UI (prevents unauthorized role changes)
- Consider setting up audit logs to track admin actions

---

## Quick Commands Cheat Sheet

```sql
-- Make user super admin
UPDATE public.users SET role = 'super_admin' WHERE email = 'admin@club.com';

-- Make user slot manager
UPDATE public.users SET role = 'slot_manager' WHERE email = 'manager@club.com';

-- Make user finance manager  
UPDATE public.users SET role = 'finance_manager' WHERE email = 'finance@club.com';

-- Reset to member
UPDATE public.users SET role = 'member' WHERE email = 'user@club.com';

-- Add balance
UPDATE public.users SET balance = balance + 100 WHERE email = 'user@club.com';

-- View all admins
SELECT name, email, role FROM public.users WHERE role != 'member';
```
