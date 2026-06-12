# Member Subscription System

## Overview

The subscription system allows members to sign up for **regular memberships** where their weekly slot is automatically booked, versus **adhoc members** who book slots manually.

## Features

### Regular Members
- ✅ **Auto-booking**: Slot automatically booked every week
- ✅ **Pre-payment**: Pay upfront for 3, 6, or 12 months
- ✅ **Flexible cancellation**: Cancel any week with 7 days advance notice
- ✅ **Full refund**: Get €4 back when cancelling with proper notice
- ✅ **Guaranteed spot**: Never miss your preferred time slot

### Adhoc Members
- Book slots as needed
- Pay per booking (€4)
- No commitment

---

## Database Schema

Run `subscription-system.sql` in Supabase SQL Editor.

### New Tables

#### `subscriptions`
- Tracks regular memberships
- Fields: sport, day_of_week (0-6), time, start/end dates
- Status: active, paused, cancelled, expired
- Auto-booking toggle

#### `subscription_cancellations`
- Logs weekly cancellations
- Enforces 7-day advance notice
- Tracks refund amounts

#### `auto_booking_logs`
- Logs all auto-booking attempts
- Status: success, failed, slot_not_found, slot_full
- For debugging and transparency

### Updated Tables

#### `users`
Added columns:
- `membership_type`: 'regular' or 'adhoc'
- `subscription_*`: Current subscription details
- `auto_booking_enabled`: Toggle auto-booking

---

## How It Works

### 1. Creating a Subscription

**User Flow:**
1. Navigate to `/subscription`
2. Click "Create Regular Membership"
3. Select: Sport, Day of Week, Time, Duration
4. See total cost (e.g., €104 for 6 months)
5. Confirm and pay from balance

**Backend:**
- Deducts total cost from balance
- Creates subscription record
- Sets user to 'regular' membership type
- Creates transaction record

**API:** `POST /api/subscriptions/create`

### 2. Auto-Booking System

**Cron Job:** `/api/cron/auto-book-subscriptions`

Run daily (recommended: 00:00 UTC) via:
- Vercel Cron Jobs
- GitHub Actions
- Supabase Edge Functions
- External cron service

**Process:**
1. Fetch all active subscriptions
2. Calculate next slot date for each
3. Find matching slot (date/time/sport)
4. Check if slot available
5. Create booking (no charge - already paid)
6. Update slot status
7. Log result

**Results logged:**
- ✅ Success: Booking created
- ❌ Slot not found: Admin needs to create slot
- ⚠️ Slot full: Need more capacity
- ℹ️ Already booked: User manually booked

### 3. Cancelling a Weekly Slot

**User Flow:**
1. View subscription at `/subscription`
2. Find upcoming booking
3. Cancel with 7+ days notice
4. Receive full €4 refund

**Backend:**
- Validates 7-day advance notice
- Cancels booking
- Removes user from slot
- Refunds €4 to balance
- Opens spot for others
- Records cancellation

**API:** `POST /api/subscriptions/cancel-slot`

---

## User Interface

### Subscription Page (`/subscription`)

**Features:**
- View active subscriptions
- Create new subscription
- Toggle auto-booking on/off
- View cancellation history
- See upcoming bookings
- Cancel future slots

**Quick Actions:**
- "Membership" link in dashboard
- Shows balance and cost breakdown
- Duration selector (3/6/12 months)

---

## Admin Management

### Creating Slots for Regular Members

**Important**: Admin must create slots for subscribed days/times!

Example: If members subscribe to "Tuesday 18:00 Badminton":
- Admin creates Tuesday 18:00 slot every week
- Auto-booking system finds and books it
- If slot missing → logged in `auto_booking_logs`

### Monitoring Auto-Booking

**Check logs:**
```sql
SELECT * FROM auto_booking_logs
WHERE status != 'success'
ORDER BY created_at DESC;
```

**Common issues:**
- `slot_not_found`: Create missing slots
- `slot_full`: Increase capacity or split into multiple slots

### Viewing All Subscriptions

**SQL Query:**
```sql
SELECT 
  u.name,
  s.sport,
  s.day_of_week,
  s.time,
  s.status,
  s.start_date,
  s.end_date
FROM subscriptions s
JOIN users u ON u.id = s.user_id
WHERE s.status = 'active'
ORDER BY s.sport, s.day_of_week, s.time;
```

---

## Pricing

### Regular Membership
- **Cost**: €4 per week
- **Duration options**:
  - 3 months: ~13 weeks = €52
  - 6 months: ~26 weeks = €104
  - 12 months: ~52 weeks = €208

### Cancellation Refund
- **Full refund**: €4 per cancelled slot
- **Requirement**: 7 days advance notice
- **Automatic**: Refunded to balance immediately

---

## API Endpoints

### Create Subscription
```
POST /api/subscriptions/create
Body: {
  sport: 'badminton',
  dayOfWeek: 2, // Tuesday
  time: '18:00',
  startDate: '2025-01-01',
  durationMonths: 6,
  pricePerWeek: 4
}
```

### List Subscriptions
```
GET /api/subscriptions/list
Returns: { subscriptions: [...] }
```

