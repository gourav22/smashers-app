'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function CreateSlotPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    date: '',
    time: '',
    location: '',
    sport: 'badminton' as 'badminton' | 'cricket',
    totalSpots: '4',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        router.push('/login');
        return;
      }

      // Check if user is admin
      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (!profile || !['super_admin', 'slot_manager'].includes(profile.role)) {
        throw new Error('You do not have permission to create slots');
      }

      // Create slot
      const { error: insertError } = await supabase.from('slots').insert({
        date: formData.date,
        time: formData.time,
        location: formData.location,
        sport: formData.sport,
        total_spots: parseInt(formData.totalSpots),
        booked_user_ids: [],
        waitlist: [],
        status: 'open',
        created_by: authData.user.id,
      });

      if (insertError) throw insertError;

      setSuccess(true);
      // Reset form
      setFormData({
        date: '',
        time: '',
        location: '',
        sport: 'badminton',
        totalSpots: '4',
      });

      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/slots');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to create slot');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Slot Created!</h2>
          <p className="text-gray-600 mb-4">
            The slot has been created successfully and is now available for booking.
          </p>
          <p className="text-sm text-gray-500">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Create New Slot</h1>
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
              ← Back
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Slot Details</h2>
            <p className="text-gray-600">
              Create a new slot that members can book. Make sure to set the correct date and capacity.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Sport */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sport</label>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="sport"
                    value="badminton"
                    checked={formData.sport === 'badminton'}
                    onChange={(e) => setFormData({ ...formData, sport: 'badminton' })}
                    className="mr-2"
                  />
                  🏸 Badminton
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="sport"
                    value="cricket"
                    checked={formData.sport === 'cricket'}
                    onChange={(e) => setFormData({ ...formData, sport: 'cricket' })}
                    className="mr-2"
                  />
                  🏏 Cricket
                </label>
              </div>
            </div>

            {/* Date */}
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                Date
              </label>
              <input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Time */}
            <div>
              <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-2">
                Time
              </label>
              <input
                id="time"
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Location */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                Location
              </label>
              <input
                id="location"
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
                placeholder="e.g., Main Court, Field #1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Total Spots */}
            <div>
              <label htmlFor="totalSpots" className="block text-sm font-medium text-gray-700 mb-2">
                Total Spots
              </label>
              <input
                id="totalSpots"
                type="number"
                min="1"
                max="20"
                value={formData.totalSpots}
                onChange={(e) => setFormData({ ...formData, totalSpots: e.target.value })}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Recommended: 4 for badminton doubles, 10 for cricket
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Creating Slot...' : 'Create Slot'}
            </button>
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>💡 Note:</strong> Once created, the slot will immediately appear in the "Available Slots"
              page for members to book.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
