import { create } from 'zustand';
import { getOrCreateUser, updateUserProfile, resetAllDataToZero, type Profile } from '../user';
import { db } from '../db';
import { levelFromXp, quotePurchase, snapshotOf } from '../utils/economy';
import { countScheduleCompliedDays } from '../utils/compliance';

interface UserState {
  user: Profile | null;
  loading: boolean;
  /**
   * The app-wide **days done** counter: days whose schedule was fully written
   * (>=18h) and fully reviewed (ADR 0005). Derived from `scheduleBlocks` on every
   * `fetchUser` and never stored, so it cannot drift or need a migration.
   */
  daysComplied: number;
  fetchUser: () => Promise<Profile>;
  updateUser: (updates: Partial<Profile>) => Promise<void>;
  addXp: (amount: number) => Promise<void>;
  addDiamonds: (amount: number) => Promise<void>;
  buyItem: (itemIdOrName: string, cost: number) => Promise<{ success: boolean; message: string }>;
  resetToZero: () => Promise<void>;
}

/**
 * Counts the complied schedule days from the blocks on disk.
 *
 * This is a full read of `scheduleBlocks`, which is why it lives in `fetchUser`
 * (once per screen mount) and not in a render path. A complied day is a *past*
 * day, so the number is stable within a session except when the user reviews the
 * last pending hour, which calls `fetchUser` again.
 */
async function countDaysDone(userId: string): Promise<number> {
  const blocks = (await db.scheduleBlocks.toArray()).filter((b) => b.userId === userId);
  return countScheduleCompliedDays(blocks);
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  loading: true,
  daysComplied: 0,
  fetchUser: async () => {
    const user = await getOrCreateUser();
    const daysComplied = await countDaysDone(user.id);
    set({ user, loading: false, daysComplied });
    return user;
  },
  updateUser: async (updates) => {
    const current = get().user || (await getOrCreateUser());
    if (!updates.militaryRank && updates.streak !== undefined) {
      const streak = updates.streak !== undefined ? updates.streak : (current?.streak ?? 0);
      const { calculateRank } = await import('../utils/gamification');
      updates.militaryRank = calculateRank(streak);
    }
    const updated = await updateUserProfile(updates);
    set({ user: updated });
  },
  addXp: async (amount) => {
    const current = get().user || (await getOrCreateUser());
    const currentXp = typeof current.xp === 'number' ? current.xp : 0;
    const newXp = Math.max(0, currentXp + amount);
    await get().updateUser({ xp: newXp, level: levelFromXp(newXp) });
  },
  addDiamonds: async (amount) => {
    const current = get().user || (await getOrCreateUser());
    const currentDiamonds = typeof current.diamonds === 'number' ? current.diamonds : 0;
    const newDiamonds = Math.max(0, currentDiamonds + amount);
    await get().updateUser({ diamonds: newDiamonds });
  },
  buyItem: async (itemIdOrName, cost) => {
    const current = get().user || (await getOrCreateUser());
    // The purchase rules themselves -- insufficient funds, the streak-freeze
    // branch, the instant-XP branch -- live in lib/utils/economy.ts and are
    // unit-tested there. They had no tests at all while they lived here, which
    // is the only reason this moved.
    const quote = quotePurchase(snapshotOf(current), itemIdOrName, cost);
    if (!quote.ok) return { success: false, message: quote.message };

    await get().updateUser(quote.updates);
    return { success: true, message: quote.message };
  },
  resetToZero: async () => {
    const user = await resetAllDataToZero();
    // The reset clears `scheduleBlocks`, so the app-wide count really is zero.
    set({ user, daysComplied: 0 });
  }
}));
