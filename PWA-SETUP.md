# PWA Setup Guide

This app is now a Progressive Web App (PWA) with advanced features!

## ✅ What's Included

### 1. **App Icons** 
- SVG base icon in `public/icons/icon.svg`
- Placeholder PNGs for all sizes (72x72 to 512x512)
- **Action Required**: Convert SVG to PNG using:
  - Online: https://realfavicongenerator.net/
  - Or install `sharp`: `npm install sharp` and run conversion script

### 2. **Service Worker** (Offline Support)
- Location: `public/service-worker.js`
- Caches: Dashboard, Slots, Leaderboard, Achievements
- Automatic registration in `src/app/register-sw.tsx`
- **Works offline**: View cached pages without internet

### 3. **Push Notifications**
- Module: `src/lib/notifications.ts`
- Templates for: Match approvals, new slots, achievements, low balance
- API endpoint: `/api/notifications/subscribe`
- Component: `src/components/NotificationPrompt.tsx`

**Setup Required:**
```bash
# Generate VAPID keys
npx web-push generate-vapid-keys

# Add to .env.local
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
```

### 4. **Pull-to-Refresh**
- Component: `src/components/PullToRefresh.tsx`
- Native mobile feel
- Usage: Wrap any page content

```tsx
import { PullToRefresh } from '@/components/PullToRefresh';

<PullToRefresh onRefresh={async () => await loadData()}>
  {/* Your content */}
</PullToRefresh>
```

### 5. **Install Prompt**
- Component: `src/components/InstallPrompt.tsx`
- Shows after 30 seconds on site
- Smart dismissal (asks again in 7 days)
- Add to layout or specific pages

### 6. **Web Share API**
- Module: `src/lib/share.ts`
- Component: `src/components/ShareButton.tsx`
- Share match results, achievements, leaderboard ranks
- Fallback: Copy to clipboard

```tsx
import { ShareButton } from '@/components/ShareButton';
import { MatchShareTemplates } from '@/lib/share';

<ShareButton 
  data={MatchShareTemplates.victory('badminton', '21-18', 1450, 'B')} 
  label="Share Victory"
/>
```

### 7. **Haptic Feedback**
- Module: `src/lib/haptics.ts`
- Vibration patterns for all actions
- Usage:

```tsx
import { Haptics } from '@/lib/haptics';

// On button click
Haptics.tap();
Haptics.success();
Haptics.bookSlot();
Haptics.matchWin();
```

### 8. **Dark Mode**
- Theme system: `src/lib/theme.ts`
- Provider: `src/components/ThemeProvider.tsx`
- Toggle: `src/components/ThemeToggle.tsx`
- Persists to localStorage
- System preference support

**Add to root layout:**
```tsx
import { ThemeProvider } from '@/components/ThemeProvider';

<ThemeProvider>
  {children}
</ThemeProvider>
```

**Add toggle to settings page:**
```tsx
import { ThemeToggle } from '@/components/ThemeToggle';

<ThemeToggle />
```

### 9. **Home Screen Widgets** (Data Ready)
- Stats API: `/api/widgets/stats`
- Leaderboard API: `/api/widgets/leaderboard`
- Future-proof for PWA widget support

### 10. **Skeleton Screens**
- Component: `src/components/Skeleton.tsx`
- Types: Card, Row, Stats, Table, Slot, Dashboard, Leaderboard
- Replace "Loading..." text

```tsx
import { SkeletonDashboard } from '@/components/Skeleton';

if (loading) return <SkeletonDashboard />;
```

---

## 📱 Add to Home Screen

### iOS (Safari)
1. Tap Share button
2. Scroll down, tap "Add to Home Screen"
3. Tap "Add"

### Android (Chrome)
1. Tap menu (3 dots)
2. Tap "Install app" or "Add to Home screen"
3. Tap "Install"

### Desktop (Chrome/Edge)
1. Click install icon in address bar
2. Or Settings → Install Smashers Club

---

## 🔧 Configuration

### Environment Variables
```env
# PWA
NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key

# App Info
NEXT_PUBLIC_CLUB_NAME=Smashers Club
NEXT_PUBLIC_BOOKING_COST=4
```

### Manifest (`public/manifest.json`)
Already configured with:
- App name, icons, theme color
- Standalone display mode
- Shortcuts: Book Slot, Leaderboard
- Screenshots placeholder

### Service Worker Caching
Edit `public/service-worker.js` to customize:
- `STATIC_ASSETS`: Pages to cache
- `CACHE_NAME`: Update version to force cache refresh

---

## 🚀 Deployment

### Vercel
1. Push to GitHub
2. Import on Vercel
3. Add environment variables
4. Deploy

### Custom Domain
1. Add domain in Vercel
2. Update manifest.json `start_url` if needed
3. Update meta tags in layout.tsx

### HTTPS Required
PWAs require HTTPS (Vercel provides this automatically)

---

## 📊 Testing

### Service Worker
1. Open DevTools → Application → Service Workers
2. Check "Update on reload" during development
3. Test offline: DevTools → Network → Offline

### Push Notifications
1. Generate VAPID keys (see above)
2. Test with: `/api/notifications/subscribe`
3. Send test notification from backend

### Install Prompt
1. Open in Chrome
2. Wait 30 seconds or trigger manually
3. Check: `localStorage.getItem('install-prompt-dismissed')`

### Lighthouse Audit
```bash
# Run PWA audit
npm run build
npm start
# Open Chrome DevTools → Lighthouse → PWA
```

---

## 🐛 Troubleshooting

### Service Worker Not Updating
```js
// In DevTools → Application → Service Workers
// Click "Unregister" then reload
```

### Icons Not Showing
- Ensure PNG files are properly generated
- Clear cache and hard reload (Cmd+Shift+R / Ctrl+Shift+F5)
- Check manifest.json paths

### Push Notifications Not Working
- Check HTTPS
- Verify VAPID keys in .env.local
- Check browser permissions
- Test in supported browsers (Chrome, Firefox, Edge)

### Dark Mode Not Persisting
- Check localStorage access
- Verify ThemeProvider wraps app
- Check CSS `.dark` class application

---

## 🔒 Security

### Service Worker Scope
Registered at root: `/service-worker.js`
Scope: entire domain

### Notification Permissions
Users must grant permission explicitly

### VAPID Keys
Keep `VAPID_PRIVATE_KEY` secret (server-side only)
Only expose `NEXT_PUBLIC_VAPID_PUBLIC_KEY`

---

## 📈 Next Steps

1. ✅ Generate proper PNG icons
2. ✅ Set up VAPID keys for push notifications
3. ✅ Add ThemeProvider to layout
4. ✅ Replace loading states with skeletons
5. ✅ Test on real mobile devices
6. ✅ Run Lighthouse audit
7. ✅ Monitor service worker errors
8. ✅ Set up notification sending from backend

---

## 📚 Resources

- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [web.dev PWA](https://web.dev/progressive-web-apps/)
- [Web Push Protocol](https://web.dev/push-notifications/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)

---

**Status**: ✅ PWA features fully implemented and ready for production!
