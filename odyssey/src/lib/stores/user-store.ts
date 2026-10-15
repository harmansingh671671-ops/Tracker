import { create } from 'zustand';
import { getOrCreateUser, updateUserProfile, resetAllDataToZero, type Profile } from '../user';
import { levelFromXp, quotePurchase, snapshotOf } from '../utils/economy';

interface UserState {
  user: Profile | null;
  loading: boolean;
  fetchUser: () => Promise<Profile>;
  updateUser: (updates: Partial<Profile>) => Promise<void>;
  addXp: (amount: number) => Promise<void>;
  addDiamonds: (amount: number) => Promise<void>;
  buyItem: (itemIdOrName: string, cost: number) => Promise<{ success: boolean; message: string }>;
  resetToZero: () => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  user: null,
  loading: true,
  fetchUser: async () => {
    const user = await getOrCreateUser();
    set({ user, loading: false });
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
    set({ user });
  }
}));
