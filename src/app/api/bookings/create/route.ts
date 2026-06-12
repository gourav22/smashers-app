import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function POST(request: Request) {
  try {
    const { slotId, userId } = await request.json();
    const token = request.headers.get('authorization')?.replace('Bearer ', '');

    if (!slotId || !userId) {
      return NextResponse.json(
        { error: 'Missing slotId or userId' },
        { status: 400 }
      );
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized: No token provided' },
        { status: 401 }
      );
    }

    // Use anon client with token to verify user identity
    const supabaseAuth = createClient(supabaseUrl, supabaseKey);
    const { data: userData, error: authError } = await supabaseAuth.auth.getUser(token);

    if (authError || !userData.user) {
      return NextResponse.json(
        { error: 'Unauthorized: Invalid token' },
        { status: 401 }
      );
    }

    // Verify user is trying to book for themselves
    if (userData.user.id !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized: Cannot book for another user' },
        { status: 403 }
      );
    }

    // Use service role key for database operations (bypasses RLS)
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const bookingCost = parseInt(process.env.NEXT_PUBLIC_BOOKING_COST || '4');

    // Get user and slot data
    const [userResult, slotResult] = await Promise.all([
      supabase.from('users').select('balance').eq('id', userId).single(),
      supabase.from('slots').select('*').eq('id', slotId).single(),
    ]);

    if (userResult.error) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (slotResult.error) {
      return NextResponse.json({ error: 'Slot not found' }, { status: 404 });
    }

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

    if (slot.booked_user_ids.length >= slot.total_spots) {
      return NextResponse.json(
        { error: 'This slot is full' },
        { status: 400 }
      );
    }

    // Create booking - This would ideally be in a single transaction
    // For MVP, we'll do sequential updates

    // 1. Create booking record
    const { error: bookingError } = await supabase
      .from('bookings')
      .insert({
        user_id: userId,
        slot_id: slotId,
        status: 'confirmed',
        amount_paid: bookingCost,
      });

    if (bookingError) {
      return NextResponse.json(
        { error: 'Failed to create booking' },
        { status: 500 }
      );
    }

    // 2. Update slot (add user to booked_user_ids)
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
      console.error('Error updating slot:', slotError);
    }

    // 3. Deduct balance
    const newBalance = user.balance - bookingCost;

    const { error: balanceError } = await supabase
      .from('users')
      .update({ balance: newBalance })
      .eq('id', userId);

    if (balanceError) {
      console.error('Error updating balance:', balanceError);
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

    return NextResponse.json({
      success: true,
      message: 'Slot booked successfully',
      newBalance,
    });
  } catch (error) {
    console.error('Booking error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
