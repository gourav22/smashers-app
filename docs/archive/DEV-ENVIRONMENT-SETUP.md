# Development Environment Setup

Complete guide to set up your local development environment.

## 🚀 Quick Start (5 Minutes)

### 1. Prerequisites
- Node.js 18+ installed
- Git installed
- Supabase account

### 2. Clone & Install
```bash
git clone https://github.com/gourav22/smashers-app.git
cd smashers-app
npm install
```

### 3. Set Up Development Database

**Option A: Create Separate Dev Supabase Project (Recommended)**
1. Go to https://supabase.com/dashboard
2. Create new project: `sports-club-dev`
3. Wait 2 minutes for setup
4. Run SQL scripts in order:
   - `supabase-setup.sql`
   - `fix-rls-policies.sql`
   - `fix-user-insert-policy.sql`
   - `add-match-approval-fields.sql`
   - `add-user-sports-preference.sql`
   - `multi-club-setup.sql` (optional, for multi-club testing)

**Option B: Use Production Database (Not Recommended)**
- Use same Supabase project
- Risk of corrupting production data
- Only for quick tests

### 4. Configure Environment
```bash
cp .env.development .env.local
```

Edit `.env.local`:
```env
# From Supabase Project Settings → API
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...  # service_role key!

# Dev Club Settings
NEXT_PUBLIC_CLUB_NAME=Dev Club
NEXT_PUBLIC_BOOKING_COST=1  # Cheaper for testing
NEXT_PUBLIC_WAITLIST_MAX=10
NEXT_PUBLIC_SPORTS=badminton,cricket
NEXT_PUBLIC_DEFAULT_ELO=1200
NEXT_PUBLIC_ELO_GRADE_A=1600
NEXT_PUBLIC_ELO_GRADE_B=1400
NEXT_PUBLIC_ELO_GRADE_C=1200
NEXT_PUBLIC_CURRENCY_SYMBOL=€
```

### 5. Disable Email Verification (Dev Only)
1. Supabase Dashboard → Authentication → Settings
2. Scroll to "Email Auth"
3. Toggle **OFF** "Enable email confirmations"
4. Save

This allows you to register multiple test users instantly!

### 6. Start Dev Server
```bash
npm run dev
```

Visit: http://localhost:3000

---

## 👥 Creating Test Users

### Quick Test Users
With email verification disabled:

```bash
# Just register via UI at /register
# Use any email format:
test1@test.com
test2@test.com
admin@test.com
```

No email verification needed!

### Make User Admin
```sql
-- In Supabase SQL Editor
UPDATE public.users
SET role = 'super_admin'
WHERE email = 'admin@test.com';
```

### Add Test Balance
```sql
UPDATE public.users
SET balance = 100
WHERE email = 'test1@test.com';
```

---

## 🧪 Testing Workflows

### Test Match Flow
1. **Create 2 users** (test1, test2)
2. **Make yourself admin** (SQL above)
3. **Add balance** to both users (€100)
4. **Create slot** at `/admin/slots/create`
5. **Both book** the same slot
6. **Create match** (test1 creates vs test2)
7. **Confirm match** (test2 confirms OR admin approves)
8. **Check ELO update** on dashboard
9. **View leaderboard** at `/leaderboard`

### Test Sport Preferences
1. Register user
2. Go to Settings
3. Toggle off cricket
4. Dashboard only shows badminton
5. Toggle back on - both show

### Test Admin Features
1. Make user admin
2. Go to `/admin/members`
3. Edit member balance
4. Go to `/admin/slots/create`
5. Create multiple slots

---

## 🏗️ Multi-Club Development

### Setup Two Clubs Locally

**1. Run multi-club SQL:**
```sql
-- Run multi-club-setup.sql in Supabase
```

**2. Create second club:**
```sql
INSERT INTO public.clubs (name, subdomain, sports, booking_cost)
VALUES ('Rockets Club', 'rockets', ARRAY['badminton'], 5.00);
```

**3. Create users for each club:**
```sql
-- User 1 in Smashers Club (default)
-- Register normally

-- User 2 in Rockets Club
-- Register, then:
UPDATE public.users
SET club_id = (SELECT id FROM public.clubs WHERE subdomain = 'rockets')
WHERE email = 'rocket@test.com';
```

**4. Test isolation:**
- Login as smashers user → see only smashers data
- Login as rockets user → see only rockets data

### Local Subdomain Testing (Optional)

**Add to `/etc/hosts`:**
```
127.0.0.1 smashers.localhost
127.0.0.1 rockets.localhost
```

