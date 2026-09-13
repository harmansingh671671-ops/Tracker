import { create } from 'zustand';
import { getOrCreateUser, updateUserProfile, type Profile } from '../user';

interface UserState {
  user: Profile | null;
  loading: boolean;
  fetchUser: () => Promise<Profile>;
  updateUser: (updates: Partial<Profile>) => Promise<void>;
  addXp: (amount: number) => Promise<void>;
  addDiamonds: (amount: number) => Promise<void>;
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
    const updated = await updateUserProfile(updates);
    set({ user: updated });
  },
  addXp: async (amount) => {
    const current = get().user;
    if (!current) return;
    const newXp = current.xp + amount;
    const newLevel = Math.floor(newXp / 200) + 1;
    await get().updateUser({ xp: newXp, level: newLevel });
  },
  addDiamonds: async (amount) => {
    const current = get().user;
    if (!current) return;
    await get().updateUser({ diamonds: current.diamonds + amount });
  }
}));
