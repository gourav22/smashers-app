# Refund Policy - Cancellation & Replacement System

## How It Works

When a member cancels a booking, the refund is **NOT processed immediately**. Instead, it's held in a "pending" state until one of two things happens:

### ✅ Refund Processed (Slot Becomes Full Again)
If the slot becomes **completely full** again **before game time**:
1. All empty spots must be filled
2. Once the last spot is filled, ALL pending refunds for that slot are processed
3. All original members get their refunds (€4 each)
4. Push notifications sent to all refunded members
   - "💰 Refund Processed - slot is full again!"

**Example:**
- Slot has 10 total spots
- 8 people booked (8/10)
- 2 people cancel → 6/10 booked, 2 pending refunds
- 4 new people book → 10/10 FULL
- **Only then** → Both original members get refunded

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
  ┌─────┴─────────┐
  ↓               ↓
Slot becomes    Game time
FULL again      passes
  ↓               ↓
REFUND        NO REFUND

Example:
- 10 total spots
- 8 booked, 2 cancel → 6/10 (2 pending refunds)
- Need 4 more bookings to reach 10/10
- Once 10/10 → Process both refunds
```

## Why This Policy?

**Prevents abuse:** Members can't cancel at the last minute without consequence

**Fair to club:** Club doesn't lose revenue unless the slot is completely full again

**Incentivizes early booking:** Members encouraged to book early to avoid forfeiting payment

**Transparent:** Members know upfront that refunds require the slot to become full again

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
