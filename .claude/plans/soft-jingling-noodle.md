# Plan: Enable PWA Installation & Complete Notification System

## Context

The user reported two critical issues with the Sports Club app:
1. **No "Add to Home Screen" option on mobile devices** - Despite having PWA infrastructure, users cannot install the app
2. **Notifications not implemented** - Need to verify if notifications work for cancellations, slot availability, etc.

### Current State Analysis

**PWA Installation:**
- ✅ Service worker exists and is properly registered
- ✅ Manifest.json is configured correctly
- ✅ `InstallPrompt` component exists with full functionality
- ❌ **CRITICAL**: `InstallPrompt` component is NEVER imported or rendered anywhere
- ❌ Only SVG icon exists; missing PNG icons in multiple sizes (required for iOS/Android)
- ❌ Missing apple-touch-icon in proper PNG format

**Notification System:**
- ✅ Service worker has push notification handlers
- ✅ Database notifications table exists with proper schema
- ✅ In-app notifications are being created in various API routes
- ✅ `NotificationPrompt` component exists for push subscription opt-in
- ❌ **CRITICAL**: `NotificationPrompt` component is NEVER imported or rendered
- ❌ **CRITICAL**: `push_subscription` column doesn't exist in users table (schema mismatch)
- ❌ **CRITICAL**: `web-push` npm package not in dependencies but code tries to use it
- ❌ No UI to view in-app notifications (no notification center/bell icon)
- ❌ Push notifications cannot be sent due to missing dependencies and schema issues

### Why It's Not Working

1. **PWA Install**: Component exists but isn't loaded, so `beforeinstallprompt` event is never captured
2. **Notifications**: Multiple breaking issues - missing database column, missing npm package, and no UI to display notifications

---

## Implementation Plan

### Phase 1: Fix PWA Installation (Add to Home Screen)

#### 1.1 Add InstallPrompt Component to Layout
**File**: `src/app/layout.tsx`

Import and render the `InstallPrompt` component:
```tsx
import { InstallPrompt } from "@/components/InstallPrompt";

// Inside the body, after ThemeProvider children:
<InstallPrompt />
```

This will enable the beforeinstallprompt event handler and show the custom install banner after 30 seconds.

#### 1.2 Generate PWA Icons in Multiple Sizes
**Directory**: `public/icons/`

Generate PNG icons from the existing SVG:
- 72x72 (favicon)
- 96x96 (favicon)
- 128x128 (Android)
- 144x144 (Android)
- 152x152 (iOS)
- 180x180 (iOS apple-touch-icon)
- 192x192 (Android home screen - required)
- 384x384 (Android splash)
- 512x512 (Android splash - required)

Use existing `icon.svg` as source and generate using image conversion tool.

#### 1.3 Update Manifest.json
**File**: `public/manifest.json`

Add PNG icon entries:
```json
"icons": [
  {
    "src": "/icons/icon-192.png",
    "sizes": "192x192",
    "type": "image/png",
    "purpose": "any maskable"
  },
  {
    "src": "/icons/icon-512.png",
    "sizes": "512x512",
    "type": "image/png",
    "purpose": "any maskable"
  },
  // Keep SVG as fallback
  {
    "src": "/icons/icon.svg",
    "sizes": "any",
    "type": "image/svg+xml"
  }
]
```

#### 1.4 Update Apple Touch Icon Reference
**File**: `src/app/layout.tsx`

Change in the `<head>` section:
```tsx
<link rel="apple-touch-icon" href="/icons/icon-180.png" />
```

---

### Phase 2: Fix Notification System

#### 2.1 Add push_subscription Column to Users Table
**File**: Create `sql/migrations/add-push-subscription-column.sql`

```sql
-- Add push subscription support to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS push_subscription JSONB DEFAULT NULL;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_push_subscription 
ON public.users(id) 
WHERE push_subscription IS NOT NULL;

-- Add comment
COMMENT ON COLUMN public.users.push_subscription IS 'Web Push API subscription object for push notifications';

SELECT 'push_subscription column added successfully!' AS message;
```

Also update `sql/CONSOLIDATED_SCHEMA.sql` to include this column in the users table definition.

#### 2.2 Install web-push Package
**File**: `package.json`

Add to dependencies:
```bash
npm install web-push
npm install --save-dev @types/web-push
```

