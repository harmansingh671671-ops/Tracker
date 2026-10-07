import { create } from 'zustand';
import { db, type Habit, type HabitLog } from '../db';
import { v4 as uuidv4 } from 'uuid';
import { getLocalTodayStr, isHabitScheduledOnDate } from '../utils/habit-colors';
import { readHabitCache, writeHabitCache, clearHabitCache } from '../habit-cache';
import {
  DIAMONDS_PER_COMPLETION,
  XP_PER_COMPLETION,
  advanceStreakForSettlement,
  computeDayReward,
  isPerfectDay,
} from '../utils/reward-rules';

/**
 * Reward rates live in `lib/utils/reward-rules.ts` and are re-exported here so
 * existing importers keep working. Named constants per ADR 0001 section 7 -- the
 * values are not a settled product decision and must never be inlined at a call
 * site.
 */
export { XP_PER_COMPLETION, DIAMONDS_PER_COMPLETION };

export interface TemporaryWallet {
  /**
   * Days that have ended, carry at least one earned completion, and have not
   * been settled yet. Normally empty: settlement runs automatically on rollover.
   * It is non-empty only when the app was closed across a day boundary and the
   * settlement has not run yet.
   */
  unclaimedDays: Array<{
    date: string;
    completedCount: number;
    xp: number;
    diamonds: number;
    perfectBonusXp: number;
  }>;
  totalXp: number;
  totalDiamonds: number;
  todayAccruedXp: number;
  todayAccruedDiamonds: number;
  /** The perfect-day bonus included in `todayAccruedXp`, for labelling it. */
  todayPerfectBonusXp: number;
  /** True when today has at least one due habit and all of them are done. */
  todayPerfect: boolean;
}

export interface SettlementResult {
  settledDays: number;
  xp: number;
  diamonds: number;
  /** True when work was actually done -- lets a caller avoid a spurious toast. */
  didSettle: boolean;
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
  /**
   * Pays every unsettled day that has ended into the profile, then empties the
   * wallet. Safe to call repeatedly -- the settlement ledger is keyed by
   * `userId:date`, so a day can only ever be paid once (ADR 0002).
   */
  settleElapsedRewards: (userId: string) => Promise<SettlementResult>;
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
  todayPerfectBonusXp: 0,
  todayPerfect: false,
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
   *
   * Settlement is read from the `rewardSettlements` table, not localStorage:
   * browser storage is not a system of record (ADR 0001 section 4, defect 7.1).
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
    // called from several places (including settlement) and must not silently
    // drop rewards when it runs before fetchHabits has populated `habits`.
    const allHabits = await db.habits.toArray();
    const habitsById = new Map(allHabits.map(h => [h.id, h]));
    const countsByDate: Record<string, number> = {};
    const completedIdsByDate: Record<string, Set<string>> = {};
    allLogs.forEach(l => {
      const habit = habitsById.get(l.habitId);
      if (!habit) return; // habit hard-deleted -> cannot verify it was due
      if (!isHabitScheduledOnDate(habit, l.date)) return; // ADR 0001 section 6.2
      countsByDate[l.date] = (countsByDate[l.date] || 0) + 1;
      if (!completedIdsByDate[l.date]) completedIdsByDate[l.date] = new Set();
      completedIdsByDate[l.date].add(l.habitId);
    });

    const settledRows = await db.rewardSettlements.where('userId').equals(userId).toArray();
    const settledDates = new Set(settledRows.map(r => r.date));

    const unclaimedDays: TemporaryWallet['unclaimedDays'] = [];
    Object.keys(countsByDate).forEach(d => {
      if (d < today && !settledDates.has(d)) {
        const count = countsByDate[d];
        if (count > 0) {
          const perfect = isPerfectDay(allHabits, d, completedIdsByDate[d]);
          unclaimedDays.push({ date: d, completedCount: count, ...computeDayReward(count, perfect) });
        }
      }
    });

    // Sort so the wallet reads chronologically and the streak rule sees a stable
    // order. Object key order on a YYYY-MM-DD record happens to be sorted, but
    // relying on that is a JS detail, not a guarantee.
    unclaimedDays.sort((a, b) => a.date.localeCompare(b.date));

    const todayCount = countsByDate[today] || 0;
    const todayPerfect = isPerfectDay(allHabits, today, completedIdsByDate[today] || new Set());
    const todayReward = computeDayReward(todayCount, todayPerfect);

    const totalXp = unclaimedDays.reduce((sum, d) => sum + d.xp, 0);
    const totalDiamonds = unclaimedDays.reduce((sum, d) => sum + d.diamonds, 0);

