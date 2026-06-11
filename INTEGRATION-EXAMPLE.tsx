// INTEGRATION EXAMPLE
// This file shows how to integrate all the new features into your existing pages

// ============================================
// 1. UPDATE ROOT LAYOUT (src/app/layout.tsx)
// ============================================

import { ThemeProvider } from '@/components/ThemeProvider';
import { RegisterServiceWorker } from './register-sw';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <RegisterServiceWorker />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

// ============================================
// 2. UPDATE DASHBOARD (src/app/(member)/dashboard/page.tsx)
// ============================================

import { PullToRefresh } from '@/components/PullToRefresh';
import { NotificationPrompt } from '@/components/NotificationPrompt';
import { InstallPrompt } from '@/components/InstallPrompt';
import { SkeletonDashboard } from '@/components/Skeleton';
import { Haptics } from '@/lib/haptics';

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  const loadData = async () => {
    // Your existing load logic
    setLoading(true);
    try {
      const data = await fetchUserData();
      setUser(data);
    } finally {
      setLoading(false);
    }
  };

  // Show skeleton while loading
  if (loading) {
    return <SkeletonDashboard />;
  }

  return (
    <>
      {/* Add notification & install prompts */}
      <NotificationPrompt userId={user.id} />
      <InstallPrompt />

      {/* Wrap content with pull-to-refresh */}
      <PullToRefresh onRefresh={loadData}>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          {/* Your existing dashboard content */}
          <header>...</header>
          <main>...</main>
        </div>
      </PullToRefresh>
    </>
  );
}

// ============================================
// 3. UPDATE SETTINGS PAGE (src/app/(member)/settings/page.tsx)
// ============================================

import { ThemeToggle } from '@/components/ThemeToggle';
import { useHaptics } from '@/lib/haptics';

export default function SettingsPage() {
  const haptics = useHaptics();

  const handleSave = () => {
    haptics.success();
    // Your save logic
  };

  return (
    <div>
      <h1>Settings</h1>

      {/* Add theme toggle */}
      <section>
        <ThemeToggle />
      </section>

      {/* Your other settings */}
      <button onClick={handleSave}>
        Save Settings
      </button>
    </div>
  );
}

// ============================================
// 4. UPDATE SLOTS PAGE (src/app/(member)/slots/page.tsx)
// ============================================

import { PullToRefresh } from '@/components/PullToRefresh';
import { SkeletonSlots } from '@/components/Skeleton';
import { Haptics } from '@/lib/haptics';

export default function SlotsPage() {
  const [loading, setLoading] = useState(true);
  const [slots, setSlots] = useState([]);

  const loadSlots = async () => {
    setLoading(true);
    const data = await fetchSlots();
    setSlots(data);
    setLoading(false);
  };

  const handleBookSlot = async (slotId) => {
    try {
      await bookSlot(slotId);
      Haptics.bookSlot(); // Vibrate on success
      await loadSlots();
    } catch (error) {
      Haptics.error(); // Error vibration
      alert('Failed to book slot');
    }
  };

  if (loading) {
    return <SkeletonSlots />;
  }

  return (
    <PullToRefresh onRefresh={loadSlots}>
      <div>
        {slots.map(slot => (
          <div key={slot.id}>
            <button onClick={() => handleBookSlot(slot.id)}>
              Book Slot
            </button>
          </div>
        ))}
      </div>
    </PullToRefresh>
  );
}

// ============================================
// 5. UPDATE MATCHES PAGE (Add Share Feature)
// ============================================

import { ShareButton } from '@/components/ShareButton';
import { MatchShareTemplates } from '@/lib/share';
import { Haptics } from '@/lib/haptics';

export default function MatchResultPage({ match }) {
  const isWin = match.won;
  const shareData = isWin
    ? MatchShareTemplates.victory(match.sport, match.score, match.newElo, match.newGrade)
    : MatchShareTemplates.defeat(match.sport, match.score, match.newElo, match.newGrade);

  return (
    <div>
      <h1>{isWin ? '🎉 Victory!' : '⚔️ Match Played'}</h1>
      <p>Score: {match.score}</p>
      <p>New ELO: {match.newElo}</p>

      {/* Add share button */}
      <ShareButton data={shareData} label="Share Result" />
    </div>
  );
}

