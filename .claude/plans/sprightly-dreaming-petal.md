# Fix Refund Logic: Correct Capacity Calculation

## Context

The current refund system has an incorrect capacity calculation. When users cancel bookings, the system currently calculates "original capacity" as `current bookings + pending refunds`, which is wrong.

**Current Wrong Logic:**
- 5/10 booked
- A, B, C cancel → 2/10 booked
- Original capacity = 2 + 3 = 5 ✗ WRONG
- Refunds start at 6/10

**Correct Logic (User's Example):**
- 5/10 booked originally
- A, B, C cancel → 2/10 booked
- Original capacity = 5 (the number that WAS booked before cancellations)
- Need to reach (10 - 3 cancellations) = 7/10 first
- Then: 8/10 → Refund A, 9/10 → Refund B, 10/10 → Refund C (if reached)

## The Problem

The formula `originalCapacity = updatedBookedIds.length + numberOfPendingRefunds` is calculated AFTER the new booking is added, so it's always inflated by 1.

**Example showing the bug:**
- Start: 5/10 booked
- A, B, C cancel → 2/10
- D books (3rd person) → updatedBookedIds = 3
- numberOfPendingRefunds = 3
- originalCapacity = 3 + 3 = 6 ✗ (Should be 5!)
- hasExceededOriginalCapacity = 3 > 6 = false ✓ (Correct result but wrong calculation)

The calculation happens to work sometimes by accident, but it's conceptually wrong and fails in edge cases.

## Correct Approach

**Original capacity should be calculated BEFORE the new booking:**
```
originalCapacity = (currentBookings - 1) + numberOfPendingRefunds
```

OR better yet, **track the capacity at cancellation time** by storing it in the `pending_refunds` table.

## Recommended Solution

### Option 1: Fix the calculation (Simple)
Change the formula to calculate based on the state BEFORE the new booking:
```typescript
const originalCapacity = (updatedBookedIds.length - 1) + numberOfPendingRefunds;
```

### Option 2: Store original capacity (Better, more explicit)
Add `original_capacity` column to `pending_refunds` table and store it when user cancels.

**I recommend Option 1 for simplicity** - just fix the math.

## Implementation Plan

### File: `src/app/api/bookings/create/route.ts`

**Current code (line ~237):**
```typescript
const originalCapacity = updatedBookedIds.length + numberOfPendingRefunds;
```

**Change to:**
```typescript
// updatedBookedIds includes the user we just added, so subtract 1 to get state before this booking
const originalCapacity = (updatedBookedIds.length - 1) + numberOfPendingRefunds;
```

**Update the logic comment (line ~242):**
```typescript
// Example: Had 5/10 booked, 3 cancelled → 2/10
// After 3rd booking → 3/10, original was 5, so no refund yet (3 <= 5)
// Need to reach (total_spots - numCancellations) before refunds start
// Then 6/10 → still filling gap, 7/10 → reached pre-cancellation level
// 8/10 → Refund 1st person, 9/10 → Refund 2nd, 10/10 → Refund 3rd
```

### Verification Logic

**The refund should trigger when:**
```
currentBookings > (total_spots - numberOfPendingRefunds)
```

Which simplifies to:
```
currentBookings + numberOfPendingRefunds > total_spots
```

So we need to add an additional check:

```typescript
// Only process refunds after we've filled the gap left by cancellations
// Example: 10 total, 3 cancelled means we need to reach 8/10 before any refunds
const minimumBookingsBeforeRefunds = slot.total_spots - numberOfPendingRefunds;
const hasReachedMinimum = updatedBookedIds.length > minimumBookingsBeforeRefunds;

if (hasReachedMinimum && numberOfPendingRefunds > 0) {
  // Process ONE refund (FIFO)
}
```

## Test Scenario (User's Example)

**Setup:**
- 10 total spots
- 5 people booked (A, B, C, D, E)
- A, B, C cancel → 2 booked (D, E remain)
- 3 pending refunds

**Expected behavior:**
1. F books → 3/10 - No refund (need to reach 7/10)
2. G books → 4/10 - No refund
3. H books → 5/10 - No refund
4. I books → 6/10 - No refund
5. J books → 7/10 - No refund (just reached minimum)
6. K books → **8/10** → **Refund A** ✅ (1st to cancel)
7. L books → **9/10** → **Refund B** ✅ (2nd to cancel)
8. Game time with 9/10 → C forfeits (no refund)

**Calculation:**
- Minimum before refunds = 10 - 3 = 7
- Refunds start at 8/10 (7 + 1)
- Each booking after 7 processes one refund

## Files to Modify

1. **`src/app/api/bookings/create/route.ts`** (lines ~222-320)
   - Fix capacity calculation
   - Update refund trigger logic
   - Improve logging messages

2. **`docs/REFUND-POLICY.md`**
   - Update example to match user's scenario
   - Clarify the "gap filling" concept

3. **`memory/project_refund_policy.md`**
   - Update with correct formula and example

## Verification

After implementation, test with the exact user scenario:
1. Create slot with 10 spots
2. Book 5 spots
3. Cancel 3 bookings
4. Book new people one by one
5. Verify refunds trigger at 8th, 9th booking (not before)
6. Check console logs show correct capacity calculations
