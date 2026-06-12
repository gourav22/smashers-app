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
  cancelled_at: string | null;
  slots: {
    id: string;
    date: string;
    time: string;
    location: string;
    sport: string;
    booked_user_ids: string[];
  };
}

interface PendingRefund {
  id: string;
  amount: number;
  status: string;
  expires_at: string;
  created_at: string;
}


export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [pendingRefunds, setPendingRefunds] = useState<Record<string, PendingRefund>>({});
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [undoingId, setUndoingId] = useState<string | null>(null);

  useEffect(() => {
    loadBookings();

    // Set up real-time subscriptions for booking updates
    const bookingsChannel = supabase
      .channel('user-bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        (payload) => {
          console.log('Booking change detected:', payload);
          loadBookings();
        }
      )
      .subscribe();

    // Listen to pending_refunds for refund status updates
    const refundsChannel = supabase
      .channel('user-refunds-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'pending_refunds',
        },
        (payload) => {
          console.log('Refund change detected:', payload);
          loadBookings();
        }
      )
      .subscribe();

    // Listen to slots for slot status changes (in case slot gets cancelled by admin)
    const slotsChannel = supabase
      .channel('user-slots-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'slots',
        },
        (payload) => {
          console.log('Slot change detected:', payload);
          loadBookings();
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(bookingsChannel);
      supabase.removeChannel(refundsChannel);
      supabase.removeChannel(slotsChannel);
    };
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
          cancelled_at,
          slots (
            id,
            date,
            time,
            location,
            sport,
            booked_user_ids
          )
        `)
        .eq('user_id', authData.user.id)
        .order('booked_at', { ascending: false});

      if (error) throw error;

      setBookings(data as any || []);

      // Load pending refunds for cancelled bookings
      const { data: refundsData, error: refundsError } = await supabase
        .from('pending_refunds')
        .select('*')
        .eq('user_id', authData.user.id);

      console.log('📊 Pending refunds:', refundsData, refundsError);

      if (refundsData) {
        const refundsMap: Record<string, PendingRefund> = {};
        refundsData.forEach((refund: any) => {
          if (refund.booking_id) {
            refundsMap[refund.booking_id] = refund;
            console.log('✅ Mapped refund for booking:', refund.booking_id, refund.status);
          }
        });
        setPendingRefunds(refundsMap);
      }
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

  const handleUndoCancel = async (booking: Booking) => {
    if (!confirm('Undo cancellation and restore your booking?')) {
      return;
    }

    setUndoingId(booking.id);

    try {
      const { data: authData } = await supabase.auth.getUser();

      // Check if user has sufficient balance
      const { data: userData } = await supabase
        .from('users')
        .select('balance')
        .eq('id', authData.user!.id)
        .single();

      if (!userData || userData.balance < booking.amount_paid) {
        throw new Error('Insufficient balance to restore booking');
      }

      // Re-add user to slot
      const updatedUserIds = [...booking.slots.booked_user_ids, authData.user!.id];

      const { error: slotError } = await supabase
        .from('slots')
        .update({
          booked_user_ids: updatedUserIds,
          status: updatedUserIds.length >= 10 ? 'full' : 'open',
        })
        .eq('id', booking.slots.id);

      if (slotError) throw slotError;

      // Update booking status back to confirmed
      const { error: bookingError } = await supabase
        .from('bookings')
        .update({
          status: 'confirmed',
          cancelled_at: null,
        })
        .eq('id', booking.id);

      if (bookingError) throw bookingError;

      // Delete pending refund if exists
      if (pendingRefunds[booking.id]) {
        await supabase
          .from('pending_refunds')
          .delete()
          .eq('booking_id', booking.id);
      }

      alert('Booking restored successfully!');
      await loadBookings();
    } catch (error: any) {
      alert(error.message || 'Failed to undo cancellation');
    } finally {
      setUndoingId(null);
    }
  };

  const confirmedBookings = bookings.filter((b) => b.status === 'confirmed');
  const waitlistBookings = bookings.filter((b) => b.status === 'waitlist');
  const cancelledBookings = bookings.filter((b) => b.status === 'cancelled');

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

        {/* Cancelled Bookings */}
        {cancelledBookings.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              ❌ Cancelled Bookings ({cancelledBookings.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cancelledBookings.map((booking) => {
                const refund = pendingRefunds[booking.id];
                const slotDateTime = new Date(`${booking.slots.date}T${booking.slots.time}`);
                const isPastSlot = slotDateTime < new Date();
                const canUndo = !isPastSlot && (!refund || refund.status === 'pending');

                console.log('🔍 Booking:', booking.id, 'Refund:', refund, 'canUndo:', canUndo, 'isPast:', isPastSlot);

                return (
                  <div key={booking.id} className="bg-white rounded-lg shadow p-6 border-2 border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-2xl">
                        {booking.slots.sport === 'badminton' ? '🏸' : '🏏'}
                      </span>
                      <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded font-semibold">
                        Cancelled
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

                      {isPastSlot ? (
                        <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                          <p className="font-semibold text-gray-700">⏰ Slot Already Passed</p>
                          <p className="text-gray-600">No refund - game already happened</p>
                        </div>
                      ) : refund ? (
                        refund.status === 'pending' ? (
                          <div className="mt-3 p-2 bg-yellow-50 rounded text-xs">
                            <p className="font-semibold text-yellow-800">⏳ Refund Pending</p>
                            <p className="text-yellow-700">€{(refund.amount / 100).toFixed(2)} will be refunded when slot fills</p>
                            <p className="text-yellow-600">Expires: {new Date(refund.expires_at).toLocaleDateString()}</p>
                          </div>
                        ) : refund.status === 'processed' ? (
                          <div className="mt-3 p-2 bg-green-50 rounded text-xs">
                            <p className="font-semibold text-green-800">✅ Refund Processed</p>
                            <p className="text-green-700">€{(refund.amount / 100).toFixed(2)} refunded</p>
                          </div>
                        ) : (
                          <div className="mt-3 p-2 bg-red-50 rounded text-xs">
                            <p className="font-semibold text-red-800">❌ Refund Expired</p>
                            <p className="text-red-700">No replacement found - no refund</p>
                          </div>
                        )
                      ) : (
                        <div className="mt-3 p-2 bg-blue-50 rounded text-xs">
                          <p className="font-semibold text-blue-800">⏳ Awaiting Refund Setup</p>
                          <p className="text-blue-700">Refund will be processed when slot fills</p>
                        </div>
                      )}
                    </div>

                    {canUndo && (
                      <button
                        onClick={() => handleUndoCancel(booking)}
                        disabled={undoingId === booking.id}
                        className="mt-4 w-full bg-blue-50 text-blue-600 py-2 rounded-lg text-sm font-medium hover:bg-blue-100 disabled:bg-gray-100 disabled:text-gray-400"
                      >
                        {undoingId === booking.id ? 'Restoring...' : '↶ Undo Cancellation'}
                      </button>
                    )}
                  </div>
                );
              })}
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
