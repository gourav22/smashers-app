# Bug Fixes - June 12, 2026

## Issues Fixed

### 1. Booking Creation Failure ✅
**Problem:** When trying to book a slot, it showed "Failed to create booking"
**Root Cause:** Client-side code was trying to access `process.env.NEXT_PUBLIC_BOOKING_COST` which returns `undefined` in the browser (Next.js environment variables need to be available at build time)
**Solution:** Replaced all instances of `process.env.NEXT_PUBLIC_BOOKING_COST` with hardcoded value `4` in client-side booking code

**Files Changed:**
- `src/app/(member)/slots/page.tsx` (lines 78, 145, 281)

**Testing:**
1. Go to `/slots` as a member
2. Click "Book for €4" on any available slot
3. Should successfully create booking and deduct €4 from balance

### 2. Form Field Visibility Issues ✅
**Problem:** In create slot form, date/time/location fields appeared with very light text that was hard to read
**Root Cause:** Input fields were missing explicit text color classes, defaulting to light gray
**Solution:** Added `text-gray-900` class to all input fields and `placeholder:text-gray-400` to text inputs

**Files Changed:**
- `src/app/(admin)/slots/create/page.tsx` (all date, time, location, and number input fields)

**Testing:**
1. Go to `/slots/create` as an admin
2. Check both "Single Slot" and "Bulk Create" modes
3. All input field values should now be clearly visible in dark gray color
4. Calendar pickers for Start Date and End Date should display properly

### 3. Phone Number Registration ✅
**Problem:** Phone number was a simple text field without country code selection
**Requirement:** Split into country selector with India and Netherlands at the top, followed by other countries

**Solution:** 
- Created a custom `PhoneInput` component with country code dropdown
- India (+91) and Netherlands (+31) are shown at the top as priority countries
- Followed by 18 other common countries
- Visual country flags and dial codes
- Stores phone number as "+XX XXXXXXXXX" format

**Files Changed:**
- `src/components/PhoneInput.tsx` (new file)
- `src/app/(auth)/register/page.tsx` (replaced simple input with PhoneInput component)

**Testing:**
1. Go to `/register`
2. Click on the country selector (shows flag and dial code)
3. Verify India 🇮🇳 (+91) and Netherlands 🇳🇱 (+31) appear at the top
4. Verify other countries appear below the separator line
5. Select a country and enter a phone number
6. Should format as: "+91 1234567890" or "+31 6 12345678"

## Additional Notes

- The booking cost is currently hardcoded to €4 in the client-side code
- If you need to change the booking cost in the future, you'll need to either:
  - Update the hardcoded value in `src/app/(member)/slots/page.tsx`
  - OR create a database-driven configuration system
  - OR use Next.js build-time environment variable injection properly

## Debug Logging

Debug logging is now active at: `/Users/rajgou/.claude/debug/d422b913-94c0-4de0-a964-5fcd06b705a1.txt`

If issues persist:
1. Reproduce the issue
2. Check the debug log for [ERROR] and [WARN] entries
3. Check browser console for client-side errors
