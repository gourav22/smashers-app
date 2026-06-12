import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

/**
 * Cron job to process expired pending refunds
 * When no replacement is found within the timeout period, forfeit the refund
 * Run this hourly via Vercel Cron or similar
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('🕐 Running expired refunds processor...');

    // Get all expired pending refunds
    const { data: expiredRefunds, error: fetchError } = await supabase
      .from('pending_refunds')
      .select('*')
      .eq('status', 'pending')
      .lt('expires_at', new Date().toISOString());

    if (fetchError) {
      console.error('Error fetching expired refunds:', fetchError);
      throw fetchError;
    }

    if (!expiredRefunds || expiredRefunds.length === 0) {
      console.log('✅ No expired refunds to process');
      return NextResponse.json({
        success: true,
        message: 'No expired refunds',
        processed: 0,
      });
    }

    console.log(`Found ${expiredRefunds.length} expired refund(s)`);

    let processedCount = 0;

    for (const refund of expiredRefunds) {
      // Mark as expired (no refund - user forfeits payment)
      const { error: updateError } = await supabase
        .from('pending_refunds')
        .update({
          status: 'expired',
          processed_at: new Date().toISOString(),
        })
        .eq('id', refund.id);

      if (updateError) {
        console.error(`Error updating refund ${refund.id}:`, updateError);
        continue;
      }

      // Notify user that refund expired
      await supabase.from('notifications').insert({
        user_id: refund.user_id,
        type: 'refund_expired',
        title: 'Refund Expired',
        message: `Your cancellation refund of €${refund.amount.toFixed(2)} has expired. No replacement was found within the time limit.`,
      });

      processedCount++;
      console.log(`✅ Marked refund ${refund.id} as expired`);
    }

    console.log(`🎉 Processed ${processedCount} expired refunds`);

    return NextResponse.json({
      success: true,
      message: `Processed ${processedCount} expired refunds`,
      processed: processedCount,
    });
  } catch (error: any) {
    console.error('Error in expired refunds processor:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process expired refunds' },
      { status: 500 }
    );
  }
}
