// Haptic Feedback Utilities

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

// Vibration patterns (in milliseconds)
const patterns: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 30,
  success: [50, 50, 50],
  warning: [100, 50, 100],
  error: [50, 100, 50, 100, 50],
  selection: 5,
};

// Check if Vibration API is supported
export function isHapticsSupported(): boolean {
  return 'vibrate' in navigator;
}

// Trigger haptic feedback
export function hapticFeedback(pattern: HapticPattern = 'medium'): void {
  if (!isHapticsSupported()) {
    return;
  }

  try {
    const vibrationPattern = patterns[pattern];
    navigator.vibrate(vibrationPattern);
  } catch (error) {
    console.error('Haptic feedback failed:', error);
  }
}

// Stop any ongoing vibration
export function stopHaptics(): void {
  if (!isHapticsSupported()) {
    return;
  }

  try {
    navigator.vibrate(0);
  } catch (error) {
    console.error('Stop haptics failed:', error);
  }
}

// Contextual haptic helpers
export const Haptics = {
  // UI interactions
  tap: () => hapticFeedback('light'),
  press: () => hapticFeedback('medium'),
  longPress: () => hapticFeedback('heavy'),
  selection: () => hapticFeedback('selection'),

  // Feedback states
  success: () => hapticFeedback('success'),
  warning: () => hapticFeedback('warning'),
  error: () => hapticFeedback('error'),

  // App-specific
  bookSlot: () => hapticFeedback('success'),
  cancelBooking: () => hapticFeedback('warning'),
  matchWin: () => navigator.vibrate([100, 50, 100, 50, 200]),
  matchLoss: () => hapticFeedback('error'),
  achievementUnlocked: () => navigator.vibrate([50, 50, 50, 50, 50, 100, 200]),
  levelUp: () => navigator.vibrate([100, 50, 100, 50, 100, 50, 300]),
  notification: () => hapticFeedback('medium'),
  swipeAction: () => hapticFeedback('light'),
  pullToRefresh: () => hapticFeedback('light'),
};

// React hook for haptic feedback
export function useHaptics() {
  const supported = isHapticsSupported();

  return {
    supported,
    trigger: hapticFeedback,
    stop: stopHaptics,
    ...Haptics,
  };
}

// Note: withHaptics HOC removed - use Haptics directly in components instead
// Example: onClick={() => { Haptics.tap(); handleClick(); }}
