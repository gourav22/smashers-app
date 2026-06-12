import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

    // Use service role key if available, otherwise use anon key with user's auth
    // Since we applied RLS policies, the anon key should work with proper authentication
    const dbKey = serviceRoleKey || supabaseKey;
    console.log('🔑 Using database key:', serviceRoleKey ? 'SERVICE_ROLE' : 'ANON');

    const supabase = createClient(supabaseUrl, dbKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
    const bookingCost = parseInt(process.env.NEXT_PUBLIC_BOOKING_COST || '4');
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
    if (user.balance < bookingCost) {
      return NextResponse.json(
        { error: `Insufficient balance. You need €${bookingCost}` },
        { status: 400 }
      );
    }

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
        { error: 'You have already booked this slot' },
        { status: 400 }
      );
    }

    if (slot.booked_user_ids.length >= slot.total_spots) {
      return NextResponse.json(
        { error: 'This slot is full' },
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
