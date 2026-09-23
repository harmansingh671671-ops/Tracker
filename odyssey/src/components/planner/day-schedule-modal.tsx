"use client";

import { useState, useEffect, useMemo } from "react";
import { db, type ScheduleBlock } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";
import {
  X,
  Sparkles,
  Moon,
  Plus,
  Trash2,
  MoreVertical,
  Check,
} from "lucide-react";

interface DayScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string; // YYYY-MM-DD
  dayNumber?: number; // e.g. Day 2
  userId: string;
  onSaved?: () => void;
}

type CategoryType = "work" | "habits" | "buffer" | "sleep";

function formatCleanHourRange(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return "";
  const [sHStr] = startTime.split(":");
  const [eHStr] = endTime.split(":");
  const sH = parseInt(sHStr, 10);
  let eH = parseInt(eHStr, 10);
  if (endTime === "24:00" || (eH === 0 && sH > 0)) eH = 24;
  return `${sH.toString().padStart(2, "0")}-${eH.toString().padStart(2, "0")}`;
}

function parseHour(timeStr: string): number {
  if (!timeStr) return 0;
  const [h, m] = timeStr.split(":");
  return parseInt(h, 10) + (parseInt(m || "0", 10) / 60);
}

function normalizeCategory(category: string, title?: string): CategoryType {
  const c = (category || "").toLowerCase();
  const t = (title || "").toLowerCase();
  if (c.includes("sleep") || c.includes("rest") || t.includes("sleep") || t.includes("slumber")) return "sleep";
  if (c.includes("work") || c.includes("study") || t.includes("study") || t.includes("deep work") || t.includes("focus")) return "work";
  if (c.includes("habit") || c.includes("health") || c.includes("vitality") || t.includes("gym") || t.includes("workout")) return "habits";
  return "buffer";
}