### Cancel Weekly Slot
```
POST /api/subscriptions/cancel-slot
Body: {
  subscriptionId: 'uuid',
  slotId: 'uuid',
  slotDate: '2025-01-15',
  reason: 'Going on vacation'
}
```

### Auto-Booking Cron
```
POST /api/cron/auto-book-subscriptions
Headers: Authorization: Bearer CRON_SECRET
```

---

## Environment Variables

```env
# Cron job authentication
CRON_SECRET=your-secure-random-string

# Booking cost (should match subscription price)
NEXT_PUBLIC_BOOKING_COST=4
```

---

## Cron Job Setup

### Vercel Cron

Create `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/auto-book-subscriptions",
    "schedule": "0 0 * * *"
  }]
}
```

### GitHub Actions

`.github/workflows/auto-book.yml`:
```yaml
name: Auto-book Subscriptions
on:
  schedule:
    - cron: '0 0 * * *'
jobs:
  auto-book:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger auto-booking
        run: |
          curl -X POST https://yourapp.com/api/cron/auto-book-subscriptions \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### External Cron Service

Use services like:
- **EasyCron**: https://www.easycron.com/
- **Cron-job.org**: https://cron-job.org/
- **UptimeRobot**: Free monitoring with webhooks

Setup:
- URL: `https://yourapp.com/api/cron/auto-book-subscriptions`
- Method: POST
- Header: `Authorization: Bearer YOUR_CRON_SECRET`
- Schedule: Daily at 00:00 UTC

---

## Testing

### Manual Test Auto-Booking

Development mode:
```bash
curl http://localhost:3000/api/cron/auto-book-subscriptions
```

### Test Subscription Flow

1. Top up balance (€104)
2. Create 6-month subscription
3. Check balance deducted
4. Verify subscription in database
5. Run cron job manually
6. Check booking created
7. Cancel a future slot
8. Verify refund

### Database Queries

**Active subscriptions:**
```sql
SELECT * FROM subscriptions WHERE status = 'active';
```

**Recent auto-bookings:**
```sql
SELECT * FROM auto_booking_logs ORDER BY created_at DESC LIMIT 20;
```

**Cancellations:**
```sql
SELECT * FROM subscription_cancellations ORDER BY cancelled_at DESC;
```

---

## Business Rules

### 7-Day Cancellation Policy

**Why 7 days?**
- Gives others time to book the slot
- Prevents last-minute cancellations
- Industry standard for recurring bookings

**Enforcement:**
- Database constraint
- API validation
- Frontend warning

### Auto-Booking Priority

Regular members get priority:
1. Existing bookings stay
2. Regular members auto-booked
3. Remaining spots for adhoc

### Expired Subscriptions

**Daily cleanup:**
```sql
UPDATE subscriptions
SET status = 'expired'
WHERE status = 'active' AND end_date < CURRENT_DATE;
```

Run via cron or database trigger.

---

## Notifications

**Recommended notifications:**
- ✅ Subscription created
- ✅ Weekly booking confirmed (via auto-book)
- ✅ Cancellation confirmed
- ⚠️ Subscription ending soon (7 days before)
- ⚠️ Auto-booking failed (slot not found)

Use the push notification system in `src/lib/notifications.ts`

---

## Migration Guide

### Converting Existing Members

**Manual update:**
```sql
UPDATE users
SET membership_type = 'regular',
    subscription_start_date = '2025-01-01',
    subscription_end_date = '2025-07-01',
    subscription_sport = 'badminton',
    subscription_day_of_week = 2,
    subscription_time = '18:00'
WHERE email = 'member@example.com';

-- Then create subscription record
INSERT INTO subscriptions (user_id, sport, day_of_week, time, start_date, end_date, total_paid, status)
VALUES (
  (SELECT id FROM users WHERE email = 'member@example.com'),
  'badminton', 2, '18:00', '2025-01-01', '2025-07-01', 104, 'active'
);
```

---

## Support & Maintenance

### Regular Tasks

**Daily:**
- ✅ Run auto-booking cron
- ✅ Check auto-booking logs
- ✅ Expire old subscriptions

**Weekly:**
- Review failed auto-bookings
- Ensure all subscribed slots exist
- Check refund transactions

**Monthly:**
- Subscription renewal reminders
- Capacity planning based on subscriptions

### Troubleshooting

**Problem**: Auto-booking failed
- Check slot exists for that date/time/sport
- Verify slot not full
- Check auto_booking_logs for details

**Problem**: User can't cancel
- Verify 7+ days until slot date
- Check subscription is active
- Confirm booking exists

**Problem**: Refund not processed
- Check user balance updated
- Verify transaction record created
- Check subscription_cancellations table

---

## Future Enhancements

- [ ] Pause subscription (vacation mode)
- [ ] Transfer slot to another member
- [ ] Waitlist for full subscription times
- [ ] Family/group subscriptions
- [ ] Multi-sport subscriptions
- [ ] Dynamic pricing (peak/off-peak)
- [ ] Loyalty rewards for long-term members

---

**Status**: ✅ Subscription system fully implemented and ready for production!

**Manual tasks remaining:**
1. Run `subscription-system.sql` in Supabase
2. Set up cron job for auto-booking
3. Test with a few members first
4. Monitor auto-booking logs
