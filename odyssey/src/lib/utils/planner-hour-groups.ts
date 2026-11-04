import type { ScheduleBlock, StoredScheduleCategory } from "@/lib/db";
import { canonicalCategoryKey } from "./schedule-category-key";
import { minuteOfLabel } from "./planner-block-time";

/** The fields an hour slot must carry to be grouped on the planner rail. */
export interface PlannerHourSlotLike {
  hour: number;
  startTime: string;
  endTime: string;
  block: ScheduleBlock | null;
  title: string;
  category: StoredScheduleCategory;
  isCustom: boolean;
  status: ScheduleBlock["status"];
}

export interface PlannerHourGroup {
  id: string;
  type: string;
  isCustom: boolean;
  startHour: number;
  endHour: number;
  /** Actual minute-level start (minutes-since-midnight) */
  startMin: number;
  /** Actual minute-level end (minutes-since-midnight) */
  endMin: number;
  hours: number[];
  slots: PlannerHourSlotLike[];
  title: string;
  category: string;
  primaryBlock: ScheduleBlock | null;
  status: string;
}

/** The entry text, compared the way a merge compares it. */
const entryKey = (title: string) => (title || "").trim().toLowerCase();

/**
 * Group adjacent written hours into the cards the planner rail draws.
 *
 * **Two hours are one card only when they are the same written entry in the
 * same category family.** Grouping on category alone was the bug: unrelated
 * tasks in one category became a single card, and a day planned end to end in
 * one category collapsed into one `00:00 → 24:00` card. Category still has to
 * match (owner rule: same text AND same category) — it just can no longer
 * create a group by itself.
 *
 * An unwritten hour never joins anything: it is its own empty slot.
 */
export function groupPlannerHours(
  hours: readonly PlannerHourSlotLike[]
): PlannerHourGroup[] {
  const groups: PlannerHourGroup[] = [];
  let current: PlannerHourGroup | null = null;

  for (const slot of hours) {
    const type = slot.isCustom ? canonicalCategoryKey(slot.category) : "open";
    const title = entryKey(slot.title);

    const canMerge =
      current !== null &&
      current.isCustom &&
      slot.isCustom &&
      title !== "" &&
      current.type === type &&
      entryKey(current.title) === title;

    if (canMerge && current) {
      current.endHour = slot.hour + 1;
      current.endMin = minuteOfLabel(slot.endTime) ?? (slot.hour + 1) * 60;
      current.hours.push(slot.hour);
      current.slots.push(slot);
      continue;
    }

    if (current) groups.push(current);
    current = {
      id: `group-${slot.hour}-${type}`,
      type,
      isCustom: slot.isCustom,
      startHour: slot.hour,
      endHour: slot.hour + 1,
      startMin: minuteOfLabel(slot.startTime) ?? slot.hour * 60,
      endMin: minuteOfLabel(slot.endTime) ?? (slot.hour + 1) * 60,
      hours: [slot.hour],
      slots: [slot],
      title: slot.title,
      category: slot.category,
      primaryBlock: slot.block ?? null,
      status: slot.status || "pending",
    };
  }

  if (current) groups.push(current);
  return groups;
}
