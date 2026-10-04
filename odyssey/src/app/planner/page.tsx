"use client";

import { logWarn, readString, writeString } from "@/lib/utils/logger";
import { Suspense, useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useUserStore } from "@/lib/stores/user-store";
import { useScheduleStore } from "@/lib/stores/schedule-store";
import { useHabitStore } from "@/lib/stores/habit-store";
import { db, type ScheduleBlock } from "@/lib/db";
import { getJourneyDayNumber, getDateForJourneyDay } from "@/lib/utils/journey";
import { syncCurrentScheduleToNative } from "@/lib/utils/android-bridge";
import { EditHourModal } from "@/components/planner/edit-hour-modal";
import { DistributionModal } from "@/components/planner/distribution-modal";
import { InfiniteDateStrip } from "@/components/planner/infinite-date-strip";
import { triggerStreaksConfetti } from "@/lib/utils/confetti";
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

export default function PlannerPage() {
  return (
    <Suspense fallback={null}>
      <PlannerContent />
    </Suspense>
  );
}

function PlannerContent() {
  const searchParams = useSearchParams();
  const queryDate = searchParams ? searchParams.get("date") : null;
  const { user, fetchUser, addXp } = useUserStore();
  const { habits, todayLogs, historyLogs, fetchHabits, loading: habitsLoading } = useHabitStore();

  const getLocalDateStr = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [currentHour, setCurrentHour] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalDateStr());
  const [todayStr, setTodayStr] = useState<string>(() => getLocalDateStr());
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDistributionModalOpen, setIsDistributionModalOpen] = useState(false);
  const [editingBlock, setEditingBlock] = useState<ScheduleBlock | null>(null);
  const [editingHour, setEditingHour] = useState<number>(9);
  const [editingEndHour, setEditingEndHour] = useState<number>(10);
  const [expandedGroupIds, setExpandedGroupIds] = useState<Record<string, boolean>>({});
  const [recentlySavedHour, setRecentlySavedHour] = useState<number | null>(null);
  const [saveToast, setSaveToast] = useState<{ title: string; time: string } | null>(null);
  const [hintToast, setHintToast] = useState<string | null>(null);

  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressTriggeredRef = useRef(false);

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
        addXp(10);
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
  };

  const toggleGroupExpand = (groupId: string, explicitState?: boolean) => {
    setExpandedGroupIds((prev) => ({
      ...prev,
      [groupId]: explicitState !== undefined ? explicitState : !prev[groupId],
    }));
  };

  const loadBlocks = useCallback(async (dateStr: string) => {
    try {
      const cached = getCachedBlocks(dateStr);
      if (cached.length > 0) {
        setBlocks((prev) => (prev.length === 0 ? cached : prev));
      }
      const dayBlocks = await db.scheduleBlocks.where("date").equals(dateStr).toArray();
      setBlocks(dayBlocks);
      setCachedBlocks(dateStr, dayBlocks);
    } catch (err) {
      console.error("Failed to load blocks:", err);
    }
  }, []);

  // Mount initialization: always default to today unless explicit queryDate is provided
  useEffect(() => {
    setIsMounted(true);
    const now = new Date();
    setCurrentHour(now.getHours());
    const today = getLocalDateStr(now);
    setTodayStr(today);

    let initialDate = today;
    const p = new URLSearchParams(window.location.search);
    const qDate = p.get("date");
    if (qDate && /^\d{4}-\d{2}-\d{2}$/.test(qDate)) {
      initialDate = qDate;
    }

    setSelectedDate(initialDate);
    const cached = getCachedBlocks(initialDate);
    if (cached.length > 0) {
      setBlocks(cached);
    }
    loadBlocks(initialDate);
    syncCurrentScheduleToNative(initialDate);
  }, [loadBlocks]);

  // Reactively switch schedule date whenever query parameter changes
  useEffect(() => {
    if (queryDate && /^\d{4}-\d{2}-\d{2}$/.test(queryDate)) {
      setSelectedDate(queryDate);
      const cached = getCachedBlocks(queryDate);
      if (cached.length > 0) {
        setBlocks(cached);
      }
      loadBlocks(queryDate);
      syncCurrentScheduleToNative(queryDate);
    }
  }, [queryDate, loadBlocks]);

  // Keep selectedDate ref updated
  const selectedDateRef = useRef(selectedDate);
  useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  // When app is reopened/resumed from background, ensure today's live date is updated and synced
  useEffect(() => {
    const handleReopen = () => {
      if (document.visibilityState === "visible") {
        const now = new Date();
        const latestToday = getLocalDateStr(now);
        setTodayStr(latestToday);
        setCurrentHour(now.getHours());

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

  // Live timer for current minute, hour, and date change
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentHour(now.getHours());
      setTodayStr(getLocalDateStr(now));
    }, 15000);
    return () => clearInterval(timer);
  }, []);

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
  }, []);

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

  // Category summary counts - strictly from user scheduled blocks!
  const categoryStats = useMemo(() => {
    let focusH = 0;
    let vitalityH = 0;
    let syncH = 0;
    let renewalH = 0;
    let restH = 0;

    full24Hours.forEach((h) => {
      if (!h.isCustom) return; // Do NOT count unwritten hours!
      const c = (h.category || "").toLowerCase();
      if (c.includes("sleep") || c.includes("rest")) restH++;
      else if (c.includes("vitality") || c.includes("habit")) vitalityH++;
      else if (c.includes("sync") || c.includes("meeting")) syncH++;
      else if (c.includes("renewal") || c.includes("buffer")) renewalH++;
      else focusH++;
    });

    const plannedTotal = focusH + vitalityH + syncH + renewalH + restH;

    return { focusH, vitalityH, syncH, renewalH, restH, plannedTotal };
  }, [full24Hours]);

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

  const handleSaveBlock = async (data: {
    id?: string;
    title: string;
    category: string;
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
  };

  const handleDeleteBlock = async (id: string) => {
    await db.scheduleBlocks.delete(id);
    await loadBlocks(selectedDate);
    syncCurrentScheduleToNative();
  };

  /**
   * Category styling for one hour block.
   *
   * Every value carries an explicit light and dark pair. The previous values
   * were dark-only: `bg-indigo-950/20` over a near-white page renders as a
   * muddy grey with no category identity, and `text-indigo-400` / `400` shades
   * fail contrast on white. Light mode therefore gets a real tint from the
   * 50-scale and the 600-scale text shade; the dark values are preserved
   * verbatim behind `dark:` so dark mode is unchanged.
   */
  const getCatStyle = (cat: string, isCustom: boolean) => {
    if (!isCustom || !cat) {
      return {
        label: "Open Slot",
        Icon: Clock,
        color: "text-on-surface-variant/60 dark:text-on-surface-variant/40",
        badgeBg:
          "bg-surface-container-lowest border border-outline/20 text-on-surface-variant/60 dark:border-outline/[0.06] dark:text-on-surface-variant/40",
        cardBorder:
          "border-dashed border-outline/25 hover:border-primary/50 dark:border-outline/[0.08] dark:hover:border-primary/40",
        cardBg: "bg-surface-container-low/70 hover:bg-surface-container-low dark:bg-surface-container-low/40 dark:hover:bg-surface-container-low/70",
        leftBorder: "border-l-transparent",
        accentGlow: "",
      };
    }
    const c = cat.toLowerCase();
    if (c.includes("sleep") || c.includes("rest")) {
      return {
        label: "Rest & Sleep",
        Icon: Moon,
        color: "text-indigo-600 dark:text-indigo-400",
        badgeBg:
          "bg-indigo-500/15 border border-indigo-500/35 text-indigo-600 dark:border-indigo-500/30 dark:text-indigo-400",
        cardBorder:
          "border-indigo-500/30 hover:border-indigo-500/60 dark:border-indigo-500/25 dark:hover:border-indigo-500/50",
        cardBg:
          "bg-indigo-50/70 hover:bg-indigo-50 dark:bg-indigo-950/20 dark:hover:bg-indigo-950/30",
        leftBorder: "border-l-indigo-500",
        accentGlow: "shadow-[0_0_16px_rgba(99,102,241,0.15)]",
      };
    }
    if (c.includes("vitality") || c.includes("habit") || c.includes("health")) {
      return {
        label: "Vitality",
        Icon: Heart,
        color: "text-emerald-600 dark:text-emerald-400",
        badgeBg:
          "bg-emerald-500/15 border border-emerald-500/35 text-emerald-600 dark:border-emerald-500/30 dark:text-emerald-400",
        cardBorder:
          "border-emerald-500/30 hover:border-emerald-500/60 dark:border-emerald-500/25 dark:hover:border-emerald-500/50",
        cardBg:
          "bg-emerald-50/70 hover:bg-emerald-50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/30",
        leftBorder: "border-l-emerald-500",
        accentGlow: "shadow-[0_0_16px_rgba(52,211,153,0.15)]",
      };
    }
    if (c.includes("sync") || c.includes("meeting") || c.includes("social")) {
      return {
        label: "Active Sync",
        Icon: MessageSquare,
        color: "text-sky-600 dark:text-sky-400",
        badgeBg:
          "bg-sky-500/15 border border-sky-500/35 text-sky-600 dark:border-sky-500/30 dark:text-sky-400",
        cardBorder:
          "border-sky-500/30 hover:border-sky-500/60 dark:border-sky-500/25 dark:hover:border-sky-500/50",
        cardBg:
          "bg-sky-50/70 hover:bg-sky-50 dark:bg-sky-950/20 dark:hover:bg-sky-950/30",
        leftBorder: "border-l-sky-500",
        accentGlow: "shadow-[0_0_16px_rgba(56,189,248,0.15)]",
      };
    }
    if (c.includes("renewal") || c.includes("buffer") || c.includes("leisure")) {
      return {
        label: "Renewal",
        Icon: Coffee,
        color: "text-amber-700 dark:text-amber-400",
        badgeBg:
          "bg-amber-500/15 border border-amber-500/40 text-amber-700 dark:border-amber-500/30 dark:text-amber-400",
        cardBorder:
          "border-amber-500/35 hover:border-amber-500/65 dark:border-amber-500/25 dark:hover:border-amber-500/50",
        cardBg:
          "bg-amber-50/70 hover:bg-amber-50 dark:bg-amber-950/20 dark:hover:bg-amber-950/30",
        leftBorder: "border-l-amber-500",
        accentGlow: "shadow-[0_0_16px_rgba(251,191,36,0.15)]",
      };
    }
    return {
      label: "Deep Focus",
      Icon: Brain,
      color: "text-primary",
      badgeBg: "bg-primary/15 border border-primary/30 text-primary",
      cardBorder:
        "border-primary/35 hover:border-primary/60 dark:border-primary/25 dark:hover:border-primary/50",
      // `bg-background/80` sat almost exactly on the page colour in light mode,
      // so the Deep Focus block had no identity at all. A primary wash at 5%
      // gives it the same weight as the other categories without the heavy fill.
      cardBg:
        "bg-primary/5 hover:bg-primary/10 dark:bg-background/80 dark:hover:bg-background/90",
      leftBorder: "border-l-primary",
      accentGlow: "shadow-[0_0_16px_rgba(108,0,255,0.15)]",
    };
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
    const cat = getCatStyle(slot.category, slot.isCustom);
    const CatIcon = cat.Icon;

    const handleSlotClick = (e: React.MouseEvent) => {
      if (isPastHour) {
        if (isLongPressTriggeredRef.current) {
          isLongPressTriggeredRef.current = false;
          return;
        }
        showHint("Tap & hold to edit past hours");
        return;
      }
      handleOpenHour(slot.hour, slot.block, slot.hour + 1);
    };

    const handleTouchStart = () => {
      if (!isPastHour) return;
      isLongPressTriggeredRef.current = false;
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = setTimeout(() => {
        isLongPressTriggeredRef.current = true;
        if (typeof window !== "undefined" && window.getSelection) {
          try {
            window.getSelection()?.removeAllRanges();
          } catch (e) { logWarn("page", "could not clear text selection", e); }
        }
        try {
          if (typeof window !== "undefined" && navigator?.vibrate) {
            navigator.vibrate(40);
          }
        } catch (e) { logWarn("page", "browser call failed: window.getSelection", e); }
        handleOpenHour(slot.hour, slot.block, slot.hour + 1);
      }, 450);
    };

    const handleTouchMove = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };

    const handleTouchEnd = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };

    const handleMouseDown = () => {
      if (!isPastHour) return;
      isLongPressTriggeredRef.current = false;
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = setTimeout(() => {
        isLongPressTriggeredRef.current = true;
        if (typeof window !== "undefined" && window.getSelection) {
          try {
            window.getSelection()?.removeAllRanges();
          } catch (e) { logWarn("page", "could not clear text selection", e); }
        }
        handleOpenHour(slot.hour, slot.block, slot.hour + 1);
      }, 450);
    };

    const handleMouseUp = () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    };

    if (slot.isCustom) {
      return (
        <div
          key={`slot-${slot.hour}`}
          onClick={handleSlotClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onTouchCancel={handleTouchEnd}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onContextMenu={(e) => e.preventDefault()}
          className={`group relative flex items-center gap-3 p-3 rounded-2xl cursor-pointer select-none transition-all duration-200 active:scale-[0.99] border border-l-4 ${cat.leftBorder} ${cat.cardBorder} ${
            // A card sitting inside a category group must read as a layer above the
            // group container, so it uses a near-white plate in light mode. Dark
            // mode keeps the original raised-surface treatment.
            options?.isInsideGroup
              ? "bg-surface-container-lowest/80 hover:bg-surface-container-lowest dark:bg-surface-container-high/60 dark:hover:bg-surface-container-high"
              : cat.cardBg
          } backdrop-blur-xl my-1 shadow-sm ${
            isRecentlySaved
              ? "ring-2 ring-primary border-primary shadow-[0_0_24px_rgba(108,0,255,0.35)] scale-[1.01] bg-surface-container-low relative z-20"
              : isCurrent
              ? "ring-2 ring-primary border-primary shadow-[0_0_24px_rgba(108,0,255,0.22)] bg-surface-container-low relative z-20"
              : ""
          }`}
        >
          {/* Structured Left Spine Time Stamp */}
          <div className="flex flex-col items-center justify-center shrink-0 w-14 text-center">
            <span className={`text-xs font-mono font-bold leading-tight ${isCurrent ? "text-primary font-extrabold" : "text-on-surface"}`}>
              {String(slot.hour).padStart(2, "0")}:00
            </span>
            <span className="text-[10px] font-mono text-on-surface-variant/60 leading-tight">
              {String((slot.hour + 1) % 24 === 0 ? 24 : slot.hour + 1).padStart(2, "0")}:00
            </span>
            
            {/* Regain Live Focus Beacon / Radar Indicator */}
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

          {/* Structured Node Glyph on Rail */}
          <div className="relative shrink-0">
            {isCurrent && (
              <span className="absolute -inset-1 rounded-2xl bg-primary/20 animate-pulse pointer-events-none" />
            )}
            <div className={`relative w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${cat.badgeBg} shadow-inner`}>
              <CatIcon className="w-4 h-4" />
            </div>
          </div>

          {/* Title & Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className={`text-sm font-semibold truncate ${isCurrent ? "text-on-surface font-bold" : "text-on-surface"}`}>
                {slot.title || cat.label}
              </h4>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-mono">
              <span className={`font-semibold ${cat.color}`}>{cat.label}</span>
              {slot.block?.description && (
                <>
                  <span className="text-on-surface-variant/30">•</span>
                  <span className="text-on-surface-variant truncate">
                    {slot.block.description}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Right Status: 3-State Toggle & Expand Chevron */}
          <div className="flex items-center gap-1 shrink-0">
            {options?.expandToggle && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  options.expandToggle!.onToggle();
                }}
                aria-label={options.expandToggle.isExpanded ? "Collapse sleep hours" : "Expand sleep hours"}
                title={options.expandToggle.isExpanded ? "Collapse sleep hours" : "Expand sleep hours"}
                className="w-7 h-7 rounded-full bg-indigo-500/15 hover:bg-indigo-500/30 border border-indigo-500/30 flex items-center justify-center text-indigo-600 hover:text-on-surface dark:border-indigo-500/25 dark:text-indigo-300 transition-all cursor-pointer"
              >
                {options.expandToggle.isExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>
            )}
            {slot.status === "completed" ? (
              <button
                type="button"
                onClick={(e) => handleToggleBlockStatus(e, slot.hour, slot.block, slot.status)}
                title="Completed ✓ (tap to mark missed)"
                className="w-8 h-8 rounded-full flex items-center justify-center text-emerald-500 hover:bg-emerald-500/15 active:scale-95 transition-all cursor-pointer dark:text-emerald-400"
              >
                <CheckCircle2 className="w-5 h-5 shadow-[0_0_12px_rgba(52,211,153,0.4)]" />
              </button>
            ) : slot.status === "missed" ? (
              <button
                type="button"
                onClick={(e) => handleToggleBlockStatus(e, slot.hour, slot.block, slot.status)}
                title="Missed ✕ (tap to reset to unreviewed)"
                className="w-8 h-8 rounded-full flex items-center justify-center text-rose-500 hover:bg-rose-500/15 active:scale-95 transition-all cursor-pointer dark:text-rose-400"
              >
                <XCircle className="w-5 h-5 shadow-[0_0_12px_rgba(244,63,94,0.4)]" />
              </button>
            ) : isFutureHour ? (
              <button
                type="button"
                onClick={(e) => handleToggleBlockStatus(e, slot.hour, slot.block, slot.status)}
                title={selectedDate > todayStr ? "Future day (cannot review yet)" : "Future hour (cannot review yet)"}
                className="w-7 h-7 rounded-full border border-outline/[0.08] text-on-surface-variant/20 flex items-center justify-center opacity-30 cursor-not-allowed"
              >
                <Circle className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => handleToggleBlockStatus(e, slot.hour, slot.block, slot.status)}
                title="Unreviewed (tap to mark completed)"
                className="w-7 h-7 rounded-full border border-outline/25 hover:border-emerald-500 hover:text-emerald-600 text-on-surface-variant/50 flex items-center justify-center transition-colors cursor-pointer dark:border-outline/20 dark:hover:border-emerald-400 dark:hover:text-emerald-400 dark:text-on-surface-variant/40"
              >
                <Circle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      );
    }

    // Open / Unscheduled Slot - Structured Minimalist Clean State
    return (
      <div
        key={`slot-${slot.hour}`}
        onClick={handleSlotClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onContextMenu={(e) => e.preventDefault()}
        className={`group relative flex items-center gap-3 p-3 rounded-2xl cursor-pointer select-none transition-all duration-200 active:scale-[0.99] border ${cat.cardBorder} ${cat.cardBg} backdrop-blur-md my-0.5 ${
          isRecentlySaved
            ? "ring-2 ring-primary border-primary shadow-[0_0_24px_rgba(108,0,255,0.35)] scale-[1.01] bg-surface-container-low relative z-20"
            : isCurrent
            ? "ring-2 ring-primary border-primary shadow-[0_0_24px_rgba(108,0,255,0.22)] bg-surface-container-low relative z-20"
            : ""
        }`}
      >
        <div className="flex flex-col items-center justify-center shrink-0 w-14 text-center">
          <span className={`text-xs font-mono font-bold leading-tight ${isCurrent ? "text-primary font-bold" : "text-on-surface-variant/50"}`}>
            {String(slot.hour).padStart(2, "0")}:00
          </span>
          {isCurrent && (
            <div className="flex items-center gap-1 mt-1 px-1.5 py-0.2 rounded-full bg-primary/20 border border-primary/40 text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
              <span className="text-[8px] font-mono font-extrabold tracking-wider">LIVE</span>
            </div>
          )}
        </div>

        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${cat.badgeBg}`}>
          <CatIcon className="w-4 h-4" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-mono text-on-surface-variant/40 italic">
            {isPastHour ? "Passed Slot" : "Empty Slot"}
          </h4>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[10px] font-mono text-on-surface-variant/35">
              {isPastHour ? "Hold to schedule past" : "Tap to schedule focus"}
            </span>
          </div>
        </div>

        {/* The "Unstructured Inbox / Backlog" trigger bar lived here, together
            with the selected-date label beside it. Both were removed in P0 to
            cut chrome off the planner.

            The inbox is NOT cancelled -- it is recorded as a Phase 2 item in
            DEVELOPMENT_PLAN.md ("Unstructured Inbox / Backlog", IDs HD16, M17)
            and re-homed there. Its component still exists at
            components/planner/inbox-drawer.tsx and its `inboxItems` table is
            still in lib/db.ts, so re-adding it is a mount point, not a rebuild. */}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-xl mx-auto px-4 pb-20 pt-2 space-y-4">

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
          className="p-3.5 rounded-2xl bg-surface-container-low/90 backdrop-blur-xl border border-outline/[0.08] hover:border-primary/40 active:scale-[0.99] transition-all cursor-pointer space-y-2.5 group shadow-sm"
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

          {/* Proportional Balance Bar */}
          <div suppressHydrationWarning className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden flex gap-0.5">
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
        </div>

        </div>

      {/* 24-Hour Chrono Stream Timeline - Structured Vertical Rail */}
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
          const cat = getCatStyle(group.category, group.isCustom);
          const CatIcon = cat.Icon;

          // 1. Multiple Sleep Hours: Minimized to 1st hour by default with top-right arrow toggle
          if (isSleep && group.hours.length > 1) {
            return (
              <div
                key={group.id}
                // Same palette as every other category group. This branch used
                // to hardcode `bg-indigo-950/20`, which is a dark navy at 20%
                // and reads as a flat grey plate over a light page.
                className={`rounded-3xl border ${cat.cardBorder} ${cat.cardBg} backdrop-blur-xl p-2 my-1 space-y-1 shadow-sm transition-all duration-300 ${
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
                className={`rounded-3xl border ${cat.cardBorder} ${cat.cardBg} backdrop-blur-xl p-2 my-1 space-y-1 shadow-sm transition-all duration-300 ${
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
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-surface-container-low/95 border border-primary/50 text-on-surface shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-md">
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
          <div className="px-4 py-2 rounded-full bg-surface-container-highest/95 border border-outline/25 text-on-surface text-xs font-mono font-medium shadow-xl backdrop-blur-md flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>{hintToast}</span>
          </div>
        </div>
      )}
    </div>
  );
}
