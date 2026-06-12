# Admin Quick Start Guide

## ✅ Your Routes (as super_admin)

### Admin-Only Pages
- **`/members`** - Manage all members (edit balance, roles)
- **`/slots/create`** - Create new slots for booking
- **`/subscription-templates`** - Create subscription templates

### Admin Features in Member Pages
- **`/matches`** - View ALL matches + Admin approve button
  - You see "🛡️ Admin Approve & Update ELO" on pending matches
  - This updates ELO ratings and marks match as confirmed
- **`/slots`** - View all slots (everyone sees this)

## 🚀 Getting Started

### 1. Create Your First Slot
1. Go to `/slots/create`
2. Fill in:
   - Date: Tomorrow's date
   - Time: 18:00
   - Location: Court A
   - Sport: Badminton
   - Total Spots: 4
3. Click "Create Slot"

### 2. Create a Subscription Template (Optional)
1. Go to `/subscription-templates`
2. Click "+ Create New Template"
3. Fill in:
   - Sport: Badminton
   - Day: Tuesday
   - Time: 18:00
   - Location: Court A
   - Max Subscribers: 10
   - Price per week: £4
   - Durations: 6, 9, 12 months
4. Create matching weekly slots (see template guide)

### 3. How Match Approval Works

**Player Flow:**
1. Player creates match at `/matches/create`
2. Match status: `pending_confirmation`
3. All players in the match must confirm
4. After all players confirm → still `pending_confirmation`

**Admin Approval (YOU):**
1. Go to `/matches`
2. See "⏳ Pending Confirmation" section
3. Click "🛡️ Admin Approve & Update ELO"
4. Match becomes `confirmed` + ELO ratings update

**Why admin approval?**
- Prevents score manipulation
- Ensures fair ELO ratings
- Resolves disputes

## 📋 Common Tasks

### Give Another User Admin Role
```sql
UPDATE public.users
SET role = 'super_admin'
WHERE email = 'their-email@example.com';
```

### Add Balance to User
Go to `/members` → Find user → Edit balance

### View All Subscriptions
```sql
SELECT 
  u.name,
  s.sport,
  s.day_of_week,
  s.status,
  s.start_date,
  s.end_date
FROM subscriptions s
JOIN users u ON s.user_id = u.id
WHERE s.status = 'active'
ORDER BY s.created_at DESC;
```

## ❓ Troubleshooting

**404 on `/members`?**
- Make sure you're logged in
- Verify you're super_admin: `SELECT role FROM users WHERE email = 'your-email';`
- Try `/dashboard` first, then navigate

**No "Admin Approve" button on matches?**
- Check your role in database
- Refresh the page
- There must be pending matches (status = 'pending_confirmation')

**Can't create slots?**
- Your role must be `super_admin` or `slot_manager`
- Check console for errors (F12)

## 🎯 Next Steps

1. ✅ Create 5-10 test slots for next week
2. ✅ Create 1-2 subscription templates
3. ✅ Test booking flow as a member
4. ✅ Create a test match and approve it
5. ✅ Check leaderboard updates after match approval
