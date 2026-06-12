# Vercel Environment Variables Setup

## Important: Vercel Does NOT Use Your Local .env Files\!

Your `.env.local` and `.env.development` files are **ONLY for local development**. Vercel uses its own environment variable system.

## How to Set Environment Variables in Vercel

### Option 1: Vercel Dashboard (Recommended)

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Add each variable below:

### Required Variables

```
NEXT_PUBLIC_SUPABASE_URL
Value: [Your Supabase project URL from dashboard]
Environments: Production, Preview, Development
```

```
NEXT_PUBLIC_SUPABASE_ANON_KEY
Value: [Your Supabase anon key from dashboard]
Environments: Production, Preview, Development
```

```
SUPABASE_SERVICE_ROLE_KEY
Value: [Your Supabase service role key - keep secret\!]
Environments: Production, Preview, Development
```

```
CRON_SECRET
Value: [Generate a random string, e.g., openssl rand -hex 32]
Environments: Production, Preview, Development
```

### Optional Variables (for Push Notifications)

```
NEXT_PUBLIC_VAPID_PUBLIC_KEY
Value: [Generate with: npx web-push generate-vapid-keys]
Environments: Production, Preview, Development
```

```
VAPID_PRIVATE_KEY
Value: [Private key from the command above]
Environments: Production, Preview, Development
```

### Optional App Configuration

```
NEXT_PUBLIC_CLUB_NAME
Value: Smashers Club
Environments: Production, Preview, Development
```

```
NEXT_PUBLIC_BOOKING_COST
Value: 4
Environments: Production, Preview, Development
```

---

## Option 2: Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Link to your project
vercel link

# Add environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add CRON_SECRET
# ... add others
```

---

## After Adding Variables

1. **Redeploy** your project for changes to take effect
2. Go to Deployments → Click on latest deployment → **Redeploy**
3. Or push a new commit to trigger a build

---

## Where to Get Supabase Keys

1. Go to your Supabase project dashboard
2. Click **Settings** (gear icon) → **API**
3. You'll see:
   - **Project URL** → Use for `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → Use for `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role** key (click "Reveal") → Use for `SUPABASE_SERVICE_ROLE_KEY`

---

## Generate VAPID Keys (for Push Notifications)

```bash
npx web-push generate-vapid-keys
```

Copy the output:
- Public key → `NEXT_PUBLIC_VAPID_PUBLIC_KEY`
- Private key → `VAPID_PRIVATE_KEY`

---

## Generate CRON_SECRET

```bash
openssl rand -hex 32
```

Or use any random string generator.

---

## Verify Variables Are Set

After deploying, check the build logs in Vercel:
- If you see errors about missing env vars, they weren't set correctly
- Build should complete successfully once all required vars are added

---

## Common Issues

**Build fails silently after 20 seconds**
- Missing required env vars (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)

**Runtime errors about Supabase**
- Service role key not set or incorrect
- Check the exact variable names (case-sensitive\!)

**Can't access app after deployment**
- Check Runtime Logs in Vercel dashboard
- Verify all env vars are set for "Production" environment
