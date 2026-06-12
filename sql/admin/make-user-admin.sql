-- ============================================================================
-- MAKE USER ADMIN
-- ============================================================================
-- Use this script to promote a user to admin after they register
--
-- Run this AFTER:
-- 1. User has registered via social auth (Google/Facebook/GitHub)
-- 2. User has completed their profile (phone number added)
--
-- Available roles:
-- - 'super_admin' (full access: manage everything)
-- - 'slot_manager' (can create/manage slots)
-- - 'finance_manager' (can manage members, view financials)
-- - 'member' (default, regular user)
-- ============================================================================

-- INSTRUCTIONS:
-- 1. Register a new user via /register (social auth)
-- 2. Complete profile with phone number
-- 3. Find the user in the users table
-- 4. Copy their email or phone number
-- 5. Run one of the queries below

-- ====================
-- Option 1: Make user SUPER ADMIN (full access)
-- ====================

-- By email:
UPDATE public.users
SET role = 'super_admin'
WHERE email = 'your@email.com';

-- Or by phone:
-- UPDATE public.users
-- SET role = 'super_admin'
-- WHERE phone = '+1234567890';

-- Or by name:
-- UPDATE public.users
-- SET role = 'super_admin'
-- WHERE name = 'Your Name';

-- ====================
-- Option 2: Make user SLOT MANAGER (manage slots only)
-- ====================

-- UPDATE public.users
-- SET role = 'slot_manager'
-- WHERE email = 'your@email.com';

-- ====================
-- Option 3: Make user FINANCE MANAGER (manage members/financials)
-- ====================

-- UPDATE public.users
-- SET role = 'finance_manager'
-- WHERE email = 'your@email.com';

-- ====================
-- Verify the change
-- ====================

SELECT
  id,
  name,
  email,
  phone,
  role,
  created_at
FROM public.users
WHERE role != 'member'
ORDER BY created_at DESC;

-- You should see your user with the new role

-- ====================
-- Make multiple users admin at once
-- ====================

-- UPDATE public.users
-- SET role = 'super_admin'
-- WHERE email IN (
--   'admin1@example.com',
--   'admin2@example.com',
--   'admin3@example.com'
-- );

-- ====================
-- Find users by search
-- ====================

-- Find by partial name match:
-- SELECT id, name, email, phone, role
-- FROM public.users
-- WHERE name ILIKE '%raj%';

-- Find by partial email match:
-- SELECT id, name, email, phone, role
-- FROM public.users
-- WHERE email ILIKE '%gmail%';

-- ====================
-- Remove admin access (demote to member)
-- ====================

-- UPDATE public.users
-- SET role = 'member'
-- WHERE email = 'former-admin@example.com';

-- ====================
-- NOTES
-- ====================

-- After updating the role:
-- 1. User needs to refresh their dashboard page
-- 2. The "Admin Panel" section will appear on dashboard
-- 3. They'll have access to:
--    - Super Admin: All admin functions
--    - Slot Manager: Create/manage slots
--    - Finance Manager: Manage members, view transactions

-- Role Permissions:
-- SUPER ADMIN can:
--   - Create/manage slots
--   - Manage members (view, edit balance, change roles)
--   - Create subscription templates
--   - View all matches
--   - Full access to everything

-- SLOT MANAGER can:
--   - Create/manage slots
--   - View bookings
--   - Cancel slots

-- FINANCE MANAGER can:
--   - Manage members (view, edit balance)
--   - View transactions
--   - Top up user balances

-- MEMBER (default):
--   - Book slots
--   - View own bookings
--   - Create matches
--   - View leaderboard
