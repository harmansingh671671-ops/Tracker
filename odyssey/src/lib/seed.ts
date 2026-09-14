import { db, type Habit, type Profile } from './db';
import { v4 as uuidv4 } from 'uuid';

export async function seedInitialData(userId: string): Promise<void> {
  // Check if habits exist
  const existingHabits = await db.habits.where('userId').equals(userId).count();
  if (existingHabits === 0) {
    const starterHabits: Array<Omit<Habit, 'id' | 'createdAt'>> = [
      {
        userId,
        name: 'Morning Hydration & Electrolytes',
        icon: 'water_drop',
        category: 'health',
        period: 'morning',
        timeOfDay: '07:00 AM',
        frequency: 'daily',
        currentStreak: 0,
        longestStreak: 0,
        totalCompletions: 0,
      },
      {
        userId,
        name: '15m Box Breathing & Mobility',
        icon: 'air',
        category: 'growth',
        period: 'morning',
        timeOfDay: '07:30 AM',
        frequency: 'daily',
        currentStreak: 0,
        longestStreak: 0,
        totalCompletions: 0,
      },
      {
        userId,
        name: 'Deep Work Sprint (Focus Block)',
        icon: 'psychology',
        category: 'work',
        period: 'afternoon',
        timeOfDay: '02:00 PM',
        frequency: 'daily',
        currentStreak: 0,
        longestStreak: 0,
        totalCompletions: 0,
      },
      {
        userId,
        name: 'Sunlight Walk & Movement',
        icon: 'wb_sunny',
        category: 'health',
        period: 'afternoon',
        timeOfDay: '01:15 PM',
        frequency: 'daily',
        currentStreak: 0,
        longestStreak: 0,
        totalCompletions: 0,
      },
      {
        userId,
        name: 'Digital Sunset & Reading',
        icon: 'nightlight',
        category: 'growth',
        period: 'evening',
        timeOfDay: '09:30 PM',
        frequency: 'daily',
        currentStreak: 0,
        longestStreak: 0,
        totalCompletions: 0,
      },
    ];

    for (const h of starterHabits) {
      await db.habits.add({
        ...h,
        id: uuidv4(),
        createdAt: new Date().toISOString(),
      });
    }
  }
}

export async function resetAllDataToZero(): Promise<Profile> {
  await db.transaction('rw', [db.profiles, db.habits, db.habitLogs, db.scheduleBlocks, db.weeklyReports], async () => {
    await db.profiles.clear();
    await db.habits.clear();
    await db.habitLogs.clear();
    await db.scheduleBlocks.clear();
    await db.weeklyReports.clear();
  });

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
