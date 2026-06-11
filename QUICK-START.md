# Quick Start Guide

## ⚡ Setup in 5 Minutes

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Supabase

**Run these SQL files in Supabase SQL Editor (in order):**
1. `supabase-setup.sql` - Main database schema
2. `fix-rls-policies.sql` - Fix Row Level Security
3. `fix-user-insert-policy.sql` - Allow user profile creation
4. `add-match-approval-fields.sql` - Add match approval tracking

### 3. Environment Variables
```bash
cp .env.local.example .env.local
# Edit .env.local with your Supabase credentials
```

### 4. Start Dev Server
```bash
npm run dev
```
Visit: http://localhost:3000

---

## 🔑 Make Yourself Admin

After registering, run in Supabase SQL Editor:

```sql
UPDATE public.users
SET role = 'super_admin'
WHERE email = 'your-email@example.com';
```

Refresh your dashboard to see the Admin Panel!

---

## 📖 Documentation

- **ADMIN-SETUP.md** - Complete role management guide
- **README.md** - Project overview
- **TESTING-GUIDE.md** - Troubleshooting
- **DEPLOYMENT.md** - Production deployment
- **COMPLETION-SUMMARY.md** - Full feature list

---

## ⚙️ Match Confirmation System

**Dual Confirmation Paths:**
- ✅ Any member can create a match
- ✅ **Opponent players** can confirm (prevents creator self-approval)
- ✅ **OR Admins** can approve (Super Admin & Slot Manager)
- ✅ ELO updates immediately after confirmation
- ✅ Both parties get notifications

**For Players:**
1. Create match with scores
2. Opponent receives notification
3. Opponent confirms → ELO updates
4. Everyone gets confirmation notification

**For Admins:**
- See ALL pending matches
- Can approve any match (admin override)
- Useful when opponents are inactive
- Full audit trail (who approved, when)

---

## 📱 Main Features

- 🎾 Separate ELO per sport
- 📅 Slot booking (€4 each)
- ⚔️ Match tracking with admin approval
- 🏆 Leaderboard
- 🎖️ Achievements
- 👥 Admin member management
- 🎯 Admin slot creation

---

## 🚀 Next Steps

1. Register and login
2. Make yourself admin (SQL above)
3. Add balance: `UPDATE users SET balance = 100 WHERE email = 'your@email.com'`
4. Create slots at `/admin/slots/create`
5. Test booking flow
6. Deploy to production (see DEPLOYMENT.md)

---

**Ready to go!** 🎉
