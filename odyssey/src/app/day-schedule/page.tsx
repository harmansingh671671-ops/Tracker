"use client";

import { Suspense, useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserStore } from "@/lib/stores/user-store";
import { useScheduleStore } from "@/lib/stores/schedule-store";
import { type ScheduleBlock } from "@/lib/db";
import { getJourneyDayNumber, getDateForJourneyDay } from "@/lib/utils/journey";
import {
  ChevronLeft,
  Moon,
  Sun,
  Coffee,
  Brain,
  Heart,
  Sparkles,
  Check,
  Loader2,
} from "lucide-react";

export default function DaySchedulePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      }
    >
      <DayScheduleContent />
    </Suspense>
  );
}

type CategoryKey =
  | "sleep"
  | "Work"
  | "Study"
  | "Health"
  | "Sleep"
  | "Leisure"
  | "Admin"
  | "work"
  | "habits"
  | "buffer";

const HOURS = Array.from({ length: 24 }, (_, i) => i);

const CATEGORY_PALETTE: {
  key: CategoryKey;
  label: string;
  icon: string;
  dotClass: string;
  pillBg: string;
  pillText: string;
}[] = [
  {
    key: "sleep",
    label: "Sleep",
    icon: "bedtime",
    dotClass: "bg-indigo-500",
    pillBg: "bg-indigo-500/15",
    pillText: "text-indigo-300",
  },
  {
    key: "Work",
    label: "Deep Focus",
    icon: "psychology",
    dotClass: "bg-primary",
    pillBg: "bg-primary/15",
    pillText: "text-primary",
  },
  {
    key: "habits",
    label: "Routine",
    icon: "wb_sunny",
    dotClass: "bg-primary-fixed",
    pillBg: "bg-primary-fixed/15",
    pillText: "text-primary-fixed",
  },
  {
    key: "Leisure",
    label: "Rest",
    icon: "self_improvement",
    dotClass: "bg-tertiary-container",
    pillBg: "bg-amber-500/15",
    pillText: "text-tertiary",
  },
  {
    key: "buffer",
    label: "Buffer",
    icon: "hourglass_empty",
    dotClass: "bg-surface-container-highest",
    pillBg: "bg-surface-container-highest/30",
    pillText: "text-on-surface-variant",
  },
];

function getCategoryMeta(cat: string) {
  return (
    CATEGORY_PALETTE.find((c) => c.key === cat) ||
    CATEGORY_PALETTE.find((c) => c.key === "buffer")!
  );
}

