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
  loading: boolean;
  temporaryWallet: TemporaryWallet;
  fetchHabits: (userId: string, date: string) => Promise<void>;
  fetchTemporaryWallet: (userId: string, today: string) => Promise<void>;
  claimTemporaryWallet: (userId: string, today: string) => Promise<{ claimedXp: number; claimedDiamonds: number }>;
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt' | 'currentStreak' | 'longestStreak' | 'totalCompletions'>) => Promise<Habit>;
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

    const logs = await db.habitLogs
      .where('[userId+date]')
      .equals([userId, date])
      .toArray();

    const logsMap: Record<string, HabitLog> = {};
    logs.forEach(l => { logsMap[l.habitId] = l; });

    set({ habits, todayLogs: logsMap, loading: false });
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

  toggleHabitLog: async (userId, habitId, date) => {
    const existingLog = get().todayLogs[habitId];
    const isCompleted = !(existingLog?.completed);

    if (existingLog) {
      await db.habitLogs.update(existingLog.id, {
        completed: isCompleted,
        loggedAt: new Date().toISOString()
      });
      set((state) => ({
        todayLogs: {
          ...state.todayLogs,
          [habitId]: { ...existingLog, completed: isCompleted }
        }
      }));
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
      set((state) => ({
        todayLogs: {
          ...state.todayLogs,
          [habitId]: newLog
        }
      }));
    }

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

    // Note: Rewards are NOT awarded immediately to user.xp / user.diamonds.
    // They accrue in today's escrow and move to the temporary wallet when the day ends!
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
