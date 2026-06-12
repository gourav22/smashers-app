# Sports Club Management System - Database Documentation

## Overview
This directory contains all SQL migrations and schema files for the Sports Club Management System.

## Quick Start

### For Fresh Setup
Run the consolidated schema file in your Supabase SQL Editor:
```sql
-- Run this file for a complete fresh setup
sql/CONSOLIDATED_SCHEMA.sql
```

This file contains:
- ✅ All tables with latest schema
- ✅ All indexes for performance
- ✅ All RLS policies with fixes
- ✅ All functions and triggers
- ✅ Complete subscription system
- ✅ Refund management system

### For Existing Databases
If you already have the database set up and need to apply specific fixes, run individual migration files in the `migrations/` folder.

## Database Schema

### Core Tables

#### `users`
- User profiles with authentication
- ELO ratings for badminton and cricket
- Balance management
- Sports preferences
- Gamification (streaks, achievements)

#### `slots`
- Available time slots for booking
- Supports badminton and cricket
- Tracks booked users and waitlist
- Status management (open/full/cancelled)

#### `bookings`
- User bookings for slots
- Supports cancellation with refund tracking
- **Special constraint**: Uses partial unique index to allow rebooking after cancellation
  - `WHERE status != 'cancelled'` allows same user to book → cancel → rebook same slot

#### `transactions`
- Financial transaction history
- Types: topup, booking, refund, registration_fee
- Tracks balance after each transaction
- Metadata field for additional context

#### `matches`
- Match results and scores
- ELO calculation tracking
- Approval workflow for admins
- Confirmation system for participants

#### `notifications`
- User notification system
- Read/unread tracking
- Optional action URLs
- Expiration support

#### `pending_refunds`
- **Key Feature**: Refunds only processed when slot fills with replacement
- Tracks pending, processed, and expired refunds
- Expires based on slot date
- Links to booking and slot

### Subscription System Tables

#### `subscription_templates`
- Admin-created subscription offerings
- Defines sport, day, time, location, price
- Tracks current vs max subscribers
- Available durations (3, 6, 12 months)
- Auto-updates status when full

#### `subscriptions`
- User subscriptions to templates
- Auto-booking enabled by default
- Status tracking (active/paused/cancelled/expired)
- Weekly pricing model

#### `subscription_cancellations`
- 7-day advance notice requirement
- Partial refund support
- Links to original subscription and slot

#### `auto_booking_logs`
- Tracks all auto-booking attempts
- Success/failure status
- Error messages for debugging

## Row Level Security (RLS)

All tables have RLS enabled with policies for:
- ✅ Users can view/update their own data
- ✅ Admins can manage all data
- ✅ Public read access where appropriate (slots, matches)
- ✅ Service role access for system operations

### Admin Roles
- `super_admin`: Full access to everything
- `slot_manager`: Manage slots, bookings, view members
- `finance_manager`: Manage finances, view transactions, manage members
- `member`: Regular user access

### Key RLS Fixes
1. **Admin Update Policy** (`is_admin()` function)
   - Uses `SECURITY DEFINER` to avoid circular reference
   - Allows admins to update any user's balance
   
2. **Bookings Policies**
   - Users can create their own bookings
   - Users can cancel their own bookings
   - Admins can view all bookings

3. **Transactions Policies**
   - Users can insert their own transactions
   - Admins can insert transactions for any user (manual adjustments)

4. **Pending Refunds Policies**
   - Service role can manage all refunds (for API operations)
   - Users can view/delete their own refunds (undo cancellation)

## Migration History

### Applied Migrations (in order)

1. **01-base-schema.sql** - Initial database structure
2. **02-subscription-system.sql** - Subscription and template system
3. **add-match-approval-fields.sql** - Admin approval for matches
4. **add-user-sports-preference.sql** - Sports selection on registration
5. **add-pending-refunds-table.sql** - Refund management system
6. **fix-user-insert-policy.sql** - Allow profile creation on signup
7. **fix-bookings-rls.sql** - Add missing INSERT policy for bookings
8. **fix-booking-unique-constraint.sql** - Allow rebooking after cancellation
9. **fix-balance-update-rls.sql** - Users can update balance for bookings
10. **fix-admin-users-update.sql** - Admin can update any user (circular ref fix)
11. **fix-transactions-rls.sql** - Admins can create transactions for manual adjustments
12. **fix-pending-refunds-rls.sql** - Service role can manage refunds

### Individual Migration Files

Located in `sql/migrations/`:

- `fix-admin-users-update.sql` - **CRITICAL**: Fixes admin balance updates with `is_admin()` function
- `fix-booking-unique-constraint.sql` - Allows rebooking same slot after cancellation
- `fix-pending-refunds-rls.sql` - Service role access for refund management
- `fix-transactions-rls.sql` - Admin transaction creation for manual adjustments
- `add-pending-refunds-table.sql` - Refund system (processes on replacement booking)

