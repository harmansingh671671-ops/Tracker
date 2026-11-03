"use client";

import { logWarn, readString, writeString } from "@/lib/utils/logger";
import { Suspense, useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserStore } from "@/lib/stores/user-store";
import { useScheduleStore } from "@/lib/stores/schedule-store";
import {
  blockRangeMinutes,
  buildDayRows,
  cardHeightPx,
  computeResize,
  findAdjacentMergeMinutes,
  findWholeDayBlocks,
  labelFromMinutes,
  MIN_BLOCK_MINUTES,
  quantizeEndMinutes,
  rowKey,
  type DayRow,
} from "@/lib/utils/block-resize";
import { canonicalCategoryKey } from "@/lib/utils/schedule-category-key";
import { BlockDragHandle } from "@/components/schedule/block-drag-handle";
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
import { getPlannerCatStyle } from "@/lib/utils/planner-category-style";

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
    // B5: reconciled to the planner's spelling — the stored id is `work`
    // either way; only the display word changed.
    label: "Deep Focus",
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
 * Category styling for one hour block — delegated to the ONE shared source.
 *
 * B5/BUG-1: this screen used to keep its own near-duplicate of the planner's
 * palette, which is where the two screens drifted (admin painted violet here
 * vs sky on the planner, and the work label disagreed). The shared module now
 * carries every field this screen needs (key, shortLabel, dotClass included).
 * `normalizeCategory` below stays local on purpose: it is an hour-inference
 * fold for empty blocks, a different job from colour.
 */
const getCatStyle = (cat?: string, isCustom?: boolean) =>
  getPlannerCatStyle(cat ?? "", isCustom ?? false);

