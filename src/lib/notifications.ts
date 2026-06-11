// Web Push Notifications Module

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
}

// Check if notifications are supported
export function isNotificationSupported(): boolean {
  return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    throw new Error('Notifications not supported');
  }

  const permission = await Notification.requestPermission();
  return permission;
}

// Get current permission status
export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) {
    return 'denied';
  }
  return Notification.permission;
}

// Subscribe to push notifications
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  if (!isNotificationSupported()) {
    return null;
  }

  const permission = await requestNotificationPermission();
  if (permission !== 'granted') {
    return null;
  }

  const registration = await navigator.serviceWorker.ready;

  // Check if already subscribed
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    // VAPID public key - you'll need to generate this
    // Use: npx web-push generate-vapid-keys
    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

    if (!vapidPublicKey) {
      console.warn('VAPID public key not configured');
      return null;
    }

    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey,
    });
  }

  return subscription;
}

// Unsubscribe from push notifications
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (!isNotificationSupported()) {
    return false;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    return await subscription.unsubscribe();
  }

  return false;
}

// Send subscription to server
export async function saveSubscriptionToServer(subscription: PushSubscription, userId: string): Promise<void> {
  const response = await fetch('/api/notifications/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      subscription,
      userId,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to save subscription');
  }
}

// Show local notification
export async function showNotification(payload: NotificationPayload): Promise<void> {
  if (!isNotificationSupported()) {
    return;
  }

  if (Notification.permission !== 'granted') {
    return;
  }

  const registration = await navigator.serviceWorker.ready;

  await registration.showNotification(payload.title, {
    body: payload.body,
    icon: payload.icon || '/icons/icon-192x192.png',
    badge: payload.badge || '/icons/icon-96x96.png',
    tag: payload.tag,
    data: payload.data,
    actions: payload.actions,
    vibrate: [200, 100, 200],
    requireInteraction: false,
  });
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Notification templates
export const NotificationTemplates = {
  matchApproved: (matchId: string, sport: string): NotificationPayload => ({
    title: '🎉 Match Approved!',
    body: `Your ${sport} match has been approved and ELO updated.`,
    tag: `match-approved-${matchId}`,
    data: { url: '/matches', matchId },
    actions: [
      { action: 'view', title: 'View Match' },
      { action: 'close', title: 'Dismiss' },
    ],
  }),

  newSlotAvailable: (sport: string, date: string): NotificationPayload => ({
    title: `🏸 New ${sport} Slot Available!`,
    body: `A slot on ${date} is now open for booking.`,
    tag: `new-slot-${sport}-${date}`,
    data: { url: '/slots' },
    actions: [
      { action: 'book', title: 'Book Now' },
      { action: 'close', title: 'Later' },
    ],
  }),

  achievementUnlocked: (achievementName: string): NotificationPayload => ({
    title: '🎖️ Achievement Unlocked!',
    body: `You earned: ${achievementName}`,
    tag: `achievement-${achievementName}`,
    data: { url: '/achievements' },
    actions: [
      { action: 'view', title: 'View All' },
      { action: 'close', title: 'Dismiss' },
    ],
  }),

  lowBalance: (balance: number): NotificationPayload => ({
    title: '💰 Low Balance Alert',
    body: `Your balance is €${balance.toFixed(2)}. Top up to continue booking.`,
    tag: 'low-balance',
    data: { url: '/topup' },
    actions: [
      { action: 'topup', title: 'Top Up' },
      { action: 'close', title: 'Later' },
    ],
  }),

  matchReminder: (sport: string, time: string): NotificationPayload => ({
    title: '⏰ Match Reminder',
    body: `Your ${sport} match starts in 1 hour at ${time}`,
    tag: `match-reminder-${time}`,
    data: { url: '/bookings' },
    actions: [
      { action: 'view', title: 'View Details' },
      { action: 'close', title: 'Dismiss' },
    ],
  }),

  slotCancellation: (date: string, refund: number): NotificationPayload => ({
    title: '❌ Slot Cancelled',
    body: `Your booking on ${date} was cancelled. €${refund.toFixed(2)} refunded.`,
    tag: `slot-cancelled-${date}`,
    data: { url: '/bookings' },
  }),

  subscriptionRenewal: (daysLeft: number): NotificationPayload => ({
    title: '📅 Subscription Reminder',
    body: `Your regular membership expires in ${daysLeft} days.`,
    tag: 'subscription-renewal',
    data: { url: '/settings' },
    actions: [
      { action: 'renew', title: 'Renew Now' },
      { action: 'close', title: 'Later' },
    ],
  }),
};
