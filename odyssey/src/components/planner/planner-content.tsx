"use client";

import { logWarn, readString, writeString } from "@/lib/utils/logger";
import { Suspense, useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useUserStore } from "@/lib/stores/user-store";
import { useScheduleStore } from "@/lib/stores/schedule-store";
import { useHabitStore } from "@/lib/stores/habit-store";
import { db, type ScheduleBlock, type StoredScheduleCategory } from "@/lib/db";
import {
  holdFloatingBlock,
  releaseFloatingBlock,
  listFloatingBlocks,
} from "@/lib/utils/floating-blocks";
import { getJourneyDayNumber, getDateForJourneyDay, getJourneyDayNumberForDate } from "@/lib/utils/journey";
import { syncCurrentScheduleToNative } from "@/lib/utils/android-bridge";
import { EditHourModal } from "@/components/planner/edit-hour-modal";
import { DistributionModal } from "@/components/planner/distribution-modal";
import { InfiniteDateStrip } from "@/components/planner/infinite-date-strip";
import { CompletionFractionHeader } from "@/components/planner/completion-fraction-header";
import { PlannerEmptyState } from "@/components/planner/planner-empty-state";
import { triggerStreaksConfetti } from "@/lib/utils/confetti";
import { XP_PER_BLOCK_COMPLETED } from "@/lib/utils/reward-rules";
import { shouldShowPlannerEmptyState } from "@/lib/utils/planner-empty-state";
import { buildAllocationSlices, allocationCategory } from "@/lib/utils/allocation-bar";
import { getPlannerCatStyle } from "@/lib/utils/planner-category-style";
import { useSharedClock, localDateStr } from "@/lib/utils/shared-clock";
import { TimelineHourSlot } from "@/components/planner/timeline-hour-slot";
import { FloatingBlock } from "@/components/planner/floating-block";
import { FlyingToCorner, type CornerFlight } from "@/components/planner/flying-to-corner";
import {
  Clock,
  CheckCircle2,
  Brain,
  Heart,
  MessageSquare,
  Coffee,
  Moon,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Flame,
  Sparkles,
  Check,
  XCircle,
  Circle,
  Radio,
  Zap,
} from "lucide-react";