export function normalizeCategory(cat?: string, hour?: number): CategoryKey {
  if (!cat) {
    // No stored value: an empty hour is inferred from its clock position. That
    // is a display default for empty rows, not a stored category.
    if (hour !== undefined) {
      if (hour < 7 || hour >= 23) return "sleep";
      if (hour === 7 || hour === 8) return "vitality";
      if (hour === 12 || hour === 13) return "renewal";
      return "work";
    }
    return "work";
  }
  // Stored values are looser than the five ids (legacy `rest`, `habits`,
  // `buffer`, `admin`), so the fold lives in ONE shared module.
  return canonicalCategoryKey(cat);
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

  /**
   * Border-drag state (`C2` follow-up). While the drag runs the day renders
   * from `liveBlocks` — the store rows with `computeResize` applied — and the
   * store is only written when the drag commits. `undoPayload` holds the
   * pre-drag originals so the absorb banner can put every eaten row back.
   */
  const [dragPreview, setDragPreview] = useState<{ id: string; endMin: number } | null>(null);
  const [undoPayload, setUndoPayload] = useState<{
    absorbed: ScheduleBlock[];
    edited: ScheduleBlock[];
    dragged: ScheduleBlock[];
  } | null>(null);

  // The banner self-clears, and cleanup on unmount is what a timer rule wants.
  useEffect(() => {
    if (!undoPayload) return;
    const t = window.setTimeout(() => setUndoPayload(null), 8000);
    return () => window.clearTimeout(t);
  }, [undoPayload]);

  const liveBlocks = useMemo(() => {
    // A drag preview is validated against the CURRENT day's blocks — its id
    // belongs to the day the drag started on. A date flip empties the day
    // beneath a stale preview; the identity check makes it inert without a
    // resetting effect (setState-synchronously-in-effect is a lint error, and
    // a cascading re-render is exactly what it warns about).
    if (!dragPreview || !blocks.some((x) => x.id === dragPreview.id)) return blocks;
    return computeResize(blocks, dragPreview.id, dragPreview.endMin).next;
  }, [blocks, dragPreview]);

  const dayRows = useMemo(() => buildDayRows(liveBlocks), [liveBlocks]);

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

  // Controlled input values per ROW (a row is a block or an empty stretch —
  // see `dayRows`). Keyed by `rowKey`, not by hour: minute-level blocks from
  // the border drag can start mid-hour, so an integer hour key can collide.
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});

  // Category selection per row key.
  const [rowCategories, setRowCategories] = useState<Record<string, CategoryKey>>({});

  /**
   * Rows whose category the user explicitly chose on this screen.
   *
   * `rowCategories` is seeded from stored blocks through the display
   * normaliser, so it cannot be trusted to distinguish "the user picked this"
   * from "this is what we folded the stored value into". Only the interaction can.
   * See `handleSaveRow` for what this protects.
   */
  const categoryTouchedKeysRef = useRef<Set<string>>(new Set());

  // Track which row's category picker popup is currently open
  const [openCategoryKey, setOpenCategoryKey] = useState<string | null>(null);

  // Recently saved row for pulsing feedback
  const [recentlySavedKey, setRecentlySavedKey] = useState<string | null>(null);

  const inputRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});
  const focusedKeyRef = useRef<string | null>(null);
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

  // Load schedule blocks for selected date, then repair a row that covers the
  // whole day.
  //
  // A 00:00 → 24:00 row leaves no editable grid: the day renders as that single
  // card and every hour outside it is walled off. It is what the old "one empty
  // row per day" render wrote the moment a title was typed into it. Owner
  // instruction: keep the first hour as a real block and leave the rest of the
  // day empty, so the row is trimmed to 00:00 → 01:00 on load.
  //
  // Done BEFORE `loading` clears, so the bad shape is never painted.
  useEffect(() => {
    if (!user?.id || !dateStr) return;
    let cancelled = false;
    const load = async () => {
      try {
        const rows = await fetchBlocksForDate(user.id, dateStr);
        const wholeDay = findWholeDayBlocks(rows);
        if (wholeDay.length > 0) {
          for (const b of wholeDay) {
            await updateBlock(b.id, { endTime: labelFromMinutes(60) });
          }
          syncCurrentScheduleToNative(dateStr);
        }
      } catch (err) {
        console.error("Error loading schedule blocks:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [user?.id, dateStr, fetchBlocksForDate, updateBlock]);

  // Synchronize blocks into row inputs and categories without clobbering the
  // active input. Runs off `dayRows` (not the raw blocks array): a block row's
  // key is its id, so a resize that only moves its times never clobbers what
  // the user is typing, and absorbed rows vanish together with their input.
  useEffect(() => {
    const newValues: Record<string, string> = {};
    const newCats: Record<string, CategoryKey> = {};

    // Blocks changing means the stored categories were re-read, so any "the user
    // chose this" claim from the previous set of blocks no longer holds. Without
    // this, a category picked on Monday would still count as touched on Tuesday
    // and authorise a rewrite the user never asked for.
    categoryTouchedKeysRef.current.clear();

    for (const row of dayRows) {
      const key = rowKey(row);
      const hourStart = Math.floor(row.startMin / 60);
      if (row.kind === "block" && row.block) {
        if (focusedKeyRef.current === key) {
          newValues[key] = editingValues[key] ?? row.block.title;
        } else {
          newValues[key] = row.block.title || "";
        }
        newCats[key] = normalizeCategory(row.block.category, hourStart);
      } else {
        if (focusedKeyRef.current === key) {
          newValues[key] = editingValues[key] ?? "";
        } else {
          newValues[key] = "";
        }
        newCats[key] = rowCategories[key] || normalizeCategory(undefined, hourStart);
      }
    }

    setEditingValues((prev) => {
      const updated = { ...prev };
      let changed = false;
      for (const key of Object.keys(newValues)) {
        if (focusedKeyRef.current !== key && updated[key] !== newValues[key]) {
          updated[key] = newValues[key];
          changed = true;
        }
      }
      return changed ? updated : prev;
    });
    setRowCategories((prev) => ({ ...prev, ...newCats }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks]);

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

  // Planned "shapes" for the allocation bar and the category counts: one entry
  // per clock hour, saying whether any planned row covers it and, if so, whose
  // category it carries. A typed-but-unsaved title counts (that was
  // `isPlannedHour`'s rule); the planner deliberately does not — the
  // per-screen difference stays intentional.
  const hourShapes = useMemo(() => {
    const planned: boolean[] = Array(24).fill(false);
    const cats: (CategoryKey | null)[] = Array(24).fill(null);
    for (const row of dayRows) {
      // Cover the real minutes this row occupies — a 10:35–11:00 half block
      // counts hour 10 for its tail, like the old hour grid counted it.
      //
      // `Math.min`, not `Math.max`: the loop is clamped to the end of the day,
      // and `max` made every row run to hour 23, so a single 00:00–01:00 block
      // painted its category across the whole allocation bar ("Sleep: 24h" for
      // one hour of sleep).
      for (let h = Math.floor(row.startMin / 60); h < Math.min(24, Math.ceil(row.endMin / 60)); h++) {
        const typed = (editingValues[rowKey(row)] ?? "").trim();
        const isPlanned = row.kind === "block" || typed.length > 0;
        if (!isPlanned || planned[h]) continue;
        planned[h] = true;
        cats[h] =
          row.kind === "block"
            ? normalizeCategory(row.block.category, h)
            : rowCategories[rowKey(row)] || normalizeCategory(undefined, h);
      }
    }
    return planned.map((p, h) => ({ planned: p, cat: cats[h] }));
  }, [dayRows, editingValues, rowCategories]);

  // Compute 24h category allocation statistics
  const categoryStats = useMemo(() => {
    let focusH = 0;
    let vitalityH = 0;
    let syncH = 0;
    let renewalH = 0;
    let restH = 0;

    hourShapes.forEach((shape) => {
      if (!shape.planned || shape.cat === null) return;
      const c = shape.cat.toLowerCase();
      if (c.includes("sleep") || c.includes("rest")) restH++;
      else if (c.includes("vitality") || c.includes("habit") || c.includes("health")) vitalityH++;
      else if (c.includes("sync") || c.includes("meet") || c.includes("social")) syncH++;
      else if (c.includes("renewal") || c.includes("buffer") || c.includes("leisure")) renewalH++;
      else focusH++;
    });

    const plannedTotal = focusH + vitalityH + syncH + renewalH + restH;
    const remaining = Math.max(0, 24 - plannedTotal);
    return { focusH, vitalityH, syncH, renewalH, restH, plannedTotal, remaining };
  }, [hourShapes]);

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
    () => buildAllocationSlices(hourShapes.map((s) => s.planned)),
    [hourShapes]
  );

  const progressPct = Math.round((categoryStats.plannedTotal / 24) * 100);

  // Save / Update / Delete the block a row stands for. Block rows save at their
  // ACTUAL minute range (the border drag may have moved it) — never at a
  // rebuilt hour span, or a resize would be silently undone by the next save.
  const handleSaveRow = useCallback(
    async (row: DayRow<ScheduleBlock>, explicitTitle?: string, explicitCat?: CategoryKey) => {
      if (!userId || !dateStr) return;
      const key = rowKey(row);
      const titleToSave = (
        explicitTitle !== undefined ? explicitTitle : (editingValues[key] ?? "")
      ).trim();
      const catToSave =
        explicitCat || rowCategories[key] || normalizeCategory(undefined, Math.floor(row.startMin / 60));

      const startLabel = labelFromMinutes(row.startMin);
      const endLabel = labelFromMinutes(row.endMin);

      try {
        let savedId: string | null = null;
        if (row.kind === "block") {
          const block = row.block;
          if (!titleToSave) {
            await deleteBlock(block.id);
            setRecentlySavedKey(key);
            setTimeout(() => {
              setRecentlySavedKey((curr) => (curr === key ? null : curr));
            }, 2500);
            syncCurrentScheduleToNative(dateStr);
            return;
          }
          await updateBlock(block.id, {
            title: titleToSave,
            // **A title edit must not rewrite the category.** `rowCategories`
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
              touched: categoryTouchedKeysRef.current.has(key),
              chosen: catToSave,
            }),
          });
          savedId = block.id;
        } else if (titleToSave) {
          const created = await addBlock({
            userId: userId,
            date: dateStr,
            startTime: startLabel,
            endTime: endLabel,
            title: titleToSave,
            category: catToSave,
            status: "pending",
            isCommitted: true,
          });
          savedId = created?.id ?? null;
        }

        // Save-time merge on this page too, minute-aware (`findMerge` in
        // planner-block-time stays hour-level): same title (case-insensitive) +
        // same category family + touching, never overlapping. The row just
        // saved survives and widens; absorbed rows are deleted, exactly the
        // planner's contract.
        //
        // The category compared is the STORED value, not the fold this screen
        // displays: `rowCategories` holds a display bucket, and comparing that
        // against a stored `rest`/`habits` row is how identical-text sleep rows
        // stayed split forever.
        const fresh = await db.scheduleBlocks.where("date").equals(dateStr).toArray();
        const merge = savedId && titleToSave
          ? findAdjacentMergeMinutes({
              title: titleToSave,
              category: row.kind === "block" ? (row.block.category ?? "") : catToSave,
              startMin: row.startMin,
              endMin: row.endMin,
              candidates: fresh.filter(
                (r) => r.id !== savedId && r.userId === userId
              ),
            })
          : null;
        if (merge && savedId) {
          await updateBlock(savedId, {
            startTime: labelFromMinutes(merge.startMin),
            endTime: labelFromMinutes(merge.endMin),
          });
          for (const absorbedId of merge.absorbedIds) {
            await deleteBlock(absorbedId);
          }
        }

        setRecentlySavedKey(key);
        setTimeout(() => {
          setRecentlySavedKey((curr) => (curr === key ? null : curr));
        }, 2500);
        syncCurrentScheduleToNative(dateStr);
      } catch (err) {
        console.error("Error saving block:", err);
      }
    },
    [
      userId,
      dateStr,
      editingValues,
      rowCategories,
      deleteBlock,
      updateBlock,
      addBlock,
    ]
  );

  // Change category of a specific row's block
  const handleCategoryChange = useCallback(
    async (row: DayRow<ScheduleBlock>, newCat: CategoryKey) => {
      const key = rowKey(row);
      setRowCategories((prev) => ({ ...prev, [key]: newCat }));
      setOpenCategoryKey(null);

      const currentTitle = (editingValues[key] ?? "").trim();
      if (row.kind === "block") {
        // The one path that is allowed to rewrite a category.
        categoryTouchedKeysRef.current.add(key);
        await updateBlock(row.block.id, { category: newCat });
        syncCurrentScheduleToNative(dateStr);
      } else if (currentTitle) {
        handleSaveRow(row, currentTitle, newCat);
      }
    },
    [editingValues, handleSaveRow, updateBlock, dateStr]
  );

  // Handle Enter / Line-break key on mobile/desktop
  const handleKeyDown = useCallback(
    (
      e: React.KeyboardEvent<HTMLTextAreaElement>,
      row: DayRow<ScheduleBlock>,
      index: number
    ) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const value = e.currentTarget.value;
        handleSaveRow(row, value);

        const nextRow = dayRows[index + 1];
        if (nextRow) {
          const nextKey = rowKey(nextRow);
          focusedKeyRef.current = nextKey;
          setTimeout(() => {
            if (inputRefs.current[nextKey]) {
              inputRefs.current[nextKey]!.focus();
            }
          }, 30);
        }
      }
    },
    [handleSaveRow, dayRows]
  );

  // Handle blur: save on loss of focus
  const handleBlur = useCallback(
    (row: DayRow<ScheduleBlock>, value: string) => {
      const key = rowKey(row);
      if (focusedKeyRef.current === key) {
        focusedKeyRef.current = null;
      }
      handleSaveRow(row, value);
    },
    [handleSaveRow]
  );

  // Handle auto-fill sleep
  const handleAutoFillSleep = useCallback(async () => {
    if (!userId || !dateStr) return;
    await autoFillSleep(userId, dateStr);
    syncCurrentScheduleToNative(dateStr);
  }, [userId, dateStr, autoFillSleep]);

  /**
   * Border-drag live step. The delta is cumulative since press, measured
   * against the block's STORED end (`blocks`, never the live preview) so bytes
   * of quantisation can never accumulate into drift.
   */
  const handleResize = useCallback(
    (row: DayRow<ScheduleBlock>, deltaMinutes: number) => {
      if (row.kind !== "block") return;
      const stored = blocks.find((x) => x.id === row.block.id) ?? row.block;
      const range = blockRangeMinutes(stored);
      if (!range) return;
      const endMin = Math.max(
        range[0] + MIN_BLOCK_MINUTES,
        quantizeEndMinutes(range[1] + deltaMinutes)
      );
      setDragPreview((prev) =>
        prev && prev.id === row.block.id ? { ...prev, endMin } : { id: row.block.id, endMin }
      );
    },
    [blocks]
  );

  /**
   * Drag commit: write everything the preview computed AT ONCE — the dragged
   * end, every trimmed neighbour, the absorbed rows — and, when the drag
   * upward freed minutes, create the new empty block the user can edit.
   * Absorbed content is the destructive part, so the pre-drag originals go
   * into the undo banner rather than vanishing with the drag.
   */
  const handleResizeCommit = useCallback(async () => {
    const preview = dragPreview;
    if (!preview) return;
    // Guard matches `liveBlocks`: a stale preview (day flipped mid-drag) must
    // not write anything when released.
    if (!blocks.some((x) => x.id === preview.id)) {
      setDragPreview(null);
      return;
    }
    const outcome = computeResize(blocks, preview.id, preview.endMin);
    setDragPreview(null);

    try {
      for (const ab of outcome.absorbed) {
        await deleteBlock(ab.id);
      }
      for (const ed of outcome.edited) {
        await updateBlock(ed.id, { startTime: ed.startTime, endTime: ed.endTime });
      }
      if (outcome.dragged) {
        await updateBlock(preview.id, { endTime: outcome.dragged.endTime });
      }
      if (outcome.freed && outcome.dragged) {
        await addBlock({
          userId: userId!,
          date: dateStr!,
          startTime: labelFromMinutes(outcome.freed.start),
          endTime: labelFromMinutes(outcome.freed.end),
          title: "",
          // The freed stretch inherits the dragged block's category, so the
          // new card reads as a continuation until the user types into it.
          category: outcome.dragged.category,
          status: "pending",
          isCommitted: true,
        });
      }
      syncCurrentScheduleToNative(dateStr);

      if (outcome.absorbed.length > 0 || outcome.edited.length > 0) {
        setUndoPayload({
          absorbed: outcome.absorbed,
          // Original pre-drag shapes, from the store — the ones `edited`
          // carries carry already-moved times.
          edited: outcome.edited
            .map((ed) => blocks.find((x) => x.id === ed.id))
            .filter((x): x is ScheduleBlock => !!x),
          dragged: outcome.dragged
            ? [blocks.find((x) => x.id === outcome.dragged!.id)].filter(
                (x): x is ScheduleBlock => !!x
              )
            : [],
        });
      }
    } catch (err) {
      console.error("Error committing resize:", err);
    }
  }, [dragPreview, blocks, deleteBlock, updateBlock, addBlock, userId, dateStr]);

  /** Undo the last resize commit: restore every absorbed, trimmed and dragged row. */
  const handleUndoResize = useCallback(async () => {
    const payload = undoPayload;
    if (!payload) return;
    setUndoPayload(null);
    try {
      for (const ab of payload.absorbed) {
        // Re-insert absorbed rows verbatim (their stored id/createdAt are the
        // two fields addBlock regenerates, so they are not forwarded).
        await addBlock({
          userId: ab.userId,
          date: ab.date,
          startTime: ab.startTime,
          endTime: ab.endTime,
          title: ab.title,
          description: ab.description,
          category: ab.category,
          tag: ab.tag,
          energyLevel: ab.energyLevel,
          status: ab.status,
          missReason: ab.missReason,
          completedAt: ab.completedAt,
          isCommitted: ab.isCommitted,
        });
      }
      for (const ed of payload.edited) {
        await updateBlock(ed.id, { startTime: ed.startTime, endTime: ed.endTime });
      }
      for (const dr of payload.dragged) {
        await updateBlock(dr.id, { startTime: dr.startTime, endTime: dr.endTime });
      }
      syncCurrentScheduleToNative(dateStr);
    } catch (err) {
      console.error("Error undoing resize:", err);
    }
  }, [undoPayload, addBlock, updateBlock, dateStr]);

  // Render a single day row — a block (at its real minute span) or an empty
  // stretch (styled identically to the old hour rows).
  const renderDayRow = (row: DayRow<ScheduleBlock>, index: number) => {
    const key = rowKey(row);
    const nowMinutes = currentHour * 60 + new Date().getMinutes();
    const isPastHour = isSelectedToday && nowMinutes >= row.endMin;
    const isCurrent = isSelectedToday && nowMinutes >= row.startMin && nowMinutes < row.endMin;
    const isRecentlySaved = recentlySavedKey === key;
    const block = row.kind === "block" ? row.block : null;
    const isCustom = !!block;
    const cat = getCatStyle(
      rowCategories[key] ||
        (block
          ? normalizeCategory(block.category, Math.floor(row.startMin / 60))
          : normalizeCategory(undefined, Math.floor(row.startMin / 60))),
      isCustom
    );
    const CatIcon = cat.Icon;
    const isCategoryPickerOpen = openCategoryKey === key;
    const isCompleted = block?.status === "completed";
    const inputValue = editingValues[key] ?? block?.title ?? "";
    const hasContent = inputValue.trim().length > 0 || !!block;

    /**
     * Proportional height (`C2` follow-up): a row's card grows with the minutes
     * it actually holds, clamped so a multi-hour block never dwarfs the page
     * and a 5-minute block stays tappable — nothing too large or too short.
     * `minHeight`, not height: a long task name still grows the row.
     */
    const cardMinHeight = cardHeightPx(row.endMin - row.startMin);

    /**
     * How high this card stacks.
     *
     * The category dropdown lives INSIDE this card, and `backdrop-blur-xl` makes
     * a card both a stacking context and a containing block for fixed children.
     * So the dropdown's own `z-50` resolves only inside this card and cannot
     * lift it past the rows below - measured before this fix: the topmost
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
        key={`slot-${key}`}
        onContextMenu={(e) => e.preventDefault()}
        /* PERF-7e: data-blur-essential marks the blur here as load-bearing
           (stacking context + containing block for the in-card category
           dropdown above), so the low-end kill-switch must not strip it. */
        data-blur-essential
        style={{ minHeight: cardMinHeight }}
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
        {/* Time Indicator on Left — the row's actual minutes, not a rebuilt
            hour: a 10:35 start must read as 10:35. */}
        <div className="flex flex-col items-center justify-center shrink-0 w-14 text-center select-none">
          <span
            className={`text-xs font-mono font-bold leading-tight ${
              isCurrent ? "text-primary font-extrabold" : "text-on-surface"
            }`}
          >
            {labelFromMinutes(row.startMin)}
          </span>
          <span className="text-[10px] font-mono text-on-surface-variant/60 leading-tight">
            {labelFromMinutes(row.endMin)}
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
              setOpenCategoryKey(isCategoryPickerOpen ? null : key);
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
                const effectiveCat =
                  rowCategories[key] ||
                  (block
                    ? normalizeCategory(block.category, Math.floor(row.startMin / 60))
                    : normalizeCategory(undefined, Math.floor(row.startMin / 60)));
                const isSelected = effectiveCat === opt.id;
                const OptIcon = opt.Icon;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleCategoryChange(row, opt.id)}
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
              inputRefs.current[key] = el;
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
              focusedKeyRef.current = key;
            }}
            onChange={(e) => {
              const val = e.target.value;
              focusedKeyRef.current = key;
              autosizeTextarea(e.target);
              setEditingValues((prev) => ({
                ...prev,
                [key]: val,
              }));
            }}
            onKeyDown={(e) => handleKeyDown(e, row, index)}
            onBlur={(e) => handleBlur(row, e.target.value)}
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

        {/* Bottom-border drag (`C2` follow-up): press-and-drag this strip and
            the block's end follows the finger in 5-minute steps — the live
            preview lives in `dragPreview`, the store is written on release. */}
        <BlockDragHandle
          onResize={(deltaMinutes) => handleResize(row, deltaMinutes)}
          onEnd={() => {
            void handleResizeCommit();
          }}
        />
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
              const cat = allocationCategory(hourShapes[slice.hour].cat);
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
            {dayRows.map((row, index) => renderDayRow(row, index))}

            {/* The border-drag absorb banner: shown just after a resize commit
                that removed whole blocks (their content lived in real tasks the
                drag covered entire). Runs for 8s; Undo puts every row back. */}
            {undoPayload && (
              <div className="flex items-center justify-between gap-3 px-3 py-2.5 my-1 rounded-2xl bg-error/10 border border-error/25">
                <span className="text-xs text-on-surface-variant font-medium">
                  {undoPayload.absorbed.length > 0
                    ? `Absorbed ${undoPayload.absorbed.length} block${undoPayload.absorbed.length > 1 ? "s" : ""} into the drag`
                    : "Duration changed"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    void handleUndoResize();
                  }}
                  className="shrink-0 px-3 py-1 rounded-full bg-error/15 border border-error/30 text-error text-xs font-bold cursor-pointer active:scale-95 transition-all"
                >
                  Undo
                </button>
              </div>
            )}

            {/* "Tap outside to close" scrim for the category picker. Rendered ONCE,
                here, OUTSIDE every card. Inside a card it could not work: each card
                carries `backdrop-blur-xl`, which makes the card a containing block
                for fixed-position children, so `fixed inset-0` collapsed onto the
                card's own box instead of the screen. This wrapper has no
                backdrop-filter, so the scrim covers the viewport - and it sits
                below the open card's `z-50`, so the dropdown is still clickable. */}
            {openCategoryKey !== null && (
              <div
                className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px]"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenCategoryKey(null);
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
