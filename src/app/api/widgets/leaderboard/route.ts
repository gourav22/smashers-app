import { createClient } from '@supabase/supabase-js';

import { NextRequest, NextResponse } from 'next/server';

// Leaderboard widget data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport') || 'badminton';

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

    const eloColumn = sport === 'badminton' ? 'badminton_elo' : 'cricket_elo';
    const gradeColumn = sport === 'badminton' ? 'badminton_grade' : 'cricket_grade';
    const gamesColumn = sport === 'badminton' ? 'badminton_games_played' : 'cricket_games_played';

    // Get top 10 players
    const { data: topPlayers, error } = await supabase
      .from('users')
      .select(`id, name, ${eloColumn}, ${gradeColumn}, ${gamesColumn}`)
      .gte(gamesColumn, 3)
      .order(eloColumn, { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch leaderboard' },
        { status: 500 }
      );
    }

    // Find current user's rank
    const { data: userProfile } = await supabase
      .from('users')
      .select(`id, name, ${eloColumn}, ${gradeColumn}, ${gamesColumn}`)
      .eq('id', user.id)
      .single();

    let userRank = null;
    if (userProfile && (userProfile as any)[gamesColumn] >= 3) {
      const { count } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .gte(gamesColumn, 3)
        .gt(eloColumn, (userProfile as any)[eloColumn]);

      userRank = (count || 0) + 1;
    }

    const widgetData = {
      sport,
      topPlayers: topPlayers.map((player, index) => ({
        rank: index + 1,
        id: player.id,
        name: player.name,
        elo: (player as any)[eloColumn],
        grade: (player as any)[gradeColumn],
        games: (player as any)[gamesColumn],
        isCurrentUser: player.id === user.id,
      })),
      currentUser: userProfile ? {
        rank: userRank,
        name: userProfile.name,
        elo: (userProfile as any)[eloColumn],
        grade: (userProfile as any)[gradeColumn],
        games: (userProfile as any)[gamesColumn],
      } : null,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(widgetData, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=240',
      },
    });
  } catch (error) {
    console.error('Error in widgets/leaderboard endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
