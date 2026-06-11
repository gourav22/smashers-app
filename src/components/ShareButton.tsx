'use client';

import { useState } from 'react';
import { shareOrCopy, ShareData } from '@/lib/share';

interface ShareButtonProps {
  data: ShareData;
  className?: string;
  label?: string;
  icon?: React.ReactNode;
}

export function ShareButton({ data, className = '', label = 'Share', icon }: ShareButtonProps) {
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleShare = async () => {
    const result = await shareOrCopy(data);

    if (result.success) {
      if (result.method === 'share') {
        setFeedback('Shared!');
      } else if (result.method === 'copy') {
        setFeedback('Copied to clipboard!');
      }

      // Haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }

      setTimeout(() => setFeedback(null), 2000);
    } else {
      setFeedback('Failed to share');
      setTimeout(() => setFeedback(null), 2000);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={handleShare}
        className={className || 'bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition flex items-center gap-2'}
      >
        {icon || (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
        )}
        {label}
      </button>

      {/* Feedback toast */}
      {feedback && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-sm rounded whitespace-nowrap animate-fade-in">
          {feedback}
        </div>
      )}
    </div>
  );
}
