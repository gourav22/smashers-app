# Member Classification: Regular vs Adhoc

## How It Works

Members are automatically classified based on their **subscription status**:

### Regular Members
- **Definition**: Users with an active subscription (`status = 'active'` in `subscriptions` table)
- **Features**:
  - Auto-booking enabled by default
  - Committed to 6, 9, or 12-month period
  - Pay upfront for the subscription
  - Cron job automatically books their slots weekly
  - Can cancel individual weeks with 7+ days notice
  - Lower cost per game (pre-paid)

### Adhoc Members
- **Definition**: Users without an active subscription
- **Features**:
  - Manual booking only (book from `/slots` page)
  - Pay £4 per booking from balance
  - No commitment required
  - Book week-by-week
  - More flexibility but higher cost per game

## Checking Member Type

### Via Database Query

```sql
-- Get all regular members (with active subscriptions)
SELECT 
  u.id,
  u.name,
  u.email,
  s.sport,
  s.day_of_week,
  s.start_date,
  s.end_date,
  'Regular' as member_type
FROM users u
INNER JOIN subscriptions s ON u.id = s.user_id
WHERE s.status = 'active';

-- Get all adhoc members (no active subscriptions)
SELECT 
  u.id,
  u.name,
  u.email,
  'Adhoc' as member_type
FROM users u
WHERE NOT EXISTS (
  SELECT 1 FROM subscriptions s 
  WHERE s.user_id = u.id 
  AND s.status = 'active'
);
```

### Via Members Page

Go to `/members` and see the subscription status for each member.

## Adding Member Type Column (Optional)

If you want a dedicated column instead of checking subscriptions:

```sql
-- Add member_type column
ALTER TABLE users ADD COLUMN member_type TEXT DEFAULT 'adhoc' CHECK (member_type IN ('regular', 'adhoc'));

-- Auto-update when subscription becomes active
CREATE OR REPLACE FUNCTION update_member_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'active' THEN
    UPDATE users SET member_type = 'regular' WHERE id = NEW.user_id;
  ELSIF OLD.status = 'active' AND NEW.status \!= 'active' THEN
    -- Check if user has other active subscriptions
    IF NOT EXISTS (
      SELECT 1 FROM subscriptions 
      WHERE user_id = NEW.user_id 
      AND status = 'active' 
      AND id \!= NEW.id
    ) THEN
      UPDATE users SET member_type = 'adhoc' WHERE id = NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscription_member_type_trigger
AFTER INSERT OR UPDATE OF status ON subscriptions
FOR EACH ROW
EXECUTE FUNCTION update_member_type();
```

## In the UI

Currently the member type is implicit. To show it explicitly:

1. **On dashboard**: Show "Regular Member" badge if user has active subscription
2. **On members page**: Add "Type" column showing Regular/Adhoc
3. **On leaderboard**: Optional filter by member type

## Key Differences Summary

| Feature | Regular | Adhoc |
|---------|---------|-------|
| **Subscription** | Yes (active) | No |
| **Auto-booking** | ✅ Yes | ❌ No |
| **Commitment** | 6-12 months | None |
| **Payment** | Upfront | Per booking |
| **Cancellation** | 7 days notice | Anytime |
| **Cost** | Lower (bulk) | Higher (£4 each) |
| **Flexibility** | Lower | Higher |

## Business Logic

The distinction is important for:
- **Revenue**: Regular members provide predictable income
- **Capacity Planning**: Auto-booking fills slots consistently  
- **User Experience**: Regular members don't need to manually book each week
- **Reports**: Track conversion from adhoc → regular
