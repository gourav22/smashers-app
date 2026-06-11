# Quick Reference Card

## 🚀 5-Minute Setup

```bash
# 1. Run database migration
# In Supabase SQL Editor: subscription-system.sql

# 2. Generate VAPID keys
npx web-push generate-vapid-keys

# 3. Add to .env.local
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
CRON_SECRET=random-secure-string

# 4. Install & run
npm install
npm run dev
```

## 📦 Import Cheatsheet

```tsx
// Components
import { PullToRefresh } from '@/components/PullToRefresh';
import { NotificationPrompt } from '@/components/NotificationPrompt';
import { InstallPrompt } from '@/components/InstallPrompt';
import { ShareButton } from '@/components/ShareButton';
import { ThemeProvider, useTheme } from '@/components/ThemeProvider';
import { ThemeToggle } from '@/components/ThemeToggle';
import { 
  SkeletonCard, SkeletonRow, SkeletonStats, 
  SkeletonDashboard, SkeletonLeaderboard, SkeletonSlots 
} from '@/components/Skeleton';

// Utilities
import { Haptics } from '@/lib/haptics';
import { MatchShareTemplates, shareOrCopy } from '@/lib/share';
import { 
  showNotification, 
  NotificationTemplates,
  subscribeToPushNotifications 
} from '@/lib/notifications';
import { applyTheme, toggleTheme } from '@/lib/theme';
```

## 🎯 One-Liners

### Loading States
```tsx
if (loading) return <SkeletonDashboard />;
```

### Haptic Feedback
```tsx
Haptics.success(); // or .error(), .tap(), .bookSlot(), .matchWin()
```

### Share Button
```tsx
<ShareButton data={MatchShareTemplates.victory('badminton', '21-18', 1450, 'B')} />
```

### Pull-to-Refresh
```tsx
<PullToRefresh onRefresh={async () => await loadData()}>
  {children}
</PullToRefresh>
```

### Theme Toggle
```tsx
<ThemeToggle />
```

### Notifications
```tsx
await showNotification(NotificationTemplates.matchApproved(matchId, sport));
```

## 🔧 Key URLs

| Feature | URL | Description |
|---------|-----|-------------|
| Subscriptions | `/subscription` | Manage memberships |
| Widget Stats | `/api/widgets/stats` | User stats API |
| Leaderboard API | `/api/widgets/leaderboard` | Rankings API |
| Subscribe | `/api/notifications/subscribe` | Push notifications |
| Auto-booking | `/api/cron/auto-book-subscriptions` | Cron job |

## 📱 PWA Manifest

Already configured in `public/manifest.json`:
- ✅ Icons (all sizes)
- ✅ Theme colors
- ✅ Display mode (standalone)
- ✅ Shortcuts (Book Slot, Leaderboard)

## 🔔 Notification Types

```tsx
NotificationTemplates.matchApproved(matchId, sport)
NotificationTemplates.newSlotAvailable(sport, date)
NotificationTemplates.achievementUnlocked(name)
NotificationTemplates.lowBalance(balance)
NotificationTemplates.matchReminder(sport, time)
NotificationTemplates.slotCancellation(date, refund)
NotificationTemplates.subscriptionRenewal(daysLeft)
```

## 🎨 Haptic Patterns

```tsx
Haptics.tap()           // Light tap
Haptics.success()       // Success pattern
Haptics.error()         // Error pattern
Haptics.bookSlot()      // Booking success
Haptics.matchWin()      // Victory pattern
Haptics.matchLoss()     // Defeat
Haptics.achievementUnlocked()  // Achievement
Haptics.levelUp()       // Grade upgrade
```

## 📤 Share Templates

```tsx
MatchShareTemplates.victory(sport, score, elo, grade)
MatchShareTemplates.defeat(sport, score, elo, grade)
MatchShareTemplates.achievement(name, description)
MatchShareTemplates.leaderboard(rank, sport, elo, grade)
MatchShareTemplates.winStreak(streak, sport?)
```

