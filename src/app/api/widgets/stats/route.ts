import { createClient } from '@supabase/supabase-js';

import { NextRequest, NextResponse } from 'next/server';

// Widget data API for future PWA widget support
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

    // Get user profile with stats
    const { data: profile, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      return NextResponse.json(
        { error: 'Failed to fetch profile' },
        { status: 500 }
      );
    }

    // Get upcoming bookings
    const { data: upcomingBookings } = await supabase
      .from('bookings')
      .select('*, slots(*)')
      .eq('user_id', user.id)
      .eq('status', 'confirmed')
      .gte('slots.date', new Date().toISOString().split('T')[0])
      .order('slots.date', { ascending: true })
      .limit(3);

    // Get recent matches
    const { data: recentMatches } = await supabase
      .from('matches')
      .select('*')
      .or(`team1_user_ids.cs.{${user.id}},team2_user_ids.cs.{${user.id}}`)
      .eq('status', 'confirmed')
      .order('date', { ascending: false })
      .limit(5);

    // Prepare widget data
    const widgetData = {
      user: {
        id: profile.id,
        name: profile.name,
        balance: profile.balance,
      },
      stats: {
        badminton: {
          elo: profile.badminton_elo,
          grade: profile.badminton_grade,
          wins: profile.badminton_wins,
          losses: profile.badminton_losses,
        },
        cricket: {
          elo: profile.cricket_elo,
          grade: profile.cricket_grade,
          wins: profile.cricket_wins,
          losses: profile.cricket_losses,
        },
        winStreak: profile.current_win_streak,
        longestStreak: profile.longest_win_streak,
      },
      upcomingBookings: upcomingBookings?.map(b => ({
        id: b.id,
        date: b.slots.date,
        time: b.slots.time,
        sport: b.slots.sport,
        location: b.slots.location,
      })) || [],
      recentMatches: recentMatches?.map(m => {
        const isTeam1 = m.team1_user_ids.includes(user.id);
        const won = isTeam1
          ? m.team1_score > m.team2_score
          : m.team2_score > m.team1_score;

        return {
          id: m.id,
          sport: m.sport,
          date: m.date,
          won,
          score: `${m.team1_score} - ${m.team2_score}`,
        };
      }) || [],
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(widgetData, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      },
    });
  } catch (error) {
    console.error('Error in widgets/stats endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
