import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
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

    // Handle refund logic - wait until game time for replacement
    // Refund is blocked until either:
    // 1. Someone new books the slot (replacement found), OR
    // 2. Game time passes without replacement (no refund - forfeited)

    await handleWaitlistAndRefund(booking.slot_id, booking.slot_id, booking.user_id, slotDate, booking.amount_paid);

    return NextResponse.json({
      success: true,
      message: `Booking cancelled. Refund of €${booking.amount_paid} will be processed if a replacement is found before ${slotDate.toLocaleDateString()}.`,
      refundStatus: 'pending',
      expiresAt: slotDate.toISOString(),
    });
  } catch (error: any) {
    console.error('Error cancelling booking:', error);
    return NextResponse.json({ error: error.message || 'Failed to cancel booking' }, { status: 500 });
  }
}

async function handleWaitlistAndRefund(bookingId: string, slotId: string, cancelledUserId: string, gameDate: Date, amount: number) {
  // Get slot details
  const { data: slot } = await supabase
    .from('slots')
    .select('*')
    .eq('id', slotId)
    .single();

  if (!slot) return;

  // Create pending refund that expires at game time
  console.log('Creating pending refund for user:', cancelledUserId, 'expires at:', gameDate.toISOString());

  await supabase.from('pending_refunds').insert({
    user_id: cancelledUserId,
    slot_id: slotId,
    booking_id: bookingId,
    amount: amount,
    reason: 'cancelled_awaiting_replacement',
    expires_at: gameDate.toISOString(), // Expires at game time, not 12 hours
  });

  // Get waitlist bookings sorted by created_at
  const { data: waitlistBookings } = await supabase
    .from('bookings')
    .select('*')
    .eq('slot_id', slotId)
    .eq('status', 'waitlist')
    .order('created_at', { ascending: true });

  if (waitlistBookings && waitlistBookings.length > 0) {
    // Notify waitlist members that slot is available
    console.log(`Notifying ${waitlistBookings.length} waitlist member(s)`);

    for (const waitlistBooking of waitlistBookings) {
      // Send in-app notification
      await supabase.from('notifications').insert({
        user_id: waitlistBooking.user_id,
        type: 'waitlist_available',
        title: 'Slot Available!',
        message: `A spot opened up for ${slot.sport} on ${slot.date} at ${slot.time}. Book now!`,
        action_url: `/slots`,
      });

      // Send push notification
      await sendPushNotification(waitlistBooking.user_id, {
        title: '🏸 Slot Available!',
        body: `${slot.sport} on ${slot.date} at ${slot.time} - Book now!`,
        url: `/slots`,
      });
    }
  }
}

async function sendPushNotification(userId: string, notification: { title: string; body: string; url: string }) {
  try {
    // Get user's push subscription
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (!subscriptions || subscriptions.length === 0) {
      console.log('No push subscriptions for user:', userId);
      return;
    }

    const webpush = require('web-push');

    // Configure VAPID keys
    webpush.setVapidDetails(
      'mailto:admin@smashersclub.com',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    // Send to all user's devices
    for (const subscription of subscriptions) {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.p256dh,
              auth: subscription.auth,
            },
          },
          JSON.stringify({
            title: notification.title,
            body: notification.body,
            icon: '/icon-192x192.png',
            badge: '/icon-192x192.png',
            data: {
              url: notification.url,
            },
          })
        );
        console.log('✅ Push notification sent to user:', userId);
      } catch (error) {
        console.error('Failed to send push notification:', error);
        // If subscription is invalid, remove it
        if ((error as any).statusCode === 410) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', subscription.id);
        }
      }
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
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
