# Deployment Guide

## Prerequisites

1. **Supabase Project** - Already set up with database schema
2. **Vercel Account** - Free tier works perfectly
3. **GitHub Repository** - To connect with Vercel

## Step 1: Prepare for Deployment

### 1.1 Update Environment Variables

Create a list of all environment variables needed:

```env
# Supabase (Public)
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Supabase (Server-side - for API routes)
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App Configuration
NEXT_PUBLIC_CLUB_NAME=Smashers Club
NEXT_PUBLIC_BOOKING_COST=4
NEXT_PUBLIC_WAITLIST_MAX=10
NEXT_PUBLIC_SPORTS=badminton,cricket
NEXT_PUBLIC_DEFAULT_ELO=1200
NEXT_PUBLIC_ELO_GRADE_A=1600
NEXT_PUBLIC_ELO_GRADE_B=1400
NEXT_PUBLIC_ELO_GRADE_C=1200
NEXT_PUBLIC_CURRENCY_SYMBOL=€
```

### 1.2 Get Supabase Service Role Key

1. Go to Supabase Dashboard
2. Project Settings → API
3. Copy the **service_role** key (keep it secret!)
4. Add it to `.env.local` for testing:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   ```

## Step 2: Push to GitHub

```bash
# Initialize git if not already done
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Sports Club MVP"

# Create GitHub repo and push
gh repo create sports-club-app --public --source=. --remote=origin --push
# OR manually:
git remote add origin https://github.com/YOUR-USERNAME/sports-club-app.git
git branch -M main
git push -u origin main
```

## Step 3: Deploy to Vercel

### Option A: Via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Add environment variables (one by one)
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
# ... add all other env vars

# Deploy to production
vercel --prod
```

### Option B: Via Vercel Dashboard

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Configure Project:
   - **Framework Preset:** Next.js
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`

4. Add Environment Variables:
   - Click "Environment Variables"
   - Add all variables from `.env.local`
   - **IMPORTANT:** Add `SUPABASE_SERVICE_ROLE_KEY` for API routes

5. Click "Deploy"

## Step 4: Verify Deployment

### 4.1 Check Build Logs
- Watch the deployment logs in Vercel dashboard
- Look for any errors

### 4.2 Test Core Features
1. Visit your deployed URL (e.g., `https://your-app.vercel.app`)
2. Test authentication:
   - Register a new user
   - Verify email
   - Login
3. Test dashboard loads correctly
4. Test booking a slot
5. Test creating a match
6. Test leaderboard

### 4.3 Common Issues

**Issue: "Invalid API key"**
- Solution: Check environment variables are set correctly in Vercel
- Redeploy after adding missing variables

**Issue: "Database connection failed"**
- Solution: Verify Supabase URL and keys are correct
- Check Supabase project is not paused

**Issue: "API route errors"**
- Solution: Make sure `SUPABASE_SERVICE_ROLE_KEY` is set
- This is needed for server-side operations

## Step 5: Custom Domain (Optional)

1. Buy domain (e.g., from Namecheap, GoDaddy)
2. In Vercel Dashboard:
   - Go to Project → Settings → Domains
   - Add your domain
   - Follow DNS configuration instructions
3. Add DNS records at your domain provider:
   - Type: `A`, Name: `@`, Value: `76.76.21.21`
   - Type: `CNAME`, Name: `www`, Value: `cname.vercel-dns.com`

## Step 6: Enable PWA Features

### 6.1 Generate PWA Icons

1. Go to https://realfavicongenerator.net/
2. Upload your club logo (512x512px minimum)
3. Generate icons for all sizes
4. Download and place in `/public/icons/`
5. Commit and push:
   ```bash
   git add public/icons/
   git commit -m "Add PWA icons"
   git push
   ```

### 6.2 Test PWA Installation

1. Open your deployed site on mobile
2. Should see "Add to Home Screen" prompt
3. Install and verify it works offline (for cached pages)

## Step 7: Supabase Production Settings

### 7.1 Enable Email Confirmation (if disabled for testing)

1. Supabase Dashboard → Authentication → Settings
2. Toggle ON "Enable email confirmations"
3. Save

### 7.2 Configure Email Templates

1. Supabase → Authentication → Email Templates
2. Customize confirmation email
3. Set redirect URL to your production domain

### 7.3 Add Production URL to Allowed Redirect URLs

1. Supabase → Authentication → URL Configuration
2. Add your production URLs:
   - `https://your-app.vercel.app/*`
   - `https://yourdomain.com/*` (if custom domain)

## Step 8: Monitoring & Maintenance

### 8.1 Set Up Monitoring

**Vercel Analytics (Free)**
- Already included with Vercel
- View in Vercel Dashboard → Analytics

**Supabase Monitoring**
- Supabase Dashboard → Database → Logs
- Monitor API usage, errors, and performance

### 8.2 Regular Maintenance Tasks

**Weekly:**
- Check error logs in Vercel and Supabase
- Monitor user feedback
- Review database size and performance

**Monthly:**
- Database backup verification (Supabase auto-backs up)
- Review and optimize slow queries
- Update dependencies:
  ```bash
  npm outdated
  npm update
  ```

## Cost Breakdown (Production)

**Supabase:**
- Free tier: Up to 500MB database, 2GB bandwidth
- Pro tier: €25/month (for 200+ users)

**Vercel:**
- Free tier: Unlimited bandwidth, 100GB bandwidth
- Pro tier: €20/month (optional, for custom domain features)

**Domain:**
- €10-15/year

**Total: €25-45/month for 200+ users**

## Rollback Plan

If something goes wrong:

1. **Instant Rollback in Vercel:**
   - Vercel Dashboard → Deployments
   - Find last working deployment
   - Click "..." → "Promote to Production"

2. **Database Rollback:**
   - Supabase auto-backs up daily
   - Dashboard → Database → Backups
   - Restore from backup if needed

## Security Checklist

Before going live:

- [ ] All environment variables set correctly
- [ ] `SUPABASE_SERVICE_ROLE_KEY` never exposed to client
- [ ] Email verification enabled in Supabase
- [ ] RLS policies tested and working
- [ ] No test/debug code in production
- [ ] HTTPS enforced (automatic with Vercel)
- [ ] Sensitive files in `.gitignore` (already configured)

## Support

**Vercel Issues:**
- https://vercel.com/support

**Supabase Issues:**
- https://supabase.com/support

**App Issues:**
- Check `/TESTING-GUIDE.md` for troubleshooting
- Review build logs in Vercel
- Check Supabase logs for database errors

---

## Quick Deploy Checklist

- [ ] Supabase project set up with schema
- [ ] Service role key obtained
- [ ] Code pushed to GitHub
- [ ] Vercel project created
- [ ] All environment variables added
- [ ] First deployment successful
- [ ] Test user registered and working
- [ ] Core features tested
- [ ] PWA icons generated (optional)
- [ ] Custom domain configured (optional)
- [ ] Email confirmation enabled
- [ ] Production URLs added to Supabase

**Estimated Time: 30-45 minutes**

🎉 **You're live!**