// ============================================
// 6. UPDATE LEADERBOARD (Add Loading State)
// ============================================

import { SkeletonLeaderboard } from '@/components/Skeleton';
import { ShareButton } from '@/components/ShareButton';
import { MatchShareTemplates } from '@/lib/share';

export default function LeaderboardPage() {
  const [loading, setLoading] = useState(true);

  if (loading) {
    return <SkeletonLeaderboard />;
  }

  return (
    <div>
      {/* Your leaderboard content */}

      {/* Add share button for user's rank */}
      <ShareButton
        data={MatchShareTemplates.leaderboard(rank, sport, elo, grade)}
        label="Share My Rank"
      />
    </div>
  );
}

// ============================================
// 7. UPDATE ACHIEVEMENTS PAGE (Add Share)
// ============================================

import { ShareButton } from '@/components/ShareButton';
import { MatchShareTemplates } from '@/lib/share';
import { Haptics } from '@/lib/haptics';

export default function AchievementsPage({ achievements }) {
  return (
    <div>
      {achievements.map(achievement => (
        <div key={achievement.id}>
          <h3>{achievement.name}</h3>
          <p>{achievement.description}</p>

          {/* Share individual achievement */}
          <ShareButton
            data={MatchShareTemplates.achievement(achievement.name, achievement.description)}
            label="Share"
            className="text-sm px-2 py-1"
          />
        </div>
      ))}
    </div>
  );
}

// ============================================
// 8. CUSTOM NOTIFICATION EXAMPLE
// ============================================

import { showNotification, NotificationTemplates } from '@/lib/notifications';

// Send notification when match is approved
async function onMatchApproved(matchId, sport) {
  await showNotification(
    NotificationTemplates.matchApproved(matchId, sport)
  );
  Haptics.success();
}

// Send notification for low balance
async function checkBalance(balance) {
  if (balance < 8) { // Less than 2 games
    await showNotification(
      NotificationTemplates.lowBalance(balance)
    );
    Haptics.warning();
  }
}

// Custom notification
async function sendCustomNotification() {
  await showNotification({
    title: 'New Feature Available!',
    body: 'Check out the new subscription system',
    data: { url: '/subscription' },
    actions: [
      { action: 'view', title: 'View' },
      { action: 'close', title: 'Later' }
    ]
  });
}

// ============================================
// 9. HAPTIC FEEDBACK EXAMPLES
// ============================================

import { Haptics } from '@/lib/haptics';

// Button tap
<button onClick={() => {
  Haptics.tap();
  // action
}}>Click Me</button>

// Successful action
const handleSuccess = () => {
  Haptics.success();
  alert('Done!');
};

// Error
const handleError = () => {
  Haptics.error();
  alert('Failed!');
};

// Match result
const handleMatchWin = () => {
  Haptics.matchWin(); // Special victory pattern
};

const handleMatchLoss = () => {
  Haptics.matchLoss();
};

// Achievement unlocked
const handleAchievement = () => {
  Haptics.achievementUnlocked(); // Exciting pattern
};

// Booking slot
const handleBooking = () => {
  Haptics.bookSlot();
};

// ============================================
// 10. DARK MODE USAGE
// ============================================

import { useTheme } from '@/components/ThemeProvider';

function MyComponent() {
  const { theme, setTheme, toggleTheme } = useTheme();

  return (
    <div>
      <p>Current theme: {theme}</p>

      {/* Manual theme switch */}
      <button onClick={() => setTheme('dark')}>Dark</button>
      <button onClick={() => setTheme('light')}>Light</button>
      <button onClick={() => setTheme('system')}>System</button>

      {/* Toggle button */}
      <button onClick={toggleTheme}>Toggle</button>
    </div>
  );
}

// Or use the pre-built toggle
import { ThemeToggle } from '@/components/ThemeToggle';
<ThemeToggle />

// ============================================
// 11. PULL-TO-REFRESH USAGE
// ============================================

