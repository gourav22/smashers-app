# Sports Club Management System

A complete web app for managing badminton and cricket club operations with ELO ratings, slot booking, and match tracking.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Supabase account
- npm or yarn

### Setup (5 minutes)

1. **Install dependencies:**
```bash
npm install
```

2. **Configure Supabase:**
   - Create project at https://supabase.com
   - Run `supabase-setup.sql` in SQL Editor
   - Run `fix-rls-policies.sql` and `fix-user-insert-policy.sql`

3. **Set environment variables:**
```bash
cp .env.local.example .env.local
# Add your Supabase URL and keys
```

4. **Start development server:**
```bash
npm run dev
```

5. **Visit:** http://localhost:3000

### Make Yourself Admin

```sql
-- In Supabase SQL Editor
UPDATE public.users
SET role = 'super_admin'
WHERE email = 'your-email@example.com';
```

See `ADMIN-SETUP.md` for detailed role management.

---

## ✨ Features

### Core Features
- 🎾 **Separate ELO Ratings** - Independent tracking for badminton & cricket
- 📅 **Slot Booking** - €4 per booking with balance management
- 💳 **Member Subscriptions** - Regular vs adhoc members with auto-booking
- ⚔️ **Match Tracking** - Create matches, admin approval required
- 🏆 **Leaderboard** - Sport-specific rankings with grades (A/B/C/D)
- 🎖️ **Achievements** - 13 unlockable badges
- 📊 **Dashboard** - Animated stats with win streaks

### PWA Features (NEW!)
- 📱 **Add to Home Screen** - Install as native app
- 🔔 **Push Notifications** - Match updates, achievements, low balance alerts
- 📴 **Offline Support** - View cached pages without internet
- 🔄 **Pull-to-Refresh** - Native mobile gesture
- 🎨 **Dark Mode** - Auto/light/dark theme options
- 📲 **Share Results** - Share matches to WhatsApp/social media
- 📳 **Haptic Feedback** - Vibration on key actions
- ⚡ **Skeleton Screens** - Better loading states

### Admin Features
- 👥 **Member Management** - Edit users, roles, balances
- 🎯 **Slot Creation** - Easy UI for creating slots
- ⚖️ **Match Approval** - Prevent score disputes
- 📈 **Analytics** - Club stats

---

## 📖 Documentation

- **ADMIN-SETUP.md** - Role management guide
- **TESTING-GUIDE.md** - Local testing
- **DEPLOYMENT.md** - Production deployment
- **SETUP_INSTRUCTIONS.md** - Supabase setup
- **PWA-SETUP.md** - Progressive Web App features & setup
- **SUBSCRIPTION-SYSTEM.md** - Member subscription system guide

---

## 🏗️ Tech Stack

- Next.js 14, TypeScript, Tailwind CSS
- Supabase (PostgreSQL + Auth)
- Framer Motion
- Vercel deployment

---

## 💰 Cost

€25/month for 200-1000 users (10x cheaper than Firebase)

---

**Status:** ✅ Production Ready

Built with ❤️ for sports clubs\!
