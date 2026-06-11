'use client';

import { useEffect, useRef, useState } from 'react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

export function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const touchStartY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const THRESHOLD = 80; // Pull distance to trigger refresh
  const MAX_PULL = 120;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let startY = 0;
    let currentY = 0;
    let pulling = false;

    const handleTouchStart = (e: TouchEvent) => {
      // Only start pull-to-refresh if at top of scroll
      if (window.scrollY > 0) return;

      startY = e.touches[0].clientY;
      touchStartY.current = startY;
      pulling = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isRefreshing || window.scrollY > 0) return;

      currentY = e.touches[0].clientY;
      const diff = currentY - startY;

      // Only trigger if pulling down
      if (diff > 0) {
        pulling = true;

        // Prevent default scroll when pulling
        if (diff > 10) {
          e.preventDefault();
        }

        // Add resistance - slower pull as distance increases
        const resistance = Math.min(diff / 2.5, MAX_PULL);
        setPullDistance(resistance);
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance >= THRESHOLD && !isRefreshing) {
        setIsRefreshing(true);
        setPullDistance(THRESHOLD);

        // Vibrate on trigger
        if ('vibrate' in navigator) {
          navigator.vibrate(50);
        }

        try {
          await onRefresh();
        } catch (error) {
          console.error('Refresh failed:', error);
        } finally {
          setIsRefreshing(false);
          setPullDistance(0);
        }
      } else {
        setPullDistance(0);
      }

      pulling = false;
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDistance, isRefreshing, onRefresh]);

  const pullProgress = Math.min((pullDistance / THRESHOLD) * 100, 100);
  const spinnerRotation = pullProgress * 3.6; // 360 degrees at 100%

  return (
    <div ref={containerRef} className="relative">
      {/* Pull indicator */}
      <div
        className="fixed top-0 left-0 right-0 flex items-center justify-center transition-all duration-200 pointer-events-none z-50"
        style={{
          height: `${pullDistance}px`,
          opacity: pullDistance > 0 ? 1 : 0,
        }}
      >
        <div className="bg-white dark:bg-gray-800 rounded-full p-3 shadow-lg">
          {isRefreshing ? (
            <div className="w-6 h-6 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg
              className="w-6 h-6 text-blue-600 transition-transform"
              style={{ transform: `rotate(${spinnerRotation}deg)` }}
              fill="none"
              strokeWidth="2"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          )}
        </div>
        {pullProgress >= 100 && !isRefreshing && (
          <div className="absolute bottom-2 text-xs text-gray-600 dark:text-gray-300 font-medium">
            Release to refresh
          </div>
        )}
      </div>

      {/* Content */}
      <div
        style={{
          transform: isRefreshing ? `translateY(${THRESHOLD}px)` : `translateY(${pullDistance}px)`,
          transition: isRefreshing || pullDistance === 0 ? 'transform 0.2s ease' : 'none',
        }}
      >
        {children}
      </div>
    </div>
  );
}
