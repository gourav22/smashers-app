// Achievement System

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'participation' | 'skill' | 'community';
  criteria: {
    type: string;
    threshold: number;
  };
}

export const ACHIEVEMENTS: Achievement[] = [
  // Participation Badges
  {
    id: 'first-step',
    name: 'First Step',
    description: 'Play your first match',
    icon: '🎯',
    category: 'participation',
    criteria: { type: 'matches_played', threshold: 1 },
  },
  {
    id: 'on-fire',
    name: 'On Fire',
    description: 'Win 3 matches in a row',
    icon: '🔥',
    category: 'participation',
    criteria: { type: 'win_streak', threshold: 3 },
  },
  {
    id: 'lightning',
    name: 'Lightning',
    description: 'Win 5 matches in a row',
    icon: '⚡',
    category: 'participation',
    criteria: { type: 'win_streak', threshold: 5 },
  },
  {
    id: 'champion',
    name: 'Champion',
    description: 'Win 10 matches in a row',
    icon: '🏆',
    category: 'participation',
    criteria: { type: 'win_streak', threshold: 10 },
  },
  {
    id: 'consistent-player',
    name: 'Consistent Player',
    description: 'Play 10 matches',
    icon: '📅',
    category: 'participation',
    criteria: { type: 'matches_played', threshold: 10 },
  },
  {
    id: 'club-legend',
    name: 'Club Legend',
    description: 'Play 100 matches',
    icon: '🌟',
    category: 'participation',
    criteria: { type: 'matches_played', threshold: 100 },
  },

  // Skill Badges
  {
    id: 'bronze-league',
    name: 'Bronze League',
    description: 'Reach Grade C',
    icon: '🥉',
    category: 'skill',
    criteria: { type: 'grade', threshold: 3 }, // D=1, C=2, B=3, A=4
  },
  {
    id: 'silver-league',
    name: 'Silver League',
    description: 'Reach Grade B',
    icon: '🥈',
    category: 'skill',
    criteria: { type: 'grade', threshold: 3 },
  },
  {
    id: 'gold-league',
    name: 'Gold League',
    description: 'Reach Grade A',
    icon: '🥇',
    category: 'skill',
    criteria: { type: 'grade', threshold: 4 },
  },
  {
    id: 'diamond-player',
    name: 'Diamond Player',
    description: 'Reach 1800 ELO',
    icon: '💎',
    category: 'skill',
    criteria: { type: 'elo', threshold: 1800 },
  },
  {
    id: 'master',
    name: 'Master',
    description: 'Reach 2000 ELO',
    icon: '👑',
    category: 'skill',
    criteria: { type: 'elo', threshold: 2000 },
  },

  // Community Badges
  {
    id: 'team-player',
    name: 'Team Player',
    description: 'Play 20 doubles matches',
    icon: '🤝',
    category: 'community',
    criteria: { type: 'doubles_played', threshold: 20 },
  },
  {
    id: 'versatile',
    name: 'Versatile',
    description: 'Play both badminton and cricket',
    icon: '🎭',
    category: 'community',
    criteria: { type: 'both_sports', threshold: 1 },
  },
  {
    id: 'climber',
    name: 'Climber',
    description: 'Gain 200 ELO points',
    icon: '📈',
    category: 'community',
    criteria: { type: 'elo_gained', threshold: 200 },
  },
];

export function checkAchievements(user: any): string[] {
  const unlockedAchievements: string[] = [];
  const currentAchievements = user.achievements || [];

  for (const achievement of ACHIEVEMENTS) {
    // Skip if already unlocked
    if (currentAchievements.includes(achievement.id)) {
      continue;
    }

    let unlocked = false;

    switch (achievement.criteria.type) {
      case 'matches_played':
        const totalMatches = user.badminton_games_played + user.cricket_games_played;
        unlocked = totalMatches >= achievement.criteria.threshold;
        break;

      case 'win_streak':
        unlocked = user.current_win_streak >= achievement.criteria.threshold;
        break;

      case 'grade':
        const gradeValue = (grade: string) => {
          return { D: 1, C: 2, B: 3, A: 4 }[grade] || 0;
        };
        const maxGrade = Math.max(
          gradeValue(user.badminton_grade),
          gradeValue(user.cricket_grade)
        );
        unlocked = maxGrade >= achievement.criteria.threshold;
        break;

      case 'elo':
        const maxElo = Math.max(user.badminton_elo, user.cricket_elo);
        unlocked = maxElo >= achievement.criteria.threshold;
        break;

      case 'both_sports':
        unlocked = user.badminton_games_played > 0 && user.cricket_games_played > 0;
        break;

      case 'doubles_played':
        // This would need tracking in the database
        // For now, we'll skip this
        break;

      case 'elo_gained':
        // This would need tracking initial ELO
        // For now, we'll skip this
        break;
    }

    if (unlocked) {
      unlockedAchievements.push(achievement.id);
    }
  }

  return unlockedAchievements;
}

export function getAchievement(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}
