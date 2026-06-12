import { createClient } from '@supabase/supabase-js';

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");
    const { subscriptionId, slotId, slotDate, reason } = await request.json();

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate inputs
    if (!subscriptionId || !slotId || !slotDate) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check 7-day advance notice
    const slotDateObj = new Date(slotDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const daysDifference = Math.ceil((slotDateObj.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysDifference < 7) {
      return NextResponse.json(
        { error: 'Cancellations require at least 7 days advance notice' },
        { status: 400 }
      );
    }

    // Verify subscription belongs to user
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .eq('user_id', user.id)
      .single();

    if (subError || !subscription) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    // Check if slot exists and user has booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('user_id', user.id)
      .eq('slot_id', slotId)
      .eq('status', 'confirmed')
      .single();

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      );
    }

    // Check if already cancelled
    const { data: existingCancellation } = await supabase
      .from('subscription_cancellations')
      .select('*')
      .eq('subscription_id', subscriptionId)
      .eq('slot_id', slotId)
      .single();

    if (existingCancellation) {
      return NextResponse.json(
        { error: 'Slot already cancelled' },
        { status: 400 }
      );
    }

    // Calculate refund (full booking cost)
    const refundAmount = booking.amount_paid || parseFloat(process.env.NEXT_PUBLIC_BOOKING_COST || '4');

    // Cancel the booking
    const { error: cancelError } = await supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
      })
      .eq('id', booking.id);

    if (cancelError) {
      console.error('Error cancelling booking:', cancelError);
      return NextResponse.json(
        { error: 'Failed to cancel booking' },
        { status: 500 }
      );
    }

    // Remove user from slot's booked_user_ids
    const { data: slot } = await supabase
      .from('slots')
      .select('booked_user_ids, total_spots')
      .eq('id', slotId)
      .single();

    if (slot) {
      const updatedUserIds = slot.booked_user_ids.filter((id: string) => id !== user.id);
      const newStatus = updatedUserIds.length < slot.total_spots ? 'open' : 'full';

      await supabase
        .from('slots')
        .update({
          booked_user_ids: updatedUserIds,
          status: newStatus,
        })
        .eq('id', slotId);
    }

    // Refund to user balance
    const { data: userProfile } = await supabase
      .from('users')
      .select('balance')
      .eq('id', user.id)
      .single();

    const newBalance = (userProfile?.balance || 0) + refundAmount;

    await supabase
      .from('users')
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq('id', user.id);

    // Create transaction record
    await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'refund',
      amount: refundAmount,
      balance_after: newBalance,
      metadata: {
        subscription_id: subscriptionId,
        slot_id: slotId,
        slot_date: slotDate,
        reason,
      },
    });

    // Record cancellation
    const { data: cancellation, error: cancelRecordError } = await supabase
      .from('subscription_cancellations')
      .insert({
        subscription_id: subscriptionId,
        user_id: user.id,
        slot_id: slotId,
        original_date: slotDate,
        refund_amount: refundAmount,
        reason,
      })
      .select()
      .single();

    if (cancelRecordError) {
      console.error('Error recording cancellation:', cancelRecordError);
    }

    return NextResponse.json({
      success: true,
      refundAmount,
      newBalance,
      cancellation,
    });
  } catch (error) {
    console.error('Error in subscriptions/cancel-slot endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
