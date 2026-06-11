// ELO Rating System

export interface Player {
  id: string;
  elo: number;
}

export interface Team {
  players: Player[];
}

export interface EloResult {
  userId: string;
  oldElo: number;
  newElo: number;
  change: number;
}

const K_FACTOR = 32;

// Calculate expected score
function expectedScore(playerElo: number, opponentElo: number): number {
  return 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
}

// Calculate ELO change
function calculateEloChange(
  playerElo: number,
  opponentElo: number,
  actualScore: number
): number {
  const expected = expectedScore(playerElo, opponentElo);
  return Math.round(K_FACTOR * (actualScore - expected));
}

// Calculate team average ELO (for doubles)
function teamAverageElo(team: Team): number {
  const sum = team.players.reduce((acc, player) => acc + player.elo, 0);
  return Math.round(sum / team.players.length);
}

// Main function to calculate ELO changes for a match
export function calculateMatchElo(
  team1: Team,
  team2: Team,
  team1Score: number,
  team2Score: number
): { team1Results: EloResult[]; team2Results: EloResult[] } {
  // Determine winner (1 = team1 won, 0 = team2 won)
  const team1ActualScore = team1Score > team2Score ? 1 : 0;
  const team2ActualScore = team2Score > team1Score ? 1 : 0;

  // For singles: direct calculation
  // For doubles: use team average
  const team1Elo = teamAverageElo(team1);
  const team2Elo = teamAverageElo(team2);

  // Calculate ELO change
  const team1Change = calculateEloChange(team1Elo, team2Elo, team1ActualScore);
  const team2Change = calculateEloChange(team2Elo, team1Elo, team2ActualScore);

  // Apply changes to all players
  const team1Results: EloResult[] = team1.players.map((player) => ({
    userId: player.id,
    oldElo: player.elo,
    newElo: player.elo + team1Change,
    change: team1Change,
  }));

  const team2Results: EloResult[] = team2.players.map((player) => ({
    userId: player.id,
    oldElo: player.elo,
    newElo: player.elo + team2Change,
    change: team2Change,
  }));

  return { team1Results, team2Results };
}

// Calculate grade based on ELO
export function calculateGrade(elo: number): 'A' | 'B' | 'C' | 'D' {
  const GRADE_A = parseInt(process.env.NEXT_PUBLIC_ELO_GRADE_A || '1600');
  const GRADE_B = parseInt(process.env.NEXT_PUBLIC_ELO_GRADE_B || '1400');
  const GRADE_C = parseInt(process.env.NEXT_PUBLIC_ELO_GRADE_C || '1200');

  if (elo >= GRADE_A) return 'A';
  if (elo >= GRADE_B) return 'B';
  if (elo >= GRADE_C) return 'C';
  return 'D';
}

// Get color for grade
export function getGradeColor(grade: 'A' | 'B' | 'C' | 'D'): string {
  const colors = {
    A: '#FFD700', // Gold
    B: '#C0C0C0', // Silver
    C: '#CD7F32', // Bronze
    D: '#9CA3AF', // Gray
  };
  return colors[grade];
}

// Get emoji for grade
export function getGradeEmoji(grade: 'A' | 'B' | 'C' | 'D'): string {
  const emojis = {
    A: '🥇',
    B: '🥈',
    C: '🥉',
    D: '⚪',
  };
  return emojis[grade];
}

// Simplified ELO calculation that returns just the changes
export function calculateSimpleElo(
  team1Elos: number[],
  team2Elos: number[],
  team1Score: number,
  team2Score: number
): { team1Change: number; team2Change: number } {
  // Calculate team averages
  const team1Avg = team1Elos.reduce((a, b) => a + b, 0) / team1Elos.length;
  const team2Avg = team2Elos.reduce((a, b) => a + b, 0) / team2Elos.length;

  // Determine winner
  const team1Won = team1Score > team2Score ? 1 : 0;
  const team2Won = team2Score > team1Score ? 1 : 0;

  // Calculate changes
  const team1Change = calculateEloChange(team1Avg, team2Avg, team1Won);
  const team2Change = calculateEloChange(team2Avg, team1Avg, team2Won);

  return { team1Change, team2Change };
}
