'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import {
  isNotificationSupported,
  getNotificationPermission,
  subscribeToPushNotifications,
  saveSubscriptionToServer
} from '@/lib/notifications';

export function NotificationPrompt({ userId }: { userId: string }) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check if we should show the prompt
    const checkPermission = () => {
      if (!isNotificationSupported()) return;

      const permission = getNotificationPermission();
      const dismissed = localStorage.getItem('notification-prompt-dismissed');

      if (permission === 'default' && !dismissed) {
        // Show prompt after 5 seconds to not be intrusive
        setTimeout(() => setShow(true), 5000);
      }
    };

    checkPermission();
  }, []);

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
        setShow(false);
      } else {
        // User denied permission or subscription failed
        // Close the popup regardless
        setShow(false);
        localStorage.setItem('notification-prompt-dismissed', 'true');

        // Check if permission was denied
        const permission = getNotificationPermission();
        if (permission === 'denied') {
          alert('Notifications were blocked. You can enable them later in Settings or your browser settings.');
        } else {
          alert('Could not enable notifications. Please try again from Settings.');
        }
      }
    } catch (error) {
      console.error('Failed to enable notifications:', error);
      setShow(false);
      localStorage.setItem('notification-prompt-dismissed', 'true');
      alert('Failed to enable notifications. You can try again from Settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('notification-prompt-dismissed', 'true');
    // Ask again in 7 days
    setTimeout(() => {
      localStorage.removeItem('notification-prompt-dismissed');
    }, 7 * 24 * 60 * 60 * 1000);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4 z-50 animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="text-3xl">🔔</div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
            Enable Notifications?
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
            Get notified about match approvals, new slots, achievements, and more.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleEnable}
              disabled={loading}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Enabling...' : 'Enable'}
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
