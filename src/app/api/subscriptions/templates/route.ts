import { createClient } from '@supabase/supabase-js';

import { NextRequest, NextResponse } from 'next/server';

// GET - List all available subscription templates
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

    // Get available templates
    const { data: templates, error } = await supabase
      .from('subscription_templates')
      .select('*')
      .eq('status', 'active')
      .order('sport')
      .order('day_of_week')
      .order('slot_time');

    if (error) {
      console.error('Error fetching templates:', error);
      return NextResponse.json(
        { error: 'Failed to fetch templates' },
        { status: 500 }
      );
    }

    return NextResponse.json({ templates: templates || [] });
  } catch (error) {
    console.error('Error in templates endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create new subscription template (admin only)
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

    // Verify admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || !['super_admin', 'slot_manager'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const {
      sport,
      dayOfWeek,
      time,
      location,
      maxSubscribers,
      pricePerWeek,
      availableDurations,
      description
    } = await request.json();

    // Validate inputs
    if (!sport || dayOfWeek === undefined || !time || !location) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Create template
    const { data: template, error } = await supabase
      .from('subscription_templates')
      .insert({
        sport,
        day_of_week: dayOfWeek,
        slot_time: time,
        location,
        max_subscribers: maxSubscribers || 10,
        price_per_week: pricePerWeek || 4,
        available_durations: availableDurations || [3, 6, 12],
        description,
        created_by: user.id,
        status: 'active',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      return NextResponse.json(
        { error: error.message || 'Failed to create template' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, template });
  } catch (error: any) {
    console.error('Error in create template endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
