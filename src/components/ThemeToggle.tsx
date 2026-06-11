'use client';

import { useTheme } from './ThemeProvider';
import { Theme } from '@/lib/theme';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const handleChange = (newTheme: Theme) => {
    setTheme(newTheme);

    // Haptic feedback
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        Theme
      </label>
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
        <button
          onClick={() => handleChange('light')}
          className={`px-3 py-1.5 rounded text-sm font-medium transition ${
            theme === 'light'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
          aria-label="Light theme"
        >
          ☀️ Light
        </button>
        <button
          onClick={() => handleChange('dark')}
          className={`px-3 py-1.5 rounded text-sm font-medium transition ${
            theme === 'dark'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
          aria-label="Dark theme"
        >
          🌙 Dark
        </button>
        <button
          onClick={() => handleChange('system')}
          className={`px-3 py-1.5 rounded text-sm font-medium transition ${
            theme === 'system'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
          aria-label="System theme"
        >
          💻 Auto
        </button>
      </div>
    </div>
  );
}
