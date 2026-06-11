# Subscription Templates System - Complete Guide

## 🎯 How It Works Now

### **Old System** (Before)
- Members could choose ANY day and time
- Created custom subscriptions
- No admin control over available slots

### **New System** (Template-Based)
- ✅ **Admin creates templates** - specific day/time/location combinations
- ✅ **Members subscribe to templates** - can only choose from available options
- ✅ **Limited spots** - each template has max subscribers
- ✅ **Admin controls** - can pause/activate templates

---

## 📋 Setup Steps

### 1. Run Database Migration
```bash
# In Supabase SQL Editor, run:
/Users/rajgou/All details adidas/Work/test/sports-club-app/subscription-templates.sql
```

This creates:
- `subscription_templates` table
- Adds `template_id` column to `subscriptions`
- Auto-updates subscriber counts
- Sample templates (commented out)

### 2. Create Templates (Admin)
Visit: http://localhost:3000/subscription-templates

**Admin creates templates like:**
- Tuesday 18:00 Badminton at Court A (max 10 people)
- Thursday 19:00 Cricket at Main Ground (max 20 people)
- Saturday 10:00 Badminton at Court B (max 12 people)

### 3. Members Subscribe
Visit: http://localhost:3000/subscription

Members see only the templates admin created and subscribe to available ones.

---

## 👥 User Workflows

### **Admin (Slot Manager)**
1. Go to `/subscription-templates`
2. Click "+ Create New Template"
3. Fill form:
   - Sport: Badminton or Cricket
   - Day: Monday - Sunday
   - Time: e.g., 18:00
   - Location: e.g., "Court A"
   - Max Subscribers: e.g., 10
   - Price: e.g., €4/week
   - Description: e.g., "Intermediate level"
4. Click "Create Template"

**Template appears in members' subscription page!**

### **Regular Members**
1. Go to `/subscription`
2. See available templates (created by admin)
3. Click "Subscribe" on desired slot
4. Choose duration (3, 6, or 12 months)
5. Click "Confirm"
6. Paid upfront, auto-booked every week

### **Adhoc Members**
1. Go to `/slots`
2. See slots for **next week only**
3. Book manually each time

---

## 🔧 Admin Dashboard Link

Add to admin section in dashboard:

```tsx
<Link
  href="/subscription-templates"
  className="bg-white/20 backdrop-blur-sm p-4 rounded-lg text-center font-semibold hover:bg-white/30 transition"
>
  ⚙️ Manage Subscriptions
</Link>
```

---

## 📊 Database Schema

### **subscription_templates**
```sql
- id: UUID
- sport: 'badminton' | 'cricket'
- day_of_week: 0-6 (0=Sunday)
- slot_time: TIME
- location: TEXT
- max_subscribers: INTEGER
- current_subscribers: INTEGER (auto-updated)
- price_per_week: NUMERIC
- available_durations: INTEGER[] (e.g., [3, 6, 12])
- status: 'active' | 'paused' | 'full' | 'cancelled'
- description: TEXT
```

### **subscriptions** (updated)
```sql
- template_id: UUID (new column, references subscription_templates)
- ... (existing columns)
```

---

## 🎯 Key Differences

| Feature | Old System | New System (Templates) |
|---------|------------|------------------------|
| Day/Time selection | Member chooses | Admin controls |
| Available slots | Any combination | Only admin-created templates |
| Capacity control | No limit | Max subscribers per template |
| Admin visibility | Limited | Full control |
| Slot visibility | All future | Admin defines availability |

---

## 💡 Benefits

### For Admin
- **Control**: Only offer slots you want to fill
- **Capacity**: Limit subscribers per slot
- **Flexibility**: Pause templates anytime
- **Visibility**: See which slots are popular

### For Members
- **Clarity**: Only see actually available options
- **Fairness**: First-come-first-served with clear limits
- **Trust**: Know slots are managed properly

---

## 🔄 Auto-Booking

Auto-booking still works! It now:
1. Reads from subscriptions (which have template_id)
2. Gets slot details from template
3. Creates weekly slots as before

**Important**: Admin must create weekly slots matching the templates for auto-booking to work!

---

## 📝 Sample Templates

Create these as examples:

```sql
-- Run in Supabase after running subscription-templates.sql
INSERT INTO public.subscription_templates 
  (sport, day_of_week, slot_time, location, max_subscribers, price_per_week, description, created_by)
VALUES
  ('badminton', 2, '18:00:00', 'Court A', 10, 4.00, 'Tuesday evening - Intermediate level', 
   (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)),
  
  ('badminton', 4, '19:00:00', 'Court A', 10, 4.00, 'Thursday evening - Advanced level', 
   (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)),
  
  ('badminton', 6, '10:00:00', 'Court B', 12, 4.00, 'Saturday morning - All levels welcome', 
   (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)),
  
  ('cricket', 0, '09:00:00', 'Main Ground', 20, 4.00, 'Sunday morning - Match practice', 
   (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)),
  
  ('cricket', 3, '18:30:00', 'Practice Nets', 15, 4.00, 'Wednesday evening - Nets session', 
   (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1));
```

---

## 🎨 UI Features

### Member Subscription Page
- ✅ Shows templates grouped by sport
- ✅ Displays available spots (e.g., "2/10 filled")
- ✅ Shows "Only X left!" warning
- ✅ Duration selector (3, 6, 12 months)
- ✅ Total cost calculator
- ✅ "Fully Booked" state

### Admin Template Page
- ✅ Create new templates
- ✅ View all templates
- ✅ See subscriber count
- ✅ Pause/activate templates
- ✅ Status badges (active/paused/full)

---

## 🚀 Testing

1. **Create template as admin**:
   - Go to `/subscription-templates`
   - Create "Tuesday 18:00 Badminton"

2. **Subscribe as member**:
   - Go to `/subscription`
   - See the Tuesday template
   - Subscribe for 6 months

3. **Check database**:
   ```sql
   SELECT * FROM subscription_templates;
   SELECT * FROM subscriptions WHERE template_id IS NOT NULL;
   ```

4. **Test capacity**:
   - Set max_subscribers = 1
   - Try subscribing with 2 different users
   - Second should see "Fully Booked"

---

## 📞 Support

### Common Questions

**Q: Can members still create custom subscriptions?**
A: No, they can only subscribe to admin-created templates.

**Q: What happens to old subscriptions without template_id?**
A: They still work! template_id is nullable. Old subscriptions continue normally.

**Q: Can admin change template after members subscribe?**
A: No, to avoid disrupting active subscriptions. Pause old template and create new one.

**Q: How do adhoc members see slots?**
A: They go to `/slots` as before, see next week only, book manually.

---

## ✅ Migration Checklist

- [ ] Run `subscription-templates.sql` in Supabase
- [ ] Create 3-5 sample templates as admin
- [ ] Test subscribing as a member
- [ ] Verify subscriber count updates
- [ ] Test "fully booked" state
- [ ] Add admin link to dashboard
- [ ] Update admin documentation

---

**System is ready!** Members can now only subscribe to slots you create and control. 🎉
