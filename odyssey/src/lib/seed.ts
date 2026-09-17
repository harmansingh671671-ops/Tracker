import { db, type Habit, type Profile } from './db';
import { v4 as uuidv4 } from 'uuid';

export async function seedInitialData(userId: string): Promise<void> {
  // No hardcoded starter hobbies.
  // Users create and write their own custom hobbies from start.
}

export async function resetAllDataToZero(): Promise<Profile> {
  await db.transaction('rw', [db.profiles, db.habits, db.habitLogs, db.scheduleBlocks, db.weeklyReports], async () => {
    await db.profiles.clear();
    await db.habits.clear();
    await db.habitLogs.clear();
    await db.scheduleBlocks.clear();
    await db.weeklyReports.clear();
  });

  if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem('odyssey_journey_start_date');
    } catch {}
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
    militaryRank: 'Civilian',
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
    notificationsEnabled: true,
  };

  await db.profiles.add(newUser);
  await seedInitialData(newUser.id);
  return newUser;
}
