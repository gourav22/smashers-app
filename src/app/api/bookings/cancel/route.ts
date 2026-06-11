import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { bookingId } = await request.json();

    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*, slots(*)')
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Verify user owns this booking
    if (booking.user_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized to cancel this booking' }, { status: 403 });
    }

    // Check if already cancelled
    if (booking.status === 'cancelled') {
      return NextResponse.json({ error: 'Booking already cancelled' }, { status: 400 });
    }

    // Calculate days until game
    const slotDate = new Date(booking.slots.date);
    const today = new Date();
    const daysUntilGame = Math.ceil((slotDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Update booking status
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (updateError) throw updateError;

    // Remove user from slot's booked_user_ids
    const updatedBookedUsers = booking.slots.booked_user_ids.filter((id: string) => id !== user.id);

    await supabase
      .from('slots')
      .update({
        booked_user_ids: updatedBookedUsers,
        status: updatedBookedUsers.length < booking.slots.total_spots ? 'open' : 'full',
      })
      .eq('id', booking.slot_id);

    // Handle refund and waitlist logic based on days until game
    if (daysUntilGame > 7) {
      // More than 7 days: Wait for replacement before refund
      await handleWaitlistNotification(booking.slot_id, booking.user_id, 'fifo');

      return NextResponse.json({
        success: true,
        message: 'Booking cancelled. Refund will be processed if a replacement is found.',
        refundStatus: 'pending',
      });
    } else if (daysUntilGame >= 1 && daysUntilGame <= 7) {
      // 1-7 days: FIFO waitlist with 12-hour timeout
      await handleWaitlistNotification(booking.slot_id, booking.user_id, 'fifo');

      return NextResponse.json({
        success: true,
        message: 'Booking cancelled. Refund will be processed if a replacement is found within 12 hours.',
        refundStatus: 'pending',
      });
    } else {
      // Game day: First-come-first-serve (notify all waitlist)
      await handleWaitlistNotification(booking.slot_id, booking.user_id, 'fcfs');

      return NextResponse.json({
        success: true,
        message: 'Booking cancelled. Refund will be processed if someone from waitlist confirms immediately.',
        refundStatus: 'pending',
      });
    }
  } catch (error: any) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json({ error: error.message || 'Failed to cancel booking' }, { status: 500 });
  }
}

async function handleWaitlistNotification(slotId: string, cancelledUserId: string, strategy: 'fifo' | 'fcfs') {
  // Get slot with waitlist
  const { data: slot } = await supabase
    .from('slots')
    .select('*, bookings!inner(*)')
    .eq('id', slotId)
    .single();

  if (!slot) return;

  // Get waitlist bookings sorted by created_at
  const { data: waitlistBookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('slot_id', slotId)
    .eq('status', 'waitlist')
    .order('created_at', { ascending: true });

  if (!waitlistBookings || waitlistBookings.length === 0) {
    // No one on waitlist, process refund immediately
    await processRefund(cancelledUserId, 4);
    return;
  }

  if (strategy === 'fifo') {
    // Notify first person on waitlist
    const firstInLine = waitlistBookings[0];
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 12); // 12-hour window

    await supabase.from('notifications').insert({
      user_id: firstInLine.user_id,
      type: 'waitlist_available',
      title: 'Slot Available!',
      message: `A spot opened up for ${slot.sport} on ${slot.date} at ${slot.time}. Confirm within 12 hours to claim it!`,
      action_url: `/bookings?confirm=${firstInLine.id}`,
      expires_at: expiresAt.toISOString(),
      metadata: {
        slot_id: slotId,
        booking_id: firstInLine.id,
        cancelled_user_id: cancelledUserId,
      },
    });
  } else {
    // Notify all waitlist members (first-come-first-serve)
    const notifications = waitlistBookings.map((booking) => ({
      user_id: booking.user_id,
      type: 'waitlist_available',
      title: 'Slot Available NOW!',
      message: `A spot opened up for ${slot.sport} on ${slot.date} at ${slot.time}. First to confirm gets it!`,
      action_url: `/bookings?confirm=${booking.id}`,
      metadata: {
        slot_id: slotId,
        booking_id: booking.id,
        cancelled_user_id: cancelledUserId,
      },
    }));

    await supabase.from('notifications').insert(notifications);
  }
}

async function processRefund(userId: string, amount: number) {
  // Get current user balance
  const { data: user } = await supabase
    .from('users')
    .select('balance')
    .eq('id', userId)
    .single();

  if (!user) return;

  const newBalance = user.balance + amount;

  // Update balance
  await supabase
    .from('users')
    .update({ balance: newBalance })
    .eq('id', userId);

  // Create transaction record
  await supabase.from('transactions').insert({
    user_id: userId,
    type: 'refund',
    amount: amount,
    balance_after: newBalance,
    metadata: {
      reason: 'Booking cancellation refund',
    },
  });

  // Notify user
  await supabase.from('notifications').insert({
    user_id: userId,
    type: 'refund',
    title: 'Refund Processed',
    message: `€${amount.toFixed(2)} has been refunded to your account.`,
  });
}
