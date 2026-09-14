import Dexie, { type Table } from 'dexie';

export interface Profile {
  id: string;
  username: string;
  displayName: string;
  dateOfBirth: string;
  createdAt: string;
  
  // Gamification
  xp: number;
  level: number;
  diamonds: number;
  streak: number;
  highestStreak: number;
  militaryRank: string;
  integrityScore: number;
  lastReviewDate: string;
  lastPlanDate: string;
  streakFreezeActive: boolean;
  streakFreezeCount?: number;
  unlockedBadges: string[];
  equippedItems?: string[];
  
  // Customization
  equippedTheme: string;
  equippedMascot: string;
  equippedSound: string;
  
  notificationsEnabled: boolean;
}

export interface ScheduleBlock {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  title: string;
  description?: string;
  category: 'sleep' | 'work' | 'habits' | 'buffer' | 'Work' | 'Study' | 'Health' | 'Sleep' | 'Leisure' | 'Admin';
  tag?: string;
  energyLevel?: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed' | 'missed' | 'pivoted';
  missReason?: string;
  completedAt?: string;
  isCommitted: boolean;
  createdAt: string;
}

export interface Habit {
  id: string;
  userId: string;
  name: string;
  icon: string;
  category: 'Health' | 'Mindfulness' | 'Learning' | 'Productivity' | 'Social' | 'growth' | 'work' | 'health';
  period?: 'morning' | 'afternoon' | 'evening';
  timeOfDay?: string; // e.g. "06:30 AM"
  frequency: 'daily' | 'weekly';
  targetDaysPerWeek?: number;
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  createdAt: string;
  archivedAt?: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  userId: string;
  date: string; // YYYY-MM-DD
  completed: boolean;
  notes?: string;
  loggedAt: string;
}

export interface WeeklyReport {
  id: string;
  userId: string;
  weekStart: string; // YYYY-MM-DD
  weekEnd: string; // YYYY-MM-DD
  totalScheduledHours: number;
  totalCompletedHours: number;
  completionRate: number;
  topCategory: string;
  mostProductiveHour: number;
  streakAtWeekEnd: number;
  diamondsEarned: number;
  xpEarned: number;
  categoryBreakdown: Record<string, number>;
  createdAt: string;
}

class OdysseyDB extends Dexie {
  profiles!: Table<Profile>;
  scheduleBlocks!: Table<ScheduleBlock>;
  habits!: Table<Habit>;
  habitLogs!: Table<HabitLog>;
  weeklyReports!: Table<WeeklyReport>;

  constructor() {
    super('OdysseyDB');
    
    this.version(1).stores({
      profiles: 'id, username',
      scheduleBlocks: 'id, userId, date, [userId+date]',
      habits: 'id, userId, category, archivedAt',
      habitLogs: 'id, habitId, userId, date, [habitId+date], [userId+date]',
      weeklyReports: 'id, userId, weekStart, [userId+weekStart]'
    });
  }
}

export const db = new OdysseyDB();
