# Available Routes

## Public Routes
- `/` - Landing page
- `/register` - Sign up
- `/login` - Sign in

## Member Routes (after login)
- `/dashboard` - Main dashboard
- `/slots` - View and book slots
- `/bookings` - Your bookings
- `/matches` - View matches (redirects to /matches/create if empty)
- `/matches/create` - Create a new match
- `/leaderboard` - Rankings
- `/achievements` - Your achievements
- `/settings` - Account settings
- `/subscription` - View and subscribe to templates

## Admin Routes (super_admin only)
- `/members` - Manage all members
- `/slots/create` - Create new slots
- `/subscription-templates` - Create/manage subscription templates

## API Routes
- `/api/bookings/create`
- `/api/bookings/cancel`
- `/api/matches/create`
- `/api/matches/confirm`
- `/api/matches/approve`
- `/api/subscriptions/*`
- `/api/cron/auto-book-subscriptions`
- `/api/widgets/leaderboard`
- `/api/widgets/stats`