import { PullToRefresh } from '@/components/PullToRefresh';

function MyPage() {
  const [data, setData] = useState([]);

  const refreshData = async () => {
    const newData = await fetchData();
    setData(newData);
  };

  return (
    <PullToRefresh onRefresh={refreshData}>
      <div>
        {data.map(item => <div key={item.id}>{item.name}</div>)}
      </div>
    </PullToRefresh>
  );
}

// ============================================
// 12. SKELETON LOADING USAGE
// ============================================

import {
  SkeletonCard,
  SkeletonRow,
  SkeletonStats,
  SkeletonTable,
  SkeletonDashboard,
  SkeletonLeaderboard,
  SkeletonSlots
} from '@/components/Skeleton';

// Instead of:
if (loading) return <div>Loading...</div>;

// Use:
if (loading) return <SkeletonDashboard />;

// Or for specific components:
if (loading) {
  return (
    <div className="space-y-4">
      <SkeletonCard />
      <SkeletonCard />
      <SkeletonStats />
    </div>
  );
}

// ============================================
// 13. SUBSCRIPTION SYSTEM USAGE
// ============================================

// Link to subscription page (already added to dashboard)
<Link href="/subscription" className="...">
  📅 Membership
</Link>

// Check if user has active subscription
const { data: subscription } = await supabase
  .from('subscriptions')
  .select('*')
  .eq('user_id', userId)
  .eq('status', 'active')
  .single();

if (subscription) {
  // Show subscription badge
  <span>Regular Member ✅</span>
}

// Cancel a slot (in subscription page component)
const handleCancelSlot = async (subscriptionId, slotId, slotDate) => {
  const response = await fetch('/api/subscriptions/cancel-slot', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subscriptionId,
      slotId,
      slotDate,
      reason: 'Vacation'
    })
  });

  if (response.ok) {
    Haptics.success();
    alert('Slot cancelled and refunded!');
  }
};

// ============================================
// 14. COMPLETE PAGE EXAMPLE
// ============================================

'use client';

import { useEffect, useState } from 'react';
import { PullToRefresh } from '@/components/PullToRefresh';
import { NotificationPrompt } from '@/components/NotificationPrompt';
import { InstallPrompt } from '@/components/InstallPrompt';
import { SkeletonDashboard } from '@/components/Skeleton';
import { ShareButton } from '@/components/ShareButton';
import { MatchShareTemplates } from '@/lib/share';
import { Haptics } from '@/lib/haptics';
import { supabase } from '@/lib/supabase/client';

export default function MyPage() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [data, setData] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      setUser(authData.user);

      const { data: pageData } = await supabase
        .from('my_table')
        .select('*');

      setData(pageData);
    } catch (error) {
      console.error(error);
      Haptics.error();
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async () => {
    try {
      Haptics.tap();
      // Do something
      await performAction();
      Haptics.success();
    } catch (error) {
      Haptics.error();
      alert('Failed!');
    }
  };

  if (loading) {
    return <SkeletonDashboard />;
  }

  return (
    <>
      <NotificationPrompt userId={user.id} />
      <InstallPrompt />

      <PullToRefresh onRefresh={loadData}>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <header className="bg-white dark:bg-gray-800 shadow">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              My Page
            </h1>
          </header>

          <main className="max-w-7xl mx-auto px-4 py-8">
            <div className="space-y-6">
              {data.map(item => (
                <div key={item.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {item.title}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-300">
                    {item.description}
                  </p>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={handleAction}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                      Action
                    </button>

                    <ShareButton
                      data={MatchShareTemplates.victory('badminton', '21-18', 1450, 'B')}
                      label="Share"
                    />
                  </div>
                </div>
              ))}
            </div>
          </main>
        </div>
      </PullToRefresh>
    </>
  );
}

// ============================================
// NOTES:
// - All components are fully typed with TypeScript
// - All features work together seamlessly
// - Dark mode classes (dark:) are already included
// - Haptic feedback works on mobile devices only
// - Service worker caches pages automatically
// - Push notifications require HTTPS and user permission
// ============================================