## Important Functions

### User Management
- `handle_new_user()` - Automatically creates user profile on auth signup
- `is_admin()` - Checks if current user is admin (used in RLS policies)

### Subscription Management
- `expire_subscriptions()` - Marks expired subscriptions (run via cron)
- `update_template_subscriber_count()` - Auto-updates subscriber counts
- `get_available_subscription_templates()` - Lists available templates with spots
- `get_next_subscription_slots()` - Finds next auto-booking slots for user

### Utility Functions
- `can_cancel_subscription_slot()` - Validates 7-day cancellation notice
- `get_weeks_remaining()` - Calculates remaining subscription weeks

## Refund Policy

**Key Business Rule**: Refunds are only processed when the cancelled slot is filled by a replacement.

1. User cancels booking
2. `pending_refund` record created with status='pending'
3. When another user books the same slot, refund is processed
4. If slot never fills before game time, refund expires (status='expired')
5. User can undo cancellation before refund is processed

## Indexes

Performance indexes on:
- User ELO ratings (for leaderboards)
- Slot date + sport + status (for availability queries)
- Booking user_id + status (for user booking lists)
- Transaction user_id + created_at (for transaction history)
- Subscription status + end_date (for active subscriptions)
- Pending refunds status (for processing pending refunds)

## Troubleshooting

### Common Issues

**1. "new row violates row-level security policy"**
- Check if RLS policies exist for the operation (SELECT, INSERT, UPDATE, DELETE)
- Verify user role has permission for the operation
- For admin operations, ensure `is_admin()` function exists

**2. Admin balance update not working**
- Ensure `fix-admin-users-update.sql` has been run
- This creates the `is_admin()` SECURITY DEFINER function
- Without it, circular reference causes policy check to fail

**3. Cannot rebook after cancellation**
- Ensure `fix-booking-unique-constraint.sql` has been run
- This replaces the UNIQUE constraint with a partial index
- Old constraint: `UNIQUE(user_id, slot_id)` prevents any duplicate
- New index: `UNIQUE(user_id, slot_id) WHERE status != 'cancelled'` allows reuse

**4. Booking creation fails with permission error**
- Ensure `fix-bookings-rls.sql` has been run
- This adds the missing INSERT policy for bookings table
- Users need permission to insert their own bookings

**5. Refund not created on cancellation**
- Check if API is using service role key for refund creation
- Ensure `fix-pending-refunds-rls.sql` has been run
- Service role policies allow bypass of user-level restrictions

## Security Notes

1. **SECURITY DEFINER Functions**
   - `is_admin()` - Runs with function owner's permissions
   - `handle_new_user()` - Runs with elevated permissions
   - These bypass RLS to avoid circular references

2. **Service Role Access**
   - Used in API routes for system operations
   - Can bypass RLS when necessary
   - Always validate input on API layer

3. **Balance Updates**
   - Users can update their own balance (for booking deductions)
   - Validated in API before applying
   - Admins can update any user's balance
   - All changes logged in transactions table

## Make Yourself Admin

After setup, make your account an admin:

```sql
UPDATE public.users
SET role = 'super_admin'
WHERE email = 'your-email@example.com';
```

## Environment Variables

Required in `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key  # For API routes
```

## Verify Setup

After running the consolidated schema:

```sql
-- Should return all tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Expected tables:
-- audit_logs, auto_booking_logs, bookings, matches, 
-- notifications, pending_refunds, slots, 
-- subscription_cancellations, subscription_templates, 
-- subscriptions, transactions, users
```

## Backup and Recovery

1. **Export Schema**
   ```bash
   pg_dump -s your_db > schema_backup.sql
   ```

2. **Export Data**
   ```bash
   pg_dump -a your_db > data_backup.sql
   ```

3. **Full Backup**
   ```bash
   pg_dump your_db > full_backup.sql
   ```

## Testing Checklist

After setup, verify:
- ✅ Users can create profiles on signup
- ✅ Users can book available slots
- ✅ Balance deducts correctly on booking
- ✅ Users can cancel bookings
- ✅ Pending refunds are created on cancellation
- ✅ Users can undo cancellation (if not yet processed)
- ✅ Admins can update any user's balance
- ✅ Admins can view all bookings and transactions
- ✅ Users can subscribe to templates
- ✅ Subscription counts update automatically

## Support

For issues or questions:
- Check migration files in `sql/migrations/`
- Review RLS policies in `CONSOLIDATED_SCHEMA.sql`
- Verify function definitions
- Check Supabase logs for detailed errors

---

**Last Updated**: 2026-06-12  
**Schema Version**: 2.0 (Consolidated with all fixes)
