// Server-side push notification utility
// Uses web-push library to send push notifications to subscribed users

import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';

// Configure VAPID details (required for web push)
if (process.env.VAPID_SUBJECT && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
} else {
  console.warn('⚠️ VAPID keys not configured. Push notifications will not work.');
}

/**
 * Send push notification to a specific user
 * @param userId - User ID to send notification to
 * @param payload - Notification content
 */
export async function sendPushToUser(
  userId: string,
  payload: { title: string; body: string; url?: string; tag?: string }
) {
  // Skip if VAPID not configured
  if (!process.env.VAPID_SUBJECT) {
    console.log('Push notifications disabled (VAPID not configured)');
    return;
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Get user's push subscription from database
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('push_subscription')
    .eq('id', userId)
    .single();

  if (userError) {
    console.error('Failed to fetch user subscription:', userError);
    return;
  }

  if (!user?.push_subscription) {
    console.log(`User ${userId} has no push subscription`);
    return;
  }

  // Prepare notification payload
  const notificationPayload = JSON.stringify({
    title: payload.title,
    body: payload.body,
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    tag: payload.tag || 'default',
    data: {
      url: payload.url || '/dashboard',
      dateTime: new Date().toISOString(),
    },
  });

  try {
    // Send push notification using web-push
    await webpush.sendNotification(
      user.push_subscription,
      notificationPayload
    );

    console.log(`✅ Push notification sent to user ${userId}`);
  } catch (error: any) {
    console.error(`Failed to send push notification to user ${userId}:`, error);

    // If subscription is invalid/expired (410 Gone), remove it from database
    if (error.statusCode === 410) {
      console.log(`Subscription expired for user ${userId}, removing from database`);

      await supabase
        .from('users')
        .update({ push_subscription: null })
        .eq('id', userId);
    }
  }
}

/**
 * Send push notifications to multiple users
 * @param userIds - Array of user IDs
 * @param payload - Notification content
 */
export async function sendPushToUsers(
  userIds: string[],
  payload: { title: string; body: string; url?: string; tag?: string }
) {
  const promises = userIds.map(userId => sendPushToUser(userId, payload));
  await Promise.allSettled(promises);
}