// Synchronous local cache helpers to ensure Frame-0 instant rendering without flashes
const getCachedBlocks = (dateStr: string): ScheduleBlock[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = readString(`odyssey_blocks_cache_${dateStr}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) { logWarn("storage call failed: localStorage.getItem", "storage call failed: localStorage.getItem", e); }
  return [];
};

const setCachedBlocks = (dateStr: string, blocksList: ScheduleBlock[]) => {
  if (typeof window === "undefined") return;
  try {
    writeString(`odyssey_blocks_cache_${dateStr}`, JSON.stringify(blocksList));
  } catch (e) { logWarn("page", "could not write to storage", e); }
};

// Hour arithmetic for the drag/swap. Hours are whole (`HH:00`), so only the hour
// part matters; `hourLabel` wraps midnight back to `00:00` the way the seed data does.
const hourOf = (t: string) => parseInt(t.split(":")[0], 10);
const hourLabel = (h: number) => `${String(((h % 24) + 24) % 24).padStart(2, "0")}:00`;
const durationOf = (startTime: string, endTime: string) =>
  (((hourOf(endTime) - hourOf(startTime)) % 24) + 24) % 24 || 1;

export function PlannerContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryDate = searchParams ? searchParams.get("date") : null;
  const { user, fetchUser, addXp } = useUserStore();
  const { habits, todayLogs, historyLogs, fetchHabits, loading: habitsLoading } = useHabitStore();

  const getLocalDateStr = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Frame-0 correctness: these three must be right on the FIRST paint, not
  // after effects run. currentHour used to start at 0, so the rail briefly
  // highlighted midnight before snapping to the real hour. blocks now seeds
  // from the synchronous local cache, so a returning user sees their real
  // schedule immediately instead of an empty timeline that fills in later.
  const now = useSharedClock();
  const currentHour = now.getHours();
  const todayStr = localDateStr(now);
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateStr());
  const [blocks, setBlocks] = useState<ScheduleBlock[]>(() => getCachedBlocks(getLocalDateStr()));

  // The planner reads `db` directly rather than going through the schedule store
  // (debt D5), so it has no store-provided `loading` flag to borrow. Without one,
  // `blocks` is `[]` on first paint for EVERY day — including days that have
  // blocks — and the M3 clean-slate state would flash "Your day is a clean slate"
  // at a full schedule before the read resolves. That is the same confident-false-
  // zero class the habit-progress null percent and the M2 readout both avoid.
  const [blocksLoading, setBlocksLoading] = useState(true);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDistributionModalOpen, setIsDistributionModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);
  const [editingHour, setEditingHour] = useState<number>(9);
  const [editingEndHour, setEditingEndHour] = useState<number>(10);
  const [expandedGroupIds, setExpandedGroupIds] = useState<Record<string, boolean>>({});
  const [recentlySavedHour, setRecentlySavedHour] = useState<number | null>(null);
  const [floatingBlocks, setFloatingBlocks] = useState<ScheduleBlock[]>([]);
  const [saveToast, setSaveToast] = useState<{ title: string; time: string } | null>(null);
  const [hintToast, setHintToast] = useState<string | null>(null);
  // The block dropped on the cross, kept only for as long as its Undo is offered.
  const [removedToast, setRemovedToast] = useState<ScheduleBlock | null>(null);
  // The hand-off the owner asked to see: the block that just lost its hour,
  // travelling to the corner. Decoration over the real state, never it.
  const [cornerFlight, setCornerFlight] = useState<{
    block: ScheduleBlock;
    flight: CornerFlight;
  } | null>(null);

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggeredRef = useRef(false);
  const removedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const flightTimerRef = useRef<NodeJS.Timeout | null>(null);

  const showHint = (msg: string) => {
    setHintToast(msg);
    setTimeout(() => {
      setHintToast((curr) => (curr === msg ? null : curr));
    }, 2000);
  };

  const handleToggleBlockStatus = async (
    e: React.MouseEvent,
    slotHour: number,
    block: ScheduleBlock | null,
    currentStatus?: string
  ) => {
    e.stopPropagation();

    // Prevent reviewing future hours
    const isFuture =
      selectedDate > todayStr ||
      (selectedDate === todayStr && slotHour > currentHour);

    if (isFuture) {
      showHint(
        selectedDate > todayStr
          ? "Future days cannot be reviewed yet"
          : "Future hours cannot be reviewed yet"
      );
      return;
    }

    const current = (currentStatus || block?.status || "pending") as "pending" | "completed" | "missed";
    
    // 3-state toggle cycle: unreviewed (pending) -> completed (tick) -> missed (cross) -> unreviewed (pending)
    let nextStatus: "pending" | "completed" | "missed" = "completed";
    if (current === "completed") {
      nextStatus = "missed";
    } else if (current === "missed") {
      nextStatus = "pending";
    } else {
      nextStatus = "completed";
    }

    if (nextStatus === "completed") {
      triggerStreaksConfetti(e.clientX, e.clientY);
      if (user) {
        // Schedule-block rewards are a SEPARATE pool from the habit vault.
        // The vault derives from `habitLogs`, so crediting here cannot double-pay
        // a habit settlement -- these are different tables and different events.
        //
        // It stays an immediate credit rather than accruing to midnight: it has
        // no habit log to accrue against. Making it settle would need schedule
        // blocks in the settlement ledger, which is a separate decision.
        addXp(XP_PER_BLOCK_COMPLETED);
      }
    }

    if (block && block.id) {
      await db.scheduleBlocks.update(block.id, {
        status: nextStatus,
        completedAt: nextStatus === "completed" ? new Date().toISOString() : undefined,
        missReason: nextStatus === "missed" ? "Did not follow" : undefined,
      });
    } else {
      // Create block if reviewing an unscheduled slot in past/current hour
      const startStr = `${String(slotHour).padStart(2, "0")}:00`;
      const endStr = `${String((slotHour + 1) % 24 === 0 ? 24 : slotHour + 1).padStart(2, "0")}:00`;
      const cat = (slotHour >= 23 || slotHour < 7) ? "sleep" : (slotHour >= 9 && slotHour < 18) ? "work" : "buffer";
      await db.scheduleBlocks.add({
        id: crypto.randomUUID(),
        userId: user?.id || "default",
        date: selectedDate,
        startTime: startStr,
        endTime: endStr,
        title: cat === "sleep" ? "Sleep" : cat === "work" ? "Deep Work" : "Buffer",
        category: cat,
        status: nextStatus,
        completedAt: nextStatus === "completed" ? new Date().toISOString() : undefined,
        missReason: nextStatus === "missed" ? "Did not follow" : undefined,
        tag: cat === "sleep" ? "Rest" : cat === "work" ? "Deep Work" : "Break",
        isCommitted: true,
        createdAt: new Date().toISOString(),
      });
    }

    await loadBlocks(selectedDate);
    syncCurrentScheduleToNative(selectedDate);
    // Reviewing hours can complete the day, which is what the app-wide "days
    // done" counter is derived from (ADR 0005). Re-read it here so the header and
    // the journey banner move on the same tick as the review.
    await fetchUser();
  };

  const toggleGroupExpand = (groupId: string, explicitState?: boolean) => {
    setExpandedGroupIds((prev) => ({
      ...prev,
      [groupId]: explicitState !== undefined ? explicitState : !prev[groupId],
    }));
  };

  // The React setters ARE listed, though they are stable by contract and the old
  // `[]` was safe at runtime. Listing them is what React Compiler needs to be able
  // to optimise this component at all -- without them it bails out of the WHOLE
  // planner screen, not just these two functions. `db`, `getCachedBlocks`,
  // `setCachedBlocks` and `writeString` are module bindings and stay out of the
  // array: including them would be noise, and they cannot change.
  const loadBlocks = useCallback(async (dateStr: string) => {
    try {
      const cached = getCachedBlocks(dateStr);
      if (cached.length > 0) {
        setBlocks((prev) => (prev.length === 0 ? cached : prev));
      }
      const dayBlocks = await db.scheduleBlocks.where("date").equals(dateStr).toArray();
      // Blocks pushed off their hour by a drag are held in their own store, so they
      // are already absent here -- and they come back as draggable icons until the
      // user drops them somewhere. Anything that is on the timeline wins over a held
      // copy of the same id, so a half-finished drop can never render a block twice.
      const onTimeline = new Set(dayBlocks.map((b) => b.id));
      const held = (await listFloatingBlocks(dateStr)).filter((b) => !onTimeline.has(b.id));
      setFloatingBlocks(held);
      setBlocks(dayBlocks);
      setCachedBlocks(dateStr, dayBlocks);
    } catch (err) {
      console.error("Failed to load blocks:", err);
    } finally {
      // Runs on the failure path too: a failed read means "we could not find
      // out", not "this day is empty", and the empty state must not claim it.
      setBlocksLoading(false);
    }
  }, [setBlocks, setBlocksLoading]);

  // Resolve the schedule date from the URL (falls back to today). The state
  // sync is done during render so React Compiler doesn't flag a synchronous
  // setState in an effect.
  const [prevQueryDate, setPrevQueryDate] = useState<string | null>(null);
  if (queryDate && /^\d{4}-\d{2}-\d{2}$/.test(queryDate) && prevQueryDate !== queryDate) {
    setPrevQueryDate(queryDate);
    setSelectedDate(queryDate);
    const cached = getCachedBlocks(queryDate);
    if (cached.length > 0) {
      setBlocks(cached);
    }
  }

  // Fetch + sync whenever the resolved date changes (including first mount).
  useEffect(() => {
    const dateStr = queryDate && /^\d{4}-\d{2}-\d{2}$/.test(queryDate) ? queryDate : getLocalDateStr();
    loadBlocks(dateStr);
    syncCurrentScheduleToNative(dateStr);
  }, [queryDate, loadBlocks]);

  // Keep selectedDate ref updated
  const selectedDateRef = useRef(selectedDate);
  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  // When app is reopened/resumed from background, ensure today's live date is updated and synced
  //
  // It no longer writes `currentHour` / `todayStr`. Those come from the shared
  // clock, which already refreshes on `visibilitychange` -- exactly what this
  // handler was duplicating. `latestToday` is still computed because the
  // selectedDate advance below needs it.
  useEffect(() => {
    const handleReopen = () => {
      if (document.visibilityState === "visible") {
        const latestToday = getLocalDateStr();

        const p = new URLSearchParams(window.location.search);
        const qDate = p.get("date");

        // If no explicit query date and previously viewed date is yesterday/past, advance to today
        if (!qDate) {
          setSelectedDate((curr) => {
            if (!curr || curr < latestToday) {
              loadBlocks(latestToday);
              syncCurrentScheduleToNative(latestToday);
              return latestToday;
            }
            loadBlocks(curr);
            syncCurrentScheduleToNative(curr);
            return curr;
          });
        } else {
          loadBlocks(qDate);
          syncCurrentScheduleToNative(qDate);
        }
      }
    };

    document.addEventListener("visibilitychange", handleReopen);
    window.addEventListener("focus", handleReopen);

    return () => {
      document.removeEventListener("visibilitychange", handleReopen);
      window.removeEventListener("focus", handleReopen);
    };
  }, [loadBlocks]);

  // Live timer for current hour and date change.
  //
  // Replaced by the shared clock (`PERF-4b`). This was a private 15-second
  // `setInterval` for two values that only change at a boundary -- the hour
  // turning, the date rolling over -- so a minute-boundary tick catches both
  // within 60s. What it really cost was a wake every 15 seconds, forever, for the
  // life of the screen.
  //
  // `currentHour` and `todayStr` are now derived from that clock at the top of the
  // component, so there is nothing left to write here.

  // Fetch user once on mount
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Blocks are keyed by date only, so they can load as soon as the date is
  // known -- no reason to make the schedule wait on the profile.
  useEffect(() => {
    loadBlocks(selectedDate);
  }, [selectedDate, loadBlocks]);

  // Habits are keyed by userId, so this must WAIT for the real profile id.
  //
  // This used to run `fetchHabits(user?.id || "default", selectedDate)` with
  // `user` deliberately absent from the dependency list. On a cold load `user`
  // is still null, so the query ran against the literal string "default",
  // which matches no rows -- and fetchHabits then falls back to loading EVERY
  // unarchived habit while finding none of the user's logs. The date strip
  // rendered that as a real denominator against an empty numerator: "0/19"
  // on every day, which persisted until some later event refetched.
  useEffect(() => {
    if (!user?.id) return;
    fetchHabits(user.id, selectedDate);
  }, [user?.id, selectedDate, fetchHabits]);

  // Same reasoning as `loadBlocks`: the setters are listed so React Compiler can
  // optimise this component rather than skipping the entire screen. `writeString`
  // and `getCachedBlocks` are module bindings and stay out.
  const handleSelectDate = useCallback((dateStr: string) => {
    setSelectedDate(dateStr);
    try {
      writeString("odyssey_planner_selected_date", dateStr);
      if (typeof window !== "undefined" && window.location.search) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    } catch (e) { logWarn("storage call failed: localStorage.setItem", "storage call failed: localStorage.setItem", e); }
    const cached = getCachedBlocks(dateStr);
    if (cached.length > 0) {
      setBlocks(cached);
    }
  }, [setSelectedDate, setBlocks]);

  // Build full 24 hours array (Unscheduled hours remain EMPTY - no fake titles)
  const full24Hours = useMemo(() => {
    return Array.from({ length: 24 }, (_, h) => {
      const sTime = `${String(h).padStart(2, "0")}:00`;
      const eTime = `${String((h + 1) % 24 === 0 ? 24 : h + 1).padStart(2, "0")}:00`;
      const matching = blocks.find((b) => {
        const sH = parseInt(b.startTime.split(":")[0], 10);
        let eH = parseInt(b.endTime.split(":")[0], 10);
        if (b.endTime === "24:00" || (eH === 0 && sH > 0)) eH = 24;
        if (sH > eH) {
          return h >= sH || h < eH;
        }
        return h >= sH && h < eH;
      });

      return {
        hour: h,
        startTime: sTime,
        endTime: eTime,
        block: matching || null,
        title: matching ? matching.title : "", // KEEP EMPTY IF NOT WRITTEN BY USER!
        category: matching ? matching.category : "",
        isCustom: !!matching,
        status: matching?.status || "pending",
      };
    });
  }, [blocks]);

  const isSelectedToday = selectedDate === todayStr;
  const isSelectedPastDay = selectedDate < todayStr;

  // M12 ("Now / Up next in ...") was removed from this header on owner
  // instruction; its module and tests went with it. See the comment where the
  // line used to render.

  // Category summary counts - strictly from user scheduled blocks!
  // `isCustom` (a saved block) is the test, and it is named because the
  // allocation bar below is the SAME fact about the SAME day: two derivations
  // of "how much of this day is planned" is how a bar and its own caption
  // start disagreeing. A typed-but-unsaved title deliberately does NOT count
  // here, unlike the Day Schedule screen.
  const isPlannedHour = useCallback((h: (typeof full24Hours)[number]) => !!h.isCustom, []);

  const categoryStats = useMemo(() => {
    let focusH = 0;
    let vitalityH = 0;
    let syncH = 0;
    let renewalH = 0;
    let restH = 0;

    full24Hours.forEach((h) => {
      if (!isPlannedHour(h)) return; // Do NOT count unwritten hours!
      const c = (h.category || "").toLowerCase();
      if (c.includes("sleep") || c.includes("rest")) restH++;
      else if (c.includes("vitality") || c.includes("habit")) vitalityH++;
      else if (c.includes("sync") || c.includes("meeting")) syncH++;
      else if (c.includes("renewal") || c.includes("buffer")) renewalH++;
      else focusH++;
    });

    const plannedTotal = focusH + vitalityH + syncH + renewalH + restH;

    return { focusH, vitalityH, syncH, renewalH, restH, plannedTotal };
  }, [full24Hours, isPlannedHour]);

  // The bar's 24 one-hour slices, left to right = 00:00 → 23:00, so it reads as
  // the day rather than as five buckets with the order discarded. Same planned
  // test as `categoryStats` above, by construction.
  const allocationSlices = useMemo(
    () => buildAllocationSlices(full24Hours.map(isPlannedHour)),
    [full24Hours, isPlannedHour]
  );

  // Helper to determine canonical category type for adjacent grouping
  const getCategoryType = useCallback((category?: string, isCustom?: boolean): string => {
    if (!isCustom || !category) return "open";
    const c = category.toLowerCase();
    if (c.includes("sleep") || c.includes("rest")) return "sleep";
    if (c.includes("vitality") || c.includes("habit")) return "vitality";
    if (c.includes("sync") || c.includes("meeting")) return "sync";
    if (c.includes("renewal") || c.includes("buffer")) return "renewal";
    return "work";
  }, []);

  // Group adjacent custom blocks of the same type together
  interface HourGroup {
    id: string;
    type: string;
    isCustom: boolean;
    startHour: number;
    endHour: number;
    hours: number[];
    slots: typeof full24Hours;
    title: string;
    category: string;
    primaryBlock?: ScheduleBlock | null;
    status: string;
  }

  const hourGroups = useMemo(() => {
    const groups: HourGroup[] = [];
    let currentGroup: HourGroup | null = null;

    full24Hours.forEach((slot) => {
      const type = getCategoryType(slot.category, slot.isCustom);
      const isCustom = slot.isCustom;

      // Merge if both are custom, same category type, and consecutive
      const canMerge =
        currentGroup &&
        currentGroup.isCustom &&
        isCustom &&
        currentGroup.type === type;

      if (canMerge && currentGroup) {
        currentGroup.endHour = slot.hour + 1;
        currentGroup.hours.push(slot.hour);
        currentGroup.slots.push(slot);
        if (!currentGroup.title && slot.title) {
          currentGroup.title = slot.title;
        }
      } else {
        if (currentGroup) {
          groups.push(currentGroup);
        }
        currentGroup = {
          id: `group-${slot.hour}-${type}`,
          type,
          isCustom,
          startHour: slot.hour,
          endHour: slot.hour + 1,
          hours: [slot.hour],
          slots: [slot],
          title: slot.title || "",
          category: slot.category || "",
          primaryBlock: slot.block || null,
          status: slot.status || "pending",
        };
      }
    });

    if (currentGroup) {
      groups.push(currentGroup);
    }

    return groups;
  }, [full24Hours, getCategoryType]);

  const handleOpenHour = (hour: number, block?: ScheduleBlock | null, endHour?: number) => {
    setEditingHour(hour);
    setEditingEndHour(endHour !== undefined ? endHour : (hour + 1) % 24 === 0 ? 24 : hour + 1);
    setEditingBlock(block || null);
    setIsEditModalOpen(true);
  };

  // Read the two boxes the hand-off travels between, before the state update that
  // takes the card off its hour. Nothing here writes data: if either box is
  // missing, the move still happens and simply does not animate.
  const startCornerFlight = useCallback(
    (block: ScheduleBlock, fromHour: number) => {
      if (typeof window === "undefined") return;
      // Reduced motion: a travelling element that does not travel is a second
      // copy of the block sitting on an hour for half a second, so skip it.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const originEl = document.querySelector(`[data-hour="${fromHour}"]`);
      const cornerEl = document.querySelector("[data-floating-container]");
      if (!originEl || !cornerEl) return;
      const origin = originEl.getBoundingClientRect();
      const iconEl = cornerEl.querySelector("[data-floating-icon]");
      const corner = (iconEl ?? cornerEl).getBoundingClientRect();
      // shortcut: with no held icon yet the corner has no box of its own, so the
      // target is a nominal 132x40 icon hung off its bottom-right anchor -- the
      // container grows upwards from a fixed bottom edge. Upgrade if the icon's
      // size changes.
      const to = iconEl
        ? { x: corner.left + corner.width / 2, y: corner.top + corner.height / 2 }
        : { x: corner.right - 66, y: corner.bottom - 20 };
      setCornerFlight({
        block,
        flight: {
          from: { x: origin.left, y: origin.top, width: origin.width, height: origin.height },
          to,
        },
      });
      if (flightTimerRef.current) clearTimeout(flightTimerRef.current);
      // Cleared by a timer rather than by `animationend`: under reduced motion the
      // animation does not run, so that event would never arrive and the flying
      // copy would stay on screen.
      flightTimerRef.current = setTimeout(() => setCornerFlight(null), 460);
    },
    [setCornerFlight]
  );

  const handleMoveBlock = useCallback(async (block: ScheduleBlock, toHour: number) => {
    if (!block?.id) return;
    const fromHour = hourOf(block.startTime);
    if (fromHour === toHour) return;
    const floatingIds = new Set(floatingBlocks.map((f) => f.id));
    // Only a block actually on the timeline can be displaced -- never one that is
    // already floating, or the same id would be pushed into the floating list twice.
    const occupant = blocks.find(
      (b) => b.id !== block.id && !floatingIds.has(b.id) && hourOf(b.startTime) === toHour
    );
    const delta = toHour - fromHour;
    const shift = (t: string) => hourLabel(hourOf(t) + delta);
    const mover: ScheduleBlock = {
      ...block,
      startTime: shift(block.startTime),
      endTime: shift(block.endTime),
    };
    await db.scheduleBlocks.update(block.id, {
      startTime: mover.startTime,
      endTime: mover.endTime,
    });
    let heldOccupant = false;
    if (occupant) {
      // The displaced block is taken OFF the timeline and held, keeping its own
      // start and end time -- its length is not rewritten to the slot it was pushed
      // out of, so nothing about it is silently altered. Held first: if that write
      // fails the block must stay where it is, because a displaced block that is
      // held nowhere is a lost block.
      try {
        await holdFloatingBlock(occupant);
        await db.scheduleBlocks.delete(occupant.id);
        heldOccupant = true;
      } catch (e) {
        logWarn("planner", "could not hold the displaced block", e);
      }
      // Read the boxes now, while the card is still on its hour, so the block can
      // be seen leaving it.
      if (heldOccupant) startCornerFlight(occupant, hourOf(occupant.startTime));
    }
    setBlocks((prev) => {
      const without = heldOccupant && occupant ? prev.filter((b) => b.id !== occupant.id) : prev;
      return without.map((b) => (b.id === block.id ? mover : b));
    });
    if (heldOccupant && occupant) {
      setFloatingBlocks((prev) => (prev.some((f) => f.id === occupant.id) ? prev : [...prev, occupant]));
    }
    // Where the user's block landed, in the same highlight a save gets.
    setRecentlySavedHour(toHour);
    setTimeout(() => setRecentlySavedHour((curr) => (curr === toHour ? null : curr)), 2800);
    syncCurrentScheduleToNative(selectedDate);
  }, [blocks, floatingBlocks, selectedDate, setBlocks, setFloatingBlocks, startCornerFlight, setRecentlySavedHour]);

  const handleDropFloating = useCallback(async (block: ScheduleBlock, toHour: number) => {
    if (!block?.id) return;
    const floatingIds = new Set(floatingBlocks.map((f) => f.id));
    const occupant = blocks.find(
      (b) => b.id !== block.id && !floatingIds.has(b.id) && hourOf(b.startTime) === toHour
    );
    const placed: ScheduleBlock = {
      ...block,
      startTime: hourLabel(toHour),
      endTime: hourLabel(toHour + durationOf(block.startTime, block.endTime)),
    };
    // Back onto the timeline before it stops being held: the worst case is then a
    // block that is on the day and still has a held copy (which the read path
    // de-duplicates), never a block that is held nowhere.
    await db.scheduleBlocks.put(placed);
    await releaseFloatingBlock(block.id);
    let heldOccupant = false;
    if (occupant) {
      // Dropping onto an occupied hour pushes that block off the timeline too, and
      // it takes a turn as a floating icon -- the same chain as a rail drag.
      try {
        await holdFloatingBlock(occupant);
        await db.scheduleBlocks.delete(occupant.id);
        heldOccupant = true;
      } catch (e) {
        logWarn("planner", "could not hold the displaced block", e);
      }
      if (heldOccupant) startCornerFlight(occupant, hourOf(occupant.startTime));
    }
    setBlocks((prev) => {
      const without = heldOccupant && occupant ? prev.filter((b) => b.id !== occupant.id) : prev;
      return [...without.filter((b) => b.id !== block.id), placed];
    });
    setFloatingBlocks((prev) => {
      const next = prev.filter((f) => f.id !== block.id);
      if (heldOccupant && occupant && !next.some((f) => f.id === occupant.id)) next.push(occupant);
      return next;
    });
    setRecentlySavedHour(toHour);
    setTimeout(() => setRecentlySavedHour((curr) => (curr === toHour ? null : curr)), 2800);
    syncCurrentScheduleToNative(selectedDate);
  }, [blocks, floatingBlocks, selectedDate, setBlocks, setFloatingBlocks, startCornerFlight, setRecentlySavedHour]);

  const handleDeleteFloating = useCallback(
    async (block: ScheduleBlock) => {
      // A displaced block is already off the day; dropping it on the cross is what
      // makes it gone. The held copy goes first -- if that write fails the icon
      // stays on screen, because the held copy is the only copy left.
      try {
        await releaseFloatingBlock(block.id);
      } catch (e) {
        logWarn("planner", "could not drop the deleted block", e);
        return;
      }
      setFloatingBlocks((prev) => prev.filter((f) => f.id !== block.id));
      setRemovedToast(block);
      if (removedTimerRef.current) clearTimeout(removedTimerRef.current);
      removedTimerRef.current = setTimeout(() => setRemovedToast(null), 5000);
    },
    [setFloatingBlocks, setRemovedToast]
  );

  // Undo puts it back exactly as it was: still off the timeline, still holding its
  // own start and end time. A delete that gets taken back must not have altered
  // anything on the way out.
  const handleUndoDelete = useCallback(async () => {
    const block = removedToast;
    if (!block) return;
    if (removedTimerRef.current) clearTimeout(removedTimerRef.current);
    removedTimerRef.current = null;
    setRemovedToast(null);
    try {
      await holdFloatingBlock(block);
      setFloatingBlocks((prev) =>
        prev.some((f) => f.id === block.id) ? prev : [...prev, block]
      );
    } catch (e) {
      logWarn("planner", "could not restore the deleted block", e);
    }
  }, [removedToast, setRemovedToast, setFloatingBlocks]);

  // The Undo window is a timer, so it is cleared when the screen goes away.
  useEffect(() => {
    return () => {
      if (removedTimerRef.current) clearTimeout(removedTimerRef.current);
    };
  }, []);
  const handleSaveBlock = async (data: {
    id?: string;
    title: string;
    /**
     * `BUG-14`. This was `string`, which made it **the widest hole in the
     * schedule's category field** -- every other write path was narrower, so
     * closing `db.ts`'s escape hatch without touching this would have left a
     * parameter that still accepted anything and passed it straight through.
     * It is constrained in practice by `edit-hour-modal`'s `CATEGORIES` ids;
     * now the type says so instead of the comment merely implying it.
     */
    category: StoredScheduleCategory;
    startTime: string;
    endTime: string;
    date: string;
    status?: "planned" | "completed" | "skipped";
    habitId?: string;
  }) => {
    const blockStatus = data.status === "completed" ? "completed" : data.status === "skipped" ? "missed" : "pending";
    if (data.id) {
      await db.scheduleBlocks.update(data.id, {
        title: data.title,
        category: data.category,
        startTime: data.startTime,
        endTime: data.endTime,
        status: blockStatus,
        tag: data.habitId,
      });
    } else {
      await db.scheduleBlocks.add({
        id: crypto.randomUUID(),
        userId: user?.id || "default",
        title: data.title,
        category: data.category,
        startTime: data.startTime,
        endTime: data.endTime,
        date: data.date,
        status: blockStatus,
        tag: data.habitId,
        isCommitted: true,
        createdAt: new Date().toISOString(),
      });
    }
    const startH = parseInt(data.startTime.split(":")[0], 10) || 0;
    const catLower = (data.category || "").toLowerCase();
    const isSleep = catLower.includes("sleep") || catLower.includes("rest");

    // Automatically expand the sleep group so the newly saved block doesn't disappear into minimized state
    if (isSleep) {
      setExpandedGroupIds((prev) => ({
        ...prev,
        [`group-${startH}-sleep`]: true,
      }));
    }

    setRecentlySavedHour(startH);
    setSaveToast({
      title: data.title || (isSleep ? "Rest & Sleep" : "Scheduled Block"),
      time: `${data.startTime} → ${data.endTime}`,
    });

    setTimeout(() => {
      setRecentlySavedHour((curr) => (curr === startH ? null : curr));
    }, 2800);

    setTimeout(() => {
      setSaveToast(null);
    }, 3200);

    await loadBlocks(selectedDate);
    syncCurrentScheduleToNative();
    // An hour can be added, retitled, or re-statused here -- all three can change
    // whether the day is fully written and reviewed, i.e. whether it is a "day
    // done" (ADR 0005).
    await fetchUser();
  };

  const handleDeleteBlock = async (id: string) => {
    await db.scheduleBlocks.delete(id);
    await loadBlocks(selectedDate);
    syncCurrentScheduleToNative();
    // Removing an hour can break a complied day: recompute the app-wide counter.
    await fetchUser();
  };

  const renderHourSlot = (
    slot: (typeof full24Hours)[0],
    options?: {
      isInsideGroup?: boolean;
      groupType?: string;
      expandToggle?: { isExpanded: boolean; onToggle: () => void };
    }
  ) => {
    const isPastHour =
      selectedDate < todayStr ||
      (selectedDate === todayStr && slot.hour < currentHour);
    const isCurrent = isSelectedToday && currentHour === slot.hour;
    const isFutureHour =
      selectedDate > todayStr ||
      (selectedDate === todayStr && slot.hour > currentHour);
    const isRecentlySaved = recentlySavedHour === slot.hour;

    return (
      <TimelineHourSlot
        key={`slot-${slot.hour}`}
        slot={slot}
        isPastHour={isPastHour}
        isCurrent={isCurrent}
        isFutureHour={isFutureHour}
        isRecentlySaved={isRecentlySaved}
        selectedDate={selectedDate}
        todayStr={todayStr}
        options={options}
        onOpenHour={handleOpenHour}
        onToggleStatus={handleToggleBlockStatus}
        onShowHint={showHint}
        onMoveBlock={handleMoveBlock}
      />
    );
  };

  // Open the quick scheduling window (day-schedule page) when user clicks empty slate
  const handleOpenQuickSchedule = useCallback(() => {
    if (!selectedDate || !user?.createdAt) return;
    const dayNum = getJourneyDayNumberForDate(selectedDate, user.createdAt);
    const dateStr = getDateForJourneyDay(dayNum, user.createdAt);
    router.push(`/day-schedule?date=${dateStr}&day=${dayNum}`);
  }, [selectedDate, user, router]);

  const currentBlockTitle = useMemo(() => {
    if (selectedDate !== todayStr) return undefined;
    const block = blocks.find((b) => {
      const start = parseInt(b.startTime.split(":")[0], 10);
      let end = parseInt(b.endTime.split(":")[0], 10);
      if (Number.isNaN(end)) end = start + 1;
      if (end <= start) end = start + 1;
      return !Number.isNaN(start) && currentHour >= start && currentHour < end;
    });
    return block?.title;
  }, [blocks, selectedDate, todayStr, currentHour]);

  const scrollToCurrent = useCallback(() => {
    if (typeof window === "undefined") return;
    const el = document.querySelector(`[data-hour="${currentHour}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [currentHour]);

  // Render floating displaced blocks as draggable icons.
  const floatingElements = floatingBlocks.map((b) => (
    <FloatingBlock key={b.id} block={b} onDrop={handleDropFloating} onDelete={handleDeleteFloating} />
  ));

  return (
    <>
    <div className="flex-1 flex flex-col w-full max-w-xl mx-auto px-4 pb-20 pt-2 space-y-4">

      {/* M9 - Completion fraction ("3/5 Habits Done · 60%"). Sits above the
          date strip so the day's standing is read first; animated and built
          from swappable slots so further readouts can be added later. Scrolls
          with the page rather than pinning (see C4). */}
      <CompletionFractionHeader
        selectedDate={selectedDate}
        todayStr={todayStr}
        habits={habits}
        todayLogs={todayLogs}
        historyLogs={historyLogs}
        loading={habitsLoading || !user?.id}
        currentBlockTitle={currentBlockTitle}
        onNowClick={scrollToCurrent}
      />

      {/* The M12 "Now / Up next in 35 min · <title> (1h)" line was removed here
          on owner instruction, along with its module `lib/utils/up-next.ts` and
          its 26 tests -- the planner was its only consumer, so all three would
          otherwise have become unreachable code that still reads as coverage.

          Do NOT reinstate it by restoring these lines: the counting logic was
          written to answer three questions the rest of the header does not
          (a running block reads "Now" rather than "in -15 min"; a block starting
          in 20 seconds rounds UP to "1 min" rather than claiming "0 min"; and a
          midnight-crossing block is 3h, not minus 21h). Reinstating the line means
          reinstating that module, not writing a countdown inline here. */}

      {/* Infinite Horizontal Date Selector Strip with Sticky Today & HabitDriven Colored Rings */}
      <InfiniteDateStrip
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
        todayStr={todayStr}
        habits={habits}
        todayLogs={todayLogs}
        historyLogs={historyLogs}
        loading={habitsLoading || !user?.id}
      />

      {/* Quick Action Toolbar & 24-Hour Category Distribution Box (Akiflow / Sunsama / Structured) */}
      <div className="space-y-2">
        <div
          role="button"
          tabIndex={0}
          onClick={() => setIsDistributionModalOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setIsDistributionModalOpen(true);
            }
          }}
          className="p-3.5 rounded-2xl bg-surface-container-low/95 border border-outline/[0.08] hover:border-primary/40 active:scale-[0.99] transition-all cursor-pointer space-y-2.5 group shadow-sm"
        >
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-on-surface flex items-center gap-1.5 group-hover:text-primary transition-colors">
                <Clock className="w-3.5 h-3.5 text-primary" />
                <span>Daily Schedule Rail</span>
              </span>
            </div>
            <div className="flex items-center gap-1 font-mono text-on-surface-variant text-[11px]">
              <ChevronRight className="w-3.5 h-3.5 text-on-surface-variant/60 group-hover:text-primary transition-colors" />
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
              the hour rail below it carries the same information in words. */}
          <div
            aria-hidden="true"
            suppressHydrationWarning
            className="relative h-2 w-full bg-surface-container-highest rounded-full overflow-hidden"
          >
            {allocationSlices.map((slice) => {
              if (!slice.filled) return null;
              // The planner's hours hold the raw stored category, so it goes
              // through this page's own resolver first. Same answer either way:
              // `isCustom` is true for every filled slice by definition.
              const cat = allocationCategory(
                getCategoryType(full24Hours[slice.hour].category, true)
              );
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
        </div>

        </div>

      {/* M3 - Zero-block state for the selected day. 
          Only shown when there are NO blocks - hides the 24-hour timeline.
          Click opens the quick scheduling window (same behavior as journey page).
          Gated on `blocksLoading` so it cannot claim a day is blank before the read resolves. */}
      {shouldShowPlannerEmptyState(blocksLoading, blocks) ? (
        <PlannerEmptyState
          isPastDay={isSelectedPastDay}
          onClick={handleOpenQuickSchedule}
        />
      ) : (
        /* 24-Hour Chrono Stream Timeline - Structured Vertical Rail
           Only shown when there ARE blocks */
        <div className="relative flex flex-col space-y-1 pl-2 sm:pl-3 before:content-[''] before:absolute before:left-[35px] sm:before:left-[39px] before:top-4 before:bottom-4 before:w-[2px] before:bg-surface-container-low before:rounded-full">
          {hourGroups.map((group) => {
          const isSleep = group.type === "sleep";
          const isRecentlySaved =
            recentlySavedHour !== null &&
            (group.hours.includes(recentlySavedHour) || group.startHour === recentlySavedHour);
          const isExpanded =
            expandedGroupIds[group.id] !== undefined
              ? expandedGroupIds[group.id]
              : isRecentlySaved;
          const cat = getPlannerCatStyle(group.category, group.isCustom);

          // 1. Multiple Sleep Hours: Minimized to 1st hour by default with top-right arrow toggle
          if (isSleep && group.hours.length > 1) {
            return (
              <div
                key={group.id}
                // Same palette as every other category group. This branch used
                // to hardcode `bg-indigo-950/20`, which is a dark navy at 20%
                // and reads as a flat grey plate over a light page.
                className={`rounded-3xl border ${cat.cardBorder} ${cat.cardBg} p-2 my-1 space-y-1 shadow-sm transition-all duration-300 ${
                  isRecentlySaved ? "ring-2 ring-primary border-primary shadow-[0_0_24px_rgba(108,0,255,0.35)]" : ""
                }`}
              >
                {/* Render the 1st sleep hour slot with down/up arrow toggle on top right */}
                {renderHourSlot(group.slots[0], {
                  isInsideGroup: true,
                  groupType: "sleep",
                  expandToggle: {
                    isExpanded,
                    onToggle: () => toggleGroupExpand(group.id),
                  },
                })}

                {/* Expanded state: render remaining sleep slots */}
                {isExpanded && (
                  group.slots.slice(1).map((slot) =>
                    renderHourSlot(slot, { isInsideGroup: true, groupType: "sleep" })
                  )
                )}
              </div>
            );
          }

          // 2. Multi-hour same-category tasks: Grouped in same background with NO extra summary/duration banner!
          if (group.isCustom && group.hours.length > 1) {
            return (
              <div
                key={group.id}
                className={`rounded-3xl border ${cat.cardBorder} ${cat.cardBg} p-2 my-1 space-y-1 shadow-sm transition-all duration-300 ${
                  isRecentlySaved ? "ring-2 ring-primary border-primary shadow-[0_0_24px_rgba(108,0,255,0.35)]" : ""
                }`}
              >
                {group.slots.map((slot) =>
                  renderHourSlot(slot, { isInsideGroup: true, groupType: group.type })
                )}
              </div>
            );
          }

          // 3. Single Hour Slot
          return renderHourSlot(group.slots[0]);
        })}
        </div>
      )}

      {/* Edit Hour Modal Sheet */}
      <EditHourModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSave={handleSaveBlock}
        onDelete={handleDeleteBlock}
        initialHour={editingHour}
        initialEndHour={editingEndHour}
        initialDate={selectedDate}
        existingBlock={editingBlock}
      />

      {/* Distribution Detail Pop-up */}
      <DistributionModal
        isOpen={isDistributionModalOpen}
        onClose={() => setIsDistributionModalOpen(false)}
        dateStr={selectedDate}
        categoryStats={categoryStats}
        blocks={blocks}
      />

      {/* Scheduled Confirmation Toast Feedback */}
      {saveToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-surface-container-low/95 border border-primary/50 text-on-surface shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0 animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs font-mono">
              <span className="font-bold text-primary">Scheduled: </span>
              <span className="text-on-surface font-semibold">{saveToast.title}</span>
              <span className="text-on-surface-variant/80 ml-1.5 text-[11px]">({saveToast.time})</span>
            </div>
          </div>
        </div>
      )}

      {/* Past Hour Tap & Hold Hint Toast */}
      {hintToast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
          <div className="px-4 py-2 rounded-full bg-surface-container-highest/95 border border-outline/25 text-on-surface text-xs font-mono font-medium shadow-xl flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>{hintToast}</span>
          </div>
        </div>
      )}

      {/* Dropped-on-the-cross confirmation. The only toast that takes pointer
          events, because it is the only one with something to press. It sits
          above the cross so a drag started while it is up cannot cover it. */}
      {removedToast && (
        <div className="fixed bottom-44 left-1/2 -translate-x-1/2 z-[60] transition-all duration-300 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3 rounded-2xl border border-error/40 bg-surface-container-low/95 px-4 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <span className="text-xs font-mono">
              <span className="font-semibold text-on-surface">{removedToast.title}</span>
              <span className="ml-1.5 text-[11px] text-on-surface-variant/80">removed</span>
            </span>
            <button
              type="button"
              onClick={handleUndoDelete}
              className="rounded-full bg-error/15 px-3 py-1 text-[11px] font-mono font-bold text-error transition-colors hover:bg-error/25"
            >
              Undo
            </button>
          </div>
        </div>
      )}

      {/* The hand-off: the block that lost its hour, crossing to the corner. */}
      {cornerFlight && (
        <FlyingToCorner block={cornerFlight.block} flight={cornerFlight.flight} />
      )}

      {/* Always rendered, even with nothing held: it is the box the hand-off flies
          to, so it has to exist before the first held block does. */}
      <div
        data-floating-container
        className="fixed bottom-28 right-4 z-50 flex flex-col items-end gap-2"
      >
        {floatingElements}
      </div>
    </div>
    </>
  );
}
