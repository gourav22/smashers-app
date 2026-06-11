# Match Confirmation System

## Overview

Matches can be confirmed by **EITHER**:
1. **Opponent players** - Any player from the opposing team
2. **Admins** - Super Admin or Slot Manager

This dual-confirmation system prevents cheating while allowing flexibility.

---

## How It Works

### 1. Match Creation
**Anyone can create a match:**
- Go to `/matches/create`
- Select slot, players, and enter scores
- Submit

**What happens:**
- Match status: `pending_confirmation`
- Notifications sent to all opponent players
- Creator **cannot** confirm their own match

### 2. Match Confirmation (Two Ways)

#### Option A: Opponent Confirmation ✅
**Who:** Any player from the opposing team (not the creator)

**Steps:**
1. Opponent receives notification
2. Goes to `/matches`
3. Reviews the match details
4. Clicks "✅ Confirm Match"

**Result:**
- Match status → `confirmed`
- ELO updated immediately for all players
- Notifications sent to all players

**Example:**
```
Creator: Player A (Team 1)
Opponents: Player B, Player C (Team 2)

Either Player B OR Player C can confirm.
Player A cannot confirm (they created it).
```

#### Option B: Admin Approval 🛡️
**Who:** Super Admin or Slot Manager

**Steps:**
1. Admin goes to `/matches`
2. Sees ALL pending matches (not just their own)
3. Reviews scores
4. Clicks "🛡️ Admin Approve & Update ELO"

**Result:**
- Match status → `confirmed`
- ELO updated immediately for all players
- Notifications sent to all players
- Admin override recorded (`approved_by`, `approved_at`)

**Use cases:**
- When opponents are inactive
- When there's a dispute
- For historical match entry
- Quick processing of multiple matches

---

## Match States

### Pending Confirmation
- Status: `pending_confirmation`
- Shown to: All players + admins
- Actions available:
  - **Opponent players:** Confirm or Reject
  - **Admins:** Admin Approve or Reject
  - **Creator:** Cannot confirm (prevents self-approval)

### Confirmed
- Status: `confirmed`
- ELO updated: ✅
- Shown in match history
- No further actions

### Rejected
- Status: `rejected`
- ELO not updated
- Shown in match history
- No further actions

---

## Notifications

### On Match Creation:
**Sent to:** All opponent players (not the creator)
```
Title: "New Match Confirmation Request"
Message: "You have a new match to confirm"
Action: Link to /matches
```

### On Opponent Confirmation:
**Sent to:** All other players (except confirmer)
```
Title: "Match Confirmed!"
Message: "Your [sport] match has been confirmed and ELO updated."
Action: Link to /matches
```

### On Admin Approval:
**Sent to:** All players
```
Title: "Match Approved by Admin!"
Message: "Your [sport] match has been approved and ELO updated."
Action: Link to /matches
```

---

## UI Display

### For Opponent Players (Can Confirm):
```
┌─────────────────────────────────────────┐
│ Badminton - Singles                     │
│ June 12, 2026 at 18:00                  │
│ [Needs Your Confirmation]               │
│                                         │
│ Your Team    VS    Team 2               │
│ Player A           Player B             │
│    21               18                  │
│                                         │
│ [✅ Confirm Match]  [❌ Reject]         │
└─────────────────────────────────────────┘
```

### For Other Players (Waiting):
```
┌─────────────────────────────────────────┐
│ Badminton - Singles                     │
│ June 12, 2026 at 18:00                  │
│ [Pending Confirmation]                  │
│                                         │
│ Team 1       VS    Your Team            │
│ Player A           Player B             │
│    21               18                  │
│                                         │
│ Waiting for opponent or admin...        │
└─────────────────────────────────────────┘
```

