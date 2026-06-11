'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Booking {
  id: string;
  status: 'confirmed' | 'waitlist' | 'cancelled';
  amount_paid: number;
  booked_at: string;
  slots: {
    date: string;
    time: string;
    location: string;
    sport: string;
  };
}

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    try {
      const { data: authData } = await supabase.auth.getUser();

      if (!authData.user) {
        router.push('/login');
        return;
      }

      const { data, error } = await supabase
        .from('bookings')
        .select(`
          id,
          status,
          amount_paid,
          booked_at,
          slots (
            date,
            time,
            location,
            sport
          )
        `)
        .eq('user_id', authData.user.id)
        .order('booked_at', { ascending: false });

      if (error) throw error;

      setBookings(data as any || []);
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm('Are you sure you want to cancel this booking? Refund depends on replacement availability.')) {
      return;
    }

    setCancellingId(bookingId);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const token = (await supabase.auth.getSession()).data.session?.access_token;

      const response = await fetch('/api/bookings/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ bookingId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel booking');
      }

      alert(data.message);
      await loadBookings();
    } catch (error: any) {
      alert(error.message || 'Failed to cancel booking');
    } finally {
      setCancellingId(null);
    }
  };

  const confirmedBookings = bookings.filter((b) => b.status === 'confirmed');
  const waitlistBookings = bookings.filter((b) => b.status === 'waitlist');

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
            <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Confirmed Bookings */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            ✅ Confirmed Bookings ({confirmedBookings.length})
          </h2>
          {confirmedBookings.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-600 mb-4">No confirmed bookings yet</p>
              <Link
                href="/slots"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
              >
                Book Your First Slot
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {confirmedBookings.map((booking) => (
                <div key={booking.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">
                      {booking.slots.sport === 'badminton' ? '🏸' : '🏏'}
                    </span>
                    <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded font-semibold">
                      Confirmed
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 capitalize">
                    {booking.slots.sport}
                  </h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p className="font-medium">
                      {new Date(booking.slots.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p>{booking.slots.time}</p>
                    <p>📍 {booking.slots.location}</p>
                    <p className="text-gray-500 text-xs mt-2">
                      Paid: €{booking.amount_paid.toFixed(2)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleCancelBooking(booking.id)}
                    disabled={cancellingId === booking.id}
                    className="mt-4 w-full bg-red-50 text-red-600 py-2 rounded-lg text-sm font-medium hover:bg-red-100 disabled:bg-gray-100 disabled:text-gray-400"
                  >
                    {cancellingId === booking.id ? 'Cancelling...' : 'Cancel Booking'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Waitlist Bookings */}
        {waitlistBookings.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              ⏳ Waitlist ({waitlistBookings.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {waitlistBookings.map((booking) => (
                <div key={booking.id} className="bg-white rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl">
                      {booking.slots.sport === 'badminton' ? '🏸' : '🏏'}
                    </span>
                    <span className="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded font-semibold">
                      Waitlist
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2 capitalize">
                    {booking.slots.sport}
                  </h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p className="font-medium">
                      {new Date(booking.slots.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p>{booking.slots.time}</p>
                    <p>📍 {booking.slots.location}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      You'll be notified if a spot opens up
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {bookings.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xl text-gray-600 mb-2">No bookings yet</p>
            <p className="text-gray-500 mb-6">Book your first slot to start playing!</p>
            <Link
              href="/slots"
              className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700"
            >
              Browse Available Slots
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
