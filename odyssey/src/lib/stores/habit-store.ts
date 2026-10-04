import { readString, writeString } from "@/lib/utils/logger";
import { create } from 'zustand';
import { db, type Habit, type HabitLog } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { getLocalTodayStr, isHabitScheduledOnDate } from '../utils/habit-colors';
import { readHabitCache, writeHabitCache, clearHabitCache } from '../habit-cache';

/**
 * Reward rates. Declared as named constants per ADR 0001 section 7 -- the
 * values are NOT yet a settled product decision, so they must live in one
 * place and never be inlined at a call site.
 */
export const XP_PER_COMPLETION = 15;
export const DIAMONDS_PER_COMPLETION = 1;

export interface TemporaryWallet {
  unclaimedDays: Array<{
    date: string;
    completedCount: number;
    xp: number;
    diamonds: number;
  }>;
  totalXp: number;
  totalDiamonds: number;
  todayAccruedXp: number;
  todayAccruedDiamonds: number;
}

interface HabitState {
  habits: Habit[];
  todayLogs: Record<string, HabitLog>; // habitId -> HabitLog
  historyLogs: Record<string, Record<string, boolean>>; // habitId -> date -> completed boolean
  /** Date that `todayLogs` was captured for; '' when unknown. */
  todayLogsDate: string;
  /** User whose data the store currently holds; '' until first successful load. */
  loadedUserId: string;
  loading: boolean;
  temporaryWallet: TemporaryWallet;
  hydrateFromCache: (userId: string, date: string) => void;
  fetchHabits: (
    userId: string,
    date: string,
    options?: { force?: boolean },
  ) => Promise<void>;
  fetchTemporaryWallet: (userId: string) => Promise<void>;
  claimTemporaryWallet: (userId: string) => Promise<{ claimedXp: number; claimedDiamonds: number }>;
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt' | 'currentStreak' | 'longestStreak' | 'totalCompletions'>) => Promise<Habit>;
  updateHabit: (id: string, updates: Partial<Habit>) => Promise<void>;
  toggleHabitLog: (userId: string, habitId: string, date: string) => Promise<boolean>;
  deleteHabit: (id: string) => Promise<void>;
  clearAllHabits: (userId: string) => Promise<void>;
}

