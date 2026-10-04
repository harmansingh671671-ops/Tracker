"use client";

import { logWarn } from "@/lib/utils/logger";
import { Suspense, useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserStore } from "@/lib/stores/user-store";
import { useScheduleStore } from "@/lib/stores/schedule-store";
import { db, type ScheduleBlock } from "@/lib/db";
import { getJourneyDayNumber } from "@/lib/utils/journey";
import { syncCurrentScheduleToNative } from "@/lib/utils/android-bridge";
import { triggerStreaksConfetti } from "@/lib/utils/confetti";
import {
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Moon,
  Coffee,
  Brain,
  Heart,
  MessageSquare,
  Check,
  CheckCircle2,
  XCircle,
  Circle,
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

export const CATEGORY_OPTIONS = [
  {
    id: "work" as const,
    label: "Deep Work",
    shortLabel: "Focus",
    Icon: Brain,
    color: "text-primary",
    badgeBg: "bg-primary/15 border-primary/30 text-primary",
  },
  {
    id: "vitality" as const,
    label: "Vitality",
    shortLabel: "Vitality",
    Icon: Heart,
    color: "text-emerald-400",
    badgeBg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
  },
  {
    id: "sync" as const,
    label: "Active Sync",
    shortLabel: "Sync",
    Icon: MessageSquare,
    color: "text-sky-400",
    badgeBg: "bg-sky-500/15 border-sky-500/30 text-sky-400",
  },
  {
    id: "renewal" as const,
    label: "Renewal",
    shortLabel: "Renewal",
    Icon: Coffee,
    color: "text-amber-400",
    badgeBg: "bg-amber-500/15 border-amber-500/30 text-amber-400",
  },
  {
    id: "sleep" as const,
    label: "Rest & Sleep",
    shortLabel: "Sleep",
    Icon: Moon,
    color: "text-indigo-400",
    badgeBg: "bg-indigo-500/15 border-indigo-500/30 text-indigo-400",
  },
];

/**
 * Category styling for one hour block.
 *
 * Mirrors the planner's schedule rail, including the light/dark pairs: the old
 * values were dark-only tints (`bg-indigo-950/20`) with 400-shade text, which
 * collapse to muddy grey and unreadable labels on a near-white page. Light mode
 * uses the 50-scale tint and a 600-scale text shade; dark keeps the original.
 */
export const getCatStyle = (cat?: string, isCustom?: boolean) => {
  if (!isCustom || !cat) {
    return {
      key: "open" as const,
      label: "Open Slot",
      shortLabel: "Open",
      Icon: Clock,
      color: "text-on-surface-variant/60 dark:text-on-surface-variant/40",
      badgeBg:
        "bg-surface-container-lowest border border-outline/20 text-on-surface-variant/60 dark:border-outline/[0.06] dark:text-on-surface-variant/40",
      cardBorder:
        "border-dashed border-outline/25 hover:border-primary/50 dark:border-outline/[0.08] dark:hover:border-primary/40",
      cardBg: "bg-surface-container-low/70 hover:bg-surface-container-low dark:bg-surface-container-low/40 dark:hover:bg-surface-container-low/70",
      leftBorder: "border-l-transparent",
      dotClass: "bg-surface-container-highest",
    };
  }
  const c = cat.toLowerCase();
  if (c.includes("sleep") || c.includes("rest")) {
    return {
      key: "sleep" as const,
      label: "Rest & Sleep",
      shortLabel: "Sleep",
      Icon: Moon,
      color: "text-indigo-600 dark:text-indigo-400",
      badgeBg:
        "bg-indigo-500/15 border border-indigo-500/35 text-indigo-600 dark:border-indigo-500/30 dark:text-indigo-400",
      cardBorder:
        "border-indigo-500/30 hover:border-indigo-500/60 dark:border-indigo-500/25 dark:hover:border-indigo-500/50",
      cardBg: "bg-indigo-50/70 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/30",
      leftBorder: "border-l-indigo-500",
      dotClass: "bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.5)]",
    };
  }
  if (c.includes("vitality") || c.includes("habit") || c.includes("health")) {
    return {
      key: "vitality" as const,
      label: "Vitality",
      shortLabel: "Vitality",
      Icon: Heart,
      color: "text-emerald-600 dark:text-emerald-400",
      badgeBg:
        "bg-emerald-500/15 border border-emerald-500/35 text-emerald-600 dark:border-emerald-500/30 dark:text-emerald-400",
      cardBorder:
        "border-emerald-500/30 hover:border-emerald-500/60 dark:border-emerald-500/25 dark:hover:border-emerald-500/50",
      cardBg: "bg-emerald-50/70 hover:bg-emerald-50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30",
      leftBorder: "border-l-emerald-500 dark:border-l-emerald-400",
      dotClass: "bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.5)]",
    };
  }
  if (c.includes("sync") || c.includes("meeting") || c.includes("social") || c.includes("admin")) {
    return {
      key: "sync" as const,
      label: "Active Sync",
      shortLabel: "Sync",
      Icon: MessageSquare,
      color: "text-sky-600 dark:text-sky-400",
      badgeBg:
        "bg-sky-500/15 border border-sky-500/35 text-sky-600 dark:border-sky-500/30 dark:text-sky-400",
      cardBorder:
        "border-sky-500/30 hover:border-sky-500/60 dark:border-sky-500/25 dark:hover:border-sky-500/50",
      cardBg: "bg-sky-50/70 hover:bg-sky-50 dark:bg-sky-950/20 dark:hover:bg-sky-950/30",
      leftBorder: "border-l-sky-500 dark:border-l-sky-400",
      dotClass: "bg-sky-500 shadow-[0_0_8px_rgba(56,189,248,0.5)]",
    };
  }
  if (c.includes("renewal") || c.includes("buffer") || c.includes("leisure")) {
    return {
      key: "renewal" as const,
      label: "Renewal",
      shortLabel: "Renewal",
      Icon: Coffee,
      color: "text-amber-700 dark:text-amber-400",
      badgeBg:
        "bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:border-amber-500/30 dark:text-amber-400",
      cardBorder:
        "border-amber-500/35 hover:border-amber-500/65 dark:border-amber-500/25 dark:hover:border-amber-500/50",
      cardBg: "bg-amber-50/70 hover:bg-amber-50 dark:bg-amber-950/20 dark:hover:bg-amber-950/30",
      leftBorder: "border-l-amber-500 dark:border-l-amber-400",
      dotClass: "bg-amber-500 shadow-[0_0_8px_rgba(251,191,36,0.5)]",
    };
  }
  return {
    key: "work" as const,
    label: "Deep Work",
    shortLabel: "Deep Work",
    Icon: Brain,
    color: "text-primary",
    badgeBg: "bg-primary/15 border border-primary/30 text-primary",
    cardBorder: "border-primary/35 hover:border-primary/60 dark:border-primary/25 dark:hover:border-primary/50",
    cardBg: "bg-primary/5 hover:bg-primary/10 dark:bg-background/80 dark:hover:bg-background/90",
    leftBorder: "border-l-primary",
    dotClass: "bg-primary shadow-[0_0_8px_rgba(108,0,255,0.5)]",
  };
};

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
  const { user, fetchUser, addXp, addDiamonds } = useUserStore();
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

  const displayDay = dayNum || (user?.createdAt ? getJourneyDayNumber(user.createdAt) : 1);
  const [dayName, setDayName] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved =
          localStorage.getItem(`odyssey_day_name_day_${displayDay}`) ||
          (dateStr ? localStorage.getItem(`odyssey_day_name_${dateStr}`) : null) ||
          "";
        setDayName(saved);
      } catch (e) { logWarn("storage call failed: localStorage.getItem", "storage call failed: localStorage.getItem", e); }
    }
  }, [displayDay, dateStr]);

  const handleUpdateDayName = (newName: string) => {
    setDayName(newName);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`odyssey_day_name_day_${displayDay}`, newName);
        if (dateStr) {
          localStorage.setItem(`odyssey_day_name_${dateStr}`, newName);
        }
      } catch (e) { logWarn("storage call failed: localStorage.setItem", "storage call failed: localStorage.setItem", e); }
    }
  };

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

  // Track which hour's category picker popup is currently open
  const [openCategoryHour, setOpenCategoryHour] = useState<number | null>(null);

  // Recently saved hour for pulsing feedback
  const [recentlySavedHour, setRecentlySavedHour] = useState<number | null>(null);

  const inputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const focusedHourRef = useRef<number | null>(null);
  const currentHour = new Date().getHours();
  const todayStr = getTodayStr();
  const isSelectedToday = dateStr === todayStr;

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

    setEditingValues((prev) => {
      const updated = { ...prev };
      let changed = false;
      for (let h = 0; h < 24; h++) {
        if (focusedHourRef.current !== h && updated[h] !== newValues[h]) {
          updated[h] = newValues[h];
          changed = true;
        }
      }
      return changed ? updated : prev;
    });
    setHourCategories((prev) => ({ ...prev, ...newCats }));
  }, [blocks]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ensure page always starts at top when opened, never auto-scrolling to bottom or restoring previous page scroll
  useEffect(() => {
    if (typeof window !== "undefined") {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual";
      }
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [dateStr]);

  useEffect(() => {
    if (!loading && typeof window !== "undefined") {
      window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    }
  }, [loading]);

  // Helper to find existing block for an hour
  const getBlockForHour = useCallback(
    (hour: number): ScheduleBlock | undefined => {
      const hourStr = formatHour(hour);
      return blocks.find((b) => b.startTime === hourStr);
    },
    [blocks]
  );

  // Build full 24 hours array matching schedule tab structure
  const full24Hours = useMemo(() => {
    return Array.from({ length: 24 }, (_, h) => {
      const sTime = formatHour(h);
      const endH = (h + 1) % 24 === 0 ? 24 : h + 1;
      const eTime = formatHour(endH % 24);
      const match = blocks.find((b) => b.startTime === sTime);
      const typedTitle = editingValues[h] ?? match?.title ?? "";
      const catKey = hourCategories[h] || normalizeCategory(match?.category, h);

      return {
        hour: h,
        startTime: sTime,
        endTime: eTime,
        block: match || null,
        title: typedTitle,
        category: catKey,
        isCustom: !!match,
        status: match?.status || "pending",
      };
    });
  }, [blocks, editingValues, hourCategories]);

  // Compute 24h category allocation statistics
  const categoryStats = useMemo(() => {
    let focusH = 0;
    let vitalityH = 0;
    let syncH = 0;
    let renewalH = 0;
    let restH = 0;

    full24Hours.forEach((h) => {
      const hasContent = !!h.block || (h.title || "").trim().length > 0;
      if (!hasContent) return;
      const c = (h.category || "").toLowerCase();
      if (c.includes("sleep") || c.includes("rest")) restH++;
      else if (c.includes("vitality") || c.includes("habit") || c.includes("health")) vitalityH++;
      else if (c.includes("sync") || c.includes("meet") || c.includes("social")) syncH++;
      else if (c.includes("renewal") || c.includes("buffer") || c.includes("leisure")) renewalH++;
      else focusH++;
    });

    const plannedTotal = focusH + vitalityH + syncH + renewalH + restH;
    const remaining = Math.max(0, 24 - plannedTotal);
    return { focusH, vitalityH, syncH, renewalH, restH, plannedTotal, remaining };
  }, [full24Hours]);

  const progressPct = Math.round((categoryStats.plannedTotal / 24) * 100);

  // Save / Update / Delete block for a given hour
  const handleSaveBlock = useCallback(
    async (hour: number, explicitTitle?: string, explicitCat?: CategoryKey) => {
      if (!user?.id || !dateStr) return;
      const block = getBlockForHour(hour);
      const titleToSave = (explicitTitle !== undefined ? explicitTitle : (editingValues[hour] ?? "")).trim();
      const catToSave = explicitCat || hourCategories[hour] || normalizeCategory(undefined, hour);

      const sTime = formatHour(hour);
      const endH = hour + 1;
      const eTime = formatHour(endH === 24 ? 0 : endH);

      try {
        if (block) {
          if (!titleToSave) {
            await deleteBlock(block.id);
          } else {
            await updateBlock(block.id, {
              title: titleToSave,
              category: catToSave as any,
            });
          }
        } else if (titleToSave) {
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

        setRecentlySavedHour(hour);
        setTimeout(() => {
          setRecentlySavedHour((curr) => (curr === hour ? null : curr));
        }, 2500);

        syncCurrentScheduleToNative(dateStr);
      } catch (err) {
        console.error("Error saving block:", err);
      }
    },
    [user?.id, dateStr, getBlockForHour, editingValues, hourCategories, deleteBlock, updateBlock, addBlock]
  );

  // Change category of a specific hour block
  const handleCategoryChange = useCallback(
    async (hour: number, newCat: CategoryKey) => {
      setHourCategories((prev) => ({ ...prev, [hour]: newCat }));
      setOpenCategoryHour(null);

      const block = getBlockForHour(hour);
      const currentTitle = (editingValues[hour] ?? "").trim();

      if (block) {
        await updateBlock(block.id, { category: newCat as any });
        syncCurrentScheduleToNative(dateStr);
      } else if (currentTitle) {
        handleSaveBlock(hour, currentTitle, newCat);
      }
    },
    [getBlockForHour, editingValues, handleSaveBlock, updateBlock, dateStr]
  );

  // Handle Enter / Line-break key on mobile/desktop
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, hour: number) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const value = e.currentTarget.value;
        handleSaveBlock(hour, value);

        const nextHour = hour + 1;
        if (nextHour < 24) {
          focusedHourRef.current = nextHour;
          setTimeout(() => {
            if (inputRefs.current[nextHour]) {
              inputRefs.current[nextHour]!.focus();
            }
          }, 30);
        }
      }
    },
    [handleSaveBlock]
  );

  // Handle blur: save on loss of focus
  const handleBlur = useCallback(
    (hour: number, value: string) => {
      if (focusedHourRef.current === hour) {
        focusedHourRef.current = null;
      }
      handleSaveBlock(hour, value);
    },
    [handleSaveBlock]
  );

  // Handle auto-fill sleep
  const handleAutoFillSleep = useCallback(async () => {
    if (!user?.id || !dateStr) return;
    await autoFillSleep(user.id, dateStr);
    syncCurrentScheduleToNative(dateStr);
  }, [user?.id, dateStr, autoFillSleep]);

  // Toggle completion status (3-state cycle: unreviewed -> completed -> missed -> unreviewed)
  const handleToggleComplete = useCallback(
    async (block: ScheduleBlock | null, hour: number) => {
      if (!block) return;
      const isFuture =
        dateStr > todayStr ||
        (dateStr === todayStr && hour > currentHour);

      if (isFuture) {
        return;
      }

      const current = (block.status || "pending") as "pending" | "completed" | "missed";
      let newStatus: "pending" | "completed" | "missed" = "completed";
      if (current === "completed") {
        newStatus = "missed";
      } else if (current === "missed") {
        newStatus = "pending";
      } else {
        newStatus = "completed";
      }

      await updateBlock(block.id, {
        status: newStatus,
        completedAt: newStatus === "completed" ? new Date().toISOString() : undefined,
        missReason: newStatus === "missed" ? "Did not follow" : undefined,
      });

      if (newStatus === "completed") {
        triggerStreaksConfetti();
        try {
          if (typeof window !== "undefined" && navigator?.vibrate) {
            navigator.vibrate(40);
          }
        } catch (e) { logWarn("page", "haptic feedback failed", e); }
        await addXp(10);
      } else if (current === "completed") {
        await addXp(-10);
      }
      await fetchUser();
      syncCurrentScheduleToNative(dateStr);
    },
    [updateBlock, addXp, fetchUser, dateStr, todayStr, currentHour]
  );

  // Clear / delete block
  const handleClearBlock = useCallback(
    async (hour: number) => {
      setEditingValues((prev) => ({ ...prev, [hour]: "" }));
      const block = getBlockForHour(hour);
      if (block) {
        await deleteBlock(block.id);
        syncCurrentScheduleToNative(dateStr);
      }
    },
    [getBlockForHour, deleteBlock, dateStr]
  );

  // Render a single hour block slot (styled identically to the Schedule tab!)
  const renderHourSlot = (slot: (typeof full24Hours)[0]) => {
    const isPastHour = isSelectedToday && slot.hour < currentHour;
    const isCurrent = isSelectedToday && currentHour === slot.hour;
    const isFutureHour = dateStr > todayStr || (dateStr === todayStr && slot.hour > currentHour);
    const isRecentlySaved = recentlySavedHour === slot.hour;
    const cat = getCatStyle(slot.category, slot.isCustom);
    const CatIcon = cat.Icon;
    const isCategoryPickerOpen = openCategoryHour === slot.hour;
    const isCompleted = slot.status === "completed";
    const inputValue = editingValues[slot.hour] ?? slot.title ?? "";
    const hasContent = inputValue.trim().length > 0 || !!slot.block;

    return (
      <div
        key={`slot-${slot.hour}`}
        id={`hour-row-${slot.hour}`}
        onContextMenu={(e) => e.preventDefault()}
        className={`group relative flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 border border-l-4 ${cat.leftBorder} select-none ${
          cat.cardBg
        } ${cat.cardBorder} backdrop-blur-xl my-1 shadow-sm ${
          isRecentlySaved
            ? "ring-2 ring-primary border-primary shadow-[0_0_24px_rgba(108,0,255,0.35)] scale-[1.01] bg-surface-container-low relative z-20"
            : isCurrent
            ? "ring-2 ring-primary border-primary shadow-[0_0_24px_rgba(108,0,255,0.25)] bg-surface-container-low relative z-20"
            : ""
        }`}
      >
        {/* Time Indicator on Left */}
        <div className="flex flex-col items-center justify-center shrink-0 w-14 text-center select-none">
          <span
            className={`text-xs font-mono font-bold leading-tight ${
              isCurrent ? "text-primary font-extrabold" : "text-on-surface"
            }`}
          >
            {slot.startTime}
          </span>
          <span className="text-[10px] font-mono text-on-surface-variant/60 leading-tight">
            {formatHour((slot.hour + 1) % 24)}
          </span>
          {isRecentlySaved ? (
            <span className="text-[8.5px] font-mono px-1.5 py-0.2 rounded-full bg-primary text-on-primary font-black mt-1 shadow-sm animate-pulse">
              SAVED
            </span>
          ) : isCurrent ? (
            <div className="flex items-center gap-1 mt-1 px-1.5 py-0.2 rounded-full bg-primary/20 border border-primary/40 text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
              <span className="text-[8px] font-mono font-extrabold tracking-wider">LIVE</span>
            </div>
          ) : null}
        </div>

        {/* Category Icon & Interactive Type Switcher Pill */}
        <div className="relative shrink-0">
          {isCurrent && (
            <span className="absolute -inset-1 rounded-2xl bg-primary/20 animate-pulse pointer-events-none" />
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setOpenCategoryHour(isCategoryPickerOpen ? null : slot.hour);
            }}
            title="Click to change block type"
            className={`relative w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${cat.badgeBg} hover:brightness-110 active:scale-95 transition-all cursor-pointer shadow-inner`}
          >
            <CatIcon className="w-4 h-4" />
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
                  Select Block Type
                </div>
                {CATEGORY_OPTIONS.map((opt) => {
                  const isSelected = normalizeCategory(slot.category, slot.hour) === opt.id;
                  const OptIcon = opt.Icon;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleCategoryChange(slot.hour, opt.id)}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        isSelected
                          ? `${opt.badgeBg} font-bold shadow-sm ring-1 ring-current/30`
                          : "text-on-surface hover:bg-surface-container-high"
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${opt.badgeBg}`}>
                        <OptIcon className="w-3.5 h-3.5" />
                      </div>
                      <span className="flex-1 text-left truncate">{opt.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Input & Details */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <input
            ref={(el) => {
              inputRefs.current[slot.hour] = el;
            }}
            type="text"
            placeholder={
              isCurrent
                ? "What are you conquering now?"
                : isPastHour
                ? "Schedule past slot..."
                : "Add task / focus..."
            }
            value={inputValue}
            onFocus={() => {
              focusedHourRef.current = slot.hour;
            }}
            onChange={(e) => {
              const val = e.target.value;
              focusedHourRef.current = slot.hour;
              setEditingValues((prev) => ({
                ...prev,
                [slot.hour]: val,
              }));
            }}
            onKeyDown={(e) => handleKeyDown(e, slot.hour)}
            onBlur={(e) => handleBlur(slot.hour, e.target.value)}
            className={`w-full bg-transparent border-0 p-0 text-sm font-semibold focus:ring-0 focus:outline-none truncate placeholder:text-on-surface-variant/35 placeholder:font-normal transition-colors ${
              isCompleted
                ? "line-through text-on-surface-variant/50"
                : hasContent
                ? "text-on-surface font-bold"
                : "text-on-surface-variant font-medium"
            }`}
          />
          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-mono">
            <span className={`font-semibold ${cat.color}`}>{cat.label}</span>
          </div>
        </div>

        {/* Right Status: 3-state toggle (Tick, Cross, Unreviewed) */}
        <div className="flex items-center gap-1.5 shrink-0">
          {slot.block ? (
            slot.status === "completed" ? (
              <button
                type="button"
                onClick={() => handleToggleComplete(slot.block, slot.hour)}
                title="Completed ✓ (tap to mark missed)"
                className="w-8 h-8 rounded-full flex items-center justify-center text-emerald-500 hover:bg-emerald-500/10 transition-colors cursor-pointer dark:text-emerald-400"
              >
                <CheckCircle2 className="w-5 h-5" />
              </button>
            ) : slot.status === "missed" ? (
              <button
                type="button"
                onClick={() => handleToggleComplete(slot.block, slot.hour)}
                title="Missed ✕ (tap to reset to unreviewed)"
                className="w-8 h-8 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer dark:text-rose-400"
              >
                <XCircle className="w-5 h-5" />
              </button>
            ) : isFutureHour ? (
              <button
                type="button"
                onClick={() => handleToggleComplete(slot.block, slot.hour)}
                title={dateStr > todayStr ? "Future day (cannot review yet)" : "Future hour (cannot review yet)"}
                className="w-7 h-7 rounded-full border border-outline/10 text-on-surface-variant/20 flex items-center justify-center opacity-30 cursor-not-allowed"
              >
                <Circle className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleToggleComplete(slot.block, slot.hour)}
                title="Unreviewed (tap to mark completed)"
                className="w-7 h-7 rounded-full border border-outline/25 hover:border-emerald-500 hover:text-emerald-600 text-on-surface-variant/50 flex items-center justify-center transition-colors cursor-pointer dark:border-outline/30 dark:hover:border-emerald-400 dark:hover:text-emerald-400 dark:text-on-surface-variant/40"
              >
                <Circle className="w-3.5 h-3.5" />
              </button>
            )
          ) : (
            <div className="w-7 h-7" />
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-on-surface pb-16">
      {/* HEADER — back to journey, title, progress ring */}
      <header className="sticky top-0 z-40 bg-surface-container-lowest/90 backdrop-blur-md px-4 py-2.5 transition-all duration-200 border-b border-outline/10">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          {/* Back Button */}
          <button
            onClick={() => router.push("/journey")}
            aria-label="Back to Journey"
            className="w-10 h-10 rounded-xl bg-surface-container-low border border-outline/10 flex items-center justify-center text-on-surface-variant hover:text-primary active:scale-95 transition-all cursor-pointer"
          >
            <ChevronLeft size={22} />
          </button>

          {/* Title Stack */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_6px_rgba(108,0,255,0.6)]" />
              <h1 className="text-base sm:text-lg font-bold text-on-surface tracking-tight truncate">
                {dayName ? dayName : `Day ${displayDay} Schedule`}
              </h1>
            </div>
            <p className="text-xs text-on-surface-variant flex items-center gap-1.5 mt-0.5 font-mono">
              {dayName && <span className="text-primary font-semibold">Day {displayDay} • </span>}
              <span>{dateStr ? formatDateDisplay(dateStr) : ""}</span>
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
                  stroke="var(--surface-container-high)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />
                <circle
                  cx="22"
                  cy="22"
                  r="17"
                  fill="transparent"
                  stroke="var(--primary)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray="106.8"
                  strokeDashoffset={106.8 - (106.8 * progressPct) / 100}
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-mono text-[11px] font-bold text-primary leading-none">
                  {categoryStats.plannedTotal}
                </span>
                <span className="text-[8px] font-mono text-outline leading-none mt-0.5">
                  /24h
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 pt-3 space-y-4">
        {/* Quick Day Naming / Focus Input */}
        <section className="p-3 rounded-2xl bg-surface-container-low border border-outline/10 space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              Day {displayDay} Focus &amp; Title
            </span>
            {dayName && (
              <span className="text-[10px] text-emerald-600 font-semibold dark:text-emerald-400">Saved</span>
            )}
          </div>
          <input
            type="text"
            value={dayName}
            onChange={(e) => handleUpdateDayName(e.target.value)}
            placeholder="e.g. Improve English, Be Happy, Enjoy Holidays..."
            className="w-full py-1.5 px-3 rounded-xl bg-surface-container-lowest border border-outline/15 text-xs text-on-surface font-semibold focus:border-primary/50 focus:ring-1 focus:ring-primary/40 focus:outline-none placeholder:text-on-surface-variant/40 transition-all"
          />
        </section>

        {/* 24-HOUR CATEGORY DISTRIBUTION BOX (Matching Planner Page) */}
        <section className="p-3.5 rounded-2xl bg-surface-container-low border border-outline/10 space-y-2.5 shadow-sm">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-on-surface flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>Daily Allocation</span>
            </span>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="text-on-surface-variant">Scheduled: {categoryStats.plannedTotal}h</span>
              <button
                type="button"
                onClick={handleAutoFillSleep}
                className="px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-semibold flex items-center gap-1 hover:bg-indigo-500/25 active:scale-95 transition-all cursor-pointer"
              >
                <Moon size={12} className="text-indigo-400" />
                <span>Auto-fill Sleep</span>
              </button>
            </div>
          </div>

          {/* Proportional Balance Bar */}
          <div className="h-2.5 w-full bg-surface-container-highest rounded-full overflow-hidden flex gap-0.5">
            {categoryStats.plannedTotal > 0 ? (
              <>
                <div style={{ width: `${(categoryStats.focusH / 24) * 100}%` }} className="bg-primary h-full" title="Focus" />
                <div style={{ width: `${(categoryStats.vitalityH / 24) * 100}%` }} className="bg-emerald-400 h-full" title="Vitality" />
                <div style={{ width: `${(categoryStats.syncH / 24) * 100}%` }} className="bg-sky-400 h-full" title="Sync" />
                <div style={{ width: `${(categoryStats.renewalH / 24) * 100}%` }} className="bg-amber-400 h-full" title="Renewal" />
                <div style={{ width: `${(categoryStats.restH / 24) * 100}%` }} className="bg-indigo-500 h-full" title="Rest" />
              </>
            ) : (
              <div className="w-full h-full bg-surface-container-highest/60" />
            )}
          </div>

          {/* Category Hours Legend */}
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-[11px] font-mono text-on-surface-variant pt-0.5">
            {categoryStats.focusH > 0 && <span className="text-primary font-semibold">Focus: {categoryStats.focusH}h</span>}
            {categoryStats.vitalityH > 0 && <span className="text-emerald-400 font-semibold">Vitality: {categoryStats.vitalityH}h</span>}
            {categoryStats.syncH > 0 && <span className="text-sky-400 font-semibold">Sync: {categoryStats.syncH}h</span>}
            {categoryStats.renewalH > 0 && <span className="text-amber-400 font-semibold">Renewal: {categoryStats.renewalH}h</span>}
            {categoryStats.restH > 0 && <span className="text-indigo-400 font-semibold">Sleep: {categoryStats.restH}h</span>}
            {categoryStats.remaining > 0 && <span className="text-outline font-semibold">{categoryStats.remaining}h Open</span>}
          </div>
        </section>

        {/* 24-HOUR CHRONO STREAM TIMELINE — Hourly Blocks (Structured Vertical Rail) */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="w-7 h-7 text-primary animate-spin" />
            <span className="text-xs font-mono text-on-surface-variant">Loading schedule blocks...</span>
          </div>
        ) : (
          <div className="relative flex flex-col space-y-1 pl-2 sm:pl-3 before:content-[''] before:absolute before:left-[35px] sm:before:left-[39px] before:top-4 before:bottom-4 before:w-[2px] before:bg-surface-container-low before:rounded-full">
            {full24Hours.map((slot) => renderHourSlot(slot))}
          </div>
        )}

        {/* Bottom padding for mobile safe area */}
        <div className="h-12" />
      </main>
    </div>
  );
}
