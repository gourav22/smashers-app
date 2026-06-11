// Theme management utilities

export type Theme = 'light' | 'dark' | 'system';

const THEME_STORAGE_KEY = 'smashers-theme';

// Get the current theme from localStorage
export function getStoredTheme(): Theme {
  if (typeof window === 'undefined') return 'system';

  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return (stored as Theme) || 'system';
  } catch {
    return 'system';
  }
}

// Save theme to localStorage
export function setStoredTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.error('Failed to save theme:', error);
  }
}

// Get system preference
export function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

// Resolve the actual theme to apply
export function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') {
    return getSystemTheme();
  }
  return theme;
}

// Apply theme to document
export function applyTheme(theme: Theme): void {
  if (typeof window === 'undefined') return;

  const resolved = resolveTheme(theme);
  const root = document.documentElement;

  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }

  // Update meta theme-color
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', resolved === 'dark' ? '#1F2937' : '#3B82F6');
  }
}

// Initialize theme on app load
export function initTheme(): void {
  if (typeof window === 'undefined') return;

  const stored = getStoredTheme();
  applyTheme(stored);

  // Listen for system theme changes
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const handleChange = () => {
    const currentTheme = getStoredTheme();
    if (currentTheme === 'system') {
      applyTheme('system');
    }
  };

  if (mediaQuery.addEventListener) {
    mediaQuery.addEventListener('change', handleChange);
  } else {
    // Fallback for older browsers
    mediaQuery.addListener(handleChange);
  }
}

// Toggle between light and dark (ignoring system)
export function toggleTheme(): Theme {
  const current = getStoredTheme();
  const resolved = resolveTheme(current);
  const newTheme: Theme = resolved === 'dark' ? 'light' : 'dark';

  setStoredTheme(newTheme);
  applyTheme(newTheme);

  return newTheme;
}

// Cycle through all theme options
export function cycleTheme(): Theme {
  const current = getStoredTheme();
  const cycle: Theme[] = ['light', 'dark', 'system'];
  const currentIndex = cycle.indexOf(current);
  const newTheme = cycle[(currentIndex + 1) % cycle.length];

  setStoredTheme(newTheme);
  applyTheme(newTheme);

  return newTheme;
}