function formatHour(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

function formatDateDisplay(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function DayScheduleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, fetchUser } = useUserStore();
  const {
    blocks,
    fetchBlocksForDate,
    addBlock,
    updateBlock,
    deleteBlock,
    autoFillSleep,
  } = useScheduleStore();

  const dateStr = searchParams.get("date") || "";
  const dayNum = searchParams.get("day")
    ? parseInt(searchParams.get("day")!, 10)
    : null;

  const [loading, setLoading] = useState(true);
  const [editingValues, setEditingValues] = useState<Record<string, string>>(
    {}
  );
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("Work");
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());

  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const streamRef = useRef<HTMLDivElement>(null);
  const currentHour = new Date().getHours();

  // Fetch user and schedule blocks
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    if (user?.id && dateStr) {
      setLoading(true);
      fetchBlocksForDate(user.id, dateStr).then(() => setLoading(false));
    }
  }, [user?.id, dateStr, fetchBlocksForDate]);

  // Initialize editing values from blocks
  useEffect(() => {
    const values: Record<string, string> = {};
    blocks.forEach((b) => {
      values[b.id] = b.title;
    });
    setEditingValues(values);
  }, [blocks]);

  // Auto-scroll to current hour on mount
  useEffect(() => {
    if (!loading) {
      const currentHourEl = document.getElementById(
        `hour-row-${currentHour}`
      );
      if (currentHourEl) {
        setTimeout(() => {
          currentHourEl.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }, 300);
      }
    }
  }, [loading, currentHour]);

  // Get block for a given hour
  const getBlockForHour = useCallback(
    (hour: number): ScheduleBlock | undefined => {
      const hourStr = formatHour(hour);
      return blocks.find((b) => b.startTime === hourStr);
    },
    [blocks]
  );

  // Compute allocation stats
  const allocationStats = useMemo(() => {
    const catHours: Record<string, number> = {};
    blocks.forEach((b) => {
      const cat = b.category || "buffer";
      catHours[cat] = (catHours[cat] || 0) + 1;
    });
    const filled = blocks.length;
    const remaining = 24 - filled;
    return { catHours, filled, remaining };
  }, [blocks]);

  const progressPct = Math.round((allocationStats.filled / 24) * 100);

  // Save or create a block for a given hour
  const handleSaveBlock = useCallback(
    async (hour: number, title: string) => {
      if (!user?.id || !dateStr) return;
      const block = getBlockForHour(hour);
      const trimmed = title.trim();

      if (block) {
        if (!trimmed) {
          // Delete block if title is empty
          await deleteBlock(block.id);
        } else if (trimmed !== block.title) {
          setSavingIds((s) => new Set(s).add(block.id));
          await updateBlock(block.id, { title: trimmed });
          setSavingIds((s) => {
            const n = new Set(s);
            n.delete(block.id);
            return n;
          });
        }
      } else if (trimmed) {
        // Create new block
        const endHour = hour + 1;
        const newBlock = await addBlock({
          userId: user.id,
          date: dateStr,
          startTime: formatHour(hour),
          endTime: formatHour(endHour === 24 ? 0 : endHour),
          title: trimmed,
          category: activeCategory,
          status: "pending",
          isCommitted: false,
        });
        setSavingIds((s) => {
          const n = new Set(s);
          n.delete(newBlock.id);
          return n;
        });
      }
    },
    [
      user?.id,
      dateStr,
      getBlockForHour,
      addBlock,
      updateBlock,
      deleteBlock,
      activeCategory,
    ]
  );

  // Handle Enter key: save current hour and focus next
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, hour: number) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const input = e.currentTarget;
        handleSaveBlock(hour, input.value);

        // Focus next hour
        const nextHour = hour + 1;
        if (nextHour < 24 && inputRefs.current[nextHour]) {
          inputRefs.current[nextHour]!.focus();
        }
      }
    },
    [handleSaveBlock]
  );

  // Handle blur: save on focus loss
  const handleBlur = useCallback(
    (hour: number, value: string) => {
      handleSaveBlock(hour, value);
    },
    [handleSaveBlock]
  );

  // Handle auto-fill sleep
  const handleAutoFillSleep = useCallback(async () => {
    if (!user?.id || !dateStr) return;
    await autoFillSleep(user.id, dateStr);
  }, [user?.id, dateStr, autoFillSleep]);

  // Toggle block completion
  const handleToggleComplete = useCallback(
    async (block: ScheduleBlock) => {
      const newStatus =
        block.status === "completed" ? "pending" : "completed";
      await updateBlock(block.id, {
        status: newStatus,
        completedAt:
          newStatus === "completed" ? new Date().toISOString() : undefined,
      });
    },
    [updateBlock]
  );

  const displayDay = dayNum || (user?.createdAt ? getJourneyDayNumber(user.createdAt) : 1);

  return (
    <div className="min-h-screen bg-background text-on-surface pb-8">
      {/* HEADER — back to journey, title, progress ring */}
      <header className="sticky top-0 z-40 bg-surface-container-lowest/90 backdrop-blur-md px-4 py-2 transition-all duration-200">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          {/* Back Button */}
          <button
            onClick={() => router.push("/journey")}
            aria-label="Back to Journey"
            className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:text-primary active:scale-95 transition-transform duration-150"
          >
            <ChevronLeft size={22} />
          </button>

          {/* Title Stack */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
              <h1 className="text-lg font-bold text-on-surface tracking-tight truncate">
                Day {displayDay} Schedule
              </h1>
            </div>
            <p className="text-xs text-on-surface-variant flex items-center gap-1.5 mt-0.5">
              <span>{dateStr ? formatDateDisplay(dateStr) : ""}</span>
              <span className="text-outline">•</span>
              <span className="text-primary font-medium">
                {allocationStats.filled}/24 Hours
              </span>
            </p>
          </div>

          {/* Circular Progress Ring */}
          <div className="flex items-center gap-2 pl-1 shrink-0">
            <div className="relative w-11 h-11 flex items-center justify-center">
              <svg
                className="w-11 h-11 transform -rotate-90"
                viewBox="0 0 44 44"
              >
                <circle
                  cx="22"
                  cy="22"
                  r="17"
                  fill="transparent"
                  stroke="#222a3d"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <circle
                  cx="22"
                  cy="22"
                  r="17"
                  fill="transparent"
                  stroke="#5af0b3"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray="106.8"
                  strokeDashoffset={106.8 - (106.8 * progressPct) / 100}
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-[11px] font-bold text-primary leading-none">
                  {allocationStats.filled}
                </span>
                <span className="text-[8px] text-outline leading-none mt-0.5">
                  /24h
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-2 space-y-4">
        {/* TIME ALLOCATION BAR */}
        <section className="bg-surface-container-low rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="material-symbols-outlined text-primary text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                pace
              </span>
              <span className="text-sm font-semibold text-on-surface">
                Time Allocation
              </span>
            </div>
            <button
              onClick={handleAutoFillSleep}
              className="px-2.5 py-1 rounded-full bg-surface-container hover:bg-surface-container-high text-primary text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 active:scale-95"
            >
              <Moon size={13} />
              <span>Auto-fill Sleep</span>
            </button>
          </div>

          {/* Segmented bar */}
          <div className="space-y-1.5">
            <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden flex">
              {CATEGORY_PALETTE.map((cat) => {
                const hrs = allocationStats.catHours[cat.key] || 0;
                if (hrs === 0) return null;
                const widthPct = (hrs / 24) * 100;
                return (
                  <div
                    key={cat.key}
                    className={`h-full ${cat.dotClass}`}
                    style={{ width: `${widthPct}%` }}
                    title={`${cat.label}: ${hrs}h`}
                  />
                );
              })}
            </div>
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px] text-on-surface-variant pt-0.5">
              {CATEGORY_PALETTE.map((cat) => {
                const hrs = allocationStats.catHours[cat.key] || 0;
                if (hrs === 0) return null;
                return (
                  <span key={cat.key} className="flex items-center gap-1">
                    <span
                      className={`w-2 h-2 rounded-full ${cat.dotClass} inline-block`}
                    />
                    {cat.label} {hrs}h
                  </span>
                );
              })}
              {allocationStats.remaining > 0 && (
                <span className="text-outline">
                  {allocationStats.remaining}h Left
                </span>
              )}
            </div>
          </div>
        </section>

        {/* CATEGORY PALETTE SELECTOR */}
        <section>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 text-xs">
            <span className="text-outline shrink-0 font-medium pl-1">
              Assign:
            </span>
            {CATEGORY_PALETTE.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                className={`shrink-0 px-3 py-1 rounded-full flex items-center gap-1.5 transition-all duration-200 ${
                  activeCategory === cat.key
                    ? `${cat.pillBg} ${cat.pillText} ring-1 ring-current/30`
                    : `${cat.pillBg} ${cat.pillText} opacity-60 hover:opacity-100`
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${cat.dotClass}`}
                />
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* 24-HOUR STREAM */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : (
          <section
            ref={streamRef}
            className="space-y-1.5 relative"
            style={{
              /* chrono rail vertical line */
            }}
          >
            {/* Vertical timeline rail */}
            <div
              className="absolute left-[17px] top-3 bottom-3 w-0.5 z-0"
              style={{
                background:
                  "linear-gradient(180deg, #3c4a42 0%, #222a3d 50%, #3c4a42 100%)",
              }}
            />

            {HOURS.map((hour) => {
              const block = getBlockForHour(hour);
              const catMeta = block
                ? getCategoryMeta(block.category)
                : getCategoryMeta(activeCategory);
              const isCurrentHour = hour === currentHour;
              const isPast = hour < currentHour;
              const isCompleted = block?.status === "completed";
              const isSaving = block ? savingIds.has(block.id) : false;

              const inputValue =
                block && editingValues[block.id] !== undefined
                  ? editingValues[block.id]
                  : block?.title || "";

              return (
                <div
                  key={hour}
                  id={`hour-row-${hour}`}
                  className={`relative z-10 flex items-center gap-3 rounded-xl p-2.5 transition-all duration-150 ${
                    isCurrentHour
                      ? "bg-surface-container ring-1 ring-primary/20"
                      : "bg-surface-container-low hover:bg-surface-container"
                  }`}
                >
                  {/* Time dot + label */}
                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${
                        block
                          ? catMeta.dotClass
                          : isCurrentHour
                          ? "bg-primary"
                          : "bg-surface-container-highest"
                      } ${
                        isCurrentHour
                          ? "shadow-[0_0_8px_rgba(90,240,179,0.4)]"
                          : block
                          ? "shadow-[0_0_6px_rgba(99,102,241,0.3)]"
                          : ""
                      }`}
                    />
                    <span
                      className={`font-mono text-xs font-semibold tracking-wider w-12 ${
                        isCurrentHour
                          ? "text-primary"
                          : isPast
                          ? "text-outline/60"
                          : "text-outline"
                      }`}
                    >
                      {formatHour(hour)}
                    </span>
                  </div>

                  {/* Category pill */}
                  {block && (
                    <div
                      className={`px-2 py-0.5 rounded-full ${catMeta.pillBg} ${catMeta.pillText} text-[11px] flex items-center gap-1 shrink-0`}
                    >
                      <span className="material-symbols-outlined text-[13px]">
                        {catMeta.icon}
                      </span>
                      <span>{catMeta.label}</span>
                    </div>
                  )}

                  {/* Input field */}
                  <div className="flex-1 min-w-0">
                    <input
                      ref={(el) => {
                        inputRefs.current[hour] = el;
                      }}
                      type="text"
                      placeholder={
                        isCurrentHour
                          ? "What's happening now?"
                          : "Add task..."
                      }
                      value={inputValue}
                      onChange={(e) => {
                        if (block) {
                          setEditingValues((prev) => ({
                            ...prev,
                            [block.id]: e.target.value,
                          }));
                        }
                      }}
                      onKeyDown={(e) => handleKeyDown(e, hour)}
                      onBlur={(e) => handleBlur(hour, e.target.value)}
                      className={`w-full bg-transparent border-0 p-0 text-sm focus:ring-0 focus:outline-none truncate placeholder:text-on-surface-variant/40 ${
                        isCompleted
                          ? "line-through text-on-surface-variant/60"
                          : block
                          ? "text-on-surface"
                          : "text-on-surface-variant"
                      }`}
                    />
                  </div>

                  {/* Toggle complete / saving indicator */}
                  {block && (
                    <button
                      onClick={() => handleToggleComplete(block)}
                      aria-label="Toggle Complete"
                      className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 ${
                        isCompleted
                          ? "bg-primary/20 text-primary"
                          : "bg-surface-container text-outline hover:text-primary"
                      }`}
                    >
                      {isSaving ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Check size={16} />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {/* BOTTOM PADDING for mobile safe area */}
        <div className="h-8" />
      </main>
    </div>
  );
}
