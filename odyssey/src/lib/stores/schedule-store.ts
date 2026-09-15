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
      { startTime: '00:00', endTime: '01:00', title: 'Deep Circadian Slumber (H1)', tag: 'Restored' },
      { startTime: '01:00', endTime: '02:00', title: 'REM Cycle Phase I', tag: 'SpO2 99%' },
      { startTime: '02:00', endTime: '03:00', title: 'Deep Delta Sleep Wave', tag: 'Peak Recovery' },
      { startTime: '03:00', endTime: '04:00', title: 'Cellular Repair Interval', tag: 'HRV 72ms' },
      { startTime: '04:00', endTime: '05:00', title: 'REM Cycle Phase II', tag: 'Memory Consolidation' },
      { startTime: '05:00', endTime: '06:00', title: 'Light Rest & Cortisol Rise', tag: 'Pre-Dawn Stage' },
      { startTime: '06:00', endTime: '07:00', title: 'Circadian Slumber Completion', tag: '8.0h Done' },
      { startTime: '21:00', endTime: '22:00', title: 'Digital Sunset & Fiction Reading', tag: 'Screen Sunset' },
      { startTime: '22:00', endTime: '23:00', title: 'Melatonin Prep & Ambient Rest', tag: 'Melatonin Prep' },
      { startTime: '23:00', endTime: '24:00', title: 'Circadian Slumber Inception', tag: 'Ready' },
    ];

    for (const slot of sleepSlots) {
      const alreadyHas = existing.some(b => b.startTime === slot.startTime);
      if (!alreadyHas) {
        const endHourNum = parseInt(slot.endTime.split(':')[0], 10);
        const normEndH = endHourNum === 0 ? 24 : endHourNum;
        const currentH = new Date().getHours();
        const isAlreadyPast = currentH >= normEndH;
        const isBuffer = slot.startTime === '21:00';
        const newBlock: ScheduleBlock = {
          id: uuidv4(),
          userId,
          date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          title: slot.title,
          description: slot.tag,
          category: isBuffer ? 'buffer' : 'sleep',
          tag: slot.tag,
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