    set({
      temporaryWallet: {
        unclaimedDays,
        totalXp,
        totalDiamonds,
        todayAccruedXp: todayReward.xp,
        todayAccruedDiamonds: todayReward.diamonds,
        todayPerfectBonusXp: todayReward.perfectBonusXp,
        todayPerfect,
      }
    });
  },

  /**
   * Pays every ended-but-unsettled day into the profile, then empties the vault.
   *
   * Runs on rollover (see the habits screen's date-change detector) and on app
   * resume. It is NOT a manual claim and has no button: the old explicit claim
   * existed only because the wallet had no automatic trigger, and it is what
   * ADR 0001 section 4 was written about.
   *
   * Idempotent. `rewardSettlements.id` is `${userId}:${date}`, so a second run
   * hits a constraint error and skips that day rather than paying twice
   * (defect 7.2). A crash mid-transaction rolls the whole batch back, because
   * the ledger write and the profile write share one Dexie transaction.
   */
  settleElapsedRewards: async (userId) => {
    // No local `today` here: the day boundary is resolved inside
    // fetchTemporaryWallet (which anchors on getLocalTodayStr() and takes no date
    // parameter, so no caller can move it -- ADR 0001 section 7.3). Deriving the
    // list there means settlement cannot disagree with the wallet about which days
    // have ended.

    // Read the wallet first: it is the derived, schedule-aware view of what is
    // owed. Recomputing here instead of trusting stored state keeps one source of
    // truth (rule 5.3 #1).
    await get().fetchTemporaryWallet(userId);
    const { unclaimedDays } = get().temporaryWallet;

    if (unclaimedDays.length === 0) {
      return { settledDays: 0, xp: 0, diamonds: 0, didSettle: false };
    }

    const { useUserStore } = await import('./user-store');
    const uStore = useUserStore.getState();
    const profile = await db.profiles.get(userId);

    let xp = 0;
    let diamonds = 0;
    const settledDates: string[] = [];
    const now = new Date().toISOString();

    // One transaction across both tables: either the payout and its record both
    // land, or neither does. This is the fix for defect 7.2, where the balance
    // was written before the claim record and a crash between them paid twice.
    await db.transaction('rw', [db.rewardSettlements, db.profiles], async () => {
      for (const day of unclaimedDays) {
        // `add` on a deterministic primary key throws if the day is already
        // recorded. Treat that as "already settled", not as an error.
        try {
          await db.rewardSettlements.add({
            id: `${userId}:${day.date}`,
            userId,
            date: day.date,
            completedCount: day.completedCount,
            xp: day.xp,
            diamonds: day.diamonds,
            perfectBonusXp: day.perfectBonusXp,
            settledAt: now,
          });
        } catch (e) {
          if (e instanceof Error && e.name === 'ConstraintError') continue;
          throw e;
        }
        xp += day.xp;
        diamonds += day.diamonds;
        settledDates.push(day.date);
      }

      if ((xp > 0 || diamonds > 0) && profile) {
        const currentXp = typeof profile.xp === 'number' ? profile.xp : 0;
        const newXp = currentXp + xp;

        // ADR 0001 section 5: streak advances by an explicit consecutive-day
        // rule, never by the number of days settled.
        const newStreak = advanceStreakForSettlement(settledDates, profile.streak || 0);

        await db.profiles.update(userId, {
          xp: newXp,
          // Same flat curve the rest of the app uses; see ADR 0001 section 2.7.
          level: Math.floor(newXp / 500) + 1,
          diamonds: (typeof profile.diamonds === 'number' ? profile.diamonds : 0) + diamonds,
          streak: newStreak,
          highestStreak: Math.max(newStreak, profile.highestStreak || 0),
          militaryRank: (await import('../utils/gamification')).calculateRank(newStreak),
        });
      }
    });

    // Push the authoritative profile back into the store so every screen reading
    // XP sees the settlement without needing its own refresh.
    await uStore.fetchUser();
    await get().fetchTemporaryWallet(userId);

    return {
      settledDays: settledDates.length,
      xp,
      diamonds,
      didSettle: settledDates.length > 0,
    };
  },

  /**
   * Retained for callers that want an explicit payout, but it is now just a thin
   * wrapper over settlement -- there is no separate localStorage claim list and
   * no separate code path, so the two cannot drift.
   */
  claimTemporaryWallet: async (userId) => {
    const result = await get().settleElapsedRewards(userId);
    return { claimedXp: result.xp, claimedDiamonds: result.diamonds };
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
