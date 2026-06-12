# Multi-Club Setup Guide

This system supports multiple clubs in a single database instance. Each club has isolated data and can have custom settings.

## 🏗️ Architecture

### Database Structure
- **clubs** table: Stores club configuration
- **club_id** field: Added to users, slots, matches, bookings
- **RLS policies**: Ensure data isolation between clubs
- **Subdomain-based**: Each club can have unique subdomain

### Current Implementation
- Single-club mode (default)
- Ready for multi-club expansion
- Data isolation already implemented

---

## 🚀 Setup Instructions

### 1. Run Database Migration

Run `multi-club-setup.sql` in Supabase SQL Editor:
- Creates `clubs` table
- Adds `club_id` to all tables
- Creates default club (Smashers Club)
- Migrates existing data
- Updates RLS policies for isolation

### 2. For Single Club (Current Setup)

**No changes needed!** The system works as before:
- All users belong to default club
- No subdomain routing
- Single club experience

### 3. For Multi-Club Setup (Future)

#### Option A: Subdomain-Based
```
smashers.yourapp.com  → Smashers Club
rockets.yourapp.com   → Rockets Club
eagles.yourapp.com    → Eagles Club
```

#### Option B: Path-Based
```
yourapp.com/smashers  → Smashers Club
yourapp.com/rockets   → Rockets Club
yourapp.com/eagles    → Eagles Club
```

---

## 📝 Adding a New Club

### Via SQL (Quick Method)

```sql
-- 1. Create new club
INSERT INTO public.clubs (name, subdomain, sports, booking_cost)
VALUES (
  'Rockets Sports Club',
  'rockets',
  ARRAY['badminton', 'cricket'],
  5.00  -- €5 per booking
);

-- 2. Get the club_id
SELECT id, name FROM public.clubs WHERE subdomain = 'rockets';

-- 3. Create admin user for the club
-- Users will register normally, then run:
UPDATE public.users
SET club_id = 'CLUB-ID-FROM-ABOVE', role = 'super_admin'
WHERE email = 'admin@rocketsclub.com';
```

### Via Admin UI (Future Enhancement)

Create an admin panel at `/super-admin/clubs` with:
- Create club form
- Edit club settings
- View club stats
- Manage club admins

---

## 🎨 Club Customization

Each club can have unique settings:

```sql
-- Update club settings
UPDATE public.clubs
SET 
  name = 'Custom Club Name',
  logo_url = 'https://example.com/logo.png',
  primary_color = '#FF5733',
  booking_cost = 5.00,
  currency_symbol = '$',
  sports = ARRAY['badminton', 'cricket', 'tennis'],
  grade_thresholds = '{"A": 1700, "B": 1500, "C": 1300}'
WHERE subdomain = 'rockets';
```

### Available Customizations:
- Club name
- Logo URL
- Primary color (brand color)
- Booking cost
- Currency symbol
- Sports offered
- ELO grade thresholds
- Waitlist size
- Default ELO for new members

---

## 🔒 Data Isolation

### Automatic Isolation
- Users only see data from their club
- RLS policies enforce club boundaries
- No code changes needed per club

### How It Works:
```sql
-- Users can only see profiles in their club
CREATE POLICY "Users can view profiles in their club"
ON public.users FOR SELECT
USING (club_id = (SELECT club_id FROM public.users WHERE id = auth.uid()));
```

This applies to:
- ✅ Users
- ✅ Slots
- ✅ Bookings
- ✅ Matches
- ✅ Leaderboard

---

## 🌐 Subdomain Routing (Optional)

### With Vercel

**1. Add Custom Domain**
```
Primary: yourapp.com
Wildcard: *.yourapp.com
```

**2. Update Next.js Middleware**

Create `src/middleware.ts`:
```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const subdomain = hostname.split('.')[0];

  // Skip for localhost
  if (hostname.includes('localhost')) {
    return NextResponse.next();
  }

  // Pass subdomain to app
  const response = NextResponse.next();
  response.cookies.set('club-subdomain', subdomain);
  
  return response;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

**3. Update Auth to Include Club**

Modify registration to assign users to club based on subdomain.

---

## 📊 Club Analytics

### View Club Stats

```sql
-- Get club overview
SELECT 
  c.name,
  c.subdomain,
  COUNT(DISTINCT u.id) as total_members,
  COUNT(DISTINCT s.id) as total_slots,
  COUNT(DISTINCT m.id) as total_matches,
  SUM(u.balance) as total_balance
