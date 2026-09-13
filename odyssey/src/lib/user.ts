import { db, type Profile } from './db';
import { v4 as uuidv4 } from 'uuid';
import { RANKS, calculateRank } from './utils/gamification';

export type { Profile };
export { RANKS, calculateRank };

export async function getOrCreateUser(): Promise<Profile> {
  const users = await db.profiles.toArray();
  
  if (users.length > 0) {
    return users[0];
  }
  
  const newUser: Profile = {
    id: uuidv4(),
    username: 'cadet',
    displayName: 'Commander',
    dateOfBirth: '',
    createdAt: new Date().toISOString(),
    xp: 0,
    level: 1,
    diamonds: 10,
    streak: 0,
    highestStreak: 0,
    militaryRank: 'Civilian',
    integrityScore: 100,
    lastReviewDate: '',
    lastPlanDate: '',
    streakFreezeActive: false,
    unlockedBadges: ['Newbie Scribe'],
    equippedTheme: 'default',
    equippedMascot: 'owl',
    equippedSound: 'default',
    notificationsEnabled: true
  };
  
  await db.profiles.add(newUser);
  return newUser;
}

export async function updateUserProfile(updates: Partial<Profile>): Promise<Profile> {
  const user = await getOrCreateUser();
  const updated = { ...user, ...updates };
  await db.profiles.update(user.id, updates);
  return updated;
}

