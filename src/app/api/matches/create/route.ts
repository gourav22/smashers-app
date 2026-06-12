import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export async function POST(request: Request) {
  try {
    const {
      slotId,
      date,
      time,
      sport,
      matchType,
      team1UserIds,
      team2UserIds,
      team1Score,
      team2Score,
      createdBy,
    } = await request.json();

    // Validation
    if (!slotId || !date || !time || !sport || !matchType || !team1UserIds || !team2UserIds) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!Array.isArray(team1UserIds) || !Array.isArray(team2UserIds)) {
      return NextResponse.json({ error: 'Team user IDs must be arrays' }, { status: 400 });
    }

    if (matchType === 'singles' && (team1UserIds.length !== 1 || team2UserIds.length !== 1)) {
      return NextResponse.json(
        { error: 'Singles must have 1 player per team' },
        { status: 400 }
      );
    }

    if (matchType === 'doubles' && (team1UserIds.length !== 2 || team2UserIds.length !== 2)) {
      return NextResponse.json(
        { error: 'Doubles must have 2 players per team' },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify all users exist
    const allUserIds = [...team1UserIds, ...team2UserIds];
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id')
      .in('id', allUserIds);

    if (usersError || !users || users.length !== allUserIds.length) {
      return NextResponse.json({ error: 'One or more users not found' }, { status: 404 });
    }

    // Create match with pending_confirmation status
    // Team 2 members need to confirm
    const pendingConfirmation = team2UserIds;
    const confirmedBy = [createdBy]; // Creator automatically confirms

    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert({
        slot_id: slotId,
        date,
        time,
        sport,
        match_type: matchType,
        team1_user_ids: team1UserIds,
        team2_user_ids: team2UserIds,
        team1_score: team1Score,
        team2_score: team2Score,
        status: 'pending_confirmation',
        confirmed_by: confirmedBy,
        pending_confirmation: pendingConfirmation,
        elo_updated: false,
        created_by: createdBy,
      })
      .select()
      .single();

    if (matchError) {
      console.error('Match creation error:', matchError);
      return NextResponse.json({ error: 'Failed to create match' }, { status: 500 });
    }

    // Create notifications for team 2 members
    const notifications = pendingConfirmation.map((userId) => ({
      user_id: userId,
      type: 'match_request',
      title: 'New Match Confirmation Request',
      message: `You have a new match to confirm`,
      action_url: '/matches',
      metadata: { match_id: match.id },
    }));

    const { error: notifError } = await supabase
      .from('notifications')
      .insert(notifications);

    if (notifError) {
      console.error('Notification error:', notifError);
    }

    return NextResponse.json({
      success: true,
      matchId: match.id,
      message: 'Match created successfully',
    });
  } catch (error) {
    console.error('Match creation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
