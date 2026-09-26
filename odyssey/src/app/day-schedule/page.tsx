"use client";

import { Suspense, useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserStore } from "@/lib/stores/user-store";
import { useScheduleStore } from "@/lib/stores/schedule-store";
import { db, type ScheduleBlock } from "@/lib/db";
import { getJourneyDayNumber } from "@/lib/utils/journey";
import { syncCurrentScheduleToNative } from "@/lib/utils/android-bridge";
import {
  ChevronLeft,
  ChevronDown,
  Moon,
  Coffee,
  Brain,
  Heart,
  MessageSquare,
  Check,
  CheckCircle2,
  Clock,
  Trash2,
  Loader2,
  Sparkles,
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

export type CategoryKey = "work" | "vitality" | "sync" | "renewal" | "sleep";

export interface CategoryDef {
  key: CategoryKey;
  label: string;
  shortLabel: string;
  Icon: React.ComponentType<{ className?: string; size?: number }>;
  color: string;
  badgeBg: string;
  cardBorder: string;
  cardBg: string;
  dotClass: string;
}

export const CATEGORIES: CategoryDef[] = [
  {
    key: "work",
    label: "Deep Focus",
    shortLabel: "Focus",
    Icon: Brain,
    color: "text-primary",
    badgeBg: "bg-primary/15 border border-primary/30 text-primary",
    cardBorder: "border-primary/25 hover:border-primary/45",
    cardBg: "bg-[#0d1d24]/80 hover:bg-[#12252e]",
    dotClass: "bg-primary shadow-[0_0_8px_rgba(90,240,179,0.5)]",
  },
  {
    key: "vitality",
    label: "Vitality & Routine",
    shortLabel: "Vitality",
    Icon: Heart,
    color: "text-emerald-400",
    badgeBg: "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400",
    cardBorder: "border-emerald-500/25 hover:border-emerald-500/45",
    cardBg: "bg-[#0c1f18]/80 hover:bg-[#102920]",
    dotClass: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]",
  },
  {
    key: "sync",
    label: "Sync & Connect",
    shortLabel: "Sync",
    Icon: MessageSquare,
    color: "text-sky-400",
    badgeBg: "bg-sky-500/15 border border-sky-500/30 text-sky-400",
    cardBorder: "border-sky-500/25 hover:border-sky-500/45",
    cardBg: "bg-[#0c1a29]/80 hover:bg-[#102236]",
    dotClass: "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.5)]",
  },
  {
    key: "renewal",
    label: "Renewal & Break",
    shortLabel: "Renewal",
    Icon: Coffee,
    color: "text-amber-400",
    badgeBg: "bg-amber-500/15 border border-amber-500/30 text-amber-400",
    cardBorder: "border-amber-500/25 hover:border-amber-500/45",
    cardBg: "bg-[#211a0c]/80 hover:bg-[#2b2210]",
    dotClass: "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]",
  },
  {
    key: "sleep",
    label: "Rest & Sleep",
    shortLabel: "Sleep",
    Icon: Moon,
    color: "text-indigo-400",
    badgeBg: "bg-indigo-500/15 border border-indigo-500/30 text-indigo-400",
    cardBorder: "border-indigo-500/25 hover:border-indigo-500/45",
    cardBg: "bg-[#13152c]/80 hover:bg-[#1a1d3b]",
    dotClass: "bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.5)]",
  },
];

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function normalizeCategory(cat?: string, hour?: number): CategoryKey {
  if (!cat) {
    if (hour !== undefined) {
      if (hour < 7 || hour >= 23) return "sleep";
      if (hour === 7 || hour === 8) return "vitality";
      if (hour === 12 || hour === 13) return "renewal";
      return "work";
    }
    return "work";
  }
  const c = cat.toLowerCase();
  if (c.includes("sleep") || c.includes("rest")) return "sleep";
  if (c.includes("vitality") || c.includes("habit") || c.includes("health")) return "vitality";
  if (c.includes("sync") || c.includes("meet") || c.includes("social") || c.includes("admin")) return "sync";
  if (c.includes("renewal") || c.includes("buffer") || c.includes("leisure")) return "renewal";
  return "work";
}

