"use client";

import { logWarn, readString, writeString } from "@/lib/utils/logger";
import { Suspense, useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserStore } from "@/lib/stores/user-store";
import { useScheduleStore } from "@/lib/stores/schedule-store";
import { db, type ScheduleBlock } from "@/lib/db";
import { getJourneyDayNumber } from "@/lib/utils/journey";
import { syncCurrentScheduleToNative } from "@/lib/utils/android-bridge";
import { buildAllocationSlices, allocationCategory } from "@/lib/utils/allocation-bar";
import { resolveEditedCategory } from "@/lib/utils/schedule-category-edit";
import { evaluateDayLoad } from "@/lib/utils/day-load";
import { DayLoadBanner } from "@/components/schedule/day-load-banner";
import { LoadingIndicator } from "@/components/common/loading-indicator";
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
  Clock,
  Trash2,
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
  const { user, fetchUser, addDiamonds } = useUserStore();
  const userId = user?.id;
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
  const [prevDayNameKey, setPrevDayNameKey] = useState<string | null>(null);
  const dayNameKey = `${displayDay}|${dateStr ?? ""}`;
  if (prevDayNameKey !== dayNameKey) {
    setPrevDayNameKey(dayNameKey);
    let saved = "";
    if (typeof window !== "undefined") {
      try {
        saved =
          readString(`odyssey_day_name_day_${displayDay}`) ||
          (dateStr ? readString(`odyssey_day_name_${dateStr}`) : null) ||
          "";
      } catch (e) { logWarn("storage call failed: localStorage.getItem", "storage call failed: localStorage.getItem", e); }
    }
    setDayName(saved);
  }

  // Day title: committed value vs. in-progress draft.
  //
  // These are deliberately SEPARATE states rather than writing on every
  // keystroke. Escape has to be able to abandon an edit, and a single state
  // makes that impossible without re-reading storage to find out what was
  // committed before the user started typing — and it would have written a
  // half-typed title to storage on every character.
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const titleInputRef = useRef<HTMLInputElement | null>(null);
  const titleButtonRef = useRef<HTMLButtonElement | null>(null);
  const refocusTitleRef = useRef(false);

  const beginTitleEdit = useCallback(() => {
    setTitleDraft(dayName);
    setIsEditingTitle(true);
  }, [dayName]);

  /** Persist the draft. Also used as the blur handler, so clicking away saves. */
  const commitTitle = useCallback(() => {
    const next = titleDraft.trim();
    setDayName(next);
    if (typeof window !== "undefined") {
      try {
        writeString(`odyssey_day_name_day_${displayDay}`, next);
        if (dateStr) {
          writeString(`odyssey_day_name_${dateStr}`, next);
        }
      } catch (e) { logWarn("storage call failed: localStorage.setItem", "storage call failed: localStorage.setItem", e); }
    }
    refocusTitleRef.current = true;
    setIsEditingTitle(false);
  }, [titleDraft, displayDay, dateStr]);

  /** Abandon the edit. Focus is restored by the effect below, not here —
   *  `titleButtonRef` is null while editing, because the button is unmounted. */
  const cancelTitleEdit = useCallback(() => {
    refocusTitleRef.current = true;
    setIsEditingTitle(false);
  }, []);

  // Focus handling for the title editor.
  //
  // Select-on-open must live HERE, not in the ref callback. A ref callback is
  // re-invoked with the node on every render (React 19 calls it null-then-node),
  // so an `el.select()` inside it re-selects the whole field after every
  // keystroke — and the next character typed then REPLACES everything, leaving
  // a one-character title. Keying on `isEditingTitle` runs it exactly once.
  useEffect(() => {
    if (isEditingTitle) {
      const el = titleInputRef.current;
      if (el) {
        el.focus();
        el.select();
      }
      return;
    }
    // Only pull focus back for keyboard users. Doing it after a blur would
    // steal focus from wherever the user clicked to.
    if (refocusTitleRef.current) {
      refocusTitleRef.current = false;
      titleButtonRef.current?.focus();
    }
  }, [isEditingTitle]);

  const [loading, setLoading] = useState(true);

  // Reloading shows the spinner again; done during render so React Compiler
  // doesn't flag a synchronous setState in an effect.
  const [prevDateStr, setPrevDateStr] = useState<string | null>(null);
  if (prevDateStr !== dateStr) {
    setPrevDateStr(dateStr);
    setLoading(true);
  }

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

  /**
   * Hours whose category the user explicitly chose on this screen.
   *
   * `hourCategories` is seeded from stored blocks through the display
   * normaliser, so it cannot be trusted to distinguish "the user picked this"
   * from "this is what we folded the stored value into". Only the interaction can.
   * See `handleSaveBlock` for what this protects.
   */
  const categoryTouchedHoursRef = useRef<Set<number>>(new Set());

  // Track which hour's category picker popup is currently open
  const [openCategoryHour, setOpenCategoryHour] = useState<number | null>(null);

  // Recently saved hour for pulsing feedback
  const [recentlySavedHour, setRecentlySavedHour] = useState<number | null>(null);

  const inputRefs = useRef<Record<number, HTMLTextAreaElement | null>>({});
  const focusedHourRef = useRef<number | null>(null);
  const currentHour = new Date().getHours();
  const todayStr = getTodayStr();
  const isSelectedToday = dateStr === todayStr;

  /**
   * Grow a task textarea to exactly fit its wrapped content.
   *
   * `height: auto` first is not redundant: a textarea's natural height only
   * accounts for one row, so measuring `scrollHeight` without collapsing the
   * box first reports the height it already has, and a shrinking edit leaves
   * the box too tall instead of getting shorter.
   *
   * Called from the ref callback as well as on change, because the value is
   * also written from outside the textarea (the block-sync effect above), and
   * a ref callback re-runs on every render for exactly that reason.
   */
  const autosizeTextarea = (el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  };

  // Fetch user profile on mount
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Load schedule blocks for selected date
  useEffect(() => {
    if (user?.id && dateStr) {
      fetchBlocksForDate(user.id, dateStr).finally(() => setLoading(false));
    }
  }, [user?.id, dateStr, fetchBlocksForDate]);

  // Synchronize blocks into hour inputs and categories without clobbering active input
  useEffect(() => {
    const newValues: Record<number, string> = {};
    const newCats: Record<number, CategoryKey> = {};

    // Blocks changing means the stored categories were re-read, so any "the user
    // chose this" claim from the previous set of blocks no longer holds. Without
    // this, a category picked on Monday would still count as touched on Tuesday
    // and authorise a rewrite the user never asked for.
    categoryTouchedHoursRef.current.clear();

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

  /**
   * Whether an hour counts as PLANNED for this day. Named rather than inlined
   * because the allocation bar below and the legend under it are the same fact
   * about the same day, and M8's lesson applies: two derivations of "how much of
   * this day is planned" is how a bar and its own caption start disagreeing.
   * A typed-but-unsaved title counts here; the planner deliberately does not
   * (it reads only saved blocks), and that difference is intentional per screen.
   */
  const isPlannedHour = useCallback(
    (h: (typeof full24Hours)[number]) => !!h.block || (h.title || "").trim().length > 0,
    []
  );

  // Compute 24h category allocation statistics
  const categoryStats = useMemo(() => {
    let focusH = 0;
    let vitalityH = 0;
    let syncH = 0;
    let renewalH = 0;
    let restH = 0;

    full24Hours.forEach((h) => {
      if (!isPlannedHour(h)) return;
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
  }, [full24Hours, isPlannedHour]);

  /**
   * S18 — the "plate" verdict derives from the SAVED plan (`blocks`), not from
   * `full24Hours`: that memo also counts typed-but-unsaved titles, which the
   * planner rail deliberately shows but the warning must not report.
   */
  const dayLoad = useMemo(() => evaluateDayLoad(blocks), [blocks]);

  /**
   * The bar's 24 one-hour slices, left to right = 00:00 → 23:00, so it reads as
   * the day rather than as five buckets with the order discarded. Same planned
   * test as `categoryStats` above, by construction.
   */
  const allocationSlices = useMemo(
    () => buildAllocationSlices(full24Hours.map(isPlannedHour)),
    [full24Hours, isPlannedHour]
  );

  const progressPct = Math.round((categoryStats.plannedTotal / 24) * 100);

  // Save / Update / Delete block for a given hour
  const handleSaveBlock = useCallback(
    async (hour: number, explicitTitle?: string, explicitCat?: CategoryKey) => {
      if (!userId || !dateStr) return;
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
              // **A title edit must not rewrite the category.** `hourCategories`
              // was seeded from the stored value through this screen's
              // *display* normaliser, and that normaliser is lossy for anything
              // outside the five values its picker offers -- a row written as
              // `habits` folds to `vitality`, a row written as `buffer` folds to
              // `renewal`. Those rows exist in real databases: an imported
              // backup is bulk-added verbatim, and earlier builds wrote them
              // before those components were orphaned.
              //
              // This is invisible today for the three values the picker *can*
              // produce, because for those the fold happens to be identity --
              // which is exactly why it survived. The moment the vocabulary
              // changes, every title edit starts silently recategorising blocks.
              // So the stored value is returned untouched unless the user
              // actually chose a category on THIS screen, which
              // `handleCategoryChange` records.
              category: resolveEditedCategory({
                stored: block.category ?? "",
                touched: categoryTouchedHoursRef.current.has(hour),
                chosen: catToSave,
              }),
            });
          }
        } else if (titleToSave) {
          await addBlock({
            userId: userId,
            date: dateStr,
            startTime: sTime,
            endTime: eTime,
            title: titleToSave,
            category: catToSave,
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
    [userId, dateStr, getBlockForHour, editingValues, hourCategories, deleteBlock, updateBlock, addBlock]
  );

  // Change category of a specific hour block
  const handleCategoryChange = useCallback(
    async (hour: number, newCat: CategoryKey) => {
      setHourCategories((prev) => ({ ...prev, [hour]: newCat }));
      setOpenCategoryHour(null);

      const block = getBlockForHour(hour);
      const currentTitle = (editingValues[hour] ?? "").trim();

      if (block) {
        // The one path that is allowed to rewrite a category.
        categoryTouchedHoursRef.current.add(hour);
        await updateBlock(block.id, { category: newCat });
        syncCurrentScheduleToNative(dateStr);
      } else if (currentTitle) {
        handleSaveBlock(hour, currentTitle, newCat);
      }
    },
    [getBlockForHour, editingValues, handleSaveBlock, updateBlock, dateStr]
  );

  // Handle Enter / Line-break key on mobile/desktop
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>, hour: number) => {
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
    if (!userId || !dateStr) return;
    await autoFillSleep(userId, dateStr);
    syncCurrentScheduleToNative(dateStr);
  }, [userId, dateStr, autoFillSleep]);

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
    const isRecentlySaved = recentlySavedHour === slot.hour;
    const cat = getCatStyle(slot.category, slot.isCustom);
    const CatIcon = cat.Icon;
    const isCategoryPickerOpen = openCategoryHour === slot.hour;
    const isCompleted = slot.status === "completed";
    const inputValue = editingValues[slot.hour] ?? slot.title ?? "";
    const hasContent = inputValue.trim().length > 0 || !!slot.block;

    /**
     * How high this card stacks.
     *
     * The category dropdown lives INSIDE this card, and `backdrop-blur-xl` makes
     * a card both a stacking context and a containing block for fixed children.
     * So the dropdown's own `z-50` resolves only inside this card and cannot
     * lift it past the hour rows below - measured before this fix: the topmost
     * element over the middle of an open dropdown was the *08:00 card*, not the
     * dropdown. Raising the card is the only thing that can.
     *
     * A picker therefore outranks the "current hour"/"saved" highlight, which is
     * what you want: the thing you just opened must never be the thing hidden.
     */
    const stackClass = isCategoryPickerOpen
      ? "z-50"
      : isCurrent || isRecentlySaved
      ? "z-20"
      : "";

    return (
      <div
        key={`slot-${slot.hour}`}
        id={`hour-row-${slot.hour}`}
        onContextMenu={(e) => e.preventDefault()}
        /* PERF-7e: data-blur-essential marks the blur here as load-bearing
           (stacking context + containing block for the in-card category
           dropdown above), so the low-end kill-switch must not strip it. */
        data-blur-essential
        className={`group relative flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 border border-l-4 ${cat.leftBorder} select-none ${
          cat.cardBg
        } ${cat.cardBorder} backdrop-blur-xl my-1 shadow-sm ${stackClass} ${
          isRecentlySaved
            ? "ring-2 ring-primary border-primary shadow-[0_0_24px_rgba(108,0,255,0.35)] scale-[1.01] bg-surface-container-low"
            : isCurrent
            ? "ring-2 ring-primary border-primary shadow-[0_0_24px_rgba(108,0,255,0.25)] bg-surface-container-low"
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
          {/* The "SAVED" flash and the "LIVE" pill were removed here on owner
              instruction. Both were status chips under the time; the row's own
              highlight (the ring/glow, the violet clock, the LIVE pulsing ring
              around the icon) already says which hour is current and which was
              just edited, so the third signal repeated it. Do not reinstate one
              without the other — they were a pair. */}
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

          {/* Category Selection Dropdown Popup.
              The dim "tap outside to close" scrim that used to sit here has
              MOVED to the list wrapper below. `backdrop-blur-xl` on this card
              makes the card a containing block for fixed-position children, so
              a `fixed inset-0` scrim rendered in here collapsed onto the card's
              own bounds instead of the screen - measured: the overlay was
              725x62px, the card, inside a 762x484 viewport. It dimmed the row
              you tapped and nothing else. Outside the cards it covers the
              screen, as it always was meant to. */}
          {isCategoryPickerOpen && (
            <div
              className="absolute left-0 top-full mt-1.5 z-50 w-52 p-1.5 rounded-2xl bg-surface-container border border-outline/25 shadow-2xl space-y-1 animate-in fade-in zoom-in-95 duration-150"
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
          )}
        </div>

        {/* Task text & category label. A TEXTAREA, not an input: an <input>
            cannot wrap — it scrolls sideways and `truncate` just clipped long
            task names at whatever the row happened to be wide. Here the text
            wraps and the row grows to fit it, at any screen width. */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <textarea
            ref={(el) => {
              inputRefs.current[slot.hour] = el;
              autosizeTextarea(el);
            }}
            rows={1}
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
              autosizeTextarea(e.target);
              setEditingValues((prev) => ({
                ...prev,
                [slot.hour]: val,
              }));
            }}
            onKeyDown={(e) => handleKeyDown(e, slot.hour)}
            onBlur={(e) => handleBlur(slot.hour, e.target.value)}
            className={`w-full max-w-full bg-transparent border-0 p-0 text-sm font-semibold leading-snug resize-none overflow-hidden break-words focus:ring-0 focus:outline-none placeholder:text-on-surface-variant/35 placeholder:font-normal transition-colors ${
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

        {/* The 3-state review toggle (Tick / Cross / Unreviewed) was removed
            here on owner instruction. It was NOT decorative: tapping it wrote
            the block's status and paid XP_PER_BLOCK_COMPLETED plus confetti, so
            this page no longer offers a way to complete or miss a block at all.

            `/planner` and `/journey` still carry the identical control, and a
            status set there still renders here as struck-through text — the
            `isCompleted` styling above is deliberately kept.

            Reinstate it as a deliberate decision to make this screen able to
            review a day again, not by restoring these buttons; the handler it
            called was deleted rather than left unreachable. */}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background text-on-surface pb-16">
      {/* HEADER — back to journey, title, progress ring */}
      {/* No backdrop-blur: sticky bar re-samplings were live scroll jank on
          Android; near-opaque tint keeps the separation. */}
      <header className="sticky top-0 z-40 bg-surface-container-lowest/97 px-4 py-2.5 transition-all duration-200 border-b border-outline/10">
        <div className="max-w-xl mx-auto flex items-center justify-between gap-3">
          {/* Back Button */}
          <button
            onClick={() => router.push("/journey")}
            aria-label="Back to Journey"
            className="w-10 h-10 rounded-xl bg-surface-container-low border border-outline/10 flex items-center justify-center text-on-surface-variant hover:text-primary active:scale-95 transition-all cursor-pointer"
          >
            <ChevronLeft size={22} />
          </button>

          {/* Title Stack — click the title to rename the day.

              The pulsing dot and the "Day N •" count were removed on owner
              instruction. `displayDay` is still load-bearing: it is the storage
              key the day title is filed under, and /journey reads that same key.

              No focus RING on the title or its editor, on owner instruction: the
              ring was a visible box around the title in both the saved and the
              editing state. Keyboard focus still shows an UNDERLINE
              (`focus-visible:underline`), which keeps a visible focus indicator
              without drawing a box — the ring was removed, not the affordance. */}
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <input
                ref={(el) => {
                  titleInputRef.current = el;
                }}
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    commitTitle();
                  } else if (e.key === "Escape") {
                    // Not commitTitle: Escape must DISCARD the draft.
                    e.preventDefault();
                    cancelTitleEdit();
                  }
                }}
                onBlur={commitTitle}
                aria-label="Day title"
                placeholder="Name this day"
                maxLength={80}
                className="w-full bg-transparent border-0 p-0 text-base sm:text-lg font-bold tracking-tight text-on-surface placeholder:font-normal placeholder:text-on-surface-variant/40 focus:outline-none focus-visible:underline focus-visible:decoration-2 focus-visible:underline-offset-4"
              />
            ) : (
              <h1 className="text-base sm:text-lg font-bold text-on-surface tracking-tight truncate">
                {/* The <h1> WRAPS the button, not the reverse: <h1> is not
                    phrasing content, so <button><h1/></button> is invalid HTML
                    even though browsers render it. */}
                <button
                  ref={titleButtonRef}
                  type="button"
                  onClick={beginTitleEdit}
                  aria-label={dayName ? `Day title: ${dayName}. Change it` : "Set a title for this day"}
                  title="Tap to change the day title"
                  className="text-left max-w-full truncate hover:text-primary focus-visible:outline-none focus-visible:underline focus-visible:decoration-2 focus-visible:underline-offset-4 transition-colors cursor-text"
                >
                  {dayName || "Schedule"}
                </button>
              </h1>
            )}
            <p className="text-xs text-on-surface-variant flex items-center gap-1.5 mt-0.5 font-mono truncate">
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
        {/* S18 verdict hidden while the day's blocks are still fetching:
            the store keeps ONE blocks array, so during a date flip it can
            briefly hold the PREVIOUS day's hours under the new day's header —
            rendering the banner there would print a confident number about
            the wrong day. Same exposure exists for the allocation box (older
            surface, pre-existing). */}
        {!loading && <DayLoadBanner load={dayLoad} />}
        {/* 24-HOUR CATEGORY DISTRIBUTION BOX (Matching Planner Page)

            Above the day-title input: the allocation is the read-at-a-glance
            summary of the day, while the title is a note the user writes about
            it. Reading order now leads with the day's shape. */}
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

          {/* Daily Allocation bar — 24 one-hour slices, left to right = 00:00 →
              23:00, so the strip reads as the day instead of five buckets with
              the order thrown away. `rounded-full overflow-hidden` is what makes
              the bar a capsule and, because slice 0 starts at 0% and slice 23
              ends at 100%, what makes both rounded ends fully covered rather
              than notched. Slices are absolutely positioned (not flex children)
              so they tile the width exactly — a flex row of 24 would also need
              gaps, and those gaps eat into every slice. `aria-hidden` because
              the legend directly below says the same thing in words. */}
          <div
            aria-hidden="true"
            className="relative h-2.5 w-full bg-surface-container-highest rounded-full overflow-hidden"
          >
            {allocationSlices.map((slice) => {
              if (!slice.filled) return null;
              const cat = allocationCategory(full24Hours[slice.hour].category);
              return (
                <div
                  key={slice.hour}
                  style={slice.style}
                  title={`${slice.label} · ${cat.label}`}
                  className={`absolute inset-y-0 ${cat.fill}`}
                />
              );
            })}
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

        {/* The "Day N Focus & Title" card was removed here on owner instruction.
            It had been the app's only WRITER of `odyssey_day_name_*` — `/journey`
            reads that key — so removing it appeared to retire the ability to name
            a day entirely.

            That was reversed the same session, also on owner instruction: the day
            count and the pulsing dot came out of the header and the title became
            click-to-edit in place, so the write path above is alive again and the
            ability to name a day is NOT retired. The card itself stays gone — the
            editing now happens in the header rather than in a panel below it.

            Both storage keys are still written (`..._day_${displayDay}` and
            `..._${dateStr}`) because `/journey` reads them and a title written
            under only one of them would not appear there. */}

        {/* 24-HOUR CHRONO STREAM TIMELINE — Hourly Blocks (Structured Vertical Rail) */}
        {loading ? (
          <LoadingIndicator label="Loading schedule blocks" className="py-24" />
        ) : (
          <div className="relative flex flex-col space-y-1 pl-2 sm:pl-3 before:content-[''] before:absolute before:left-[35px] sm:before:left-[39px] before:top-4 before:bottom-4 before:w-[2px] before:bg-surface-container-low before:rounded-full">
            {full24Hours.map((slot) => renderHourSlot(slot))}

            {/* "Tap outside to close" scrim for the category picker. Rendered ONCE,
                here, OUTSIDE every card. Inside a card it could not work: each card
                carries `backdrop-blur-xl`, which makes the card a containing block
                for fixed-position children, so `fixed inset-0` collapsed onto the
                card's own box instead of the screen. This wrapper has no
                backdrop-filter, so the scrim covers the viewport - and it sits
                below the open card's `z-50`, so the dropdown is still clickable. */}
            {openCategoryHour !== null && (
              <div
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenCategoryHour(null);
                }}
              />
            )}
          </div>
        )}

        {/* Bottom padding for mobile safe area */}
        <div className="h-12" />
      </main>
    </div>
  );
}
