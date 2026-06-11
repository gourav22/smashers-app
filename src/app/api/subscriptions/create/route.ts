import { createClient } from '@supabase/supabase-js';

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
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
    if (!templateId || !durationMonths) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get template details
    const { data: template, error: templateError } = await supabase
      .from('subscription_templates')
      .select('*')
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Check if template is available
    if (template.status !== 'active') {
      return NextResponse.json(
        { error: 'This subscription is no longer available' },
        { status: 400 }
      );
    }

    if (template.current_subscribers >= template.max_subscribers) {
      return NextResponse.json(
        { error: 'This subscription is full' },
        { status: 400 }
      );
    }

    // Check if duration is allowed
    if (!template.available_durations.includes(durationMonths)) {
      return NextResponse.json(
        { error: `Invalid duration. Available: ${template.available_durations.join(', ')} months` },
        { status: 400 }
      );
    }

    // Calculate dates and cost
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setMonth(end.getMonth() + durationMonths);

    const weeks = Math.ceil(durationMonths * 4.33);
    const totalCost = weeks * template.price_per_week;

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
      .eq('template_id', templateId)
      .in('status', ['active', 'paused'])
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: 'You already have an active subscription for this slot' },
        { status: 400 }
      );
    }

    // Create subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        template_id: templateId,
        sport: template.sport,
        day_of_week: template.day_of_week,
        slot_time: template.slot_time,
        start_date: start.toISOString().split('T')[0],
        end_date: end.toISOString().split('T')[0],
        price_per_week: template.price_per_week,
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
        subscription_sport: template.sport,
        subscription_day_of_week: template.day_of_week,
        subscription_slot_time: template.slot_time,
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
        template_id: templateId,
        sport: template.sport,
        duration_months: durationMonths,
        weeks,
      },
    });

    return NextResponse.json({
      success: true,
      subscription,
      template,
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
