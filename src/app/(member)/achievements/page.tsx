'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ACHIEVEMENTS, checkAchievements, Achievement } from '@/lib/achievements';

export default function AchievementsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [unlockedAchievements, setUnlockedAchievements] = useState<string[]>([]);
  const [newAchievements, setNewAchievements] = useState<string[]>([]);

  useEffect(() => {
    loadUserAndAchievements();
  }, []);

  const loadUserAndAchievements = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', authData.user.id)
        .single();

      if (!profile) return;

      setUser(profile);
      const currentAchievements = profile.achievements || [];
      setUnlockedAchievements(currentAchievements);

      // Check for new achievements
      const newlyUnlocked = checkAchievements(profile);
      if (newlyUnlocked.length > 0) {
        setNewAchievements(newlyUnlocked);

        // Update user's achievements
        const updatedAchievements = [...currentAchievements, ...newlyUnlocked];
        await supabase
          .from('users')
          .update({ achievements: updatedAchievements })
          .eq('id', authData.user.id);

        setUnlockedAchievements(updatedAchievements);
      }
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const categorizedAchievements = {
    participation: ACHIEVEMENTS.filter((a) => a.category === 'participation'),
    skill: ACHIEVEMENTS.filter((a) => a.category === 'skill'),
    community: ACHIEVEMENTS.filter((a) => a.category === 'community'),
  };

  const isUnlocked = (achievementId: string) => unlockedAchievements.includes(achievementId);
  const isNew = (achievementId: string) => newAchievements.includes(achievementId);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-xl">Loading achievements...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">🏆 Achievements</h1>
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
              Home
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Progress Summary */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg shadow-lg p-6 text-white mb-8">
          <h2 className="text-2xl font-bold mb-2">Your Progress</h2>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold">{unlockedAchievements.length}</div>
            <div>
              <p className="text-lg">/ {ACHIEVEMENTS.length} Achievements Unlocked</p>
              <div className="w-64 bg-white/20 rounded-full h-2 mt-2">
                <div
                  className="bg-white h-2 rounded-full transition-all"
                  style={{
                    width: `${(unlockedAchievements.length / ACHIEVEMENTS.length) * 100}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* New Achievements Alert */}
        {newAchievements.length > 0 && (
          <div className="bg-green-50 border-2 border-green-500 rounded-lg p-6 mb-8">
            <h3 className="text-xl font-bold text-green-900 mb-4">🎉 New Achievements Unlocked!</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {newAchievements.map((achievementId) => {
                const achievement = ACHIEVEMENTS.find((a) => a.id === achievementId);
                if (!achievement) return null;
                return (
                  <div
                    key={achievement.id}
                    className="bg-white rounded-lg p-4 border-2 border-green-500 animate-pulse"
                  >
                    <div className="text-4xl mb-2 text-center">{achievement.icon}</div>
                    <h4 className="font-bold text-gray-900 text-center">{achievement.name}</h4>
                    <p className="text-sm text-gray-600 text-center">{achievement.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Participation Achievements */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">🎯 Participation Badges</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categorizedAchievements.participation.map((achievement) => (
              <div
                key={achievement.id}
                className={`rounded-lg p-6 transition-all ${
                  isUnlocked(achievement.id)
                    ? 'bg-gradient-to-br from-yellow-100 to-yellow-200 border-2 border-yellow-500 shadow-lg'
                    : 'bg-gray-100 opacity-50'
                }`}
              >
                <div className="text-5xl mb-3 text-center filter grayscale-0">
                  {achievement.icon}
                </div>
                <h4 className="font-bold text-gray-900 text-center mb-1">{achievement.name}</h4>
                <p className="text-sm text-gray-600 text-center">{achievement.description}</p>
                {isUnlocked(achievement.id) && (
                  <div className="mt-3 text-center">
                    <span className="bg-green-600 text-white text-xs px-3 py-1 rounded-full font-semibold">
                      Unlocked ✓
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Skill Achievements */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">⚡ Skill Badges</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categorizedAchievements.skill.map((achievement) => (
              <div
                key={achievement.id}
                className={`rounded-lg p-6 transition-all ${
                  isUnlocked(achievement.id)
                    ? 'bg-gradient-to-br from-blue-100 to-blue-200 border-2 border-blue-500 shadow-lg'
                    : 'bg-gray-100 opacity-50'
                }`}
              >
                <div className="text-5xl mb-3 text-center">{achievement.icon}</div>
                <h4 className="font-bold text-gray-900 text-center mb-1">{achievement.name}</h4>
                <p className="text-sm text-gray-600 text-center">{achievement.description}</p>
                {isUnlocked(achievement.id) && (
                  <div className="mt-3 text-center">
                    <span className="bg-green-600 text-white text-xs px-3 py-1 rounded-full font-semibold">
                      Unlocked ✓
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Community Achievements */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">🤝 Community Badges</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {categorizedAchievements.community.map((achievement) => (
              <div
                key={achievement.id}
                className={`rounded-lg p-6 transition-all ${
                  isUnlocked(achievement.id)
                    ? 'bg-gradient-to-br from-purple-100 to-purple-200 border-2 border-purple-500 shadow-lg'
                    : 'bg-gray-100 opacity-50'
                }`}
              >
                <div className="text-5xl mb-3 text-center">{achievement.icon}</div>
                <h4 className="font-bold text-gray-900 text-center mb-1">{achievement.name}</h4>
                <p className="text-sm text-gray-600 text-center">{achievement.description}</p>
                {isUnlocked(achievement.id) && (
                  <div className="mt-3 text-center">
                    <span className="bg-green-600 text-white text-xs px-3 py-1 rounded-full font-semibold">
                      Unlocked ✓
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
