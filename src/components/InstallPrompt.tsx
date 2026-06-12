'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInstalled = localStorage.getItem('app-installed') === 'true';

    console.log('📱 PWA Status:', { isStandalone, isInstalled });

    if (isStandalone || isInstalled) {
      console.log('✅ App already installed');
      return;
    }

    // Check if user dismissed the prompt
    const dismissed = localStorage.getItem('install-prompt-dismissed');
    const dismissedDate = dismissed ? new Date(dismissed) : null;
    const daysSinceDismissed = dismissedDate
      ? (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24)
      : 999;

    console.log('🔔 Install prompt dismissed:', daysSinceDismissed < 7 ? 'Yes (within 7 days)' : 'No');

    // Don't show if dismissed within last 7 days
    if (daysSinceDismissed < 7) {
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('🎯 beforeinstallprompt event fired!');
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);

      // Show prompt after user has spent 10 seconds on the site (reduced from 30)
      setTimeout(() => {
        console.log('⏰ Showing install prompt');
        setShowPrompt(true);
      }, 10000);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Check if already installed
    window.addEventListener('appinstalled', () => {
      console.log('✅ App installed!');
      setShowPrompt(false);
      setDeferredPrompt(null);
      localStorage.setItem('app-installed', 'true');
    });

    // Log after 2 seconds if event hasn't fired
    setTimeout(() => {
      if (!deferredPrompt) {
        console.log('⚠️ beforeinstallprompt event not fired after 2 seconds');
        console.log('📱 This is normal on iOS (uses native prompt) or if already installed');
        console.log('🔧 On Android Chrome: Make sure site is HTTPS and meets PWA criteria');
      }
    }, 2000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      localStorage.setItem('app-installed', 'true');
    } else {
      console.log('User dismissed the install prompt');
      localStorage.setItem('install-prompt-dismissed', new Date().toISOString());
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('install-prompt-dismissed', new Date().toISOString());
  };

  if (!showPrompt || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg shadow-2xl p-4 z-50 animate-bounce-in">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 text-white/80 hover:text-white"
        aria-label="Dismiss"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div className="flex items-start gap-3">
        <div className="text-4xl">📱</div>
        <div className="flex-1">
          <h3 className="font-bold text-white mb-1 text-lg">
            Install Smashers Club
          </h3>
          <p className="text-sm text-white/90 mb-3">
            Add to your home screen for quick access, offline support, and native app experience!
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleInstallClick}
              className="flex-1 bg-white text-blue-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-blue-50 transition"
            >
              Install App
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-white text-sm font-medium hover:bg-white/10 rounded-lg transition"
            >
              Not Now
            </button>
          </div>
        </div>
      </div>

      {/* Benefits list */}
      <div className="mt-3 pt-3 border-t border-white/20">
        <div className="grid grid-cols-3 gap-2 text-xs text-white/90">
          <div className="text-center">
            <div className="font-semibold">⚡ Fast</div>
            <div>Instant load</div>
          </div>
          <div className="text-center">
            <div className="font-semibold">📴 Offline</div>
            <div>Works anywhere</div>
          </div>
          <div className="text-center">
            <div className="font-semibold">🔔 Alerts</div>
            <div>Get notified</div>
          </div>
        </div>
      </div>
    </div>
  );
}