export function DayScheduleModal({
  isOpen,
  onClose,
  date,
  dayNumber,
  userId,
  onSaved,
}: DayScheduleModalProps) {
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState(true);

  // Sequential task entry form state
  const [taskTitle, setTaskTitle] = useState("");
  const [taskCategory, setTaskCategory] = useState<CategoryType>("work");
  const [taskDuration, setTaskDuration] = useState<number>(1); // hours
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  // Formatted date title
  const formattedDate = useMemo(() => {
    if (!date) return "";
    const [y, m, d] = date.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [date]);

  // Fetch blocks for date from DB
  const loadBlocks = async () => {
    if (!userId || !date) return;
    setLoading(true);
    const results = await db.scheduleBlocks
      .where("[userId+date]")
      .equals([userId, date])
      .toArray();
    results.sort((a, b) => a.startTime.localeCompare(b.startTime));
    setBlocks(results);
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      loadBlocks();
    }
  }, [isOpen, date, userId]);

  // Hourly allocation map (0 to 23)
  const hourMap = useMemo(() => {
    const map: (ScheduleBlock | null)[] = Array(24).fill(null);
    for (const b of blocks) {
      const startH = parseHour(b.startTime);
      let endH = parseHour(b.endTime);
      if (endH === 0 && startH > 0) endH = 24;
      if (b.endTime === "24:00") endH = 24;

      const s = Math.max(0, Math.floor(startH));
      const e = Math.min(24, Math.ceil(endH));
      for (let h = s; h < e; h++) {
        map[h] = b;
      }
    }
    return map;
  }, [blocks]);

  // Find next unoccupied hour for sequential entry
  const nextUnoccupiedHour = useMemo(() => {
    for (let h = 0; h < 24; h++) {
      if (!hourMap[h]) return h;
    }
    return null; // All 24 hours filled!
  }, [hourMap]);

  // Hours calculated by category
  const { sleepHours, workHours, habitHours, bufferHours, totalHours } = useMemo(() => {
    let sleep = 0, work = 0, habit = 0, buffer = 0;
    for (let h = 0; h < 24; h++) {
      const b = hourMap[h];
      if (b) {
        const cat = normalizeCategory(b.category, b.title);
        if (cat === "sleep") sleep++;
        else if (cat === "work") work++;
        else if (cat === "habits") habit++;
        else buffer++;
      }
    }
    return {
      sleepHours: sleep,
      workHours: work,
      habitHours: habit,
      bufferHours: buffer,
      totalHours: sleep + work + habit + buffer,
    };
  }, [hourMap]);

  // Sequential grouping of timeline for presentation
  const groupedTimeline = useMemo(() => {
    const items: Array<
      | { type: "block"; block: ScheduleBlock; startH: number; endH: number }
      | { type: "empty"; startH: number; endH: number }
    > = [];

    let currentH = 0;
    while (currentH < 24) {
      const currentBlock = hourMap[currentH];
      if (currentBlock) {
        const startH = currentH;
        while (currentH < 24 && hourMap[currentH]?.id === currentBlock.id) {
          currentH++;
        }
        items.push({
          type: "block",
          block: currentBlock,
          startH,
          endH: currentH,
        });
      } else {
        const startH = currentH;
        while (currentH < 24 && !hourMap[currentH]) {
          currentH++;
        }
        items.push({
          type: "empty",
          startH,
          endH: currentH,
        });
      }
    }
    return items;
  }, [hourMap]);

  // Auto-fill Sleep (23:00-07:00)
  const handleAutoFillSleep = async () => {
    if (!userId || !date) return;
    const sleepSlots = [
      { start: "00:00", end: "01:00" },
      { start: "01:00", end: "02:00" },
      { start: "02:00", end: "03:00" },
      { start: "03:00", end: "04:00" },
      { start: "04:00", end: "05:00" },
      { start: "05:00", end: "06:00" },
      { start: "06:00", end: "07:00" },
      { start: "23:00", end: "24:00" },
    ];

    for (const slot of sleepSlots) {
      const sH = parseInt(slot.start.split(":")[0], 10);
      if (!hourMap[sH]) {
        await db.scheduleBlocks.add({
          id: uuidv4(),
          userId,
          date,
          startTime: slot.start,
          endTime: slot.end,
          title: "Sleep",
          description: "",
          category: "sleep",
          tag: "Rest",
          status: "pending",
          isCommitted: true,
          createdAt: new Date().toISOString(),
        });
      }
    }
    await loadBlocks();
    onSaved?.();
  };

  // Add sequential task to the next available hour
  const handleAddSequentialTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!taskTitle.trim() || nextUnoccupiedHour === null) return;

    const startH = nextUnoccupiedHour;
    let endH = startH;
    const requestedEnd = Math.min(24, startH + taskDuration);
    while (endH < requestedEnd && !hourMap[endH]) {
      endH++;
    }

    if (endH <= startH) return;

    const startStr = `${startH.toString().padStart(2, "0")}:00`;
    const endStr = endH === 24 ? "24:00" : `${endH.toString().padStart(2, "0")}:00`;

    const newBlock: ScheduleBlock = {
      id: uuidv4(),
      userId,
      date,
      startTime: startStr,
      endTime: endStr,
      title: taskTitle.trim(),
      category: taskCategory,
      tag: taskCategory === "work" ? "Deep Work" : taskCategory === "habits" ? "Vitality" : "Routine",
      status: "pending",
      isCommitted: true,
      createdAt: new Date().toISOString(),
    };

    await db.scheduleBlocks.add(newBlock);
    setTaskTitle("");
    await loadBlocks();
    onSaved?.();
  };

  // Quick fill specific empty range
  const handleFillEmptySlot = (startH: number) => {
    const startStr = `${startH.toString().padStart(2, "0")}:00`;
    const endH = Math.min(24, startH + 1);
    const endStr = endH === 24 ? "24:00" : `${endH.toString().padStart(2, "0")}:00`;
    
    const title = prompt(`Task name for ${formatCleanHourRange(startStr, endStr)}:`);
    if (title && title.trim()) {
      db.scheduleBlocks.add({
        id: uuidv4(),
        userId,
        date,
        startTime: startStr,
        endTime: endStr,
        title: title.trim(),
        category: "work",
        status: "pending",
        isCommitted: true,
        createdAt: new Date().toISOString(),
      }).then(() => {
        loadBlocks();
        onSaved?.();
      });
    }
  };

  // Delete a block
  const handleDeleteBlock = async (id: string) => {
    await db.scheduleBlocks.delete(id);
    setActiveActionMenuId(null);
    await loadBlocks();
    onSaved?.();
  };

  // Clear entire day schedule
  const handleClearDay = async () => {
    if (confirm("Are you sure you want to clear all blocks for this day?")) {
      const ids = blocks.map((b) => b.id);
      await db.scheduleBlocks.bulkDelete(ids);
      await loadBlocks();
      onSaved?.();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[92vh] flex flex-col bg-surface-container-high border border-outline/25 rounded-2xl shadow-2xl overflow-hidden">
        {/* Modal Top Header */}
        <div className="p-4 border-b border-outline/15 flex items-center justify-between shrink-0 bg-surface-container">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              {dayNumber && (
                <span className="px-2 py-0.5 rounded-md bg-primary/15 text-primary text-[11px] font-mono font-bold">
                  Day {dayNumber}
                </span>
              )}
              <span className="text-xs text-on-surface-variant font-medium">
                Daily Plan
              </span>
            </div>
            <h2 className="text-base sm:text-lg font-bold text-on-surface tracking-tight truncate mt-0.5">
              {formattedDate}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 24-Hour Progress & Distribution Bar */}
        <div className="px-4 py-2.5 bg-surface-container-highest/60 border-b border-outline/10 shrink-0 space-y-1.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-semibold text-on-surface">
              {totalHours} / 24 hrs Planned
            </span>
            <span
              className={`font-bold ${
                totalHours === 24
                  ? "text-emerald-400"
                  : totalHours >= 16
                  ? "text-primary"
                  : "text-amber-400"
              }`}
            >
              {Math.round((totalHours / 24) * 100)}% Locked
            </span>
          </div>

          {/* Color Breakdown Strip */}
          <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden flex">
            <div
              style={{ width: `${(sleepHours / 24) * 100}%` }}
              className="h-full bg-emerald-500 transition-all duration-300"
              title={`Sleep: ${sleepHours}h`}
            />
            <div
              style={{ width: `${(workHours / 24) * 100}%` }}
              className="h-full bg-primary transition-all duration-300"
              title={`Work/Study: ${workHours}h`}
            />
            <div
              style={{ width: `${(habitHours / 24) * 100}%` }}
              className="h-full bg-purple-500 transition-all duration-300"
              title={`Habits: ${habitHours}h`}
            />
            <div
              style={{ width: `${(bufferHours / 24) * 100}%` }}
              className="h-full bg-amber-500 transition-all duration-300"
              title={`Buffer: ${bufferHours}h`}
            />
          </div>

          {/* Category Legend & Quick Actions */}
          <div className="flex items-center justify-between pt-0.5">
            <div className="flex items-center gap-2.5 text-[10.5px] font-mono text-on-surface-variant">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Sleep {sleepHours}h
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Work {workHours}h
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                Habits {habitHours}h
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAutoFillSleep}
                className="px-2 py-0.5 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10.5px] font-mono font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                title="Auto-fill Sleep hours (23:00 - 07:00)"
              >
                <Moon className="w-3 h-3" />
                <span>Auto-Sleep</span>
              </button>
              {blocks.length > 0 && (
                <button
                  type="button"
                  onClick={handleClearDay}
                  className="px-1.5 py-0.5 rounded-md text-rose-400/80 hover:text-rose-400 text-[10.5px] font-mono hover:bg-rose-500/10 cursor-pointer"
                  title="Clear all blocks"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sequential Task Entry Panel (No manual hour picking!) */}
        <div className="p-3 sm:p-4 bg-surface-container/90 border-b border-outline/15 shrink-0">
          {nextUnoccupiedHour !== null ? (
            <form onSubmit={handleAddSequentialTask} className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Sequential Entry • Next Slot:{" "}
                  <span className="text-on-surface bg-surface-container-highest px-1.5 py-0.2 rounded border border-outline/20">
                    {nextUnoccupiedHour.toString().padStart(2, "0")}:00
                  </span>
                </span>

                {/* Duration Pills (1h, 2h, 3h) */}
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map((dur) => (
                    <button
                      key={dur}
                      type="button"
                      onClick={() => setTaskDuration(dur)}
                      className={`px-2 py-0.5 rounded text-[10.5px] font-mono font-semibold transition-colors cursor-pointer ${
                        taskDuration === dur
                          ? "bg-primary text-on-primary"
                          : "bg-surface-container-highest text-on-surface-variant hover:text-on-surface"
                      }`}
                    >
                      {dur}h
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="Task in sequence (e.g. Deep Work, Workout, Reading)..."
                  className="flex-1 bg-surface-container-highest border border-outline/30 rounded-xl px-3 py-2 text-xs sm:text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-colors"
                />

                <select
                  value={taskCategory}
                  onChange={(e) => setTaskCategory(e.target.value as CategoryType)}
                  className="bg-surface-container-highest border border-outline/30 rounded-xl px-2.5 py-2 text-xs font-mono font-semibold text-on-surface focus:outline-none focus:border-primary shrink-0 cursor-pointer"
                >
                  <option value="work">Work/Study</option>
                  <option value="habits">Habits/Health</option>
                  <option value="buffer">Buffer/Rest</option>
                  <option value="sleep">Sleep</option>
                </select>

                <button
                  type="submit"
                  disabled={!taskTitle.trim()}
                  className="px-3.5 py-2 rounded-xl bg-primary text-on-primary font-bold text-xs flex items-center gap-1.5 shadow-md hover:bg-primary-fixed active:scale-95 disabled:opacity-40 disabled:pointer-events-none transition-all cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-emerald-400">
              <span className="text-xs font-mono font-bold flex items-center gap-2">
                <Check className="w-4 h-4" />
                All 24 Hours Fully Planned for this Day!
              </span>
              <span className="text-[11px] font-mono font-semibold">100% Locked</span>
            </div>
          )}
        </div>

        {/* 24-Hour Sequential Timeline List (Same sleek look as Today page) */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
          {loading ? (
            <div className="py-12 text-center text-xs text-on-surface-variant font-mono">
              Loading schedule...
            </div>
          ) : (
            groupedTimeline.map((item, idx) => {
              if (item.type === "empty") {
                const sStr = `${item.startH.toString().padStart(2, "0")}:00`;
                const eStr = item.endH === 24 ? "24:00" : `${item.endH.toString().padStart(2, "0")}:00`;
                const timeLabel = formatCleanHourRange(sStr, eStr);

                return (
                  <button
                    key={`empty-${idx}`}
                    type="button"
                    onClick={() => handleFillEmptySlot(item.startH)}
                    className="w-full p-2.5 rounded-xl border border-dashed border-outline/20 hover:border-primary/40 bg-surface-container-highest/25 hover:bg-surface-container-highest/50 flex items-center justify-between text-left transition-all cursor-pointer group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-xs font-bold text-on-surface-variant/70 group-hover:text-primary">
                        {timeLabel}
                      </span>
                      <span className="text-xs text-on-surface-variant/50 group-hover:text-on-surface-variant">
                        Unallocated slot • Tap to fill
                      </span>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-on-surface-variant/40 group-hover:text-primary" />
                  </button>
                );
              }

              const { block, startH, endH } = item;
              const sStr = `${startH.toString().padStart(2, "0")}:00`;
              const eStr = endH === 24 ? "24:00" : `${endH.toString().padStart(2, "0")}:00`;
              const timeLabel = formatCleanHourRange(sStr, eStr);
              const cat = normalizeCategory(block.category, block.title);

              const catBadgeColor =
                cat === "sleep"
                  ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                  : cat === "work"
                  ? "border-primary/30 text-primary bg-primary/10"
                  : cat === "habits"
                  ? "border-purple-400/30 text-purple-400 bg-purple-400/10"
                  : "border-amber-400/30 text-amber-400 bg-amber-400/10";

              return (
                <div
                  key={block.id}
                  className="relative p-2.5 sm:p-3 rounded-xl bg-surface-container border border-outline/20 flex items-center justify-between gap-2.5 hover:border-outline/40 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="font-mono text-xs font-bold text-on-surface-variant shrink-0 w-12 sm:w-14">
                      {timeLabel}
                    </span>

                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-bold text-on-surface truncate">
                          {block.title}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold uppercase border ${catBadgeColor}`}
                        >
                          {cat}
                        </span>
                      </div>
                      {block.description && (
                        <span className="text-[11px] text-on-surface-variant truncate">
                          {block.description}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions (3-dots or direct delete) */}
                  <div className="relative shrink-0 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setActiveActionMenuId(
                          activeActionMenuId === block.id ? null : block.id
                        )
                      }
                      className="p-1.5 rounded-lg hover:bg-surface-container-highest text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {activeActionMenuId === block.id && (
                      <div className="absolute right-0 top-8 z-30 w-32 p-1 rounded-xl bg-surface-container-highest border border-outline/30 shadow-xl space-y-0.5 animate-in fade-in zoom-in-95">
                        <button
                          type="button"
                          onClick={() => handleDeleteBlock(block.id)}
                          className="w-full px-2.5 py-1.5 rounded-lg text-left text-xs text-rose-400 hover:bg-rose-500/15 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Block</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Bottom Footer */}
        <div className="p-3 sm:p-4 border-t border-outline/15 bg-surface-container flex items-center justify-between shrink-0">
          <span className="text-xs text-on-surface-variant font-mono">
            {totalHours === 24
              ? "✓ Day schedule complete"
              : `${24 - totalHours} hours unallocated`}
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-md hover:bg-primary-fixed active:scale-95 transition-all cursor-pointer"
          >
            Done & Save
          </button>
        </div>
      </div>
    </div>
  );
}
