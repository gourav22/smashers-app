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
  const [createdCount, setCreatedCount] = useState(0);
  const [bulkMode, setBulkMode] = useState(false);

  const [formData, setFormData] = useState({
    date: '',
    time: '',
    location: '',
    sport: 'badminton' as 'badminton' | 'cricket',
    totalSpots: '4',
  });

  const [bulkData, setBulkData] = useState({
    startDate: '',
    endDate: '',
    time: '',
    location: '',
    sport: 'badminton' as 'badminton' | 'cricket',
    totalSpots: '4',
    daysOfWeek: [] as number[], // 0=Sunday, 1=Monday, etc.
  });

  const handleSingleSubmit = async (e: React.FormEvent) => {
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

      setCreatedCount(1);
      setSuccess(true);

      setTimeout(() => {
        router.push('/admin/slots/manage');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to create slot');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', authData.user.id)
        .single();

      if (!profile || !['super_admin', 'slot_manager'].includes(profile.role)) {
        throw new Error('You do not have permission to create slots');
      }

      if (bulkData.daysOfWeek.length === 0) {
        throw new Error('Please select at least one day of the week');
      }

      // Generate all dates
      const startDate = new Date(bulkData.startDate);
      const endDate = new Date(bulkData.endDate);
      const slots = [];

      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dayOfWeek = date.getDay();

        if (bulkData.daysOfWeek.includes(dayOfWeek)) {
          slots.push({
            date: date.toISOString().split('T')[0],
            time: bulkData.time,
            location: bulkData.location,
            sport: bulkData.sport,
            total_spots: parseInt(bulkData.totalSpots),
            booked_user_ids: [],
            waitlist: [],
            status: 'open',
            created_by: authData.user.id,
          });
        }
      }

      if (slots.length === 0) {
        throw new Error('No slots to create with selected criteria');
      }

      // Create all slots
      const { error: insertError } = await supabase.from('slots').insert(slots);

      if (insertError) throw insertError;

      setCreatedCount(slots.length);
      setSuccess(true);

      setTimeout(() => {
        router.push('/admin/slots/manage');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to create slots');
    } finally {
      setLoading(false);
    }
  };

  const toggleDay = (day: number) => {
    setBulkData(prev => ({
      ...prev,
      daysOfWeek: prev.daysOfWeek.includes(day)
        ? prev.daysOfWeek.filter(d => d !== day)
        : [...prev.daysOfWeek, day]
    }));
  };

  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {createdCount} Slot{createdCount > 1 ? 's' : ''} Created!
          </h2>
          <p className="text-gray-600 mb-4">
            The slot{createdCount > 1 ? 's have' : ' has'} been created successfully and {createdCount > 1 ? 'are' : 'is'} now available for booking.
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
            <h1 className="text-2xl font-bold text-gray-900">Create New Slot{bulkMode ? 's' : ''}</h1>
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
              ← Back
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Mode Toggle */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setBulkMode(false)}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                !bulkMode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Single Slot
            </button>
            <button
              onClick={() => setBulkMode(true)}
              className={`px-6 py-2 rounded-lg font-semibold transition ${
                bulkMode
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Bulk Create (Multiple Days)
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-8">
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {bulkMode ? 'Bulk Slot Creation' : 'Single Slot Details'}
            </h2>
            <p className="text-gray-600">
              {bulkMode
                ? 'Create multiple slots for recurring days over a period of time.'
                : 'Create a new slot that members can book. Make sure to set the correct date and capacity.'}
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {!bulkMode ? (
            // Single Slot Form
            <form onSubmit={handleSingleSubmit} className="space-y-6">
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
                      onChange={() => setFormData({ ...formData, sport: 'badminton' })}
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
                      onChange={() => setFormData({ ...formData, sport: 'cricket' })}
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Recommended: 4 for badminton doubles, 10 for cricket
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Creating Slot...' : 'Create Slot'}
              </button>
            </form>
          ) : (
            // Bulk Slots Form
            <form onSubmit={handleBulkSubmit} className="space-y-6">
              {/* Sport */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sport</label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="bulkSport"
                      value="badminton"
                      checked={bulkData.sport === 'badminton'}
                      onChange={() => setBulkData({ ...bulkData, sport: 'badminton' })}
                      className="mr-2"
                    />
                    🏸 Badminton
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="bulkSport"
                      value="cricket"
                      checked={bulkData.sport === 'cricket'}
                      onChange={() => setBulkData({ ...bulkData, sport: 'cricket' })}
                      className="mr-2"
                    />
                    🏏 Cricket
                  </label>
                </div>
              </div>

              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                    Start Date
                  </label>
                  <input
                    id="startDate"
                    type="date"
                    value={bulkData.startDate}
                    onChange={(e) => setBulkData({ ...bulkData, startDate: e.target.value })}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>
                <div>
                  <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                    End Date
                  </label>
                  <input
                    id="endDate"
                    type="date"
                    value={bulkData.endDate}
                    onChange={(e) => setBulkData({ ...bulkData, endDate: e.target.value })}
                    required
                    min={bulkData.startDate || new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                  />
                </div>
              </div>

              {/* Days of Week */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Days of Week
                </label>
                <div className="flex flex-wrap gap-2">
                  {days.map((day, index) => (
                    <button
                      key={index}
                      type="button"
                      onClick={() => toggleDay(index)}
                      className={`px-4 py-2 rounded-lg font-semibold transition ${
                        bulkData.daysOfWeek.includes(index)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Select all days you want to create slots for
                </p>
              </div>

              {/* Time */}
              <div>
                <label htmlFor="bulkTime" className="block text-sm font-medium text-gray-700 mb-2">
                  Time
                </label>
                <input
                  id="bulkTime"
                  type="time"
                  value={bulkData.time}
                  onChange={(e) => setBulkData({ ...bulkData, time: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>

              {/* Location */}
              <div>
                <label htmlFor="bulkLocation" className="block text-sm font-medium text-gray-700 mb-2">
                  Location
                </label>
                <input
                  id="bulkLocation"
                  type="text"
                  value={bulkData.location}
                  onChange={(e) => setBulkData({ ...bulkData, location: e.target.value })}
                  required
                  placeholder="e.g., Main Court, Field #1"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
                />
              </div>

              {/* Total Spots */}
              <div>
                <label htmlFor="bulkTotalSpots" className="block text-sm font-medium text-gray-700 mb-2">
                  Total Spots
                </label>
                <input
                  id="bulkTotalSpots"
                  type="number"
                  min="1"
                  max="20"
                  value={bulkData.totalSpots}
                  onChange={(e) => setBulkData({ ...bulkData, totalSpots: e.target.value })}
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
              >
                {loading ? 'Creating Slots...' : 'Create Multiple Slots'}
              </button>
            </form>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <strong>💡 {bulkMode ? 'Bulk Mode' : 'Note'}:</strong>{' '}
              {bulkMode
                ? 'This will create one slot for each selected day of the week within the date range.'
                : 'Once created, the slot will immediately appear in the "Available Slots" page for members to book.'}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