const initialWallet: TemporaryWallet = {
  unclaimedDays: [],
  totalXp: 0,
  totalDiamonds: 0,
  todayAccruedXp: 0,
  todayAccruedDiamonds: 0,
};

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  todayLogs: {},
  historyLogs: {},
  todayLogsDate: "",
  loadedUserId: "",
  // Starts LOADING, not idle. Before the first fetch resolves there are no
  // habits and no logs, and a date strip rendering that empty store would
  // paint a confidently wrong "0/0" (and a "Rest Day" dot) that flips a moment
  // later. Consumers treat `loading` as "nothing is known yet" and show a
  // neutral placeholder instead. No consumer existed for this flag before.
  loading: true,
  temporaryWallet: initialWallet,

  /**
   * Seeds the store from the synchronous localStorage mirror, so the very first
   * render already has real values instead of an empty store. `loading` is left
   * TRUE: the mirror is last-known-good, not current, so consumers must keep
   * showing their "unknown yet" treatment until fetchHabits (the authoritative
   * IndexedDB read) lands and clears the flag.
   */
  hydrateFromCache: (userId: string, date: string) => {
    if (get().habits.length > 0) return; // real data already present
    const cached = readHabitCache(userId);
    if (!cached) return;
    // `todayLogs` belongs to the day it was captured on. Habits and history are
    // date-independent and always safe to reuse; the day-scoped slice is only
    // reused when it is the day actually being asked for, otherwise reusing it
    // would attribute yesterday's completions to today.
    const todayLogsUsable = cached.capturedDate === date;
    set({
      habits: cached.habits,
      historyLogs: cached.historyLogs,
      todayLogs: todayLogsUsable ? cached.todayLogs : {},
      todayLogsDate: todayLogsUsable ? cached.capturedDate : "",
    });
  },

  /**
   * Reads habits + logs from IndexedDB and refreshes the store.
   *
   * By DEFAULT this is a no-op when the store already holds this user's data,
   * because the store is a module-level singleton that outlives route changes:
   * the data is already correct and re-reading it only costs a flash. Callers
   * that just MUTATED the database pass `force: true` to demand a re-read.
   *
   * This is what makes a page switch instant. Previously every mount of the
   * planner and the habits page ran a fresh IndexedDB query, so moving between
   * them visibly emptied and refilled the data.
   *
   * `date` is only the day whose logs land in `todayLogs`; `historyLogs` always
   * carries every day, so a different `date` alone does not require a re-read
   * unless `todayLogs` is actually consulted for that day.
   */
  fetchHabits: async (userId, date, options) => {
    const force = options?.force === true;

    if (!force) {
      const state = get();
      const alreadyHaveThisUser = state.loadedUserId === userId;
      const todayLogsUsable = state.todayLogsDate === date;
      // Habits and history are date-independent. todayLogs is the only
      // date-scoped slice, so it must match before we can call this satisfied.
      if (alreadyHaveThisUser && todayLogsUsable) return;
      // Same user, but todayLogs belongs to another day. Rebuild just that
      // slice from historyLogs, which already holds every day -- no database
      // read needed, because historyLogs is the complete record.
      if (alreadyHaveThisUser) {
        const rebuilt: Record<string, HabitLog> = {};
        for (const habit of get().habits) {
          const done = get().historyLogs[habit.id]?.[date];
          if (done === undefined) continue;
          rebuilt[habit.id] = {
            id: `${habit.id}:${date}`,
            habitId: habit.id,
            userId,
            date,
            completed: done,
            loggedAt: new Date().toISOString(),
          };
        }
        set({ todayLogs: rebuilt, todayLogsDate: date });
        return;
      }
    }

    // Seed from the mirror first so a fast synchronous paint is possible even
    // though IndexedDB reads are async. IndexedDB below remains authoritative.
    get().hydrateFromCache(userId, date);
    set({ loading: true });
    let habits = await db.habits
      .where('userId')
      .equals(userId)
      .filter(h => !h.archivedAt)
      .toArray();

    // Fallback: If no habits found for specific userId, load all unarchived habits
    if (habits.length === 0) {
      habits = await db.habits
        .filter(h => !h.archivedAt)
        .toArray();
    }

    const allUserLogs = await db.habitLogs
      .where('userId')
      .equals(userId)
      .toArray();

    const logsMap: Record<string, HabitLog> = {};
    const historyMap: Record<string, Record<string, boolean>> = {};

    allUserLogs.forEach(l => {
      if (l.date === date) {
        logsMap[l.habitId] = l;
      }
      if (!historyMap[l.habitId]) {
        historyMap[l.habitId] = {};
      }
      historyMap[l.habitId][l.date] = l.completed;
    });

    set({ habits, todayLogs: logsMap, historyLogs: historyMap, todayLogsDate: date, loadedUserId: userId, loading: false });

    // Mirror the authoritative read so the next cold load can paint instantly.
    // `logsMap` is by construction the logs for `date`, and it is stored under
    // `capturedDate`, so hydrateFromCache can tell whether it applies.
    writeHabitCache(userId, {
      capturedDate: date,
      habits,
      todayLogs: logsMap,
      historyLogs: historyMap,
    });

    await get().fetchTemporaryWallet(userId);
  },

  /**
   * Recomputes the Temporary Wallet from habit logs.
   *
   * IMPORTANT: `today` is resolved internally via getLocalTodayStr() and is
   * deliberately NOT a parameter. The wallet is anchored to the real current
   * date, so switching the date being viewed in the UI can never move it.
   *
   * A day earns a reward only when every one of these holds:
   *   - the habit was completed that day (l.completed)
   *   - the habit was SCHEDULED for that day (ADR 0001 section 6.2)
   *   - the day has ended (d < today), so today's figure is shown separately
   *     as an accrual and is not yet claimable
   *
   * Unscheduled completions are worth nothing -- otherwise a once-a-week habit
   * marked done on all seven days would earn seven days of rewards.
   */
  fetchTemporaryWallet: async (userId) => {
    const today = getLocalTodayStr();

    const allLogs = await db.habitLogs
      .where('userId')
      .equals(userId)
      .filter(l => l.completed)
      .toArray();

    // Count only completions of habits that were actually due that day.
    // Read habits from the database rather than store state: the wallet is
    // called from several places (including a claim) and must not silently drop
    // rewards when it runs before fetchHabits has populated `habits`.
    const allHabits = await db.habits.toArray();
    const habitsById = new Map(allHabits.map(h => [h.id, h]));
    const countsByDate: Record<string, number> = {};
    allLogs.forEach(l => {
      const habit = habitsById.get(l.habitId);
      if (!habit) return; // habit hard-deleted -> cannot verify it was due
      if (!isHabitScheduledOnDate(habit, l.date)) return; // ADR 0001 section 6.2
      countsByDate[l.date] = (countsByDate[l.date] || 0) + 1;
    });

    const key = `odyssey_claimed_habit_rewards_${userId}`;
    let claimedDates: string[] = [];
    try {
      claimedDates = JSON.parse(readString(key) || '[]');
    } catch {
      claimedDates = [];
    }

    const unclaimedDays: TemporaryWallet['unclaimedDays'] = [];
    Object.keys(countsByDate).forEach(d => {
      if (d < today && !claimedDates.includes(d)) {
        const count = countsByDate[d];
        if (count > 0) {
          unclaimedDays.push({
            date: d,
            completedCount: count,
            xp: count * XP_PER_COMPLETION,
            diamonds: count * DIAMONDS_PER_COMPLETION,
          });
        }
      }
    });

    const todayCount = countsByDate[today] || 0;
    const totalXp = unclaimedDays.reduce((sum, d) => sum + d.xp, 0);
    const totalDiamonds = unclaimedDays.reduce((sum, d) => sum + d.diamonds, 0);

    set({
      temporaryWallet: {
        unclaimedDays,
        totalXp,
        totalDiamonds,
        todayAccruedXp: todayCount * XP_PER_COMPLETION,
        todayAccruedDiamonds: todayCount * DIAMONDS_PER_COMPLETION,
      }
    });
  },

  claimTemporaryWallet: async (userId) => {
    const { temporaryWallet } = get();
    const { totalXp, totalDiamonds, unclaimedDays } = temporaryWallet;

    if (totalXp > 0 || totalDiamonds > 0) {
      const { useUserStore } = await import('./user-store');
      const uStore = useUserStore.getState();

      if (totalXp > 0) await uStore.addXp(totalXp);
      if (totalDiamonds > 0) await uStore.addDiamonds(totalDiamonds);

      if (uStore.user) {
        const daysClaimedCount = Math.max(1, unclaimedDays.length);
        const newStreak = (uStore.user.streak || 0) + daysClaimedCount;
        await uStore.updateUser({
          streak: newStreak,
          highestStreak: Math.max(newStreak, uStore.user.highestStreak || 0),
        });
      }

      const key = `odyssey_claimed_habit_rewards_${userId}`;
      let claimed: string[] = [];
      try {
        claimed = JSON.parse(readString(key) || '[]');
      } catch {
        claimed = [];
      }

      const updatedClaimed = Array.from(new Set([...claimed, ...unclaimedDays.map(d => d.date)]));
      writeString(key, JSON.stringify(updatedClaimed));
    }

    await get().fetchTemporaryWallet(userId);
    return { claimedXp: totalXp, claimedDiamonds: totalDiamonds };
  },

  addHabit: async (habitData) => {
    const newHabit: Habit = {
      ...habitData,
      id: uuidv4(),
      currentStreak: 0,
      longestStreak: 0,
      totalCompletions: 0,
      createdAt: new Date().toISOString()
    };
    await db.habits.add(newHabit);
    set((state) => ({ habits: [...state.habits, newHabit] }));
    return newHabit;
  },

  updateHabit: async (id, updates) => {
    await db.habits.update(id, updates);
    set((state) => ({
      habits: state.habits.map((h) => (h.id === id ? { ...h, ...updates } : h)),
    }));
  },

  toggleHabitLog: async (userId, habitId, date) => {
    const existingLogs = await db.habitLogs
      .where('[habitId+date]')
      .equals([habitId, date])
      .toArray();
    const existingLog = existingLogs[0];
    const isCompleted = !(existingLog?.completed);

    if (existingLog) {
      await db.habitLogs.update(existingLog.id, {
        completed: isCompleted,
        loggedAt: new Date().toISOString()
      });
    } else {
      const newLog: HabitLog = {
        id: uuidv4(),
        habitId,
        userId,
        date,
        completed: true,
        loggedAt: new Date().toISOString()
      };
      await db.habitLogs.add(newLog);
    }

    const todayStr = getLocalTodayStr();

    set((state) => {
      const updatedToday = { ...state.todayLogs };
      if (date === todayStr) {
        if (existingLog) {
          updatedToday[habitId] = { ...existingLog, completed: isCompleted };
        } else {
          updatedToday[habitId] = {
            id: uuidv4(),
            habitId,
            userId,
            date,
            completed: true,
            loggedAt: new Date().toISOString()
          };
        }
      }

      const updatedHistory = { ...state.historyLogs };
      if (!updatedHistory[habitId]) {
        updatedHistory[habitId] = {};
      }
      updatedHistory[habitId] = {
        ...updatedHistory[habitId],
        [date]: isCompleted,
      };

      return {
        todayLogs: updatedToday,
        historyLogs: updatedHistory,
      };
    });

    // Update streak for this habit
    const habit = get().habits.find(h => h.id === habitId);
    if (habit) {
      const newTotal = isCompleted ? habit.totalCompletions + 1 : Math.max(0, habit.totalCompletions - 1);
      const newStreak = isCompleted ? habit.currentStreak + 1 : Math.max(0, habit.currentStreak - 1);
      const newLongest = Math.max(habit.longestStreak, newStreak);
      
      await db.habits.update(habitId, {
        totalCompletions: newTotal,
        currentStreak: newStreak,
        longestStreak: newLongest
      });

      set((state) => ({
        habits: state.habits.map(h => h.id === habitId ? {
          ...h,
          totalCompletions: newTotal,
          currentStreak: newStreak,
          longestStreak: newLongest
        } : h)
      }));
    }

    // Recompute the wallet from the real today. `date` here is the day the user
    // toggled, which may be any past day -- it must not influence the wallet,
    // so it is deliberately not passed (ADR 0001 section 6).
    await get().fetchTemporaryWallet(userId);
    return isCompleted;
  },

  deleteHabit: async (id) => {
    await db.habits.update(id, { archivedAt: new Date().toISOString() });
    set((state) => ({
      habits: state.habits.filter(h => h.id !== id)
    }));
  },

  clearAllHabits: async (userId) => {
    const habits = await db.habits.where('userId').equals(userId).toArray();
    for (const h of habits) {
      await db.habits.update(h.id, { archivedAt: new Date().toISOString() });
    }
    // The mirror must go too, otherwise the next cold load restores the habits
    // that were just archived.
    clearHabitCache(userId);
    set({ habits: [], historyLogs: {}, todayLogs: {}, todayLogsDate: "", loadedUserId: "" });
  }
}));
