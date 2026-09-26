import { create } from 'zustand';
import { getOrCreateUser, updateUserProfile, resetAllDataToZero, type Profile } from '../user';

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
    const newLevel = Math.floor(newXp / 500) + 1;
    await get().updateUser({ xp: newXp, level: newLevel });
  },
  addDiamonds: async (amount) => {
    const current = get().user || (await getOrCreateUser());
    const currentDiamonds = typeof current.diamonds === 'number' ? current.diamonds : 0;
    const newDiamonds = Math.max(0, currentDiamonds + amount);
    await get().updateUser({ diamonds: newDiamonds });
  },
  buyItem: async (itemIdOrName, cost) => {
    const current = get().user || (await getOrCreateUser());
    const currentDiamonds = current.diamonds || 0;
    if (currentDiamonds < cost) {
      return { success: false, message: `Insufficient diamonds! Need ${cost}, have ${currentDiamonds}` };
    }

    const equipped = current.equippedItems || [];
    const lower = itemIdOrName.toLowerCase();
    const updates: Partial<Profile> = {
      diamonds: Math.max(0, currentDiamonds - cost),
      equippedItems: Array.from(new Set([...equipped, itemIdOrName])),
    };

    if (lower.includes('freeze') || lower.includes('shield')) {
      updates.streakFreezeActive = true;
      updates.streakFreezeCount = (current.streakFreezeCount || 0) + 1;
    } else if (lower.includes('xp') || lower.includes('instant')) {
      const newXp = (current.xp || 0) + 100;
      updates.xp = newXp;
      updates.level = Math.floor(newXp / 500) + 1;
    }

    await get().updateUser(updates);
    return { success: true, message: `Acquired ${itemIdOrName}!` };
  },
  resetToZero: async () => {
    const user = await resetAllDataToZero();
    set({ user });
  }
}));