### For Admins (Can Override):
```
┌─────────────────────────────────────────┐
│ Badminton - Singles                     │
│ June 12, 2026 at 18:00                  │
│ [Awaiting Approval]                     │
│                                         │
│ Team 1       VS    Team 2               │
│ Player A           Player B             │
│    21               18                  │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🛡️ Admin Override: You can approve  │ │
│ │ this match even though you're not   │ │
│ │ an opponent                         │ │
│ │ [🛡️ Admin Approve & Update ELO]     │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## Anti-Cheating Features

### 1. Creator Cannot Confirm
- Creator submits the match
- Only opponents or admins can confirm
- Prevents self-approval of fake scores

### 2. Single Confirmation Required
- Only ONE opponent needs to confirm (not all)
- OR one admin can approve
- Faster confirmation process

### 3. Audit Trail
- `created_by` - Who created the match
- `confirmed_by` - Who confirmed it
- `approved_by` - If admin approved
- `approved_at` - When admin approved
- All stored in database

### 4. Admin Visibility
- Admins see ALL matches, not just their own
- Can spot suspicious patterns
- Can intervene in disputes

---

## Technical Details

### API Endpoints

**1. Create Match**
```
POST /api/matches/create
Body: { slotId, matchType, team1, team2, team1Score, team2Score, sport }
Auth: Required (becomes creator)
```

**2. Opponent Confirms**
```
POST /api/matches/confirm
Body: { matchId, userId }
Auth: Required
Validation: User must be opponent (not creator)
Result: Updates ELO immediately
```

**3. Admin Approves**
```
POST /api/matches/approve
Body: { matchId }
Auth: Required (must be admin)
Validation: User must be super_admin or slot_manager
Result: Updates ELO immediately
```

### Database Fields

```sql
CREATE TABLE matches (
  id UUID PRIMARY KEY,
  created_by UUID,              -- Who created
  team1_user_ids UUID[],
  team2_user_ids UUID[],
  team1_score INTEGER,
  team2_score INTEGER,
  status TEXT,                   -- pending_confirmation, confirmed, rejected
  confirmed_by UUID[],           -- Who confirmed (opponent or admin)
  pending_confirmation UUID[],   -- Who needs to confirm
  elo_updated BOOLEAN,           -- Prevents duplicate updates
  approved_by UUID,              -- If admin approved
  approved_at TIMESTAMPTZ,       -- When admin approved
  ...
);
```

---

## Examples

### Example 1: Normal Confirmation
```
1. Player A creates match: A vs B, score 21-18
2. Player B receives notification
3. Player B reviews and confirms
4. ELO updated for both players
5. Both receive confirmation notification
```

### Example 2: Admin Approval
```
1. Player A creates match: A vs B, score 21-18
2. Player B doesn't respond for 24 hours
3. Admin sees pending match
4. Admin reviews and approves
5. ELO updated for both players
6. Both receive admin approval notification
```

### Example 3: Rejection
```
1. Player A creates match: A vs B, score 21-18
2. Player B sees incorrect score
3. Player B rejects the match
4. Match marked as rejected
5. No ELO update
6. Players can discuss and recreate with correct score
```

---

## Benefits

✅ **Prevents Cheating** - Creator can't approve their own matches  
✅ **Fast Confirmation** - Any one opponent can confirm  
✅ **Admin Flexibility** - Admins can override when needed  
✅ **Audit Trail** - Full tracking of who did what  
✅ **Notifications** - Everyone stays informed  
✅ **Dispute Resolution** - Clear rejection workflow  

---

## Future Enhancements (Optional)

1. **Photo Evidence** - Attach scoreboard photos
2. **Challenge Scores** - Challenge confirmed matches within 24h
3. **Automatic Approval** - Auto-approve after 48h if no dispute
4. **Score Limits** - Validate score ranges (e.g., badminton max 30)
5. **Witness System** - Third-party witnesses can confirm

---

## Summary

**Match confirmation is DUAL-PATH:**
- ✅ Opponent confirms → ELO updates
- ✅ Admin approves → ELO updates
- ❌ Creator cannot confirm their own match

**This system ensures fair play while maintaining flexibility!**