## 🎭 Theme System

```tsx
const { theme, setTheme, toggleTheme } = useTheme();

setTheme('light');   // or 'dark', 'system'
toggleTheme();       // Toggle light/dark
```

## 💾 Skeleton Types

```tsx
<SkeletonCard />         // Single card
<SkeletonRow />          // List row
<SkeletonStats />        // Stats grid
<SkeletonTable />        // Table with rows
<SkeletonSlot />         // Slot card
<SkeletonDashboard />    // Full dashboard
<SkeletonLeaderboard />  // Full leaderboard
<SkeletonSlots />        // Full slots page
```

## 🔄 Subscription Flow

### Create
```tsx
POST /api/subscriptions/create
{
  sport: 'badminton',
  dayOfWeek: 2,
  time: '18:00',
  startDate: '2025-01-01',
  durationMonths: 6
}
```

### Cancel Slot
```tsx
POST /api/subscriptions/cancel-slot
{
  subscriptionId: 'uuid',
  slotId: 'uuid',
  slotDate: '2025-01-15',
  reason: 'Optional reason'
}
```

### List
```tsx
GET /api/subscriptions/list
```

## ⏰ Cron Job

### Vercel
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/auto-book-subscriptions",
    "schedule": "0 0 * * *"
  }]
}
```

### Manual Trigger (Dev)
```bash
curl http://localhost:3000/api/cron/auto-book-subscriptions
```

### Production
```bash
curl -X POST https://yourapp.com/api/cron/auto-book-subscriptions \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## 🗃️ Database Queries

### Active Subscriptions
```sql
SELECT * FROM subscriptions WHERE status = 'active';
```

### Failed Auto-bookings
```sql
SELECT * FROM auto_booking_logs 
WHERE status != 'success' 
ORDER BY created_at DESC;
```

### Recent Cancellations
```sql
SELECT * FROM subscription_cancellations 
ORDER BY cancelled_at DESC LIMIT 10;
```

## 🐛 Quick Fixes

### Service Worker Not Updating
1. DevTools → Application → Service Workers
2. Click "Unregister"
3. Hard refresh (Cmd+Shift+R)

### Push Notifications Not Working
1. Check HTTPS enabled
2. Verify VAPID keys in .env.local
3. Check browser permissions
4. Test in Chrome/Firefox/Edge

### Dark Mode Not Working
1. Check ThemeProvider wraps app
2. Verify .dark class in CSS
3. Clear localStorage

### Icons Not Showing
1. Generate PNGs from SVG
2. Clear cache
3. Check manifest.json paths

## 📊 Testing Checklist

- [ ] Service worker registers
- [ ] App installs on mobile
- [ ] Push notifications work
- [ ] Dark mode toggles
- [ ] Pull-to-refresh works
- [ ] Haptics vibrate
- [ ] Share button works
- [ ] Skeletons show
- [ ] Subscription creates
- [ ] Auto-booking runs
- [ ] Slot cancellation works
- [ ] Offline mode works

## 🎯 Critical Paths

### First-time Setup
1. Run SQL migration
2. Generate VAPID keys
3. Setup cron job
4. Deploy

### Regular Maintenance
1. Check auto-booking logs (daily)
2. Monitor failed bookings
3. Review subscriptions (weekly)
4. Test on real devices

## 📞 Need Help?

- **PWA Issues**: See `PWA-SETUP.md`
- **Subscription Issues**: See `SUBSCRIPTION-SYSTEM.md`
- **Integration**: See `INTEGRATION-EXAMPLE.tsx`
- **Full Guide**: See `ENHANCEMENTS-SUMMARY.md`

## 🎉 You're Ready!

All features are production-ready. Just:
1. Run the database migration
2. Setup environment variables
3. Deploy and test

That's it! 🚀
