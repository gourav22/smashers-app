# Refund Policy - Cancellation & Replacement System

## How It Works

When a member cancels a booking, the refund is **NOT processed immediately**. Instead, it's held in a "pending" state until one of two things happens:

### ✅ Refund Processed (FIFO After Gap Filled)
Refunds are processed **one at a time** in **FIFO order** (First In, First Out), but **ONLY AFTER** the slot fills the gap left by cancellations:

**Example (User's Scenario):**
- Slot has 10 total spots
- 5 people booked (A, B, C, D, E) ← **5/10 original**
- Person A cancels → 4/10 (1 pending refund)
- Person B cancels → 3/10 (2 pending refunds)  
- Person C cancels → 2/10 (3 pending refunds)

**Gap to fill: 10 - 3 cancellations = 7 bookings needed before refunds start**

Bookings come in:
- F books → 3/10 (filling gap, no refund)
- G books → 4/10 (filling gap, no refund)
- H books → 5/10 (filling gap, no refund)
- I books → 6/10 (filling gap, no refund)
- J books → 7/10 (gap filled, no refund yet)
- K books → **8/10** → **Refund A** ✅ (1st to cancel)
- L books → **9/10** → **Refund B** ✅ (2nd to cancel)
- Game time at 9/10 → C forfeits (no 10th booking)

**Formula:**
- Minimum before refunds = total_spots - number_of_cancellations
- Refunds start at: minimum + 1
- Each booking after minimum processes ONE refund (FIFO)

### ❌ Refund Forfeited (No Replacement)
If **NO ONE books the slot before game time**:
1. The pending refund expires at game time
2. Original member forfeits the payment (no refund)
3. Member gets notification: "Refund expired - no replacement found"

## Timeline

```
5/10 booked originally (A, B, C, D, E)
        ↓
A cancels → 4/10 (A pending)
B cancels → 3/10 (A, B pending)
C cancels → 2/10 (A, B, C pending)
        ↓
Gap to fill = 10 - 3 = 7
   (waiting to reach 7/10...)
        ↓
F books → 3/10 (filling gap - no refund)
G books → 4/10 (filling gap - no refund)
H books → 5/10 (filling gap - no refund)
I books → 6/10 (filling gap - no refund)
J books → 7/10 (gap filled - no refund yet)
K books → 8/10 → Refund A ✅ (1st to cancel)
L books → 9/10 → Refund B ✅ (2nd to cancel)
        ↓
Game time at 9/10 → C forfeits ❌ (no 10th booking)

Key Formula:
- Minimum before refunds = total_spots - pending_refunds_count
- Example: 10 - 3 = 7 minimum
- Refunds start at: 7 + 1 = 8/10
- Each booking after 7 processes ONE refund (FIFO)
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