export function getCategoryDef(key: CategoryKey): CategoryDef {
  return CATEGORIES.find((c) => c.key === key) || CATEGORIES[0];
}

function formatHour(h: number): string {
  return `${String(h).padStart(2, "0")}:00`;
}

function formatDateDisplay(dateStr: string): string {
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return "";
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

const getTodayStr = () => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

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

  const paramDate = searchParams.get("date");
  const dateStr = paramDate && /^\d{4}-\d{2}-\d{2}$/.test(paramDate) ? paramDate : getTodayStr();
  const dayNum = searchParams.get("day") ? parseInt(searchParams.get("day")!, 10) : null;

  const [loading, setLoading] = useState(true);
  
  // Controlled input values for every hour (0..23)
  const [editingValues, setEditingValues] = useState<Record<number, string>>(() => {
    const init: Record<number, string> = {};
    for (let h = 0; h < 24; h++) init[h] = "";
    return init;
  });

  // Category selection for every hour (0..23)
  const [hourCategories, setHourCategories] = useState<Record<number, CategoryKey>>(() => {
    const init: Record<number, CategoryKey> = {};
    for (let h = 0; h < 24; h++) init[h] = normalizeCategory(undefined, h);
    return init;
  });

  // Active default category for newly created slots
  const [activeDefaultCategory, setActiveDefaultCategory] = useState<CategoryKey>("work");

  // Track which hour's category picker popup is currently open
  const [openCategoryHour, setOpenCategoryHour] = useState<number | null>(null);

  // Saving state tracker for instant spinner feedback
  const [savingHours, setSavingHours] = useState<Set<number>>(new Set());

  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const focusedHourRef = useRef<number | null>(null);
  const currentHour = new Date().getHours();

  // Fetch user profile on mount
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Load schedule blocks for selected date
  useEffect(() => {
    if (user?.id && dateStr) {
      setLoading(true);
      fetchBlocksForDate(user.id, dateStr).finally(() => setLoading(false));
    }
  }, [user?.id, dateStr, fetchBlocksForDate]);

  // Synchronize blocks into hour inputs and categories without clobbering active input
  useEffect(() => {
    const newValues: Record<number, string> = {};
    const newCats: Record<number, CategoryKey> = {};

    for (let h = 0; h < 24; h++) {
      const sTime = formatHour(h);
      const match = blocks.find((b) => b.startTime === sTime);

      if (match) {
        // If the user is actively typing in this input, don't clobber what they're typing
        if (focusedHourRef.current === h) {
          newValues[h] = editingValues[h] ?? match.title;
        } else {
          newValues[h] = match.title || "";
        }
        newCats[h] = normalizeCategory(match.category, h);
      } else {
        if (focusedHourRef.current === h) {
          newValues[h] = editingValues[h] ?? "";
        } else {
          newValues[h] = "";
        }
        newCats[h] = hourCategories[h] || normalizeCategory(undefined, h);
      }
    }

    setEditingValues((prev) => ({ ...prev, ...newValues }));
    setHourCategories((prev) => ({ ...prev, ...newCats }));
  }, [blocks]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to current hour on initial load
  useEffect(() => {
    if (!loading) {
      const currentHourEl = document.getElementById(`hour-row-${currentHour}`);
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

  // Helper to find existing block for an hour
  const getBlockForHour = useCallback(
    (hour: number): ScheduleBlock | undefined => {
      const hourStr = formatHour(hour);
      return blocks.find((b) => b.startTime === hourStr);
    },
    [blocks]
  );

  // Compute 24h category allocation statistics
  const allocationStats = useMemo(() => {
    const catHours: Record<CategoryKey, number> = {
      work: 0,
      vitality: 0,
      sync: 0,
      renewal: 0,
      sleep: 0,
    };

    let filledCount = 0;

    for (let h = 0; h < 24; h++) {
      const sTime = formatHour(h);
      const block = blocks.find((b) => b.startTime === sTime);
      if (block && block.title.trim().length > 0) {
        const cat = normalizeCategory(block.category, h);
        catHours[cat] = (catHours[cat] || 0) + 1;
        filledCount++;
      }
    }

    const remaining = Math.max(0, 24 - filledCount);
    return { catHours, filled: filledCount, remaining };
  }, [blocks]);

  const progressPct = Math.round((allocationStats.filled / 24) * 100);

  // Save / Update / Delete block for a given hour
  const handleSaveBlock = useCallback(
    async (hour: number, explicitTitle?: string, explicitCat?: CategoryKey) => {
      if (!user?.id || !dateStr) return;
      const block = getBlockForHour(hour);
      const titleToSave = (explicitTitle !== undefined ? explicitTitle : (editingValues[hour] ?? "")).trim();
      const catToSave = explicitCat || hourCategories[hour] || activeDefaultCategory || normalizeCategory(undefined, hour);

      const sTime = formatHour(hour);
      const endH = hour + 1;
      const eTime = formatHour(endH === 24 ? 0 : endH);

      setSavingHours((prev) => new Set(prev).add(hour));

      try {
        if (block) {
          if (!titleToSave) {
            // Deleted task
            await deleteBlock(block.id);
          } else {
            await updateBlock(block.id, {
              title: titleToSave,
              category: catToSave as any,
            });
          }
        } else if (titleToSave) {
          // Created new task
          await addBlock({
            userId: user.id,
            date: dateStr,
            startTime: sTime,
            endTime: eTime,
            title: titleToSave,
            category: catToSave as any,
            status: "pending",
            isCommitted: true,
          });
        }
        syncCurrentScheduleToNative();
      } catch (err) {
        console.error("Error saving block:", err);
      } finally {
        setSavingHours((prev) => {
          const next = new Set(prev);
          next.delete(hour);
          return next;
        });
      }
    },
    [
      user?.id,
      dateStr,
      getBlockForHour,
      editingValues,
      hourCategories,
      activeDefaultCategory,
      deleteBlock,
      updateBlock,
      addBlock,
    ]
  );

  // Change category of a specific hour block
  const handleCategoryChange = useCallback(
    async (hour: number, newCat: CategoryKey) => {
      setHourCategories((prev) => ({ ...prev, [hour]: newCat }));
      setOpenCategoryHour(null);

      const block = getBlockForHour(hour);
      const currentTitle = (editingValues[hour] ?? "").trim();

      if (block) {
        setSavingHours((prev) => new Set(prev).add(hour));
        try {
          await updateBlock(block.id, { category: newCat as any });
          syncCurrentScheduleToNative();
        } finally {
          setSavingHours((prev) => {
            const next = new Set(prev);
            next.delete(hour);
            return next;
          });
        }
      } else if (currentTitle) {
        // If user already typed text in this empty hour slot, save it with new category
        handleSaveBlock(hour, currentTitle, newCat);
      }
    },
    [getBlockForHour, editingValues, handleSaveBlock, updateBlock]
  );

  // Handle Enter / Line-break key on mobile/desktop
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, hour: number) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const value = e.currentTarget.value;
        handleSaveBlock(hour, value);

        // Advance focus to next hour seamlessly
        const nextHour = hour + 1;
        if (nextHour < 24 && inputRefs.current[nextHour]) {
          inputRefs.current[nextHour]!.focus();
        }
      }
    },
    [handleSaveBlock]
  );

  // Handle blur: save on loss of focus
  const handleBlur = useCallback(
    (hour: number, value: string) => {
      focusedHourRef.current = null;
      handleSaveBlock(hour, value);
    },
    [handleSaveBlock]
  );

  // Handle auto-fill sleep
  const handleAutoFillSleep = useCallback(async () => {
    if (!user?.id || !dateStr) return;
    await autoFillSleep(user.id, dateStr);
    syncCurrentScheduleToNative();
  }, [user?.id, dateStr, autoFillSleep]);

  // Toggle completion status
  const handleToggleComplete = useCallback(
    async (block: ScheduleBlock) => {
      const newStatus = block.status === "completed" ? "pending" : "completed";
      await updateBlock(block.id, {
        status: newStatus,
        completedAt: newStatus === "completed" ? new Date().toISOString() : undefined,
      });
      syncCurrentScheduleToNative();
    },
    [updateBlock]
  );

  // Clear / delete block
  const handleClearBlock = useCallback(
    async (hour: number) => {
      setEditingValues((prev) => ({ ...prev, [hour]: "" }));
      const block = getBlockForHour(hour);
      if (block) {
        await deleteBlock(block.id);
        syncCurrentScheduleToNative();
      }
    },
    [getBlockForHour, deleteBlock]
  );

  const displayDay = dayNum || (user?.createdAt ? getJourneyDayNumber(user.createdAt) : 1);

  return (
    <div className="min-h-screen bg-background text-on-surface pb-12">
      {/* HEADER — back to journey, title, progress ring */}
      <header className="sticky top-0 z-40 bg-surface-container-lowest/90 backdrop-blur-md px-4 py-2.5 transition-all duration-200 border-b border-outline/10">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          {/* Back Button */}
          <button
            onClick={() => router.push("/journey")}
            aria-label="Back to Journey"
            className="w-10 h-10 rounded-xl bg-surface-container-low border border-outline/10 flex items-center justify-center text-on-surface-variant hover:text-primary active:scale-95 transition-all"
          >
            <ChevronLeft size={22} />
          </button>

          {/* Title Stack */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_6px_rgba(90,240,179,0.6)]" />
              <h1 className="text-base sm:text-lg font-bold text-on-surface tracking-tight truncate">
                Day {displayDay} Quick Schedule
              </h1>
            </div>
            <p className="text-xs text-on-surface-variant flex items-center gap-1.5 mt-0.5 font-mono">
              <span>{dateStr ? formatDateDisplay(dateStr) : ""}</span>
              <span className="text-outline">•</span>
              <span className="text-primary font-semibold">
                {allocationStats.filled}/24 Hours
              </span>
            </p>
          </div>

          {/* Circular Progress Ring */}
          <div className="flex items-center gap-2 pl-1 shrink-0">
            <div className="relative w-11 h-11 flex items-center justify-center">
              <svg className="w-11 h-11 transform -rotate-90" viewBox="0 0 44 44">
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
                <span className="text-[8px] font-mono text-outline leading-none mt-0.5">
                  /24h
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-3 sm:px-4 pt-3 space-y-3.5">
        {/* TIME ALLOCATION CARD */}
        <section className="bg-surface-container-low border border-outline/10 rounded-2xl p-3.5 sm:p-4 flex flex-col gap-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <Clock className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-on-surface tracking-tight">
                Daily Time Allocation
              </span>
            </div>
            <button
              onClick={handleAutoFillSleep}
              className="px-3 py-1.5 rounded-full bg-indigo-500/15 border border-indigo-500/30 hover:bg-indigo-500/25 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm"
            >
              <Moon size={13} className="text-indigo-400" />
              <span>Auto-fill Sleep</span>
            </button>
          </div>

          {/* Segmented allocation bar */}
          <div className="space-y-2">
            <div className="w-full h-2.5 rounded-full bg-surface-container-highest overflow-hidden flex gap-0.5">
              {CATEGORIES.map((cat) => {
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
            <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px] font-mono text-on-surface-variant pt-0.5">
              {CATEGORIES.map((cat) => {
                const hrs = allocationStats.catHours[cat.key] || 0;
                if (hrs === 0) return null;
                return (
                  <span key={cat.key} className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${cat.dotClass} inline-block`} />
                    <span className={cat.color}>{cat.shortLabel}: {hrs}h</span>
                  </span>
                );
              })}
              {allocationStats.remaining > 0 && (
                <span className="text-outline font-semibold">
                  {allocationStats.remaining}h Open
                </span>
              )}
            </div>
          </div>
        </section>

        {/* DEFAULT CATEGORY CHIPS */}
        <section className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 px-0.5">
          <span className="text-[11px] font-mono text-outline shrink-0 font-medium">
            Default Type:
          </span>
          <div className="flex items-center gap-1.5">
            {CATEGORIES.map((cat) => {
              const isSelected = activeDefaultCategory === cat.key;
              const IconComp = cat.Icon;
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveDefaultCategory(cat.key)}
                  className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all duration-150 cursor-pointer ${
                    isSelected
                      ? `${cat.badgeBg} ring-1 ring-current/40 shadow-sm font-bold scale-[1.02]`
                      : "bg-surface-container-low hover:bg-surface-container text-on-surface-variant border border-outline/10 opacity-70 hover:opacity-100"
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>{cat.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </section>

        {/* 24-HOUR INTERACTIVE STREAM */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
            <span className="text-xs font-mono text-on-surface-variant">Loading day schedule...</span>
          </div>
        ) : (
          <section className="space-y-2 relative">
            {/* Background vertical rail */}
            <div
              className="absolute left-[23px] top-4 bottom-4 w-0.5 z-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(90,240,179,0.3) 0%, rgba(34,42,61,0.6) 50%, rgba(90,240,179,0.3) 100%)",
              }}
            />

            {HOURS.map((hour) => {
              const block = getBlockForHour(hour);
              const currentCatKey = hourCategories[hour] || (block ? normalizeCategory(block.category, hour) : activeDefaultCategory);
              const catDef = getCategoryDef(currentCatKey);
              const CatIcon = catDef.Icon;

              const isCurrentHour = hour === currentHour;
              const isPast = hour < currentHour;
              const isCompleted = block?.status === "completed";
              const isSaving = savingHours.has(hour);
              const isCategoryPickerOpen = openCategoryHour === hour;

              const inputValue = editingValues[hour] ?? block?.title ?? "";
              const hasContent = inputValue.trim().length > 0 || !!block;

              return (
                <div
                  key={hour}
                  id={`hour-row-${hour}`}
                  className={`relative z-10 flex items-center gap-2.5 sm:gap-3 rounded-2xl p-2.5 sm:p-3 border transition-all duration-200 ${
                    hasContent ? catDef.cardBg : "bg-surface-container-low/60 hover:bg-surface-container-low"
                  } ${
                    isCurrentHour
                      ? "ring-2 ring-primary border-primary shadow-[0_0_20px_rgba(90,240,179,0.25)] bg-[#102028]"
                      : hasContent
                      ? catDef.cardBorder
                      : "border-outline/10 hover:border-outline/25"
                  }`}
                >
                  {/* Left Column: Time & Status */}
                  <div className="flex flex-col items-center justify-center shrink-0 w-12 sm:w-14 text-center select-none">
                    <span
                      className={`font-mono text-xs font-bold leading-tight ${
                        isCurrentHour
                          ? "text-primary font-extrabold"
                          : isPast
                          ? "text-on-surface-variant/60"
                          : "text-on-surface"
                      }`}
                    >
                      {formatHour(hour)}
                    </span>
                    <span className="font-mono text-[10px] text-on-surface-variant/40 leading-tight">
                      {formatHour((hour + 1) % 24)}
                    </span>
                    {isCurrentHour && (
                      <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-primary text-[#003825] font-extrabold mt-1 shadow-sm animate-pulse">
                        NOW
                      </span>
                    )}
                  </div>

                  {/* Interactive Category Selector Pill */}
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenCategoryHour(isCategoryPickerOpen ? null : hour);
                      }}
                      title="Click to change block type"
                      className={`px-2 sm:px-2.5 py-1 rounded-xl text-[11px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer select-none active:scale-95 ${
                        catDef.badgeBg
                      } hover:brightness-110`}
                    >
                      <CatIcon className="w-3.5 h-3.5 shrink-0" />
                      <span className="hidden sm:inline">{catDef.shortLabel}</span>
                      <ChevronDown className="w-3 h-3 opacity-60 shrink-0" />
                    </button>

                    {/* Category Selection Dropdown Popup */}
                    {isCategoryPickerOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenCategoryHour(null);
                          }}
                        />
                        <div
                          className="absolute left-0 top-full mt-1.5 z-50 w-52 p-1.5 rounded-2xl bg-surface-container border border-outline/25 shadow-2xl space-y-1 backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-150"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="px-2.5 py-1 text-[10px] font-mono text-on-surface-variant font-bold uppercase tracking-wider">
                            Change Block Type
                          </div>
                          {CATEGORIES.map((cat) => {
                            const isSelected = currentCatKey === cat.key;
                            const CatOptionIcon = cat.Icon;
                            return (
                              <button
                                key={cat.key}
                                type="button"
                                onClick={() => handleCategoryChange(hour, cat.key)}
                                className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                                  isSelected
                                    ? `${cat.badgeBg} font-bold shadow-sm ring-1 ring-current/30`
                                    : "text-on-surface hover:bg-surface-container-high"
                                }`}
                              >
                                <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${cat.badgeBg}`}>
                                  <CatOptionIcon className="w-3.5 h-3.5" />
                                </div>
                                <span className="flex-1 text-left truncate">{cat.label}</span>
                                {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {/* Main Input Field - Controlled by editingValues[hour] for 100% instant typing */}
                  <div className="flex-1 min-w-0">
                    <input
                      ref={(el) => {
                        inputRefs.current[hour] = el;
                      }}
                      type="text"
                      placeholder={
                        isCurrentHour
                          ? "What are you conquering now?"
                          : isPast
                          ? "Schedule past slot..."
                          : "Add task / focus..."
                      }
                      value={inputValue}
                      onFocus={() => {
                        focusedHourRef.current = hour;
                      }}
                      onChange={(e) => {
                        const val = e.target.value;
                        setEditingValues((prev) => ({
                          ...prev,
                          [hour]: val,
                        }));
                      }}
                      onKeyDown={(e) => handleKeyDown(e, hour)}
                      onBlur={(e) => handleBlur(hour, e.target.value)}
                      className={`w-full bg-transparent border-0 p-0 text-sm font-medium focus:ring-0 focus:outline-none truncate placeholder:text-on-surface-variant/35 placeholder:font-normal transition-colors ${
                        isCompleted
                          ? "line-through text-on-surface-variant/50"
                          : hasContent
                          ? "text-on-surface font-semibold"
                          : "text-on-surface-variant"
                      }`}
                    />
                  </div>

                  {/* Right Actions: Completion Check & Clear/Delete */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Saving Spinner Indicator */}
                    {isSaving ? (
                      <div className="w-7 h-7 flex items-center justify-center text-primary">
                        <Loader2 size={15} className="animate-spin" />
                      </div>
                    ) : block ? (
                      <>
                        {/* Toggle Complete Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleComplete(block)}
                          aria-label={isCompleted ? "Mark as pending" : "Mark as completed"}
                          title={isCompleted ? "Completed (tap to revert)" : "Tap to complete"}
                          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                            isCompleted
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm"
                              : "border border-outline/20 hover:border-emerald-400 text-on-surface-variant/40 hover:text-emerald-400 hover:bg-emerald-500/10"
                          }`}
                        >
                          {isCompleted ? <CheckCircle2 size={16} /> : <Check size={14} />}
                        </button>

                        {/* Quick Delete / Clear Button */}
                        <button
                          type="button"
                          onClick={() => handleClearBlock(hour)}
                          aria-label="Delete block"
                          title="Clear this block"
                          className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant/30 hover:text-error hover:bg-error-container/20 transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    ) : inputValue.trim().length > 0 ? (
                      <button
                        type="button"
                        onClick={() => handleClearBlock(hour)}
                        aria-label="Clear input"
                        title="Clear"
                        className="w-7 h-7 rounded-full flex items-center justify-center text-on-surface-variant/30 hover:text-error transition-colors cursor-pointer"
                      >
                        <Trash2 size={13} />
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {/* Safe padding for mobile bottom bar */}
        <div className="h-12" />
      </main>
    </div>
  );
}