#### 2.3 Generate VAPID Keys
Create utility script `scripts/generate-vapid-keys.js`:
```javascript
const webpush = require('web-push');
const vapidKeys = webpush.generateVAPIDKeys();
console.log('Public Key:', vapidKeys.publicKey);
console.log('Private Key:', vapidKeys.privateKey);
```

Run once: `node scripts/generate-vapid-keys.js`

Add to `.env.local`:
```
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<public-key>
VAPID_PRIVATE_KEY=<private-key>
VAPID_SUBJECT=mailto:admin@smashersclub.com
```

#### 2.4 Create Push Notification Utility
**File**: `src/lib/push-notifications-server.ts`

Create server-side utility to send push notifications:
```typescript
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// Configure VAPID
webpush.setVapidDetails(
  process.env.VAPID_SUBJECT!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get user's push subscription
  const { data: user } = await supabase
    .from('users')
    .select('push_subscription')
    .eq('id', userId)
    .single();

  if (!user?.push_subscription) return;

  try {
    await webpush.sendNotification(
      user.push_subscription,
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-72.png',
        data: { url: payload.url || '/dashboard' },
      })
    );
  } catch (error) {
    console.error('Push notification failed:', error);
    // If subscription expired, remove it
    if (error.statusCode === 410) {
      await supabase
        .from('users')
        .update({ push_subscription: null })
        .eq('id', userId);
    }
  }
}
```

#### 2.5 Add NotificationPrompt Component to Dashboard
**File**: `src/app/(member)/dashboard/page.tsx`

Import and render after user is loaded:
```tsx
import { NotificationPrompt } from "@/components/NotificationPrompt";

// In the return, after main content:
{user && <NotificationPrompt userId={user.id} />}
```

This will show the notification opt-in prompt after 5 seconds.

#### 2.6 Create Notification Center Component
**File**: `src/components/NotificationCenter.tsx`

