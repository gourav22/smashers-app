import { createClient } from '@supabase/supabase-js';

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

    // Verify user is authenticated
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user's subscriptions
    const { data: subscriptions, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return NextResponse.json(
        { error: 'Failed to fetch subscriptions' },
        { status: 500 }
      );
    }

    // Get cancellations for each subscription
    const subscriptionsWithCancellations = await Promise.all(
      subscriptions.map(async (sub) => {
        const { data: cancellations } = await supabase
          .from('subscription_cancellations')
          .select('*')
          .eq('subscription_id', sub.id)
          .order('cancelled_at', { ascending: false });

        return {
          ...sub,
          cancellations: cancellations || [],
        };
      })
    );

    return NextResponse.json({ subscriptions: subscriptionsWithCancellations });
  } catch (error) {
    console.error('Error in subscriptions/list endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
