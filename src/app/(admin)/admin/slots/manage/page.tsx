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
  created_at: string;
}

interface SlotBookingMember {
  id: string;
  slot_id: string;
  user_id: string;
  status: 'confirmed' | 'waitlist' | 'cancelled';
  created_at: string;
  cancelled_at?: string | null;
  users: {
    name: string;
    email: string;
    phone?: string | null;
  }[] | null;
}

export default function ManageSlotsPage() {
  const router = useRouter();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('upcoming');
  const [sportFilter, setSportFilter] = useState<'all' | 'badminton' | 'cricket'>('all');
  const [slotBookingsMap, setSlotBookingsMap] = useState<Record<string, SlotBookingMember[]>>({});
  const [expandedSlotId, setExpandedSlotId] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAndLoadSlots();

    // Set up real-time subscription for slot and booking updates
    const slotsChannel = supabase
      .channel('admin-slots-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'slots',
        },
        (payload) => {
          console.log('Admin: Slot change detected:', payload);
          loadSlots();
        }
      )
      .subscribe();

    const bookingsChannel = supabase
      .channel('admin-bookings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bookings',
        },
        (payload) => {
          console.log('Admin: Booking change detected:', payload);
          loadSlots();
        }
      )
      .subscribe();

    // Cleanup subscriptions on unmount
    return () => {
      supabase.removeChannel(slotsChannel);
      supabase.removeChannel(bookingsChannel);
    };
  }, [filter, sportFilter]);

  const checkAdminAndLoadSlots = async () => {
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
        router.push('/dashboard');
        return;
      }

      await loadSlots();
    } catch (error) {
      console.error('Error:', error);
      router.push('/dashboard');
    }
  };

  const loadSlots = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      let query = supabase
        .from('slots')
        .select('*');

      // Apply date filter
      if (filter === 'upcoming') {
        query = query.gte('date', today);
      } else if (filter === 'past') {
        query = query.lt('date', today);
      }

      // Apply sport filter
      if (sportFilter !== 'all') {
        query = query.eq('sport', sportFilter);
      }

      query = query
        .order('date', { ascending: filter === 'past' ? false : true })
        .order('time', { ascending: true });

      const { data, error } = await query;

      if (error) throw error;

      const loadedSlots = data || [];
      setSlots(loadedSlots);

      const slotIds = loadedSlots.map((slot) => slot.id);
      if (slotIds.length === 0) {
        setSlotBookingsMap({});
        return;
      }

      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('id, slot_id, user_id, status, created_at, cancelled_at, users(name, email, phone)')
        .in('slot_id', slotIds)
        .in('status', ['confirmed', 'waitlist', 'cancelled'])
        .order('created_at', { ascending: true });

      if (bookingsError) {
        console.error('Error loading booking members:', bookingsError);
        setSlotBookingsMap({});
        return;
      }

      const grouped = (bookingsData || []).reduce((acc, booking) => {
        if (!acc[booking.slot_id]) {
          acc[booking.slot_id] = [];
        }
        acc[booking.slot_id].push(booking as SlotBookingMember);
        return acc;
      }, {} as Record<string, SlotBookingMember[]>);

      setSlotBookingsMap(grouped);
    } catch (error) {
      console.error('Error loading slots:', error);
    } finally {
      setLoading(false);
    }
  };

  const getBookingStatusCounts = (slotId: string) => {
    const bookings = slotBookingsMap[slotId] || [];
    return {
      confirmed: bookings.filter((b) => b.status === 'confirmed').length,
      waitlist: bookings.filter((b) => b.status === 'waitlist').length,
      cancelled: bookings.filter((b) => b.status === 'cancelled').length,
    };
  };

  const toggleSlotDetails = (slotId: string) => {
    setExpandedSlotId((prev) => (prev === slotId ? null : slotId));
  };

  const handleDeleteSlot = async (slot: Slot) => {
    const hasBookings = slot.booked_user_ids.length > 0;

    const confirmMessage = hasBookings
      ? `⚠️ WARNING: This slot has ${slot.booked_user_ids.length} booking(s)!\n\nDeleting this slot will:\n- Remove all bookings\n- Not refund users automatically\n\nAre you sure you want to delete this slot?`
      : 'Are you sure you want to delete this slot?';

    if (!confirm(confirmMessage)) {
      return;
    }

    setDeleting(slot.id);

    try {
      // If there are bookings, handle them first
      if (hasBookings) {
        // Option 1: Just delete (CASCADE will handle related records)
        // Option 2: Create refunds first (more complex but better UX)

        // For now, we'll just delete and let CASCADE handle it
        // In production, you might want to:
        // 1. Get all bookings for this slot
        // 2. Create refund transactions
        // 3. Update user balances
        // 4. Then delete the slot
      }

      const { error } = await supabase
        .from('slots')
        .delete()
        .eq('id', slot.id);

      if (error) throw error;

      alert(`Slot deleted successfully!${hasBookings ? ' Bookings have been removed.' : ''}`);
      await loadSlots();
    } catch (error: any) {
      alert(error.message || 'Failed to delete slot');
    } finally {
      setDeleting(null);
    }
  };

  const handleCancelSlot = async (slot: Slot) => {
    if (!confirm(`Mark this slot as cancelled? This will prevent new bookings but preserve existing ones.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('slots')
        .update({ status: 'cancelled' })
        .eq('id', slot.id);

      if (error) throw error;

      alert('Slot marked as cancelled');
      await loadSlots();
    } catch (error: any) {
      alert(error.message || 'Failed to cancel slot');
    }
  };

  const handleReactivateSlot = async (slot: Slot) => {
    try {
      const newStatus = slot.booked_user_ids.length >= slot.total_spots ? 'full' : 'open';

      const { error } = await supabase
        .from('slots')
        .update({ status: newStatus })
        .eq('id', slot.id);

      if (error) throw error;

      alert('Slot reactivated');
      await loadSlots();
    } catch (error: any) {
      alert(error.message || 'Failed to reactivate slot');
    }
  };

  const filteredSlots = slots;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="text-4xl mb-4">⏳</div>
          <p className="text-gray-600">Loading slots...</p>
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
            <h1 className="text-2xl font-bold text-gray-900">Manage Slots</h1>
            <div className="flex gap-4">
              <Link
                href="/admin/slots/create"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-blue-700"
              >
                ➕ Create New Slot
              </Link>
              <Link href="/dashboard" className="text-blue-600 hover:text-blue-700">
                Home
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center">
            {/* Time Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => setFilter('upcoming')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  filter === 'upcoming'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Upcoming
              </button>
              <button
                onClick={() => setFilter('past')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  filter === 'past'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Past
              </button>
            </div>

            <div className="border-l border-gray-300 h-8"></div>

            {/* Sport Filter */}
            <div className="flex gap-2">
              <button
                onClick={() => setSportFilter('all')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  sportFilter === 'all'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                All Sports
              </button>
              <button
                onClick={() => setSportFilter('badminton')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  sportFilter === 'badminton'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🏸 Badminton
              </button>
              <button
                onClick={() => setSportFilter('cricket')}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  sportFilter === 'cricket'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                🏏 Cricket
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-blue-600">{slots.length}</div>
            <div className="text-sm text-gray-600">Total Slots</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-green-600">
              {slots.filter((s) => s.status === 'open').length}
            </div>
            <div className="text-sm text-gray-600">Open</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-amber-600">
              {slots.filter((s) => s.status === 'full').length}
            </div>
            <div className="text-sm text-gray-600">Full</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-2xl font-bold text-red-600">
              {slots.filter((s) => s.status === 'cancelled').length}
            </div>
            <div className="text-sm text-gray-600">Cancelled</div>
          </div>
        </div>

        {/* Slots Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredSlots.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-600 mb-4">No slots found</p>
              <Link
                href="/admin/slots/create"
                className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
              >
                Create Your First Slot
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sport</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Capacity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Members</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredSlots.map((slot) => {
                    const statusCounts = getBookingStatusCounts(slot.id);
                    const slotBookings = slotBookingsMap[slot.id] || [];
                    const confirmedBookings = slotBookings.filter((b) => b.status === 'confirmed');
                    const waitlistBookings = slotBookings.filter((b) => b.status === 'waitlist');
                    const cancelledBookings = slotBookings.filter((b) => b.status === 'cancelled');
                    const isExpanded = expandedSlotId === slot.id;

                    return (
                    <>
                    <tr key={slot.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(slot.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{slot.time}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="flex items-center gap-1">
                          {slot.sport === 'badminton' ? '🏸' : '🏏'}
                          <span className="capitalize">{slot.sport}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{slot.location}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`font-semibold ${
                          slot.booked_user_ids.length >= slot.total_spots ? 'text-red-600' :
                          slot.booked_user_ids.length > 0 ? 'text-amber-600' :
                          'text-green-600'
                        }`}>
                          {slot.booked_user_ids.length}/{slot.total_spots}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            slot.status === 'open'
                              ? 'bg-green-100 text-green-800'
                              : slot.status === 'full'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {slot.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <span className="text-green-700">B: {statusCounts.confirmed}</span>
                          <span className="text-amber-700">W: {statusCounts.waitlist}</span>
                          <span className="text-red-700">C: {statusCounts.cancelled}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex gap-2">
                          <button
                            onClick={() => toggleSlotDetails(slot.id)}
                            className="text-blue-600 hover:text-blue-900 font-medium"
                          >
                            {isExpanded ? 'Hide Members' : 'View Members'}
                          </button>
                          {slot.status === 'cancelled' ? (
                            <button
                              onClick={() => handleReactivateSlot(slot)}
                              className="text-green-600 hover:text-green-900 font-medium"
                            >
                              ↶ Reactivate
                            </button>
                          ) : (
                            <button
                              onClick={() => handleCancelSlot(slot)}
                              className="text-amber-600 hover:text-amber-900 font-medium"
                            >
                              ⊘ Cancel
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteSlot(slot)}
                            disabled={deleting === slot.id}
                            className="text-red-600 hover:text-red-900 font-medium disabled:text-gray-400"
                          >
                            {deleting === slot.id ? '⏳' : '🗑️'} Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={8} className="px-6 py-4 bg-gray-50">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white border border-green-200 rounded-lg p-4">
                              <h4 className="font-semibold text-green-800 mb-3">
                                Confirmed ({confirmedBookings.length})
                              </h4>
                              {confirmedBookings.length === 0 ? (
                                <p className="text-sm text-gray-500">No confirmed bookings.</p>
                              ) : (
                                <ul className="space-y-2">
                                  {confirmedBookings.map((booking) => (
                                    <li key={booking.id} className="text-sm text-gray-800">
                                      <div className="font-medium">{booking.users?.[0]?.name || 'Unknown User'}</div>
                                      <div className="text-gray-600">{booking.users?.[0]?.email || 'No email'}</div>
                                      {booking.users?.[0]?.phone && (
                                        <div className="text-gray-600">{booking.users[0].phone}</div>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>

                            <div className="bg-white border border-amber-200 rounded-lg p-4">
                              <h4 className="font-semibold text-amber-800 mb-3">
                                Waitlist ({waitlistBookings.length})
                              </h4>
                              {waitlistBookings.length === 0 ? (
                                <p className="text-sm text-gray-500">No waitlisted members.</p>
                              ) : (
                                <ul className="space-y-2">
                                  {waitlistBookings.map((booking) => (
                                    <li key={booking.id} className="text-sm text-gray-800">
                                      <div className="font-medium">{booking.users?.[0]?.name || 'Unknown User'}</div>
                                      <div className="text-gray-600">{booking.users?.[0]?.email || 'No email'}</div>
                                      {booking.users?.[0]?.phone && (
                                        <div className="text-gray-600">{booking.users[0].phone}</div>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>

                            <div className="bg-white border border-red-200 rounded-lg p-4">
                              <h4 className="font-semibold text-red-800 mb-3">
                                Cancelled ({cancelledBookings.length})
                              </h4>
                              {cancelledBookings.length === 0 ? (
                                <p className="text-sm text-gray-500">No cancellations.</p>
                              ) : (
                                <ul className="space-y-2">
                                  {cancelledBookings.map((booking) => (
                                    <li key={booking.id} className="text-sm text-gray-800">
                                      <div className="font-medium">{booking.users?.[0]?.name || 'Unknown User'}</div>
                                      <div className="text-gray-600">{booking.users?.[0]?.email || 'No email'}</div>
                                      {booking.users?.[0]?.phone && (
                                        <div className="text-gray-600">{booking.users[0].phone}</div>
                                      )}
                                      {booking.cancelled_at && (
                                        <div className="text-xs text-gray-500">
                                          Cancelled: {new Date(booking.cancelled_at).toLocaleString()}
                                        </div>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                    </>
                  );})}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Warning Box */}
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <h3 className="font-semibold text-amber-900 mb-1">Important Notes</h3>
              <ul className="text-sm text-amber-800 space-y-1">
                <li>• <strong>Cancel</strong>: Prevents new bookings but keeps existing ones</li>
                <li>• <strong>Delete</strong>: Permanently removes the slot and all bookings</li>
                <li>• Deleting slots with bookings will NOT automatically refund users</li>
                <li>• Consider manually refunding affected users from the Members page</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
