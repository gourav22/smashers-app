// Web Share API utilities

export interface ShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

// Check if Web Share API is supported
export function isShareSupported(): boolean {
  return 'share' in navigator;
}

// Check if Web Share API supports files
export function isShareFilesSupported(): boolean {
  return 'canShare' in navigator && navigator.canShare !== undefined;
}

// Share content using Web Share API
export async function shareContent(data: ShareData): Promise<boolean> {
  if (!isShareSupported()) {
    console.warn('Web Share API not supported');
    return false;
  }

  try {
    // Check if data can be shared
    if (isShareFilesSupported() && data.files) {
      const canShare = navigator.canShare && navigator.canShare({ files: data.files });
      if (!canShare) {
        console.warn('Cannot share files on this device');
        delete data.files;
      }
    }

    await navigator.share(data);
    return true;
  } catch (error: any) {
    // User cancelled or error occurred
    if (error.name === 'AbortError') {
      console.log('Share cancelled by user');
    } else {
      console.error('Share failed:', error);
    }
    return false;
  }
}

// Fallback: Copy to clipboard
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      try {
        document.execCommand('copy');
        textArea.remove();
        return true;
      } catch (error) {
        console.error('Fallback: Copy failed', error);
        textArea.remove();
        return false;
      }
    }
  } catch (error) {
    console.error('Copy to clipboard failed:', error);
    return false;
  }
}

// Share or copy with fallback
export async function shareOrCopy(data: ShareData): Promise<{ success: boolean; method: 'share' | 'copy' | 'none' }> {
  if (isShareSupported()) {
    const shared = await shareContent(data);
    if (shared) {
      return { success: true, method: 'share' };
    }
  }

  // Fallback to copy
  const textToCopy = `${data.title || ''}\n\n${data.text || ''}\n\n${data.url || ''}`.trim();
  const copied = await copyToClipboard(textToCopy);

  if (copied) {
    return { success: true, method: 'copy' };
  }

  return { success: false, method: 'none' };
}

// Match result sharing templates
export const MatchShareTemplates = {
  victory: (sport: string, score: string, elo: number, grade: string) => ({
    title: '🏆 Match Victory!',
    text: `Just won a ${sport} match ${score}!

My new ELO: ${elo} (Grade ${grade}) 🔥

Join Smashers Club and compete!`,
    url: typeof window !== 'undefined' ? window.location.origin : '',
  }),

  defeat: (sport: string, score: string, elo: number, grade: string) => ({
    title: '⚔️ Match Played',
    text: `Played a tough ${sport} match ${score}.

Current ELO: ${elo} (Grade ${grade})

Coming back stronger! 💪`,
    url: typeof window !== 'undefined' ? window.location.origin : '',
  }),

  achievement: (achievementName: string, description: string) => ({
    title: '🎖️ Achievement Unlocked!',
    text: `${achievementName}

${description}

Check out Smashers Club!`,
    url: typeof window !== 'undefined' ? window.location.origin : '',
  }),

  leaderboard: (rank: number, sport: string, elo: number, grade: string) => ({
    title: `🏅 Ranked #${rank} in ${sport}!`,
    text: `I'm currently ranked #${rank} in ${sport} on Smashers Club!

ELO: ${elo} | Grade: ${grade}

Think you can beat me? 😎`,
    url: typeof window !== 'undefined' ? window.location.origin : '',
  }),

  winStreak: (streak: number, sport?: string) => ({
    title: `🔥 ${streak}-Match Win Streak!`,
    text: `On fire with a ${streak}-match win streak${sport ? ` in ${sport}` : ''}! 🔥

Join Smashers Club and challenge me!`,
    url: typeof window !== 'undefined' ? window.location.origin : '',
  }),
};
