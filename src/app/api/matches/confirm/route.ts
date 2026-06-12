import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateSimpleElo, calculateGrade } from '@/lib/elo';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export async function POST(request: Request) {
  try {
    const { matchId, userId } = await request.json();

    if (!matchId || !userId) {
      return NextResponse.json({ error: 'Missing matchId or userId' }, { status: 400 });
    }

    // Get authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user
    const token = authHeader.replace('Bearer ', '');
    const supabaseClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user || user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    if (match.status === 'confirmed') {
      return NextResponse.json({ error: 'Match already confirmed' }, { status: 400 });
    }

    if (match.status !== 'pending_confirmation') {
      return NextResponse.json({ error: 'Match is not pending confirmation' }, { status: 400 });
    }

    // Check if user is an opponent (not the creator)
    const allPlayers = [...match.team1_user_ids, ...match.team2_user_ids];
    if (!allPlayers.includes(userId)) {
      return NextResponse.json({ error: 'You are not a player in this match' }, { status: 403 });
    }

    if (match.created_by === userId) {
      return NextResponse.json({ error: 'Creator cannot confirm their own match. Only opponents or admins can confirm.' }, { status: 403 });
    }

    // Check if user already confirmed
    if (match.confirmed_by && match.confirmed_by.includes(userId)) {
      return NextResponse.json({ error: 'You already confirmed this match' }, { status: 400 });
    }

    // User is an opponent - they can confirm
    // This will trigger ELO update immediately

    if (match.elo_updated) {
      return NextResponse.json({ error: 'ELO already updated for this match' }, { status: 400 });
    }

    // Get all player profiles
    const { data: players, error: playersError } = await supabase
      .from('users')
      .select('*')
      .in('id', allPlayers);

    if (playersError || !players) {
      return NextResponse.json({ error: 'Failed to fetch players' }, { status: 500 });
    }

    // Calculate ELO changes
    const team1Players = players.filter((p) => match.team1_user_ids.includes(p.id));
    const team2Players = players.filter((p) => match.team2_user_ids.includes(p.id));

    const sport = match.sport;
    const team1Elos = team1Players.map((p) => sport === 'badminton' ? p.badminton_elo : p.cricket_elo);
    const team2Elos = team2Players.map((p) => sport === 'badminton' ? p.badminton_elo : p.cricket_elo);

    const eloChanges = calculateSimpleElo(team1Elos, team2Elos, match.team1_score, match.team2_score);

    const team1Won = match.team1_score > match.team2_score;

    // Update each player's stats
    for (let i = 0; i < allPlayers.length; i++) {
      const playerId = allPlayers[i];
      const player = players.find((p) => p.id === playerId);
      if (!player) continue;

      const isTeam1 = match.team1_user_ids.includes(playerId);
      const eloChange = isTeam1 ? eloChanges.team1Change : eloChanges.team2Change;
      const won = isTeam1 ? team1Won : !team1Won;

      const currentElo = sport === 'badminton' ? player.badminton_elo : player.cricket_elo;
      const newElo = currentElo + eloChange;
      const newGrade = calculateGrade(newElo);

      const updates: any = {};

      if (sport === 'badminton') {
        updates.badminton_elo = newElo;
        updates.badminton_grade = newGrade;
        updates.badminton_games_played = player.badminton_games_played + 1;

        if (won) {
          updates.badminton_wins = player.badminton_wins + 1;
          updates.current_win_streak = player.current_win_streak + 1;
          updates.longest_win_streak = Math.max(
            player.longest_win_streak,
            player.current_win_streak + 1
          );
        } else {
          updates.badminton_losses = player.badminton_losses + 1;
          updates.current_win_streak = 0;
        }
      } else {
        updates.cricket_elo = newElo;
        updates.cricket_grade = newGrade;
        updates.cricket_games_played = player.cricket_games_played + 1;

        if (won) {
          updates.cricket_wins = player.cricket_wins + 1;
          updates.current_win_streak = player.current_win_streak + 1;
          updates.longest_win_streak = Math.max(
            player.longest_win_streak,
            player.current_win_streak + 1
          );
        } else {
          updates.cricket_losses = player.cricket_losses + 1;
          updates.current_win_streak = 0;
        }
      }

      await supabase.from('users').update(updates).eq('id', playerId);
    }

    // Mark match as confirmed and ELO updated
    await supabase
      .from('matches')
      .update({
        status: 'confirmed',
        elo_updated: true,
        confirmed_by: [userId],
        pending_confirmation: [],
      })
      .eq('id', matchId);

    // Send notifications to all players
    const notifications = allPlayers
      .filter((id) => id !== userId)
      .map((playerId) => ({
        user_id: playerId,
        type: 'match_confirmed',
        title: 'Match Confirmed!',
        message: `Your ${match.sport} match has been confirmed and ELO updated.`,
        action_url: '/matches',
      }));

    if (notifications.length > 0) {
      await supabase.from('notifications').insert(notifications);
    }

    return NextResponse.json({
      success: true,
      message: 'Match confirmed by opponent! ELO updated for all players.',
    });
  } catch (error: any) {
    console.error('Error confirming match:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to confirm match' },
      { status: 500 }
    );
  }
}
