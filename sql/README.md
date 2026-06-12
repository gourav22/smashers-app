# Database Migrations

## Quick Setup

Run these files in order in your **Supabase SQL Editor**:

### Required Migrations (in order)

1. **`migrations/01-base-schema.sql`**
   - Creates core tables: users, slots, bookings, matches
   - Sets up RLS policies
   - Initial indexes

2. **`migrations/02-subscription-system.sql`**
   - Adds subscription_templates table
   - Adds subscriptions table
   - Adds subscription_cancellations table
   - Adds auto_booking_logs table

### Optional Migrations

- `migrations/fix-rls-policies.sql` - If you have RLS permission issues
- `migrations/fix-user-insert-policy.sql` - If user registration fails
- `migrations/add-user-sports-preference.sql` - If already deployed without sports_played field
- `migrations/add-match-approval-fields.sql` - If matches table missing approval columns
- `migrations/multi-club-setup.sql` - For multi-club support (future)

## Verify Setup

After running migrations, check:

```sql
-- Should return all tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Should return at least: auto_booking_logs, bookings, matches, 
-- slots, subscription_cancellations, subscription_templates, 
-- subscriptions, users
```

## Make Yourself Admin

```sql
UPDATE public.users
SET role = 'super_admin'
WHERE email = 'your-email@example.com';
```
