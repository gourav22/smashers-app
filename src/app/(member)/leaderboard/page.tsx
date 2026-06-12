'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getGradeEmoji, getGradeColor } from '@/lib/elo';

interface Player {
  id: string;
  name: string;
  badminton_elo: number;
  badminton_grade: 'A' | 'B' | 'C' | 'D';
  badminton_games_played: number;
  badminton_wins: number;
  cricket_elo: number;
  cricket_grade: 'A' | 'B' | 'C' | 'D';
  cricket_games_played: number;
  cricket_wins: number;
}

export default function LeaderboardPage() {
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [sport, setSport] = useState<'badminton' | 'cricket'>('badminton');
  const [loading, setLoading] = useState(true);
  const [userSports, setUserSports] = useState<string[]>(['badminton', 'cricket']);

  useEffect(() => {
    loadLeaderboard();
  }, [sport]);

  const loadLeaderboard = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        router.push('/login');
        return;
      }

      setUserId(authData.user.id);

      // Get user's sport preferences
      const { data: profile } = await supabase
        .from('users')
        .select('sports_played')
        .eq('id', authData.user.id)
        .single();

      const sportsPlayed = profile?.sports_played || ['badminton', 'cricket'];
      setUserSports(sportsPlayed);

      // Set default sport to first one user plays
      if (!sportsPlayed.includes(sport)) {
        setSport(sportsPlayed[0] as 'badminton' | 'cricket');
      }

      const { data, error } = await supabase
        .from('users')
        .select('id, name, badminton_elo, badminton_grade, badminton_games_played, badminton_wins, cricket_elo, cricket_grade, cricket_games_played, cricket_wins')
        .order(sport === 'badminton' ? 'badminton_elo' : 'cricket_elo', { ascending: false });

      if (error) throw error;

      setPlayers(data || []);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateWinRate = (wins: number, gamesPlayed: number) => {
    if (gamesPlayed === 0) return 0;
    return Math.round((wins / gamesPlayed) * 100);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Leaderboard</h1>
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Sport Tabs */}
        <div className="flex gap-2 mb-8">
          {userSports.includes('badminton') && (
            <button
              onClick={() => setSport('badminton')}
              className={`px-6 py-3 rounded-lg font-semibold text-lg transition ${
                sport === 'badminton'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              🏸 Badminton
            </button>
          )}
          {userSports.includes('cricket') && (
            <button
              onClick={() => setSport('cricket')}
              className={`px-6 py-3 rounded-lg font-semibold text-lg transition ${
                sport === 'cricket'
                  ? 'bg-blue-600 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              🏏 Cricket
            </button>
          )}
        </div>

        {userSports.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center mb-8">
            <p className="text-yellow-800 mb-4">
              You haven't selected any sports yet. Please update your preferences.
            </p>
            <Link
              href="/settings"
              className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700"
            >
              Go to Settings
            </Link>
          </div>
        )}

        {/* Leaderboard Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rank
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Player
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ELO
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Matches
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Win Rate
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {players.map((player, index) => {
                  const elo = sport === 'badminton' ? player.badminton_elo : player.cricket_elo;
                  const grade = sport === 'badminton' ? player.badminton_grade : player.cricket_grade;
                  const gamesPlayed = sport === 'badminton' ? player.badminton_games_played : player.cricket_games_played;
                  const wins = sport === 'badminton' ? player.badminton_wins : player.cricket_wins;
                  const winRate = calculateWinRate(wins, gamesPlayed);
                  const isCurrentUser = player.id === userId;

                  return (
                    <tr
                      key={player.id}
                      className={`${isCurrentUser ? 'bg-blue-50 border-l-4 border-blue-600' : ''}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {index === 0 && <span className="text-2xl mr-2">👑</span>}
                          {index === 1 && <span className="text-2xl mr-2">🥈</span>}
                          {index === 2 && <span className="text-2xl mr-2">🥉</span>}
                          <span className="text-lg font-bold text-gray-900">#{index + 1}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {player.name}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded">
                              YOU
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-lg font-bold" style={{ color: getGradeColor(grade) }}>
                          {elo}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="text-2xl mr-2">{getGradeEmoji(grade)}</span>
                          <span className="text-sm font-medium text-gray-900">{grade}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {gamesPlayed}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2 max-w-[100px]">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${winRate}%` }}
                            ></div>
                          </div>
                          <span className="text-sm font-medium text-gray-900">{winRate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Your Position */}
        {userId && (
          <div className="mt-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
            <h3 className="text-xl font-semibold mb-2">📊 Your Position</h3>
            {(() => {
              const userIndex = players.findIndex((p) => p.id === userId);
              const userPlayer = players[userIndex];
              if (!userPlayer) return null;

              const elo = sport === 'badminton' ? userPlayer.badminton_elo : userPlayer.cricket_elo;
              const rank = userIndex + 1;
              const totalPlayers = players.length;
              const percentile = Math.round((1 - userIndex / totalPlayers) * 100);

              return (
                <div className="space-y-2">
                  <p className="text-lg">
                    <strong>Rank:</strong> #{rank} out of {totalPlayers} players (Top {percentile}%)
                  </p>
                  <p className="text-lg">
                    <strong>Current ELO:</strong> {elo}
                  </p>
                  {userIndex > 0 && (
                    <p className="text-sm opacity-90">
                      🎯 {players[userIndex - 1].name} is just {
                        (sport === 'badminton' ? players[userIndex - 1].badminton_elo : players[userIndex - 1].cricket_elo) - elo
                      } ELO points ahead of you!
                    </p>
                  )}
                </div>
              );
            })()}
          </div>
        )}
      </main>
    </div>
  );
}
