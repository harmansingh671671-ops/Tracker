import { db, type Profile } from './db';
import { v4 as uuidv4 } from 'uuid';
import { RANKS, calculateRank } from './utils/gamification';
import { resetAllDataToZero } from './seed';

export type { Profile };
export { RANKS, calculateRank, resetAllDataToZero };

export async function getOrCreateUser(): Promise<Profile> {
  // Use first() instead of toArray()[0] for deterministic profile selection.
  // toArray() order is not guaranteed by Dexie; first() reads the primary-key
  // order which is stable and what we actually want.
  const user = await db.profiles.toCollection().first();
  
  if (user) {
    // If the database has the old hardcoded demo values (240 diamonds, 14 streak), reset to zero start
    if (user.diamonds === 240 && user.streak === 14 && user.militaryRank === 'Scholar') {
      return await resetAllDataToZero();
    }
    // Automatically migrate legacy/military rank to the new practical rank
    const modernRank = calculateRank(user.streak);
    if (!user.militaryRank || user.militaryRank === 'Civilian' || user.militaryRank === 'Sepoy' || user.militaryRank === 'Explorer') {
      user.militaryRank = modernRank;
      await db.profiles.update(user.id, { militaryRank: modernRank });
    }
    return user;
  }
  
  const newUser: Profile = {
    id: uuidv4(),
    username: 'explorer',
    displayName: 'Traveler',
    dateOfBirth: '',
    createdAt: new Date().toISOString(),
    xp: 0,
    level: 1,
    diamonds: 0,
    streak: 0,
    highestStreak: 0,
    militaryRank: 'Beginner',
    integrityScore: 100,
    lastReviewDate: '',
    lastPlanDate: '',
    streakFreezeActive: false,
    streakFreezeCount: 0,
    unlockedBadges: ['Newbie Scribe'],
    equippedItems: [],
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
