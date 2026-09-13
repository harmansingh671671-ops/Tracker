import { create } from 'zustand';
import { db, type ScheduleBlock } from '../db';
import { v4 as uuidv4 } from 'uuid';

interface ScheduleState {
  blocks: ScheduleBlock[];
  loading: boolean;
  fetchBlocksForDate: (userId: string, date: string) => Promise<ScheduleBlock[]>;
  addBlock: (block: Omit<ScheduleBlock, 'id' | 'createdAt'>) => Promise<ScheduleBlock>;
  updateBlock: (id: string, updates: Partial<ScheduleBlock>) => Promise<void>;
  deleteBlock: (id: string) => Promise<void>;
  commitSchedule: (userId: string, date: string) => Promise<void>;
}

export const useScheduleStore = create<ScheduleState>((set, get) => ({
  blocks: [],
  loading: false,
  fetchBlocksForDate: async (userId, date) => {
    set({ loading: true });
    const blocks = await db.scheduleBlocks
      .where('[userId+date]')
      .equals([userId, date])
      .toArray();
    
    // Sort by startTime
    blocks.sort((a, b) => a.startTime.localeCompare(b.startTime));
    set({ blocks, loading: false });
    return blocks;
  },
  addBlock: async (blockData) => {
    const newBlock: ScheduleBlock = {
      ...blockData,
      id: uuidv4(),
      createdAt: new Date().toISOString()
    };
    await db.scheduleBlocks.add(newBlock);
    set((state) => ({
      blocks: [...state.blocks, newBlock].sort((a, b) => a.startTime.localeCompare(b.startTime))
    }));
    return newBlock;
  },
  updateBlock: async (id, updates) => {
    await db.scheduleBlocks.update(id, updates);
    set((state) => ({
      blocks: state.blocks.map(b => b.id === id ? { ...b, ...updates } : b)
    }));
  },
  deleteBlock: async (id) => {
    await db.scheduleBlocks.delete(id);
    set((state) => ({
      blocks: state.blocks.filter(b => b.id !== id)
    }));
  },
  commitSchedule: async (userId, date) => {
    const blocks = get().blocks;
    await db.transaction('rw', db.scheduleBlocks, async () => {
      for (const b of blocks) {
        await db.scheduleBlocks.update(b.id, { isCommitted: true });
      }
    });
    set((state) => ({
      blocks: state.blocks.map(b => ({ ...b, isCommitted: true }))
    }));
  }
}));
