'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Match {
  id: string;
  date: string;
  time: string;
  sport: string;
  match_type: string;
  team1_user_ids: string[];
  team2_user_ids: string[];
  team1_score: number;
  team2_score: number;
  status: string;
  confirmed_by: string[];
  pending_confirmation: string[];
  created_at: string;
}

interface UserNames {
  [key: string]: string;
}

export default function MatchesPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('member');
  const [matches, setMatches] = useState<Match[]>([]);
  const [userNames, setUserNames] = useState<UserNames>({});
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);

  useEffect(() => {
    loadMatches();
  }, []);

  const loadMatches = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        router.push('/login');
        return;
      }

      setUserId(authData.user.id);

      // Get user role
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (profile) {
        setUserRole(profile.role);
      }

      // Get matches where user is in either team (or all matches if admin)
      let matchesQuery = supabase.from('matches').select('*');

      // If not admin, only show matches where user is a player
      if (!['super_admin', 'slot_manager'].includes(profile?.role || '')) {
        matchesQuery = matchesQuery.or(
          `team1_user_ids.cs.{${authData.user.id}},team2_user_ids.cs.{${authData.user.id}}`
        );
      }

      const { data: matchesData, error } = await matchesQuery.order('created_at', { ascending: false });

      if (error) throw error;

      setMatches(matchesData || []);

      // Get all unique user IDs
      const allUserIds = new Set<string>();
      matchesData?.forEach((match) => {
        match.team1_user_ids.forEach((id: string) => allUserIds.add(id));
        match.team2_user_ids.forEach((id: string) => allUserIds.add(id));
      });

      // Fetch user names
      if (allUserIds.size > 0) {
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name')
          .in('id', Array.from(allUserIds));

        if (usersData) {
          const namesMap: UserNames = {};
          usersData.forEach((user) => {
            namesMap[user.id] = user.name;
          });
          setUserNames(namesMap);
        }
      }
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveMatch = async (matchId: string) => {
    if (!confirm('Approve this match and update ELO ratings?')) return;

    setApproving(matchId);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;

      const response = await fetch('/api/matches/approve', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ matchId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to approve match');
      }

      alert('Match approved and ELO updated successfully!');
      loadMatches();
    } catch (error: any) {
      alert(error.message || 'Failed to approve match');
    } finally {
      setApproving(null);
    }
  };

  const handleRejectMatch = async (matchId: string) => {
    if (!confirm('Are you sure you want to reject this match?')) return;

    try {
      const { error } = await supabase
        .from('matches')
        .update({ status: 'rejected' })
        .eq('id', matchId);

      if (error) throw error;

      alert('Match rejected');
      loadMatches();
    } catch (error) {
      alert('Failed to reject match');
    }
  };

  const isUserInTeam = (match: Match, teamUserIds: string[]) => {
    return userId && teamUserIds.includes(userId);
  };

  const isAdmin = () => {
    return ['super_admin', 'slot_manager'].includes(userRole);
  };

  const needsMyConfirmation = (match: Match) => {
    return userId && match.pending_confirmation.includes(userId);
  };

  const handleConfirmMatch = async (matchId: string) => {
    if (!userId) return;

    setApproving(matchId);

    try {
      const token = (await supabase.auth.getSession()).data.session?.access_token;

      const response = await fetch('/api/matches/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ matchId, userId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to confirm match');
      }

      alert(result.message || 'Match confirmed successfully!');
      loadMatches();
    } catch (error: any) {
      alert(error.message || 'Failed to confirm match');
    } finally {
      setApproving(null);
    }
  };

  const pendingMatches = matches.filter((m) => m.status === 'pending_confirmation');
  const confirmedMatches = matches.filter((m) => m.status === 'confirmed');

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">My Matches</h1>
            <div className="flex gap-4">
              <Link
                href="/matches/create"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700"
              >
                + Create Match
              </Link>
              <Link href="/dashboard" className="text-blue-600 hover:text-blue-700 px-4 py-2">
                ← Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Pending Matches */}
        {pendingMatches.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              ⏳ Pending Confirmation ({pendingMatches.length})
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Matches can be confirmed by opponent players OR admins
            </p>
            <div className="space-y-4">
              {pendingMatches.map((match) => {
                const isTeam1 = isUserInTeam(match, match.team1_user_ids);
                const needsConfirm = needsMyConfirmation(match);

                return (
                  <div key={match.id} className="bg-white rounded-lg shadow p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 capitalize">
                          {match.sport} - {match.match_type}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {new Date(match.date).toLocaleDateString()} at {match.time}
                        </p>
                      </div>
                      <span className="bg-amber-100 text-amber-800 text-sm px-3 py-1 rounded-full font-semibold">
                        {needsMyConfirmation(match)
                          ? 'Needs Your Confirmation'
                          : isAdmin()
                            ? 'Awaiting Approval'
                            : 'Pending Confirmation'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 items-center">
                      {/* Team 1 */}
                      <div className={`${isTeam1 ? 'bg-blue-50' : ''} p-3 rounded`}>
                        <p className="text-xs text-gray-600 mb-1">
                          {isTeam1 ? 'Your Team' : 'Team 1'}
                        </p>
                        {match.team1_user_ids.map((id) => (
                          <p key={id} className="text-sm font-medium text-gray-900">
                            {userNames[id] || 'Unknown'}
                          </p>
                        ))}
                        <p className="text-2xl font-bold text-gray-900 mt-2">{match.team1_score}</p>
                      </div>

                      {/* VS */}
                      <div className="text-center">
                        <p className="text-xl font-bold text-gray-400">VS</p>
                      </div>

                      {/* Team 2 */}
                      <div className={`${!isTeam1 ? 'bg-blue-50' : ''} p-3 rounded`}>
                        <p className="text-xs text-gray-600 mb-1">
                          {!isTeam1 ? 'Your Team' : 'Team 2'}
                        </p>
                        {match.team2_user_ids.map((id) => (
                          <p key={id} className="text-sm font-medium text-gray-900">
                            {userNames[id] || 'Unknown'}
                          </p>
                        ))}
                        <p className="text-2xl font-bold text-gray-900 mt-2">{match.team2_score}</p>
                      </div>
                    </div>

                    {(needsMyConfirmation(match) || isAdmin()) && (
                      <div className="space-y-3 mt-4">
                        {needsMyConfirmation(match) && (
                          <div className="flex gap-3">
                            <button
                              onClick={() => handleConfirmMatch(match.id)}
                              disabled={approving === match.id}
                              className="flex-1 bg-green-600 text-white py-2 rounded-lg font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                              {approving === match.id ? 'Confirming...' : '✅ Confirm Match'}
                            </button>
                            <button
                              onClick={() => handleRejectMatch(match.id)}
                              disabled={approving === match.id}
                              className="flex-1 bg-red-600 text-white py-2 rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                              ❌ Reject
                            </button>
                          </div>
                        )}
                        {isAdmin() && !needsMyConfirmation(match) && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-xs text-blue-800 mb-2">
                              🛡️ Admin Override: You can approve this match even though you're not an opponent
                            </p>
                            <button
                              onClick={() => handleApproveMatch(match.id)}
                              disabled={approving === match.id}
                              className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            >
                              {approving === match.id ? 'Approving...' : '🛡️ Admin Approve & Update ELO'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Confirmed Matches */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            ✅ Confirmed Matches ({confirmedMatches.length})
          </h2>
          {confirmedMatches.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600 mb-4">No confirmed matches yet</p>
              <Link
                href="/matches/create"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
              >
                Create Your First Match
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {confirmedMatches.map((match) => {
                const isTeam1 = isUserInTeam(match, match.team1_user_ids);
                const didWin =
                  (isTeam1 && match.team1_score > match.team2_score) ||
                  (!isTeam1 && match.team2_score > match.team1_score);

                return (
                  <div
                    key={match.id}
                    className={`bg-white rounded-lg shadow p-6 ${
                      didWin ? 'border-l-4 border-green-500' : 'border-l-4 border-gray-300'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 capitalize">
                          {match.sport} - {match.match_type}
                        </h3>
                        <p className="text-sm text-gray-600">
                          {new Date(match.date).toLocaleDateString()} at {match.time}
                        </p>
                      </div>
                      {didWin ? (
                        <span className="bg-green-100 text-green-800 text-sm px-3 py-1 rounded-full font-semibold">
                          🎉 Won
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full font-semibold">
                          Loss
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-4 items-center">
                      {/* Team 1 */}
                      <div className={`${isTeam1 ? 'bg-blue-50' : ''} p-3 rounded`}>
                        <p className="text-xs text-gray-600 mb-1">
                          {isTeam1 ? 'Your Team' : 'Team 1'}
                        </p>
                        {match.team1_user_ids.map((id) => (
                          <p key={id} className="text-sm font-medium text-gray-900">
                            {userNames[id] || 'Unknown'}
                          </p>
                        ))}
                        <p className="text-2xl font-bold text-gray-900 mt-2">{match.team1_score}</p>
                      </div>

                      {/* VS */}
                      <div className="text-center">
                        <p className="text-xl font-bold text-gray-400">VS</p>
                      </div>

                      {/* Team 2 */}
                      <div className={`${!isTeam1 ? 'bg-blue-50' : ''} p-3 rounded`}>
                        <p className="text-xs text-gray-600 mb-1">
                          {!isTeam1 ? 'Your Team' : 'Team 2'}
                        </p>
                        {match.team2_user_ids.map((id) => (
                          <p key={id} className="text-sm font-medium text-gray-900">
                            {userNames[id] || 'Unknown'}
                          </p>
                        ))}
                        <p className="text-2xl font-bold text-gray-900 mt-2">{match.team2_score}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
