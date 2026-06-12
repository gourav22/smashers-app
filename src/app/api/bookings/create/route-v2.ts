import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { BOOKING_COST } from '@/lib/config';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

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

    // Create authenticated client
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Verify user identity
    const { data: userData, error: authError } = await supabase.auth.getUser();

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

    const bookingCost = BOOKING_COST;

    // Call the database function that handles the entire transaction
    const { data, error } = await supabase.rpc('create_booking_transaction', {
      p_user_id: userId,
      p_slot_id: slotId,
      p_booking_cost: bookingCost,
    });

    if (error) {
      console.error('Database function error:', error);
      return NextResponse.json(
        { error: 'Failed to create booking', details: error.message },
        { status: 500 }
      );
    }

    // Check the result from the function
    if (!data.success) {
      return NextResponse.json(
        { error: data.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Slot booked successfully',
      newBalance: data.new_balance,
      bookingId: data.booking_id,
    });
  } catch (error) {
    console.error('Booking error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