FROM public.clubs c
LEFT JOIN public.users u ON u.club_id = c.id
LEFT JOIN public.slots s ON s.club_id = c.id
LEFT JOIN public.matches m ON m.club_id = c.id
WHERE c.subdomain = 'smashers'
GROUP BY c.id, c.name, c.subdomain;
```

---

## 🧪 Testing Multi-Club Setup

### Create Test Club

```sql
-- 1. Create test club
INSERT INTO public.clubs (id, name, subdomain, booking_cost)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  'Test Club',
  'testclub',
  3.00
);

-- 2. Create test user
-- Register normally, then:
UPDATE public.users
SET club_id = '00000000-0000-0000-0000-000000000002'
WHERE email = 'test@testclub.com';

-- 3. Verify isolation
-- Login as test@testclub.com
-- Should only see Test Club data, not Smashers Club data
```

---

## 🔄 Migration Path

### Current: Single Club
- ✅ Working now
- ✅ All data in default club
- ✅ No changes to user experience

### Phase 1: Add Clubs Infrastructure
- ✅ Run `multi-club-setup.sql`
- ✅ All existing data migrated
- ✅ System ready for expansion

### Phase 2: Add Second Club (When Needed)
- Create new club via SQL
- Set up subdomain routing
- Add club admin
- Test isolation

### Phase 3: Full Multi-Tenant
- Build super admin panel
- Self-service club creation
- Custom domains per club
- Billing per club

---

## 🛠️ Development Environment

### Local Development

**Option 1: Single Club (Default)**
```bash
# .env.local
NEXT_PUBLIC_CLUB_NAME=Dev Club
# No subdomain needed
```

**Option 2: Multi-Club Testing**
```bash
# Use /etc/hosts for local subdomains
127.0.0.1 smashers.localhost
127.0.0.1 rockets.localhost

# Then access:
http://smashers.localhost:3000
http://rockets.localhost:3000
```

### Separate Supabase Projects

**Development:**
- Project: `sports-club-dev`
- Multiple test clubs
- Test data

**Staging:**
- Project: `sports-club-staging`
- Mirror of production structure
- Pre-release testing

**Production:**
- Project: `sports-club-prod`
- Live clubs
- Real user data

---

## 💡 Best Practices

### 1. Always Use club_id
```typescript
// ❌ Don't
const { data } = await supabase.from('users').select('*');

// ✅ Do - RLS handles it automatically
const { data } = await supabase.from('users').select('*');
// Returns only users from current user's club
```

### 2. Set club_id on Creation
```typescript
// When creating slots, matches, bookings
const { data: user } = await supabase.auth.getUser();
const { data: profile } = await supabase
  .from('users')
  .select('club_id')
  .eq('id', user.id)
  .single();

await supabase.from('slots').insert({
  ...slotData,
  club_id: profile.club_id,
});
```

### 3. Test Data Isolation
- Create two test clubs
- Register users in each
- Verify they can't see each other's data

---

## 🚨 Important Notes

### Existing Deployment
- **No immediate action needed**
- System works as single-club
- Migration is backward-compatible
- Existing data safe

### Before Going Multi-Club
- Run `multi-club-setup.sql`
- Test with second club
- Verify RLS isolation
- Update middleware if using subdomains

### Performance
- club_id indexes created automatically
- RLS policies optimized
- No performance impact on single-club

---

## 📞 Support Scenarios

### Scenario 1: Start Second Club
```sql
INSERT INTO public.clubs (name, subdomain, sports)
VALUES ('New Club', 'newclub', ARRAY['badminton']);

-- Note the new club ID
-- Update first admin user to that club_id
```

### Scenario 2: Merge Clubs
```sql
-- Move all users from club B to club A
UPDATE public.users SET club_id = 'CLUB_A_ID' WHERE club_id = 'CLUB_B_ID';
UPDATE public.slots SET club_id = 'CLUB_A_ID' WHERE club_id = 'CLUB_B_ID';
-- ... repeat for other tables
```

### Scenario 3: White-Label for New Client
1. Create new Vercel project
2. Point to same repo
3. Set environment variables
4. Create club in shared database
5. Each deployment = separate club

---

## ✅ Checklist: Adding a Club

- [ ] Run `multi-club-setup.sql` (first time only)
- [ ] Insert new club record
- [ ] Note the club_id
- [ ] Create admin user
- [ ] Update admin user's club_id
- [ ] (Optional) Set up subdomain
- [ ] Test registration flow
- [ ] Verify data isolation
- [ ] Customize club settings

---

**Status:** ✅ Ready for multi-club expansion when needed!
