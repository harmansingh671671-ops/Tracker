import Dexie, { type Table } from 'dexie';

export interface Profile {
  id: string;
  username: string;
  displayName: string;
  age?: number;
  bio?: string;
  motto?: string;
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

/**
 * Canonical schedule categories.
 *
 * This union used to be declared inline as
 *   'sleep' | 'work' | 'habits' | 'buffer' | 'Work' | 'Study' | 'Health' | 'Sleep' | 'Leisure' | 'Admin'
 * which listed the same idea twice in two spellings ('work' AND 'Work',
 * 'health' AND 'Health', 'sleep' AND 'Sleep'). Any `category === 'work'` check
 * silently failed for rows saved as 'Work', and vice versa.
 *
 * Title Case is canonical -- it is what the habit taxonomy already used.
 * {@link normalizeCategory} maps existing lowercase data onto it.
 */
export const SCHEDULE_CATEGORIES = [
  "Work",
  "Study",
  "Health",
  "Sleep",
  "Leisure",
  "Admin",
  "Habits",
  "Buffer",
] as const;

export type ScheduleCategory = (typeof SCHEDULE_CATEGORIES)[number];

/**
 * Canonical habit categories.
 *
 * Same problem as above: the inline union mixed Title Case with the lowercase
 * leftovers 'growth', 'work' and 'health'.
 */
export const HABIT_CATEGORIES = [
  "Health",
  "Mindfulness",
  "Learning",
  "Productivity",
  "Social",
  "Growth",
] as const;

export type HabitCategory = (typeof HABIT_CATEGORIES)[number];

/**
 * Maps any previously-saved spelling onto the canonical one.
 *
 * Case-insensitive, and preserves anything unrecognised rather than discarding
 * it -- a user's data must never be dropped because it did not match a list.
 * Returns the input unchanged when no mapping applies.
 */
export function normalizeCategory(value: string): string {
  const lower = String(value ?? "").trim().toLowerCase();
  if (!lower) return value;
  const match =
    SCHEDULE_CATEGORIES.find((c) => c.toLowerCase() === lower) ??
    HABIT_CATEGORIES.find((c) => c.toLowerCase() === lower);
  return match ?? value;
}

export interface ScheduleBlock {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  title: string;
  description?: string;
  category: ScheduleCategory | (string & {});
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
  category: HabitCategory | (string & {});
  period?: 'morning' | 'afternoon' | 'evening';
  timeOfDay?: string; // e.g. "06:30 AM"
  frequency: 'daily' | 'weekly';
  targetDaysPerWeek?: number;
  targetDays?: number[]; // [1..7] where 1=Mon, 2=Tue, ..., 7=Sun
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

export interface InboxItem {
  id: string;
  userId: string;
  title: string;
  timeHorizon: 'today' | 'this_week' | 'someday';
  estimatedMinutes?: number;
  priority?: 'urgent' | 'high' | 'normal' | 'low';
  category?: string;
  createdAt: string;
}

class OdysseyDB extends Dexie {
  profiles!: Table<Profile>;
  scheduleBlocks!: Table<ScheduleBlock>;
  habits!: Table<Habit>;
  habitLogs!: Table<HabitLog>;
  weeklyReports!: Table<WeeklyReport>;
  inboxItems!: Table<InboxItem>;

  constructor() {
    super('OdysseyDB');
    
    this.version(1).stores({
      profiles: 'id, username',
      scheduleBlocks: 'id, userId, date, [userId+date]',
      habits: 'id, userId, category, archivedAt',
      habitLogs: 'id, habitId, userId, date, [habitId+date], [userId+date]',
      weeklyReports: 'id, userId, weekStart, [userId+weekStart]',
      inboxItems: 'id, userId, timeHorizon, createdAt'
    });
  }
}

export const db = new OdysseyDB();
