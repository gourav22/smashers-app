import { createClient } from '@supabase/supabase-js';

import { NextRequest, NextResponse } from 'next/server';

// This endpoint should be called daily via a cron job (e.g., Vercel Cron, GitHub Actions, or Supabase Edge Functions)
// Example: Run daily at 00:00 UTC to book slots for the upcoming week

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret to prevent unauthorized calls
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

    // Get all active subscriptions with auto-booking enabled
    const { data: subscriptions, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('status', 'active')
      .eq('auto_booking_enabled', true)
      .lte('start_date', new Date().toISOString().split('T')[0])
      .gte('end_date', new Date().toISOString().split('T')[0]);

    if (subError) {
      console.error('Error fetching subscriptions:', subError);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No active subscriptions to process',
        processed: 0,
      });
    }

    const results = {
      success: 0,
      failed: 0,
      slotNotFound: 0,
      slotFull: 0,
      alreadyBooked: 0,
      errors: [] as string[],
    };

    // Process each subscription
    for (const sub of subscriptions) {
      try {
        // Calculate next occurrence date
        const today = new Date();
        const targetDayOfWeek = sub.day_of_week;
        const daysUntilTarget = (targetDayOfWeek - today.getDay() + 7) % 7;
        const nextDate = new Date(today);
        nextDate.setDate(today.getDate() + (daysUntilTarget === 0 ? 7 : daysUntilTarget));
        const nextDateStr = nextDate.toISOString().split('T')[0];

        // Check if slot exists for this date/time/sport
        const { data: slots, error: slotError } = await supabase
          .from('slots')
          .select('*')
          .eq('date', nextDateStr)
          .eq('time', sub.slot_time)
          .eq('sport', sub.sport)
          .neq('status', 'cancelled');

        if (slotError || !slots || slots.length === 0) {
          // Slot not found - log it
          await supabase.from('auto_booking_logs').insert({
            subscription_id: sub.id,
            user_id: sub.user_id,
            slot_id: null,
            booking_id: null,
            slot_date: nextDateStr,
            status: 'slot_not_found',
            error_message: 'No matching slot found for this date/time/sport',
          });

          results.slotNotFound++;
          continue;
        }

        const slot = slots[0];

        // Check if user already booked this slot
        if (slot.booked_user_ids.includes(sub.user_id)) {
          await supabase.from('auto_booking_logs').insert({
            subscription_id: sub.id,
            user_id: sub.user_id,
            slot_id: slot.id,
            booking_id: null,
            slot_date: nextDateStr,
            status: 'success',
            error_message: 'Already booked',
          });

          results.alreadyBooked++;
          continue;
        }

        // Check if slot is full
        if (slot.booked_user_ids.length >= slot.total_spots) {
          await supabase.from('auto_booking_logs').insert({
            subscription_id: sub.id,
            user_id: sub.user_id,
            slot_id: slot.id,
            booking_id: null,
            slot_date: nextDateStr,
            status: 'slot_full',
            error_message: 'Slot is full',
          });

          results.slotFull++;
          continue;
        }

        // Check user balance (should have been pre-paid, but double-check)
        const { data: user } = await supabase
          .from('users')
          .select('balance')
          .eq('id', sub.user_id)
          .single();

        const bookingCost = 0; // Already paid in subscription

        // Create booking
        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .insert({
            user_id: sub.user_id,
            slot_id: slot.id,
            status: 'confirmed',
            amount_paid: bookingCost,
          })
          .select()
          .single();

        if (bookingError) {
          await supabase.from('auto_booking_logs').insert({
            subscription_id: sub.id,
            user_id: sub.user_id,
            slot_id: slot.id,
            booking_id: null,
            slot_date: nextDateStr,
            status: 'failed',
            error_message: bookingError.message,
          });

          results.failed++;
          results.errors.push(`User ${sub.user_id}: ${bookingError.message}`);
          continue;
        }

        // Update slot
        const updatedUserIds = [...slot.booked_user_ids, sub.user_id];
        const newStatus = updatedUserIds.length >= slot.total_spots ? 'full' : 'open';

        await supabase
          .from('slots')
          .update({
            booked_user_ids: updatedUserIds,
            status: newStatus,
          })
          .eq('id', slot.id);

        // Log success
        await supabase.from('auto_booking_logs').insert({
          subscription_id: sub.id,
          user_id: sub.user_id,
          slot_id: slot.id,
          booking_id: booking.id,
          slot_date: nextDateStr,
          status: 'success',
        });

        results.success++;

        // Optional: Send notification to user
        // You can integrate push notifications here

      } catch (error: any) {
        console.error('Error processing subscription:', sub.id, error);
        results.failed++;
        results.errors.push(`Subscription ${sub.id}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      processed: subscriptions.length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in auto-book cron:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// Also support GET for manual trigger (in development)
export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'GET method only available in development' },
      { status: 403 }
    );
  }

  return POST(request);
}
