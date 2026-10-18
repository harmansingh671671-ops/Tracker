import Dexie, { type Table } from "dexie";
import { type ScheduleBlock } from "@/lib/db";
import { logWarn } from "@/lib/utils/logger";

/**
 * Where a block waits after a drag pushes it off its hour.
 *
 * A held block is deliberately NOT in `scheduleBlocks`. Everything that reads
 * that table reads it as "the day's timeline" -- the rail, the first-paint
 * cache, the native sync, the stats rollups -- and a held block is not on the
 * timeline until the user drops it somewhere. Keeping it in its own store means
 * all of those readers keep working unchanged, and the hour the user dragged
 * from stays empty across a reload instead of the pushed-out block quietly
 * reappearing in it.
 *
 * Its own database rather than a table in `OdysseyDB`: a held block has no
 * relationship to the day being queried, and this store can be dropped and
 * rebuilt without touching the user's schedule.
 */
class FloatingBlocksDB extends Dexie {
  blocks!: Table<ScheduleBlock, string>;

  constructor() {
    super("OdysseyFloatingBlocks");
    this.version(1).stores({ blocks: "id, date" });
  }
}

const floatingDb = new FloatingBlocksDB();

/**
 * Move a block off the timeline. The full row is kept, so it is restored
 * exactly as it was -- including its own start and end time, which are NOT
 * rewritten to the slot it was pushed out of.
 *
 * Throws if it cannot be stored. Callers must then leave the block on the
 * timeline: a displaced block that is not held anywhere is a lost block.
 */
export async function holdFloatingBlock(block: ScheduleBlock): Promise<void> {
  await floatingDb.blocks.put(block);
}

/** The block is back on the timeline; forget the held copy. */
export async function releaseFloatingBlock(id: string): Promise<void> {
  await floatingDb.blocks.delete(id);
}

/** Best-effort read: an unreadable store means "no held blocks", never a throw. */
export async function listFloatingBlocks(dateStr: string): Promise<ScheduleBlock[]> {
  try {
    return await floatingDb.blocks.where("date").equals(dateStr).toArray();
  } catch {
    return [];
  }
}

/**
 * Drop every held block. `scheduleBlocks` is wiped by two flows -- restoring a
 * backup and "reset all data to zero" -- and both must take the held blocks with
 * them, or a reset user is handed floating icons for blocks they just cleared.
 *
 * Deliberately never throws: it runs inside a reset whose job is to finish.
 */
export async function clearFloatingBlocks(): Promise<void> {
  try {
    await floatingDb.blocks.clear();
  } catch (e) {
    logWarn("storage", "could not clear held blocks", e);
  }
}
