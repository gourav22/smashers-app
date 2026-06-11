import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies });
    const { templateId, durationMonths } = await request.json();

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate inputs
    if (!sport || dayOfWeek === undefined || !time || !startDate || !durationMonths) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (!['badminton', 'cricket'].includes(sport)) {
      return NextResponse.json(
        { error: 'Invalid sport' },
        { status: 400 }
      );
    }

    if (dayOfWeek < 0 || dayOfWeek > 6) {
      return NextResponse.json(
        { error: 'Invalid day of week' },
        { status: 400 }
      );
    }

    // Calculate end date
    const start = new Date(startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + durationMonths);

    // Calculate total cost
    const weeks = Math.ceil(durationMonths * 4.33); // Approximate weeks
    const costPerWeek = pricePerWeek || 4;
    const totalCost = weeks * costPerWeek;

    // Check user has sufficient balance
    const { data: userProfile } = await supabase
      .from('users')
      .select('balance')
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.balance < totalCost) {
      return NextResponse.json(
        { error: `Insufficient balance. Need €${totalCost.toFixed(2)}` },
        { status: 400 }
      );
    }

    // Check for overlapping subscriptions
    const { data: existing } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('sport', sport)
      .eq('day_of_week', dayOfWeek)
      .eq('slot_time', time)
      .in('status', ['active', 'paused'])
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'You already have a subscription for this slot' },
        { status: 400 }
      );
    }

    // Create subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        sport,
        day_of_week: dayOfWeek,
        slot_time: time,
        start_date: start.toISOString().split('T')[0],
        end_date: end.toISOString().split('T')[0],
        price_per_week: costPerWeek,
        total_paid: totalCost,
        status: 'active',
        auto_booking_enabled: true,
      })
      .select()
      .single();

    if (subError) {
      console.error('Error creating subscription:', subError);
      return NextResponse.json(
        { error: 'Failed to create subscription' },
        { status: 500 }
      );
    }

    // Deduct from balance
    const newBalance = userProfile.balance - totalCost;
    const { error: balanceError } = await supabase
      .from('users')
      .update({
        balance: newBalance,
        membership_type: 'regular',
        subscription_start_date: start.toISOString().split('T')[0],
        subscription_end_date: end.toISOString().split('T')[0],
        subscription_sport: sport,
        subscription_day_of_week: dayOfWeek,
        subscription_slot_time: time,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (balanceError) {
      console.error('Error updating balance:', balanceError);
      // Rollback subscription
      await supabase.from('subscriptions').delete().eq('id', subscription.id);
      return NextResponse.json(
        { error: 'Failed to process payment' },
        { status: 500 }
      );
    }

    // Create transaction record
    await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'registration_fee',
      amount: -totalCost,
      balance_after: newBalance,
      metadata: {
        subscription_id: subscription.id,
        sport,
        duration_months: durationMonths,
        weeks,
      },
    });

    return NextResponse.json({
      success: true,
      subscription,
      totalCost,
      weeks,
      newBalance,
    });
  } catch (error) {
    console.error('Error in subscriptions/create endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
