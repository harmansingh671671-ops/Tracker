import { create } from 'zustand';
import { db, type Habit, type HabitLog } from '../db';
import { v4 as uuidv4 } from 'uuid';

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
  loading: boolean;
  temporaryWallet: TemporaryWallet;
  fetchHabits: (userId: string, date: string) => Promise<void>;
  fetchTemporaryWallet: (userId: string, today: string) => Promise<void>;
  claimTemporaryWallet: (userId: string, today: string) => Promise<{ claimedXp: number; claimedDiamonds: number }>;
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
  loading: false,
  temporaryWallet: initialWallet,

  fetchHabits: async (userId, date) => {
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

    set({ habits, todayLogs: logsMap, historyLogs: historyMap, loading: false });
    await get().fetchTemporaryWallet(userId, date);
  },

  fetchTemporaryWallet: async (userId, today) => {
    const allLogs = await db.habitLogs
      .where('userId')
      .equals(userId)
      .filter(l => l.completed)
      .toArray();

    const countsByDate: Record<string, number> = {};
    allLogs.forEach(l => {
      countsByDate[l.date] = (countsByDate[l.date] || 0) + 1;
    });

    const key = `odyssey_claimed_habit_rewards_${userId}`;
    let claimedDates: string[] = [];
    try {
      claimedDates = JSON.parse(localStorage.getItem(key) || '[]');
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
            xp: count * 15,
            diamonds: count * 1,
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
        todayAccruedXp: todayCount * 15,
        todayAccruedDiamonds: todayCount * 1,
      }
    });
  },

  claimTemporaryWallet: async (userId, today) => {
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
        claimed = JSON.parse(localStorage.getItem(key) || '[]');
      } catch {
        claimed = [];
      }

      const updatedClaimed = Array.from(new Set([...claimed, ...unclaimedDays.map(d => d.date)]));
      localStorage.setItem(key, JSON.stringify(updatedClaimed));
    }

    await get().fetchTemporaryWallet(userId, today);
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

    const todayStr = new Date().toISOString().split("T")[0];

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

    await get().fetchTemporaryWallet(userId, date);
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
    set({ habits: [] });
  }
}));
