import { create } from 'zustand';
import { getOrCreateUser, updateUserProfile, resetAllDataToZero, type Profile } from '../user';

interface UserState {
  user: Profile | null;
  loading: boolean;
  fetchUser: () => Promise<Profile>;
  updateUser: (updates: Partial<Profile>) => Promise<void>;
  addXp: (amount: number) => Promise<void>;
  addDiamonds: (amount: number) => Promise<void>;
  buyItem: (name: string, cost: number) => Promise<{ success: boolean; message: string }>;
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
    const current = get().user;
    if (!updates.militaryRank && (updates.streak !== undefined || updates.integrityScore !== undefined)) {
      const streak = updates.streak !== undefined ? updates.streak : (current?.streak ?? 0);
      const integrity = updates.integrityScore !== undefined ? updates.integrityScore : (current?.integrityScore ?? 100);
      const { calculateRank } = await import('../utils/gamification');
      updates.militaryRank = calculateRank(streak, integrity);
    }
    const updated = await updateUserProfile(updates);
    set({ user: updated });
  },
  addXp: async (amount) => {
    const current = get().user;
    if (!current) return;
    const newXp = current.xp + amount;
    const newLevel = Math.floor(newXp / 500) + 1;
    await get().updateUser({ xp: newXp, level: newLevel });
  },
  addDiamonds: async (amount) => {
    const current = get().user;
    if (!current) return;
    await get().updateUser({ diamonds: current.diamonds + amount });
  },
  buyItem: async (name, cost) => {
    const current = get().user;
    if (!current) return { success: false, message: 'User not loaded' };
    if (current.diamonds < cost) {
      return { success: false, message: `Insufficient diamonds! Need ${cost}, have ${current.diamonds}` };
    }

    const equipped = current.equippedItems || [];
    const updates: Partial<Profile> = {
      diamonds: current.diamonds - cost,
      equippedItems: Array.from(new Set([...equipped, name])),
    };

    if (name.includes('Streak Freeze')) {
      updates.streakFreezeActive = true;
      updates.streakFreezeCount = (current.streakFreezeCount || 0) + 1;
    } else if (name.includes('100 Instant XP')) {
      const newXp = current.xp + 100;
      updates.xp = newXp;
      updates.level = Math.floor(newXp / 500) + 1;
    }

    await get().updateUser(updates);
    return { success: true, message: `Acquired ${name}!` };
  },
  resetToZero: async () => {
    const user = await resetAllDataToZero();
    set({ user });
  }
}));
