'use client';

import { useEffect, useState } from 'react';

export function IOSChromePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Detect iOS Chrome
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isChrome = /CriOS/.test(navigator.userAgent); // Chrome on iOS uses CriOS
    const isSafari = /Safari/.test(navigator.userAgent) && !/CriOS/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const dismissed = localStorage.getItem('ios-chrome-prompt-dismissed');

    console.log('🔍 Browser detection:', { isIOS, isChrome, isSafari, isStandalone });

    // Show prompt only if:
    // - On iOS
    // - In Chrome (not Safari)
    // - Not already installed
    // - Not dismissed
    if (isIOS && isChrome && !isStandalone && !dismissed) {
      setShowPrompt(true);
    }
  }, []);

  const handleOpenInSafari = () => {
    // Copy current URL to clipboard
    const url = window.location.href;

    // Try to copy to clipboard
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        alert('✅ URL copied!\n\n1. Close Chrome\n2. Open Safari\n3. Paste the URL\n4. Tap Share → Add to Home Screen');
      });
    } else {
      alert('📱 To install this app:\n\n1. Copy this URL: ' + url + '\n2. Close Chrome\n3. Open Safari\n4. Paste the URL\n5. Tap Share → Add to Home Screen');
    }

    setShowPrompt(false);
    localStorage.setItem('ios-chrome-prompt-dismissed', 'true');
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('ios-chrome-prompt-dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-gradient-to-r from-orange-500 to-red-500 text-white p-4 shadow-lg z-50 animate-slide-down">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start gap-3">
          <div className="text-3xl">🍎</div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-lg mb-1">Install App in Safari</h3>
            <p className="text-sm text-white/90 mb-3">
              Chrome on iOS cannot install web apps. Please open this site in Safari to install.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleOpenInSafari}
                className="bg-white text-orange-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-orange-50 transition"
              >
                📋 Copy URL for Safari
              </button>
              <button
                onClick={handleDismiss}
                className="bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/30 transition"
              >
                Dismiss
              </button>
            </div>
            <p className="text-xs text-white/75 mt-2">
              💡 In Safari: Tap Share (⬆️) → Add to Home Screen
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
