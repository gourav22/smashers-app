# Pre-Commit Code Review

## Context
User requested a review of all modified files before committing to identify potential issues. The codebase contains changes across admin/member pages, API routes, SQL schema, and new migration files.

## Critical Issues Found

### 1. Race Condition in Booking Creation (HIGH PRIORITY)
**File:** `src/app/api/bookings/create/route.ts`
**Issue:** Duplicate booking check removed at lines 99-107. Code now relies solely on database constraint (error code 23505 at line 174) for duplicate detection.
**Risk:** Timing window for race conditions when multiple simultaneous booking requests occur.
**Fix:** Restore early duplicate check before DB operation OR document this is intentional and ensure DB constraint is sufficient.

### 2. String Date Comparison (MEDIUM PRIORITY)
**File:** `src/app/api/subscriptions/create/route.ts`
**Issue:** Lines 55-64 use string comparison for dates (`template.period_start_date > today`) instead of proper date parsing.
**Risk:** Fragile - works for ISO format but could fail with malformed data.
**Fix:** Convert to proper Date object comparison.

### 3. Development Endpoint Security (MEDIUM PRIORITY)
**File:** `src/app/api/dev/create-test-user/route.ts`
**Issue:** Uses service role key with elevated privileges (line 45). While gated by `NODE_ENV !== 'development'` and secret header, this is high-privilege code.
**Risk:** If accidentally deployed to production, could create security vulnerability.
**Fix:** Ensure this directory is excluded from production builds. Add deployment safeguards.

### 4. Subscription Period Constraint Inconsistency (MEDIUM PRIORITY)
**Files:** 
- `sql/migrations/add-subscription-template-periods.sql` (allows NULL periods)
- `src/app/api/subscriptions/templates/route.ts` POST endpoint (line 89: rejects NULL)
- `src/app/(member)/subscription/page.tsx` (line 278: treats NULL as "ongoing")

**Issue:** Schema allows NULL periods, but POST API rejects them. Frontend assumes NULL means "ongoing".
**Fix:** Choose one approach - either require periods in both schema AND API, OR allow NULL consistently across all layers.

## Minor Observations
- UI improvements (notification positioning, link text) - safe changes
- Schema constraint validates date ranges properly
- Error handling for duplicate keys appropriately implemented
- env.example changes appear configuration-related

## Recommendation
**Do NOT commit until:**
1. Issue #1 (race condition) is resolved - either restore check or confirm DB constraint suffices
2. Issue #2 (date comparison) is fixed with proper date parsing
3. Issue #4 (NULL period inconsistency) is addressed - align schema/API/frontend

**Optional but recommended:**
- Add deployment safeguards for dev/ endpoint (#3)
- Verify migration file is production-ready

## Verification
After fixes:
1. Test booking creation with concurrent requests
2. Test subscription template period validation with edge case dates
3. Ensure dev endpoint cannot be reached in production environment
4. Run existing test suite to catch regressions
