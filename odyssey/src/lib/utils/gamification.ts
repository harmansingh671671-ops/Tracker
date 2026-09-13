export interface RankInfo {
  name: string;
  streak: number;
  efficiency: number;
  badge: string;
  division: string;
}

export const RANKS: RankInfo[] = [
  { name: 'Civilian', streak: 0, efficiency: 0, badge: '🍃', division: 'Starter' },
  { name: 'Sepoy', streak: 7, efficiency: 50, badge: '🎖️', division: 'Bronze' },
  { name: 'Lance Naik', streak: 14, efficiency: 60, badge: '🎖️', division: 'Bronze' },
  { name: 'Naik', streak: 21, efficiency: 65, badge: '🎖️', division: 'Bronze' },
  { name: 'Havaldar', streak: 30, efficiency: 70, badge: '🎖️', division: 'Bronze' },
  { name: 'Naib Subedar', streak: 45, efficiency: 75, badge: '💂', division: 'Silver' },
  { name: 'Subedar', streak: 60, efficiency: 75, badge: '💂', division: 'Silver' },
  { name: 'Subedar Major', streak: 75, efficiency: 80, badge: '💂', division: 'Silver' },
  { name: 'Lieutenant', streak: 90, efficiency: 80, badge: '⚔️', division: 'Gold' },
  { name: 'Captain', streak: 120, efficiency: 82, badge: '⚔️', division: 'Gold' },
  { name: 'Major', streak: 150, efficiency: 85, badge: '⚔️', division: 'Gold' },
  { name: 'Lt. Colonel', streak: 180, efficiency: 85, badge: '⚔️', division: 'Gold' },
  { name: 'Colonel', streak: 210, efficiency: 85, badge: '⚔️', division: 'Gold' },
  { name: 'Brigadier', streak: 250, efficiency: 88, badge: '⭐', division: 'Platinum' },
  { name: 'Maj. General', streak: 300, efficiency: 90, badge: '⭐⭐', division: 'Platinum' },
  { name: 'Lt. General', streak: 365, efficiency: 90, badge: '⭐⭐⭐', division: 'Platinum' },
  { name: 'General', streak: 500, efficiency: 92, badge: '👑', division: 'Platinum' },
  { name: 'Field Marshal', streak: 730, efficiency: 95, badge: '🏆', division: 'GOAT' }
];

export function calculateRank(streak: number = 0, efficiency: number = 100): string {
  let eligibleRank = 'Civilian';
  for (const rank of RANKS) {
    if (streak >= rank.streak && efficiency >= rank.efficiency) {
      eligibleRank = rank.name;
    }
  }
  return eligibleRank;
}

export function getRankInfo(rankName: string): RankInfo {
  return RANKS.find(r => r.name === rankName) || RANKS[0];
}

