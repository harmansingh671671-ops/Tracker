import { create } from 'zustand';
import { db, type Habit, type HabitLog } from '../db';
import { v4 as uuidv4 } from 'uuid';

interface HabitState {
  habits: Habit[];
  todayLogs: Record<string, HabitLog>; // habitId -> HabitLog
  loading: boolean;
  fetchHabits: (userId: string, date: string) => Promise<void>;
  addHabit: (habit: Omit<Habit, 'id' | 'createdAt' | 'currentStreak' | 'longestStreak' | 'totalCompletions'>) => Promise<Habit>;
  toggleHabitLog: (userId: string, habitId: string, date: string) => Promise<boolean>;
  deleteHabit: (id: string) => Promise<void>;
}

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  todayLogs: {},
  loading: false,
  fetchHabits: async (userId, date) => {
    set({ loading: true });
    const habits = await db.habits
      .where('userId')
      .equals(userId)
      .filter(h => !h.archivedAt)
      .toArray();

    const logs = await db.habitLogs
      .where('[userId+date]')
      .equals([userId, date])
      .toArray();

    const logsMap: Record<string, HabitLog> = {};
    logs.forEach(l => { logsMap[l.habitId] = l; });

    set({ habits, todayLogs: logsMap, loading: false });
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

      // Gamification award
      if (isCompleted) {
        import('./user-store').then(({ useUserStore }) => {
          const uStore = useUserStore.getState();
          uStore.addXp(15);
          uStore.addDiamonds(1);
          if (uStore.user && uStore.user.streak === 0) {
            uStore.updateUser({ streak: 1, highestStreak: Math.max(1, uStore.user.highestStreak) });
          }
        });
      }
    }

    return isCompleted;
  },
  deleteHabit: async (id) => {
    await db.habits.update(id, { archivedAt: new Date().toISOString() });
    set((state) => ({
      habits: state.habits.filter(h => h.id !== id)
    }));
  }
}));
