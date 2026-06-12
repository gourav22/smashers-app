'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Booking {
  id: string;
  slot_id: string;
  user_id: string;
  slots: {
    date: string;
    time: string;
    location: string;
    sport: string;
  };
  users: {
    id: string;
    name: string;
  };
}

interface Player {
  id: string;
  name: string;
}

export default function CreateMatchPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    matchType: 'doubles' as 'singles' | 'doubles',
    team1Player2: '',
    team2Player1: '',
    team2Player2: '',
    team1Score: '',
    team2Score: '',
  });

  useEffect(() => {
    loadUserBookings();
  }, []);

  const loadUserBookings = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        router.push('/login');
        return;
      }

      setUserId(authData.user.id);

      // Get user profile
      const { data: profile } = await supabase
        .from('users')
        .select('name')
        .eq('id', authData.user.id)
        .single();

      if (profile) {
        setUserName(profile.name);
      }

      // Get user's bookings with slot details
      const { data: bookingsData, error } = await supabase
        .from('bookings')
        .select(`
          id,
          slot_id,
          user_id,
          slots (
            date,
            time,
            location,
            sport
          )
        `)
        .eq('user_id', authData.user.id)
        .eq('status', 'confirmed')
        .order('slots(date)', { ascending: true });

      if (error) throw error;

      setBookings(bookingsData as any || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
      setError('Failed to load your bookings');
    } finally {
      setLoading(false);
    }
  };

  const loadPlayersForSlot = async (slotId: string) => {
    try {
      // Get all users who booked this slot
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          users (
            id,
            name
          )
        `)
        .eq('slot_id', slotId)
        .eq('status', 'confirmed');

      if (error) throw error;

      const playersList = data.map((b: any) => b.users).filter(Boolean);
      setPlayers(playersList);
    } catch (error) {
      console.error('Error loading players:', error);
    }
  };

  const handleSlotChange = (slotId: string) => {
    setSelectedSlot(slotId);
    if (slotId) {
      loadPlayersForSlot(slotId);
    } else {
      setPlayers([]);
    }
    // Reset player selections
    setFormData({
      ...formData,
      team1Player2: '',
      team2Player1: '',
      team2Player2: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (!selectedSlot || !userId) {
        throw new Error('Please select a slot');
      }

      const team1Score = parseInt(formData.team1Score);
      const team2Score = parseInt(formData.team2Score);

      if (isNaN(team1Score) || isNaN(team2Score) || team1Score < 0 || team2Score < 0) {
        throw new Error('Invalid scores');
      }

      // Build teams
      const team1 = [userId];
      if (formData.matchType === 'doubles' && formData.team1Player2) {
        team1.push(formData.team1Player2);
      }

      const team2 = [formData.team2Player1];
      if (formData.matchType === 'doubles' && formData.team2Player2) {
        team2.push(formData.team2Player2);
      }

      // Validate team sizes
      if (formData.matchType === 'singles' && team1.length !== 1) {
        throw new Error('Singles must have 1 player per team');
      }
      if (formData.matchType === 'doubles' && team1.length !== 2) {
        throw new Error('Doubles must have 2 players per team');
      }

      if (!formData.team2Player1) {
        throw new Error('Please select at least one opponent');
      }

      // Get slot details
      const selectedBooking = bookings.find((b) => b.slot_id === selectedSlot);
      if (!selectedBooking) {
        throw new Error('Booking not found');
      }

      // Create match via API
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch('/api/matches/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          slotId: selectedSlot,
          date: selectedBooking.slots.date,
          time: selectedBooking.slots.time,
          sport: selectedBooking.slots.sport,
          matchType: formData.matchType,
          team1UserIds: team1,
          team2UserIds: team2,
          team1Score,
          team2Score,
          createdBy: userId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create match');
      }

      alert('Match created successfully! Waiting for opponent confirmation.');
      router.push('/matches');
    } catch (err: any) {
      setError(err.message || 'Failed to create match');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const selectedBooking = bookings.find((b) => b.slot_id === selectedSlot);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Create Match</h1>
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Record a Match</h2>
            <p className="text-gray-600">
              Create a match after you've played. Select the slot you booked, add players, and enter scores.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {bookings.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">You don't have any bookings yet.</p>
              <Link
                href="/slots"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
              >
                Book a Slot First
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Select Slot */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Slot You Played
                </label>
                <select
                  value={selectedSlot}
                  onChange={(e) => handleSlotChange(e.target.value)}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">-- Select a slot --</option>
                  {bookings.map((booking) => (
                    <option key={booking.id} value={booking.slot_id}>
                      {new Date(booking.slots.date).toLocaleDateString()} - {booking.slots.time} -{' '}
                      {booking.slots.location} ({booking.slots.sport})
                    </option>
                  ))}
                </select>
              </div>

              {selectedSlot && (
                <>
                  {/* Match Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Match Type</label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="matchType"
                          value="singles"
                          checked={formData.matchType === 'singles'}
                          onChange={(e) =>
                            setFormData({ ...formData, matchType: 'singles', team1Player2: '', team2Player2: '' })
                          }
                          className="mr-2"
                        />
                        Singles (1v1)
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="matchType"
                          value="doubles"
                          checked={formData.matchType === 'doubles'}
                          onChange={(e) => setFormData({ ...formData, matchType: 'doubles' })}
                          className="mr-2"
                        />
                        Doubles (2v2)
                      </label>
                    </div>
                  </div>

                  {/* Team 1 */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Your Team</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Player 1</label>
                        <input
                          type="text"
                          value={userName}
                          disabled
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50"
                        />
                      </div>
                      {formData.matchType === 'doubles' && (
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Player 2</label>
                          <select
                            value={formData.team1Player2}
                            onChange={(e) => setFormData({ ...formData, team1Player2: e.target.value })}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">-- Select partner --</option>
                            {players
                              .filter((p) => p.id !== userId && p.id !== formData.team2Player1 && p.id !== formData.team2Player2)
                              .map((player) => (
                                <option key={player.id} value={player.id}>
                                  {player.name}
                                </option>
                              ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Team 2 */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-3">Opponent Team</h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Player 1</label>
                        <select
                          value={formData.team2Player1}
                          onChange={(e) => setFormData({ ...formData, team2Player1: e.target.value })}
                          required
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="">-- Select opponent --</option>
                          {players
                            .filter((p) => p.id !== userId && p.id !== formData.team1Player2 && p.id !== formData.team2Player2)
                            .map((player) => (
                              <option key={player.id} value={player.id}>
                                {player.name}
                              </option>
                            ))}
                        </select>
                      </div>
                      {formData.matchType === 'doubles' && (
                        <div>
                          <label className="block text-sm text-gray-600 mb-1">Player 2</label>
                          <select
                            value={formData.team2Player2}
                            onChange={(e) => setFormData({ ...formData, team2Player2: e.target.value })}
                            required
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">-- Select opponent --</option>
                            {players
                              .filter(
                                (p) =>
                                  p.id !== userId &&
                                  p.id !== formData.team1Player2 &&
                                  p.id !== formData.team2Player1
                              )
                              .map((player) => (
                                <option key={player.id} value={player.id}>
                                  {player.name}
                                </option>
                              ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Scores */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Your Team Score</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.team1Score}
                        onChange={(e) => setFormData({ ...formData, team1Score: e.target.value })}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="21"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Opponent Score</label>
                      <input
                        type="number"
                        min="0"
                        value={formData.team2Score}
                        onChange={(e) => setFormData({ ...formData, team2Score: e.target.value })}
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="18"
                      />
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                  >
                    {submitting ? 'Creating Match...' : 'Create Match'}
                  </button>
                </>
              )}
            </form>
          )}
        </div>
      </main>
    </div>
  );
}
