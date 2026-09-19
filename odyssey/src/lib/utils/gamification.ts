export interface RankInfo {
  name: string;
  streak: number;
  efficiency: number;
  badge: string;
  division: string;
  description: string;
}

export const RANKS: RankInfo[] = [
  { name: 'Beginner', streak: 0, efficiency: 0, badge: '🌱', division: 'Starter', description: 'Taking the first steps on your daily journey' },
  { name: 'Novice', streak: 7, efficiency: 50, badge: '🧭', division: 'Bronze', description: '1 week completed: finding your daily rhythm' },
  { name: 'Builder', streak: 14, efficiency: 60, badge: '🔨', division: 'Bronze', description: '2 weeks completed: actively building strong habits' },
  { name: 'Consistent', streak: 30, efficiency: 70, badge: '⚡', division: 'Silver', description: '1 full month of reliable daily routine' },
  { name: 'Specialist', streak: 60, efficiency: 75, badge: '🎯', division: 'Silver', description: '2 months: steady daily focus and strong habits' },
  { name: 'Expert', streak: 90, efficiency: 80, badge: '⚔️', division: 'Gold', description: '3 months (1 quarter) of high consistency' },
  { name: 'Pro', streak: 180, efficiency: 85, badge: '🌟', division: 'Gold', description: 'Half a year of continuous dedication' },
  { name: 'Master', streak: 270, efficiency: 85, badge: '💎', division: 'Platinum', description: '9 months of self-mastery and excellence' },
  { name: 'Legend', streak: 365, efficiency: 90, badge: '👑', division: 'Diamond', description: '1 full year of continuous dedication' }
];

export function calculateRank(streak: number = 0, _legacyEfficiency?: number): string {
  let eligibleRank = RANKS[0].name;
  for (const rank of RANKS) {
    if (streak >= rank.streak) {
      eligibleRank = rank.name;
    }
  }
  return eligibleRank;
}

export function getRankInfo(rankName?: string): RankInfo {
  if (!rankName || rankName === 'Civilian' || rankName === 'Explorer') return RANKS[0];
  const found = RANKS.find(r => r.name.toLowerCase() === rankName.toLowerCase());
  return found || RANKS[0];
}

export function getNextRank(currentRankName: string): RankInfo | null {
  const currentIndex = RANKS.findIndex(r => r.name.toLowerCase() === currentRankName.toLowerCase());
  if (currentIndex >= 0 && currentIndex < RANKS.length - 1) {
    return RANKS[currentIndex + 1];
  }
  return null;
}
