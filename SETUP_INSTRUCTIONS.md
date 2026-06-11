# 🚀 Quick Setup Guide (5 minutes)

## Step 1: Create Supabase Project (2 min)

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Name: `sports-club-mvp`
4. Password: (choose strong password)
5. Region: Choose closest to you
6. Click "Create new project"
7. Wait ~2 minutes for provisioning

## Step 2: Set Up Database (1 min)

1. In Supabase dashboard, click "SQL Editor" in left sidebar
2. Click "New query"
3. Copy entire contents of `supabase-setup.sql`
4. Paste and click "Run"
5. Should see: "Database schema created successfully!"

## Step 3: Get API Keys (1 min)

1. Click "Project Settings" (gear icon) in left sidebar
2. Click "API" tab
3. Copy these values:
   - Project URL: `https://xxx.supabase.co`
   - `anon/public` key: `eyJ...` (long string)

## Step 4: Configure Environment (1 min)

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and paste your Supabase values:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```

3. Update club name if desired:
   ```
   NEXT_PUBLIC_CLUB_NAME="Your Club Name"
   ```

## Step 5: Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

## Step 6: Create First Admin User

1. Register at `/register`
2. Verify email
3. In Supabase dashboard → Authentication → Users
4. Find your user, click "..."
5. Edit user
6. Go to SQL Editor and run:
   ```sql
   UPDATE public.users 
   SET role = 'super_admin' 
   WHERE email = 'your@email.com';
   ```

## Done! 🎉

You now have:
- ✅ Authentication system
- ✅ Member dashboard
- ✅ Slot booking
- ✅ Match creation
- ✅ ELO system
- ✅ Admin panel

## Next Steps

- Create some test slots (as admin)
- Register test users
- Book slots
- Create matches
- See ELO updates!

## Troubleshooting

**"Invalid API key"**: Check `.env.local` values match Supabase dashboard

**"Table doesn't exist"**: Re-run `supabase-setup.sql`

**"Cannot connect"**: Restart dev server after editing `.env.local`
