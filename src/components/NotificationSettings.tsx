'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  isNotificationSupported,
  getNotificationPermission,
  subscribeToPushNotifications,
  saveSubscriptionToServer,
  unsubscribeFromPushNotifications
} from '@/lib/notifications';

export function NotificationSettings({ userId }: { userId: string }) {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [loading, setLoading] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    checkNotificationStatus();
  }, []);

  const checkNotificationStatus = () => {
    const isSupported = isNotificationSupported();
    setSupported(isSupported);

    if (isSupported) {
      const perm = getNotificationPermission();
      setPermission(perm);
      setEnabled(perm === 'granted');
    }
  };

  const handleEnable = async () => {
    setLoading(true);
    try {
      const subscription = await subscribeToPushNotifications();

      if (subscription && userId) {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          throw new Error('Not authenticated');
        }

        await saveSubscriptionToServer(subscription, userId, token);
        localStorage.setItem('notification-enabled', 'true');

        // Re-check status after enabling
        checkNotificationStatus();

        alert('✅ Push notifications enabled! You\'ll receive updates about bookings, matches, and more.');
      } else {
        // Re-check status to see if permission was denied
        checkNotificationStatus();

        const perm = getNotificationPermission();
        if (perm === 'denied') {
          alert('❌ Notifications were blocked. Please allow notifications in your browser settings and try again.');
        } else {
          alert('❌ Could not enable notifications. Please check your browser settings or try again.');
        }
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error);
      checkNotificationStatus();
      alert('❌ Failed to enable notifications. Please check your browser permissions and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    setLoading(true);
    try {
      const success = await unsubscribeFromPushNotifications();
      if (success) {
        setPermission('default');
        setEnabled(false);
        localStorage.removeItem('notification-enabled');
        alert('✅ Push notifications disabled.');
      }
    } catch (error) {
      console.error('Failed to disable notifications:', error);
      alert('Failed to disable notifications.');
    } finally {
      setLoading(false);
    }
  };

  if (!supported) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🔕</span>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">
              Push Notifications Not Available
            </h3>
            <p className="text-sm text-gray-600">
              Your browser doesn't support push notifications, or you're browsing in private mode.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (permission === 'denied') {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🚫</span>
          <div>
            <h3 className="font-semibold text-red-900 mb-1">
              Notifications Blocked
            </h3>
            <p className="text-sm text-red-700 mb-2">
              You've blocked notifications for this site. To enable them:
            </p>
            <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
              <li>Click the lock icon in your browser's address bar</li>
              <li>Find "Notifications" and set to "Allow"</li>
              <li>Refresh this page</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <span className="text-3xl">🔔</span>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">
            Push Notifications
          </h3>
          <p className="text-sm text-gray-600 mb-3">
            {enabled
              ? 'You\'re receiving push notifications for bookings, matches, and updates.'
              : 'Enable notifications to get instant updates about bookings, matches, and more.'}
          </p>

          {enabled ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                <span>✓</span>
                <span>Enabled</span>
              </div>
              <button
                onClick={handleDisable}
                disabled={loading}
                className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
              >
                {loading ? 'Disabling...' : 'Disable'}
              </button>
            </div>
          ) : (
            <button
              onClick={handleEnable}
              disabled={loading}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Enabling...' : '🔔 Enable Notifications'}
            </button>
          )}

          <div className="mt-3 pt-3 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              <strong>You'll be notified about:</strong>
            </p>
            <ul className="text-xs text-gray-500 mt-1 space-y-0.5">
              <li>✓ Booking confirmations and cancellations</li>
              <li>✓ Match approvals and results</li>
              <li>✓ Waitlist spot availability</li>
              <li>✓ Refund processing updates</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