Create new component to display in-app notifications:
```tsx
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import Link from 'next/link';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  action_url: string | null;
  created_at: string;
}

export function NotificationCenter({ userId }: { userId: string }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    loadNotifications();
    
    // Real-time subscription
    const subscription = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        () => loadNotifications()
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [userId]);

  const loadNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10);

    if (data) {
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    }
  };

  const markAsRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id);
    loadNotifications();
  };

  const markAllAsRead = async () => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false);
    loadNotifications();
  };

  return (
    <div className="relative">
      {/* Bell Icon Button */}
      <button
        onClick={() => setShow(!show)}
        className="relative p-2 text-gray-600 hover:text-gray-900"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown */}
      {show && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border z-50">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-semibold">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Mark all read
              </button>
            )}
          </div>
          
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No notifications yet
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b hover:bg-gray-50 ${
                    !notification.read ? 'bg-blue-50' : ''
                  }`}
                >
                  {notification.action_url ? (
                    <Link
                      href={notification.action_url}
                      onClick={() => {
                        markAsRead(notification.id);
                        setShow(false);
                      }}
                    >
                      <div className="font-medium text-sm">{notification.title}</div>
                      <div className="text-xs text-gray-600 mt-1">{notification.message}</div>
                      <div className="text-xs text-gray-400 mt-2">
                        {new Date(notification.created_at).toLocaleDateString()}
                      </div>
                    </Link>
                  ) : (
                    <div onClick={() => markAsRead(notification.id)}>
                      <div className="font-medium text-sm">{notification.title}</div>
                      <div className="text-xs text-gray-600 mt-1">{notification.message}</div>
                      <div className="text-xs text-gray-400 mt-2">
                        {new Date(notification.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
```

#### 2.7 Add Notification Center to Dashboard Header
**File**: `src/app/(member)/dashboard/page.tsx`

Import and add to header:
```tsx
import { NotificationCenter } from "@/components/NotificationCenter";

// In header section, next to Settings link:
{user && <NotificationCenter userId={user.id} />}
```

#### 2.8 Fix Existing Notification Sending Code
**Files to update:**
- `src/app/api/bookings/cancel/route.ts`
- `src/app/api/bookings/create/route.ts`

Replace the broken `sendPushNotification` function calls with:
```typescript
import { sendPushToUser } from '@/lib/push-notifications-server';

// When creating notification:
await sendPushToUser(userId, {
  title: 'Booking Confirmed',
  body: 'Your slot has been booked',
  url: '/bookings'
});
```

---

### Phase 3: Verification & Testing

#### 3.1 PWA Installation Testing
**Steps:**
1. Deploy to production or use ngrok/localtunnel for HTTPS
2. Open site on mobile device (iOS Safari or Android Chrome)
3. Wait 30 seconds - should see install prompt banner
4. Click "Install App" - app should install to home screen
5. Launch from home screen - should open in standalone mode (no browser chrome)
6. Verify PWA shortcuts work (Book Slot, Leaderboard)

**Expected Results:**
- Install banner appears after 30 seconds
- Install process completes successfully
- App icon appears on home screen with proper image
- App launches in standalone mode

#### 3.2 Push Notification Testing
**Steps:**
1. Run SQL migration to add push_subscription column
2. Install web-push package
3. Generate VAPID keys and add to .env.local
4. Login to app on mobile
5. Wait 5 seconds - should see notification opt-in prompt
6. Click "Enable" - should grant permission
7. Cancel a booking (triggers notification)
8. Should receive push notification on device
9. Click notification - should open to correct page

**Expected Results:**
- Notification permission prompt appears
- Permission granted successfully
- Push subscription saved to database
- Push notification received when events occur
- Clicking notification navigates to correct page

#### 3.3 In-App Notification Testing
**Steps:**
1. Login to dashboard
2. Look for bell icon in header with notification count
3. Perform action that creates notification (book slot, cancel, etc.)
4. Click bell icon - dropdown should show notification
5. Click notification - should navigate to relevant page
6. Notification should be marked as read
7. Unread count should update

**Expected Results:**
- Bell icon visible with unread count badge
- Notifications appear in dropdown
- Real-time updates when new notifications arrive
- Click navigation works correctly
- Read/unread state updates properly

---

## Critical Files to Modify

### Must Create:
- `sql/migrations/add-push-subscription-column.sql` - Database schema fix
- `src/lib/push-notifications-server.ts` - Server-side push utility
- `src/components/NotificationCenter.tsx` - Notification UI component
- `scripts/generate-vapid-keys.js` - One-time key generation
- `public/icons/icon-72.png` through `icon-512.png` - PWA icons

### Must Modify:
- `src/app/layout.tsx:52` - Add `<InstallPrompt />` after RegisterServiceWorker
- `src/app/layout.tsx:46` - Change apple-touch-icon to PNG
- `src/app/(member)/dashboard/page.tsx` - Add NotificationPrompt and NotificationCenter
- `public/manifest.json:10-16` - Add PNG icon entries
- `sql/CONSOLIDATED_SCHEMA.sql:24` - Add push_subscription column to users table
- `package.json` - Add web-push dependency
- `.env.local` - Add VAPID keys (generate first)
- `src/app/api/bookings/cancel/route.ts` - Replace sendPushNotification with working implementation
- `src/app/api/bookings/create/route.ts` - Replace sendPushNotification with working implementation

### Existing Components to Reuse:
- `src/components/InstallPrompt.tsx` - Already perfect, just needs to be imported
- `src/components/NotificationPrompt.tsx` - Already perfect, just needs to be imported
- `src/lib/notifications.ts` - Client-side notification utilities (working correctly)
- `public/service-worker.js` - Push handlers already implemented

---

## Dependencies

**New packages needed:**
```bash
npm install web-push
npm install --save-dev @types/web-push
```

**Environment variables needed:**
```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=<generated-public-key>
VAPID_PRIVATE_KEY=<generated-private-key>
VAPID_SUBJECT=mailto:admin@smashersclub.com
```

---

## Notes

1. **PWA Icons**: Can use an online tool like https://realfavicongenerator.net/ or ImageMagick to convert SVG to PNG in multiple sizes
2. **VAPID Keys**: Must run generation script ONCE and save keys securely
3. **HTTPS Required**: PWA and push notifications only work over HTTPS (or localhost)
4. **iOS Limitations**: iOS has limited PWA support, may not show custom install prompt (uses native Safari prompt instead)
5. **Database Migration**: Must run SQL migration before notification features will work
6. **Service Role Key**: Ensure SUPABASE_SERVICE_ROLE_KEY is in .env.local for server-side operations

---

## Rollout Order

1. **Phase 1** (PWA) - Can be done independently, no breaking changes
2. **Phase 2.1-2.3** (Database & Dependencies) - Must be done together before Phase 2.4-2.8
3. **Phase 2.4-2.8** (Notification UI & Integration) - Depends on 2.1-2.3 being complete
4. **Phase 3** (Testing) - Final verification

Each phase can be committed separately for easier review and rollback if needed.
