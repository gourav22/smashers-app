# 🚀 Deployment Checklist

## ✅ Pre-Deployment (Complete These First)

### 1. Database Setup
- [ ] Run `subscription-system.sql` in Supabase SQL Editor
- [ ] Run `subscription-templates.sql` in Supabase SQL Editor
- [ ] Verify tables created:
  ```sql
  SELECT table_name FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name IN ('subscription_templates', 'subscription_cancellations', 'auto_booking_logs');
  ```

### 2. Environment Variables
Add to Vercel/deployment platform:
```env
# Supabase (existing)
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key

# PWA Push Notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key

# Cron Job Security
CRON_SECRET=random-secure-string-abc123xyz

# App Config (optional)
NEXT_PUBLIC_CLUB_NAME=Smashers Club
NEXT_PUBLIC_BOOKING_COST=4
```

### 3. Generate Production Icons
- [ ] Visit: https://realfavicongenerator.net/
- [ ] Upload: `public/icons/icon.svg`
- [ ] Download PNG files
- [ ] Replace placeholder PNGs in `public/icons/`

---

## 🔧 Deployment Steps

### Option A: Vercel (Recommended)

1. **Connect Repository**
   - Go to vercel.com
   - Import your GitHub repository
   - Select the `sports-club-app` project

2. **Configure Environment Variables**
   - In Vercel dashboard → Settings → Environment Variables
   - Add all variables from section 2 above

3. **Add Cron Job**
   Create `vercel.json` in project root:
   ```json
   {
     "crons": [{
       "path": "/api/cron/auto-book-subscriptions",
       "schedule": "0 0 * * *"
     }]
   }
   ```
   Commit and push:
   ```bash
   git add vercel.json
   git commit -m "Add Vercel cron for auto-booking"
   git push
   ```

4. **Deploy**
   - Vercel auto-deploys on push to main
   - Or click "Deploy" button in dashboard

### Option B: Other Platforms

Follow similar steps for:
- **Netlify**: Add env vars, use Netlify Functions for cron
- **Railway**: Add env vars, use external cron service
- **DigitalOcean App Platform**: Add env vars, use cron-job.org

---

## ✅ Post-Deployment Testing

### 1. Test Basic App
- [ ] Visit: https://yourapp.com
- [ ] Landing page loads
- [ ] Can register/login
- [ ] Dashboard loads properly
- [ ] Dark mode works

### 2. Test Subscription System
- [ ] Visit: `/subscription-templates` (as admin)
- [ ] Create a test template
- [ ] Visit: `/subscription` (as member)
- [ ] See the template
- [ ] Subscribe (with sufficient balance)
- [ ] Verify in database:
  ```sql
  SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT 1;
  ```

### 3. Test PWA Features
- [ ] Check service worker registers (DevTools → Application)
- [ ] Try "Add to Home Screen" on mobile
- [ ] Test offline mode (DevTools → Network → Offline)
- [ ] Dark mode toggle works
- [ ] Install prompt appears (wait 30 seconds)

### 4. Test Cron Job
**Manual trigger** (first time):
```bash
curl -X POST https://yourapp.com/api/cron/auto-book-subscriptions \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Check logs:
```sql
SELECT * FROM auto_booking_logs ORDER BY created_at DESC LIMIT 10;
```

### 5. Test on Real Devices
- [ ] iPhone (Safari)
- [ ] Android (Chrome)
- [ ] Desktop (Chrome/Firefox)

---

## 📊 Monitoring

### Check These Daily

1. **Auto-booking Success Rate**
   ```sql
   SELECT 
     status,
     COUNT(*) as count
   FROM auto_booking_logs
   WHERE created_at > NOW() - INTERVAL '7 days'
   GROUP BY status;
   ```

2. **Active Subscriptions**
   ```sql
   SELECT 
     COUNT(*) as total,
     sport
   FROM subscriptions
   WHERE status = 'active'
   GROUP BY sport;
   ```

3. **Template Capacity**
   ```sql
   SELECT 
     sport,
     day_of_week,
     slot_time,
     current_subscribers || '/' || max_subscribers as capacity,
     status
   FROM subscription_templates
   ORDER BY sport, day_of_week, slot_time;
   ```

---

## 🐛 Common Issues

### Service Worker Not Working
**Symptom**: Offline mode doesn't work
**Fix**: 
- Check HTTPS (required)
- Clear cache and hard reload
- Verify service worker registered in DevTools

### Push Notifications Failing
**Symptom**: Users don't receive notifications
**Fix**:
- Verify VAPID keys in env vars
- Check user granted permission
- Test in supported browsers (Chrome, Firefox, Edge)

### Auto-booking Not Running
**Symptom**: Subscriptions not auto-booking
**Fix**:
- Verify cron job configured
- Check cron job ran (Vercel logs)
- Verify slots exist for subscription days/times
- Check `auto_booking_logs` table

### Template Subscriber Count Wrong
**Symptom**: Count doesn't match actual subscriptions
**Fix**:
```sql
-- Reset counts
UPDATE subscription_templates SET current_subscribers = (
  SELECT COUNT(*)
  FROM subscriptions
  WHERE template_id = subscription_templates.id
    AND status IN ('active', 'paused')
);
```

---

## 🔄 Updates & Maintenance

### Add New Template
1. Admin goes to `/subscription-templates`
2. Click "+ Create New Template"
3. Fill form and create
4. **Important**: Create weekly slots matching the template!

### Create Weekly Slots
Members subscribed to templates need matching slots:

```sql
-- Example: Create Tuesday 18:00 slots for next 8 weeks
INSERT INTO slots (date, time, sport, location, total_spots, status, created_by)
SELECT
  date_series::date,
  '18:00:00'::time,
  'badminton',
  'Court A',
  10,
  'open',
  (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)
FROM generate_series(
  CURRENT_DATE + INTERVAL '1 week',
  CURRENT_DATE + INTERVAL '8 weeks',
  INTERVAL '1 week'
) AS date_series
WHERE EXTRACT(DOW FROM date_series) = 2; -- Tuesday
```

### Update VAPID Keys
If keys need rotation:
1. Generate new keys: `npx web-push generate-vapid-keys`
2. Update env vars on Vercel
3. Redeploy
4. Users will need to re-enable notifications

---

## 📈 Success Metrics

Track these to measure success:

- **Subscription Conversion**: Adhoc → Regular members
- **Auto-booking Success Rate**: Target >95%
- **PWA Install Rate**: Track via analytics
- **User Retention**: Regular members vs adhoc
- **Template Utilization**: Which slots are most popular

---

## 📞 Support

### For Users
- How to install: Send PWA-SETUP.md
- How to subscribe: Send SUBSCRIPTION-TEMPLATES-GUIDE.md
- How to cancel: 7 days advance via subscription page

### For Admins
- Template management: /subscription-templates
- Monitor logs: SQL queries above
- Troubleshooting: This checklist

---

## ✅ Final Check

Before going live:
- [ ] All SQL migrations run
- [ ] Environment variables set
- [ ] Cron job configured
- [ ] Production icons generated
- [ ] Tested on real devices
- [ ] Created 3-5 test templates
- [ ] Created slots for next 4 weeks
- [ ] Tested full subscribe → auto-book → cancel flow
- [ ] Monitoring queries bookmarked

---

**Your app is production-ready!** 🎉

Deploy and monitor the first week closely to catch any issues early.
