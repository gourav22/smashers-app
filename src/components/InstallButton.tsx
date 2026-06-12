'use client';

import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function InstallButton({ className = '' }: { className?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Check if already installed
    const standalone = window.matchMedia('(display-mode: standalone)').matches;
    const installed = localStorage.getItem('app-installed') === 'true';
    setIsInstalled(standalone || installed);

    // Listen for install prompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      localStorage.setItem('app-installed', 'true');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      alert('Install option not available. Try adding to home screen from your browser menu.');
      return;
    }

    setIsInstalling(true);

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setIsInstalled(true);
        localStorage.setItem('app-installed', 'true');
      }

      setDeferredPrompt(null);
    } catch (error) {
      console.error('Install failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  if (isInstalled) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-green-600">✓</span>
        <span className="text-sm text-gray-600">App Installed</span>
      </div>
    );
  }

  return (
    <button
      onClick={handleInstall}
      disabled={!deferredPrompt || isInstalling}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition ${
        deferredPrompt
          ? 'bg-blue-600 text-white hover:bg-blue-700'
          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
      } ${className}`}
      title={!deferredPrompt ? 'Install option not available on this device/browser' : 'Install app to home screen'}
    >
      <span>📱</span>
      <span>{isInstalling ? 'Installing...' : 'Install App'}</span>
    </button>
  );
}
