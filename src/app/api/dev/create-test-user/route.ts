import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const expectedSecret = process.env.DEV_TEST_USER_SECRET;
  if (!expectedSecret) {
    return NextResponse.json(
      { error: 'DEV_TEST_USER_SECRET is not configured' },
      { status: 500 }
    );
  }

  const providedSecret = request.headers.get('x-dev-secret');
  if (providedSecret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '').trim();
    const name = String(body.name || '').trim() || 'Test User';
    const phone = String(body.phone || '').trim() || '+31 600000000';

    if (!email || !password) {
      return NextResponse.json(
        { error: 'email and password are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || ''
    );

    const { data: createdUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        full_name: name,
      },
    });

    if (createError || !createdUser.user) {
      return NextResponse.json(
        { error: createError?.message || 'Failed to create test user' },
        { status: 400 }
      );
    }

    const userId = createdUser.user.id;
    const { error: profileError } = await supabase.from('users').upsert(
      {
        id: userId,
        email,
        name,
        phone,
        role: 'member',
        sports_played: ['badminton'],
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (profileError) {
      return NextResponse.json(
        { error: `User created but profile upsert failed: ${profileError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: userId,
        email,
        name,
        phone,
      },
      message: 'Test user created with confirmed email',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}