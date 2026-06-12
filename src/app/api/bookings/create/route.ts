import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendPushToUser } from '@/lib/push-notifications-server';
import { BOOKING_COST } from '@/lib/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function POST(request: Request) {
  try {
    console.log('🔵 Booking API called');
    const { slotId, userId } = await request.json();
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    console.log('📦 Request data:', { slotId, userId: userId?.substring(0, 8), hasToken: !!token });

    if (!slotId || !userId) {
      console.log('❌ Missing slotId or userId');
      return NextResponse.json(
        { error: 'Missing slotId or userId' },
        { status: 400 }
      );
    }

    if (!token) {
      console.log('❌ No token provided');
      return NextResponse.json(
        { error: 'Unauthorized: No token provided' },
        { status: 401 }
      );
    }

    // Use anon client with token to verify user identity
    console.log('🔐 Verifying user token...');
    const supabaseAuth = createClient(supabaseUrl, supabaseKey);
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !userData.user) {
      console.log('❌ Auth error:', authError?.message);
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token' },
        { status: 401 }
      );
    }

    console.log('✅ User verified:', userData.user.id.substring(0, 8));

    // Verify user is trying to book for themselves
    if (userData.user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Cannot book for another user' },
        { status: 403 }
      );
    }

    // Create service role client (bypasses RLS) for database operations
    // User is already authenticated above, so we can trust the userId
    if (!serviceRoleKey) {
      console.log('❌ Service role key not configured');
      return NextResponse.json(
        { error: 'Server configuration error: Service role key required' },
        { status: 500 }
      );
    }

    console.log('🔑 Using SERVICE_ROLE key to bypass RLS');
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const bookingCost = BOOKING_COST;
    console.log('💰 Booking cost:', bookingCost);

    // Get user and slot data
    console.log('📊 Fetching user and slot data...');
    const [userResult, slotResult] = await Promise.all([
      supabase.from('users').select('balance').eq('id', userId).single(),
      supabase.from('slots').select('*').eq('id', slotId).single(),
    ]);

    if (userResult.error) {
      console.log('❌ User fetch error:', userResult.error);
      return NextResponse.json({ error: 'User not found', details: userResult.error.message }, { status: 404 });
    }

    if (slotResult.error) {
      console.log('❌ Slot fetch error:', slotResult.error);
      return NextResponse.json({ error: 'Slot not found', details: slotResult.error.message }, { status: 404 });
    }

    console.log('✅ Data fetched - Balance:', userResult.data.balance, 'Slot:', slotResult.data.id.substring(0, 8));

    const user = userResult.data;
    const slot = slotResult.data;

    // Validations
    if (slot.status === 'cancelled') {
      return NextResponse.json(
        { error: 'This slot has been cancelled' },
        { status: 400 }
      );
    }

    if (slot.booked_user_ids.includes(userId)) {
      return NextResponse.json(
        { error: 'You have already booked this slot' },
        { status: 400 }
      );
    }

    // Check if booking already exists (excluding cancelled bookings)
    console.log('🔍 Checking for existing active booking...');
    const { data: existingBooking } = await supabase
      .from('bookings')
      .select('id, status')
      .eq('user_id', userId)
      .eq('slot_id', slotId)
      .neq('status', 'cancelled')  // Exclude cancelled bookings
      .maybeSingle();  // Use maybeSingle to avoid error if no booking found

    if (existingBooking) {
      console.log('⚠️ Active booking already exists:', existingBooking.id, 'Status:', existingBooking.status);
      return NextResponse.json(
        { error: existingBooking.status === 'waitlist' ? 'You are already in waitlist for this slot' : 'You have already booked this slot' },
        { status: 400 }
      );
    }

    if (slot.booked_user_ids.length >= slot.total_spots) {
      // Slot is full: allow waitlist without deducting balance
      const { error: waitlistError } = await supabase
        .from('bookings')
        .insert({
          user_id: userId,
          slot_id: slotId,
          status: 'waitlist',
          amount_paid: 0,
        });

      if (waitlistError) {
        console.error('❌ Waitlist creation error:', waitlistError);
        return NextResponse.json(
          { error: waitlistError.message || 'Failed to join waitlist' },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          waitlist: true,
          message: 'Slot is full. You have been added to waitlist.',
        },
        { status: 200 }
      );
    }

    if (user.balance < bookingCost) {
      return NextResponse.json(
        { error: `Insufficient balance. You need €${bookingCost}` },
        { status: 400 }
      );
    }

    // Create booking - This would ideally be in a single transaction
    // For MVP, we'll do sequential updates

    // 1. Create booking record
    console.log('💾 Creating booking record...');
    const { error: bookingError } = await supabase
      .from('bookings')
      .insert({
        user_id: userId,
        slot_id: slotId,
        status: 'confirmed',
        amount_paid: bookingCost,
      });

    if (bookingError) {
      console.error('❌ Booking creation error:', bookingError);

      // Handle duplicate booking error specifically (unique constraint violation)
      if (bookingError.code === '23505') {
        console.log('⚠️ Duplicate key error - user already has active booking for this slot');
        return NextResponse.json(
          { error: 'You have already booked this slot' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        { error: 'Failed to create booking', details: bookingError.message },
        { status: 500 }
      );
    }

    console.log('✅ Booking created');

    // 2. Update slot (add user to booked_user_ids)
    console.log('🎰 Updating slot...');
    const updatedBookedIds = [...slot.booked_user_ids, userId];
    const newStatus = updatedBookedIds.length >= slot.total_spots ? 'full' : 'open';

    const { error: slotError } = await supabase
      .from('slots')
      .update({
        booked_user_ids: updatedBookedIds,
        status: newStatus,
      })
      .eq('id', slotId);

    if (slotError) {
      console.error('❌ Error updating slot:', slotError);
    } else {
      console.log('✅ Slot updated');
    }

    // 3. Deduct balance
    console.log('💸 Deducting balance...');
    const newBalance = user.balance - bookingCost;

    const { error: balanceError } = await supabase
      .from('users')
      .update({ balance: newBalance })
      .eq('id', userId);

    if (balanceError) {
      console.error('❌ Error updating balance:', balanceError);
    } else {
      console.log('✅ Balance updated to:', newBalance);
    }

    // 4. Create transaction record
    const { error: transactionError } = await supabase
      .from('transactions')
      .insert({
        user_id: userId,
        type: 'booking',
        amount: -bookingCost,
        balance_after: newBalance,
        metadata: { slot_id: slotId },
      });

    if (transactionError) {
      console.error('Error creating transaction:', transactionError);
    }

    // 5. Process pending refunds ONE AT A TIME (FIFO)
    // Only process AFTER slot reaches original capacity (before cancellations)
    console.log('💳 Checking for pending refunds...');

    // Count how many pending refunds exist for this slot
    const { data: allPendingRefunds, count: pendingCount } = await supabase
      .from('pending_refunds')
      .select('*', { count: 'exact' })
      .eq('slot_id', slotId)
      .eq('status', 'pending');

    const numberOfPendingRefunds = pendingCount || 0;

    // Calculate minimum bookings needed before refunds start
    // Example: 10 total, 3 cancelled = need to reach 7/10 before any refunds
    // Then: 8/10 → Refund 1st person, 9/10 → Refund 2nd, 10/10 → Refund 3rd
    const minimumBookingsBeforeRefunds = slot.total_spots - numberOfPendingRefunds;

    console.log(`📊 Slot analysis: ${updatedBookedIds.length}/${slot.total_spots} booked, ${numberOfPendingRefunds} pending refunds, minimum before refunds: ${minimumBookingsBeforeRefunds}`);

    // Only process refunds AFTER we've filled the gap left by cancellations
    // Example: Had 5/10 booked, 3 cancelled → 2/10
    // Need bookings 3-7 to fill gap, then 8+ trigger refunds
    const hasReachedMinimum = updatedBookedIds.length > minimumBookingsBeforeRefunds;

    if (hasReachedMinimum && numberOfPendingRefunds > 0) {
      // Get the oldest pending refund (FIFO)
      const { data: pendingRefunds } = await supabase
        .from('pending_refunds')
        .select('*')
        .eq('slot_id', slotId)
        .eq('status', 'pending')
        .order('created_at', { ascending: true }) // Oldest first
        .limit(1);

      const shouldProcessRefund = pendingRefunds && pendingRefunds.length > 0;

      if (shouldProcessRefund) {
        const refund = pendingRefunds[0];
        console.log(`✅ Processing refund for user ${refund.user_id} (bookings ${updatedBookedIds.length} exceeded minimum ${minimumBookingsBeforeRefunds})`);

        // Get user's current balance
        const { data: refundUser } = await supabase
          .from('users')
          .select('balance')
          .eq('id', refund.user_id)
          .single();

        if (refundUser) {
          const refundBalance = refundUser.balance + refund.amount;

          // Update balance
          await supabase
            .from('users')
            .update({ balance: refundBalance })
            .eq('id', refund.user_id);

          // Create transaction record
          await supabase.from('transactions').insert({
            user_id: refund.user_id,
            type: 'refund',
            amount: refund.amount,
            balance_after: refundBalance,
            metadata: {
              reason: 'Cancellation refund - replacement found',
              slot_id: slotId,
              replacement_user_id: userId,
            },
          });

          // Mark refund as processed
          await supabase
            .from('pending_refunds')
            .update({
              status: 'processed',
              processed_at: new Date().toISOString(),
            })
            .eq('id', refund.id);

          // Notify user about refund (in-app)
          await supabase.from('notifications').insert({
            user_id: refund.user_id,
            type: 'refund',
            title: 'Refund Processed',
            message: `€${refund.amount.toFixed(2)} has been refunded. A replacement was found for your cancelled booking.`,
          });

          // Send push notification
          await sendPushNotification(refund.user_id, {
            title: '💰 Refund Processed',
            body: `€${refund.amount} refunded - replacement found!`,
            url: '/bookings',
          });

          console.log(`✅ Processed refund for user ${refund.user_id}`);
        }
      }
    } else {
      if (numberOfPendingRefunds > 0) {
        console.log(`⏳ Still filling gap from cancellations. Current: ${updatedBookedIds.length}/${slot.total_spots}, need to reach ${minimumBookingsBeforeRefunds + 1} before refunds start.`);
      } else {
        console.log(`No pending refunds for this slot`);
      }
    }

    console.log('🎉 Booking completed successfully!');
    return NextResponse.json({
      success: true,
      message: 'Slot booked successfully',
      newBalance,
    });
  } catch (error) {
    console.error('❌ Booking error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Replaced with sendPushToUser from @/lib/push-notifications-server
async function sendPushNotification(userId: string, notification: { title: string; body: string; url: string }) {
  await sendPushToUser(userId, notification);
}
