# Refund Policy - Cancellation & Replacement System

## How It Works

When a member cancels a booking, the refund is **NOT processed immediately**. Instead, it's held in a "pending" state until one of two things happens:

### ✅ Refund Processed (Replacement Found)
If someone new books the cancelled slot **before game time**:
1. The new booking is confirmed
2. The original member gets their refund (€4)
3. Both members get push notifications
   - Original member: "💰 Refund Processed - replacement found!"
   - New booker: Standard booking confirmation

### ❌ Refund Forfeited (No Replacement)
If **NO ONE books the slot before game time**:
1. The pending refund expires at game time
2. Original member forfeits the payment (no refund)
3. Member gets notification: "Refund expired - no replacement found"

## Timeline

```
User cancels booking
        ↓
Refund status: PENDING
        ↓
   (waiting...)
        ↓
  ┌─────┴─────┐
  ↓           ↓
Someone     Game time
books       passes
  ↓           ↓
REFUND    NO REFUND
```

## Why This Policy?

**Prevents abuse:** Members can't cancel at the last minute without consequence

**Fair to club:** Club doesn't lose revenue unless a replacement is found

**Transparent:** Members know upfront that refunds depend on replacements

## Technical Implementation

### Database
- **Table**: `pending_refunds`
- **Status**: pending → processed/expired
- **Expires**: Game date/time (not fixed 12 hours)

### Push Notifications
When slot becomes available (someone cancels):
- ✅ Waitlist members notified
- ✅ Push notification sent to their phone
- Message: "🏸 Slot Available! [Sport] on [Date] at [Time]"

When refund is processed (replacement found):
- ✅ Original member notified
- ✅ Push notification sent
- Message: "💰 Refund Processed - €4 refunded"

### Cron Job
**Route**: `/api/cron/process-expired-refunds`  
**Frequency**: Hourly  
**Purpose**: Mark pending refunds as expired after game time

## Member View

In the bookings page, cancelled bookings show:
- Status: "Cancelled"
- Refund: "Pending (expires [date])" or "Processed" or "Forfeited"
- Clear messaging about replacement requirement

## Admin View

Admins can see:
- All pending refunds
- Expiration times
- Which members are waiting for replacements