**Access:**
```
http://smashers.localhost:3000
http://rockets.localhost:3000
```

---

## 🔧 Development Scripts

### Useful Commands

```bash
# Start dev server
npm run dev

# Build for production (test locally)
npm run build
npm start

# Type check
npm run type-check

# Lint
npm run lint

# Format code
npm run format
```

### Database Reset (Dev Only)

```bash
# In Supabase SQL Editor
TRUNCATE public.users, public.slots, public.bookings, 
         public.matches, public.transactions, 
         public.notifications, public.audit_logs 
CASCADE;

# Then re-run setup scripts
```

---

## 📊 Dev Database Seeding

### Seed Test Data

Create `seed-dev-data.sql`:
```sql
-- Create test users
INSERT INTO public.users (id, email, name, balance, sports_played)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'player1@test.com', 'Player One', 100, ARRAY['badminton', 'cricket']),
  ('22222222-2222-2222-2222-222222222222', 'player2@test.com', 'Player Two', 100, ARRAY['badminton', 'cricket']),
  ('33333333-3333-3333-3333-333333333333', 'admin@test.com', 'Admin User', 500, ARRAY['badminton', 'cricket']);

-- Make admin
UPDATE public.users SET role = 'super_admin' WHERE email = 'admin@test.com';

-- Create test slots
INSERT INTO public.slots (date, time, location, sport, total_spots, status)
VALUES
  (CURRENT_DATE + 1, '18:00', 'Court 1', 'badminton', 4, 'open'),
  (CURRENT_DATE + 1, '19:00', 'Court 1', 'cricket', 10, 'open'),
  (CURRENT_DATE + 2, '18:00', 'Court 2', 'badminton', 4, 'open');
```

Run in Supabase SQL Editor.

---

## 🐛 Debugging

### Check Logs

**Browser Console:**
- F12 → Console tab
- Look for errors

**Next.js Server:**
- Terminal where `npm run dev` is running
- Server-side errors show here

**Supabase Logs:**
- Dashboard → Logs
- API, Database, Auth tabs

### Common Issues

**Issue: "Invalid API key"**
```bash
# Check .env.local
cat .env.local

# Restart dev server
# Press Ctrl+C
npm run dev
```

**Issue: "Table doesn't exist"**
- Re-run SQL setup scripts in order
- Check Supabase SQL Editor for errors

**Issue: "User not found"**
- Check if profile exists:
```sql
SELECT * FROM public.users WHERE email = 'your@email.com';
```

**Issue: Build fails**
- Clear Next.js cache:
```bash
rm -rf .next
npm run dev
```

---

## 🔄 Syncing with Production

### Pull Production Schema
```bash
# Backup production schema
# In production Supabase SQL Editor:
SELECT * FROM information_schema.tables WHERE table_schema = 'public';

# Export table structures
```

### Update Dev Database
1. Note schema changes in production
2. Create migration SQL file
3. Test in dev
4. Apply to production

---

## 🎨 Development Tips

### Hot Reload
- File changes auto-reload
- No need to restart server
- Except `.env.local` changes (restart needed)

### Fast Iteration
1. Disable email verification
2. Use simple test emails
3. Keep SQL Editor open for quick fixes
4. Use browser dev tools

### Code Quality
```bash
# Before committing
npm run build  # Check for errors
npm run lint   # Check code style
```

### VS Code Extensions (Recommended)
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- Supabase extension

---

## 📝 Environment Files

### `.env.local` (Your local config - NOT committed)
```env
NEXT_PUBLIC_SUPABASE_URL=https://dev.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

### `.env.development` (Template - committed)
```env
# Template with placeholders
# Copy to .env.local and fill in
```

### `.env.local.example` (Shared template - committed)
```env
# For new developers
# Shows required variables
```

---

## 🚀 Ready to Develop!

**Your dev environment is set up when:**
- ✅ `npm run dev` starts without errors
- ✅ http://localhost:3000 loads
- ✅ Can register new users
- ✅ Can login successfully
- ✅ Dashboard shows stats
- ✅ Can create slots (as admin)

**Next steps:**
- Create test users
- Test core workflows
- Start building features!

---

## 📞 Getting Help

**Check documentation:**
- `README.md` - Project overview
- `QUICK-START.md` - Quick setup
- `TESTING-GUIDE.md` - Testing tips

**Common commands:**
```bash
npm run dev          # Start dev server
npm run build        # Test production build
git status           # Check changes
git pull             # Get latest code
```

Happy coding! 🎉
