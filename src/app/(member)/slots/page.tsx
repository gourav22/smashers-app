'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Slot {
  id: string;
  date: string;
  time: string;
  location: string;
  sport: 'badminton' | 'cricket';
  total_spots: number;
  booked_user_ids: string[];
  status: 'open' | 'full' | 'cancelled';
}

export default function SlotsPage() {
  const router = useRouter();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [userBalance, setUserBalance] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'badminton' | 'cricket'>('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        router.push('/login');
        return;
      }

      setUserId(authData.user.id);

      // Get user balance
      const { data: profile } = await supabase
        .from('users')
        .select('balance')
        .eq('id', authData.user.id)
        .single();

      if (profile) {
        setUserBalance(profile.balance);
      }

      // Get slots
      const { data: slotsData, error } = await supabase
        .from('slots')
        .select('*')
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) throw error;

      setSlots(slotsData || []);
    } catch (error) {
      console.error('Error loading slots:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBookSlot = async (slotId: string) => {
    if (!userId) return;

    setBooking(slotId);

    try {
      const bookingCost = parseInt(process.env.NEXT_PUBLIC_BOOKING_COST || '4');

      if (userBalance < bookingCost) {
        alert(`Insufficient balance! You need €${bookingCost} to book a slot.`);
        return;
      }

      // Call booking API (we'll create this next)
      const response = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slotId, userId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to book slot');
      }

      alert('Slot booked successfully! €4 deducted from your balance.');
      loadData(); // Reload data
    } catch (error: any) {
      alert(error.message || 'Failed to book slot');
    } finally {
      setBooking(null);
    }
  };

  const isSlotBookedByUser = (slot: Slot) => {
    return userId && slot.booked_user_ids.includes(userId);
  };

  const filteredSlots = slots.filter((slot) => {
    if (filter === 'all') return true;
    return slot.sport === filter;
  });

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Available Slots</h1>
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Balance Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Your Balance</p>
              <p className="text-2xl font-bold text-gray-900">€{userBalance.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-600">Games Available</p>
              <p className="text-2xl font-bold text-green-600">
                {Math.floor(userBalance / parseInt(process.env.NEXT_PUBLIC_BOOKING_COST || '4'))}
              </p>
            </div>
          </div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            All Sports
          </button>
          <button
            onClick={() => setFilter('badminton')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'badminton'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            🏸 Badminton
          </button>
          <button
            onClick={() => setFilter('cricket')}
            className={`px-4 py-2 rounded-lg font-medium ${
              filter === 'cricket'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 border border-gray-300'
            }`}
          >
            🏏 Cricket
          </button>
        </div>

        {/* Slots Grid */}
        {filteredSlots.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-xl text-gray-600 mb-4">No slots available</p>
            <p className="text-gray-500">Check back later or contact admin to create slots.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSlots.map((slot) => {
              const availableSpots = slot.total_spots - slot.booked_user_ids.length;
              const isFull = availableSpots === 0;
              const isBookedByMe = isSlotBookedByUser(slot);
              const isAlmostFull = availableSpots <= 2 && !isFull;

              return (
                <div key={slot.id} className="bg-white rounded-lg shadow hover:shadow-lg transition">
                  <div className="p-6">
                    {/* Sport & Status */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">
                        {slot.sport === 'badminton' ? '🏸' : '🏏'}
                      </span>
                      {isAlmostFull && !isBookedByMe && (
                        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded font-semibold">
                          🔥 HOT SLOT!
                        </span>
                      )}
                      {isBookedByMe && (
                        <span className="bg-green-500 text-white text-xs px-2 py-1 rounded font-semibold">
                          ✅ BOOKED
                        </span>
                      )}
                    </div>

                    {/* Sport Name */}
                    <h3 className="text-lg font-semibold text-gray-900 mb-2 capitalize">
                      {slot.sport}
                    </h3>

                    {/* Date & Time */}
                    <p className="text-gray-600 mb-1">
                      {new Date(slot.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-gray-600 mb-3">{slot.time}</p>

                    {/* Location */}
                    <p className="text-sm text-gray-500 mb-4">📍 {slot.location}</p>

                    {/* Capacity */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Capacity</span>
                        <span className={`font-semibold ${isFull ? 'text-red-600' : 'text-green-600'}`}>
                          {slot.booked_user_ids.length}/{slot.total_spots}
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            isFull ? 'bg-red-500' : 'bg-green-500'
                          }`}
                          style={{
                            width: `${(slot.booked_user_ids.length / slot.total_spots) * 100}%`,
                          }}
                        ></div>
                      </div>
                      {isAlmostFull && !isFull && !isBookedByMe && (
                        <p className="text-xs text-red-600 mt-1">⏱️ Only {availableSpots} spots left!</p>
                      )}
                    </div>

                    {/* Action Button */}
                    {isBookedByMe ? (
                      <button
                        disabled
                        className="w-full bg-gray-300 text-gray-600 py-2 rounded-lg font-semibold cursor-not-allowed"
                      >
                        Already Booked
                      </button>
                    ) : isFull ? (
                      <button
                        disabled
                        className="w-full bg-gray-300 text-gray-600 py-2 rounded-lg font-semibold cursor-not-allowed"
                      >
                        Full (Waitlist Coming Soon)
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBookSlot(slot.id)}
                        disabled={booking === slot.id || userBalance < 4}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
                      >
                        {booking === slot.id ? 'Booking...' : `Book for €${process.env.NEXT_PUBLIC_BOOKING_COST || 4}`}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
