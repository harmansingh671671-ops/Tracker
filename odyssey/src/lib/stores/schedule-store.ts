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
  autoFillSleep: (userId: string, date: string) => Promise<void>;
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
  },
  autoFillSleep: async (userId, date) => {
    const existing = get().blocks;
    const sleepSlots = [
      { startTime: '00:00', endTime: '01:00' },
      { startTime: '01:00', endTime: '02:00' },
      { startTime: '02:00', endTime: '03:00' },
      { startTime: '03:00', endTime: '04:00' },
      { startTime: '04:00', endTime: '05:00' },
      { startTime: '05:00', endTime: '06:00' },
      { startTime: '06:00', endTime: '07:00' },
      { startTime: '23:00', endTime: '24:00' },
    ];

    for (const slot of sleepSlots) {
      const alreadyHas = existing.some(b => b.startTime === slot.startTime);
      if (!alreadyHas) {
        const endHourNum = parseInt(slot.endTime.split(':')[0], 10);
        const normEndH = endHourNum === 0 ? 24 : endHourNum;
        const currentH = new Date().getHours();
        const isAlreadyPast = currentH >= normEndH;
        const newBlock: ScheduleBlock = {
          id: uuidv4(),
          userId,
          date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          title: 'Sleep',
          description: '',
          category: 'sleep',
          tag: 'Rest',
          status: isAlreadyPast ? 'completed' : 'pending',
          isCommitted: true,
          createdAt: new Date().toISOString(),
        };
        await db.scheduleBlocks.add(newBlock);
      }
    }
    await get().fetchBlocksForDate(userId, date);
  }
}));
