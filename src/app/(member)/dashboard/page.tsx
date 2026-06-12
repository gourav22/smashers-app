'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { getGradeEmoji, getGradeColor } from '@/lib/elo';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { AnimatedCounter } from '@/components/AnimatedCounter';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  balance: number;
  sports_played: string[];
  badminton_elo: number;
  badminton_grade: 'A' | 'B' | 'C' | 'D';
  badminton_games_played: number;
  badminton_wins: number;
  badminton_losses: number;
  cricket_elo: number;
  cricket_grade: 'A' | 'B' | 'C' | 'D';
  cricket_games_played: number;
  cricket_wins: number;
  cricket_losses: number;
  current_win_streak: number;
  longest_win_streak: number;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData.user) {
        console.error('Auth error:', authError);
        router.push('/login');
        return;
      }

      const { data: profile, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (error) {
        console.error('Error loading user profile:', error);

        // If profile doesn't exist, create it
        if (error.code === 'PGRST116') {
          const { data: newProfile, error: createError } = await supabase
            .from('users')
            .insert({
              id: authData.user.id,
              email: authData.user.email || '',
              name: authData.user.user_metadata?.name || authData.user.email?.split('@')[0] || 'User',
              phone: authData.user.user_metadata?.phone || null,
              sports_played: ['badminton', 'cricket'], // Default to both sports
            })
            .select()
            .single();

          if (createError) {
            console.error('Error creating profile:', createError);
            setLoading(false);
            alert('Error creating profile. Please check console.');
            return;
          }

          setUser(newProfile);
          setLoading(false);
          return;
        }

        // Other error - show and stop loading
        setLoading(false);
        alert(`Error loading profile: ${error.message}`);
        return;
      }

      // Ensure sports_played has a default value
      if (!profile.sports_played || profile.sports_played.length === 0) {
        profile.sports_played = ['badminton', 'cricket'];
      }

      setUser(profile);
    } catch (error: any) {
      console.error('Error loading user:', error);
      alert(`Error: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const calculateProgress = (elo: number, grade: string) => {
    const thresholds = {
      A: parseInt(process.env.NEXT_PUBLIC_ELO_GRADE_A || '1600'),
      B: parseInt(process.env.NEXT_PUBLIC_ELO_GRADE_B || '1400'),
      C: parseInt(process.env.NEXT_PUBLIC_ELO_GRADE_C || '1200'),
    };

    if (grade === 'D') {
      const target = thresholds.C;
      const progress = ((elo / target) * 100).toFixed(0);
      return { progress: Math.min(parseInt(progress), 100), target, needed: target - elo };
    }
    if (grade === 'C') {
      const target = thresholds.B;
      const progress = (((elo - thresholds.C) / (target - thresholds.C)) * 100).toFixed(0);
      return { progress: Math.min(parseInt(progress), 100), target, needed: target - elo };
    }
    if (grade === 'B') {
      const target = thresholds.A;
      const progress = (((elo - thresholds.B) / (target - thresholds.B)) * 100).toFixed(0);
      return { progress: Math.min(parseInt(progress), 100), target, needed: target - elo };
    }
    return { progress: 100, target: elo, needed: 0 };
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const badmintonProgress = calculateProgress(user.badminton_elo, user.badminton_grade);
  const cricketProgress = calculateProgress(user.cricket_elo, user.cricket_grade);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">
              {process.env.NEXT_PUBLIC_CLUB_NAME || 'Smashers Club'}
            </h1>
            <div className="flex gap-4 items-center">
              <Link href="/settings" className="text-gray-600 hover:text-gray-900">
                ⚙️ Settings
              </Link>
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Welcome Banner */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow-lg p-6 text-white mb-8"
        >
          <h2 className="text-3xl font-bold mb-2">Welcome back, {user.name}! 🎾</h2>
          {user.current_win_streak > 0 && (
            <motion.p
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring' }}
              className="text-xl"
            >
              You're on a <AnimatedCounter value={user.current_win_streak} />-match win streak! 🔥
            </motion.p>
          )}
        </motion.div>

        {/* Sport Stats Cards */}
        <div className={`grid grid-cols-1 md:grid-cols-2 ${user.sports_played?.length === 2 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-6 mb-8`}>
          {/* Badminton Card */}
          {user.sports_played?.includes('badminton') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Badminton 🏸</h3>
              <span className="text-3xl">{getGradeEmoji(user.badminton_grade)}</span>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-3xl font-bold" style={{ color: getGradeColor(user.badminton_grade) }}>
                  <AnimatedCounter value={user.badminton_elo} /> ELO
                </p>
                <p className="text-sm text-gray-600">Grade {user.badminton_grade}</p>
              </div>
              {user.badminton_grade !== 'A' && (
                <>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${badmintonProgress.progress}%`,
                        backgroundColor: getGradeColor(user.badminton_grade),
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600">
                    {badmintonProgress.needed} pts to Grade {
                      user.badminton_grade === 'D' ? 'C' : user.badminton_grade === 'C' ? 'B' : 'A'
                    } 🎯
                  </p>
                </>
              )}
              <div className="pt-2 border-t">
                <p className="text-sm text-gray-600">
                  Matches: {user.badminton_games_played} |
                  W: {user.badminton_wins} |
                  L: {user.badminton_losses}
                </p>
              </div>
            </div>
          </motion.div>
          )}

          {/* Cricket Card */}
          {user.sports_played?.includes('cricket') && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Cricket 🏏</h3>
              <span className="text-3xl">{getGradeEmoji(user.cricket_grade)}</span>
            </div>
            <div className="space-y-3">
              <div>
                <p className="text-3xl font-bold" style={{ color: getGradeColor(user.cricket_grade) }}>
                  <AnimatedCounter value={user.cricket_elo} /> ELO
                </p>
                <p className="text-sm text-gray-600">Grade {user.cricket_grade}</p>
              </div>
              {user.cricket_grade !== 'A' && (
                <>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${cricketProgress.progress}%`,
                        backgroundColor: getGradeColor(user.cricket_grade),
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600">
                    {cricketProgress.needed} pts to Grade {
                      user.cricket_grade === 'D' ? 'C' : user.cricket_grade === 'C' ? 'B' : 'A'
                    } 🎯
                  </p>
                </>
              )}
              <div className="pt-2 border-t">
                <p className="text-sm text-gray-600">
                  Matches: {user.cricket_games_played} |
                  W: {user.cricket_wins} |
                  L: {user.cricket_losses}
                </p>
              </div>
            </div>
          </motion.div>
          )}

          {/* Balance Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Balance 💰</h3>
            <div className="space-y-3">
              <div>
                <p className="text-4xl font-bold text-green-600">
                  €{user.balance.toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">
                  {Math.floor(user.balance / 4)} games available
                </p>
              </div>
              <Link
                href="/topup"
                className="block w-full bg-green-600 text-white text-center py-2 rounded-lg font-semibold hover:bg-green-700 transition"
              >
                Top Up Balance
              </Link>
              {user.balance < 4 && (
                <p className="text-xs text-red-600">
                  ⚠️ Low balance! Top up to book slots.
                </p>
              )}
            </div>
          </motion.div>
        </div>

        {/* Stats Overview */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">📊 Your Stats</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {user.badminton_games_played + user.cricket_games_played}
              </p>
              <p className="text-sm text-gray-600">Total Matches</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {user.badminton_wins + user.cricket_wins}
              </p>
              <p className="text-sm text-gray-600">Total Wins</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-amber-600">
                {user.current_win_streak}
              </p>
              <p className="text-sm text-gray-600">Current Streak 🔥</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">
                {user.longest_win_streak}
              </p>
              <p className="text-sm text-gray-600">Best Streak 🏆</p>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">🌟 Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/subscription"
              className="bg-purple-600 text-white p-4 rounded-lg text-center font-semibold hover:bg-purple-700 transition"
            >
              📅 Membership
            </Link>
            <Link
              href="/slots"
              className="bg-blue-600 text-white p-4 rounded-lg text-center font-semibold hover:bg-blue-700 transition"
            >
              🎾 Book Slot
            </Link>
            <Link
              href="/matches/create"
              className="bg-indigo-600 text-white p-4 rounded-lg text-center font-semibold hover:bg-indigo-700 transition"
            >
              ⚔️ Create Match
            </Link>
            <Link
              href="/bookings"
              className="bg-purple-600 text-white p-4 rounded-lg text-center font-semibold hover:bg-purple-700 transition"
            >
              📋 My Bookings
            </Link>
            <Link
              href="/leaderboard"
              className="bg-amber-600 text-white p-4 rounded-lg text-center font-semibold hover:bg-amber-700 transition"
            >
              🏆 Leaderboard
            </Link>
            <Link
              href="/achievements"
              className="bg-green-600 text-white p-4 rounded-lg text-center font-semibold hover:bg-green-700 transition"
            >
              🎖️ Achievements
            </Link>
            <Link
              href="/matches"
              className="bg-gray-600 text-white p-4 rounded-lg text-center font-semibold hover:bg-gray-700 transition"
            >
              📊 My Matches
            </Link>
          </div>
        </div>

        {/* Admin Actions */}
        {(user.role === 'super_admin' || user.role === 'slot_manager' || user.role === 'finance_manager') && (
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-lg shadow-lg p-6 text-white mt-8">
            <h3 className="text-xl font-semibold mb-4">⚙️ Admin Panel</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {(user.role === 'super_admin' || user.role === 'slot_manager') && (
                <Link
                  href="/slots/create"
                  className="bg-white text-purple-600 p-4 rounded-lg text-center font-semibold hover:bg-purple-50 transition shadow-md"
                >
                  ➕ Create Slots
                </Link>
              )}
              {(user.role === 'super_admin' || user.role === 'finance_manager') && (
                <Link
                  href="/members"
                  className="bg-white text-purple-600 p-4 rounded-lg text-center font-semibold hover:bg-purple-50 transition shadow-md"
                >
                  👥 Manage Members
                </Link>
              )}
              {user.role === 'super_admin' && (
                <Link
                  href="/subscription-templates"
                  className="bg-white text-purple-600 p-4 rounded-lg text-center font-semibold hover:bg-purple-50 transition shadow-md"
                >
                  📋 Subscriptions
                </Link>
              )}
              {user.role === 'super_admin' && (
                <Link
                  href="/matches"
                  className="bg-white text-purple-600 p-4 rounded-lg text-center font-semibold hover:bg-purple-50 transition shadow-md"
                >
                  ⚔️ All Matches
                </Link>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
