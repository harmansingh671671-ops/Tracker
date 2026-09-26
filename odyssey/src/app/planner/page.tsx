"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useUserStore } from "@/lib/stores/user-store";
import { useScheduleStore } from "@/lib/stores/schedule-store";
import { useHabitStore } from "@/lib/stores/habit-store";
import { db, type ScheduleBlock } from "@/lib/db";
import { getJourneyDayNumber, getDateForJourneyDay } from "@/lib/utils/journey";
import { syncCurrentScheduleToNative } from "@/lib/utils/android-bridge";
import { EditHourModal } from "@/components/planner/edit-hour-modal";
import { DistributionModal } from "@/components/planner/distribution-modal";
import { InfiniteDateStrip } from "@/components/planner/infinite-date-strip";
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
} from "lucide-react";

// Synchronous local cache helpers to ensure Frame-0 instant rendering without flashes
const getCachedBlocks = (dateStr: string): ScheduleBlock[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(`odyssey_blocks_cache_${dateStr}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {}
  return [];
};

const setCachedBlocks = (dateStr: string, blocksList: ScheduleBlock[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(`odyssey_blocks_cache_${dateStr}`, JSON.stringify(blocksList));
  } catch {}
};

export default function PlannerPage() {
  const { user, fetchUser } = useUserStore();
  const { habits, fetchHabits } = useHabitStore();

  const getLocalDateStr = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const [currentHour, setCurrentHour] = useState<number>(() => new Date().getHours());
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const d = p.get("date");
      if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;

      try {
        const saved = localStorage.getItem("odyssey_planner_selected_date");
        if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) return saved;
      } catch {}
    }
    return getLocalDateStr();
  });
  const [todayStr, setTodayStr] = useState<string>(() => getLocalDateStr());

  // Frame-0 synchronous initial blocks load from cache
  const [blocks, setBlocks] = useState<ScheduleBlock[]>(() => {
    const initDate = (() => {
      if (typeof window !== "undefined") {
        const p = new URLSearchParams(window.location.search);
        const d = p.get("date");
        if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
        try {
          const saved = localStorage.getItem("odyssey_planner_selected_date");
          if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved)) return saved;
        } catch {}
      }
      return getLocalDateStr();
    })();
    return getCachedBlocks(initDate);
  });

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
    block: ScheduleBlock | null,
    currentStatus?: string
  ) => {
    e.stopPropagation();
    if (!block || !block.id) return;
    const isCompleted = currentStatus === "completed" || block.status === "completed";
    const nextStatus = isCompleted ? "missed" : "completed";
    await db.scheduleBlocks.update(block.id, {
      status: nextStatus,
    });
    await loadBlocks(selectedDate);
    syncCurrentScheduleToNative();
  };

  const toggleGroupExpand = (groupId: string, explicitState?: boolean) => {
    setExpandedGroupIds((prev) => ({
      ...prev,
      [groupId]: explicitState !== undefined ? explicitState : !prev[groupId],
    }));
  };

  // Persist selectedDate to localStorage whenever changed and keep ref updated
  const selectedDateRef = useRef(selectedDate);
  useEffect(() => {
    selectedDateRef.current = selectedDate;
    if (typeof window !== "undefined" && selectedDate) {
      try {
        localStorage.setItem("odyssey_planner_selected_date", selectedDate);
      } catch {}
    }
  }, [selectedDate]);

  // Consume incoming ?date= from Journey page or notifications on initial load
  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const d = p.get("date");
      if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
        setSelectedDate(d);
        try {
          localStorage.setItem("odyssey_planner_selected_date", d);
          // Clean URL so the query param doesn't lock future date switching
          window.history.replaceState(null, "", window.location.pathname);
        } catch {}
      }
    }
  }, []);

  // Restore previously opened date when app is reopened/resumed from minimized state
  useEffect(() => {
    const handleReopen = () => {
      if (document.visibilityState === "visible") {
        try {
          const saved = localStorage.getItem("odyssey_planner_selected_date");
          if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved) && saved !== selectedDateRef.current) {
            setSelectedDate(saved);
            const cached = getCachedBlocks(saved);
            if (cached.length > 0) setBlocks(cached);
          }
        } catch {}
      } else if (document.visibilityState === "hidden") {
        if (selectedDateRef.current) {
          try {
            localStorage.setItem("odyssey_planner_selected_date", selectedDateRef.current);
          } catch {}
        }
      }
    };

    document.addEventListener("visibilitychange", handleReopen);
    window.addEventListener("focus", handleReopen);

    return () => {
      document.removeEventListener("visibilitychange", handleReopen);
      window.removeEventListener("focus", handleReopen);
    };
  }, []);

  // Live timer for current minute, hour, and date change
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentHour(now.getHours());
      setTodayStr(getLocalDateStr(now));
    }, 15000);
    return () => clearInterval(timer);
  }, []);

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

  // Fetch user once on mount
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // Load habits and blocks cleanly on date change without double-firing on user object resolution
  useEffect(() => {
    fetchHabits(user?.id || "default", selectedDate);
    loadBlocks(selectedDate);
  }, [selectedDate, fetchHabits, loadBlocks]);

  const handleSelectDate = useCallback((dateStr: string) => {
    setSelectedDate(dateStr);
    try {
      localStorage.setItem("odyssey_planner_selected_date", dateStr);
      if (typeof window !== "undefined" && window.location.search) {
        window.history.replaceState(null, "", window.location.pathname);
      }
    } catch {}
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
        category: data.category as any,
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
        category: data.category as any,
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

  const getCatStyle = (cat: string, isCustom: boolean) => {
    if (!isCustom || !cat) {
      return {
        label: "Open Slot",
        Icon: Clock,
        color: "text-on-surface-variant/40",
        badgeBg: "bg-surface-container-lowest border-outline/10 text-on-surface-variant/40",
        cardBorder: "border-dashed border-outline/15 hover:border-primary/40",
        cardBg: "bg-surface-container-lowest/30 hover:bg-surface-container-lowest/70",
        accent: "border-outline/10",
      };
    }
    const c = cat.toLowerCase();
    if (c.includes("sleep") || c.includes("rest")) {
      return {
        label: "Rest & Sleep",
        Icon: Moon,
        color: "text-indigo-400",
        badgeBg: "bg-indigo-500/15 border-indigo-500/30 text-indigo-400",
        cardBorder: "border-indigo-500/35 hover:border-indigo-500/60",
        cardBg: "bg-indigo-950/25 hover:bg-indigo-950/35",
        accent: "border-indigo-500/40",
      };
    }
    if (c.includes("vitality") || c.includes("habit")) {
      return {
        label: "Vitality",
        Icon: Heart,
        color: "text-emerald-400",
        badgeBg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
        cardBorder: "border-emerald-500/35 hover:border-emerald-500/60",
        cardBg: "bg-emerald-950/25 hover:bg-emerald-950/35",
        accent: "border-emerald-500/40",
      };
    }
    if (c.includes("sync") || c.includes("meeting")) {
      return {
        label: "Active Sync",
        Icon: MessageSquare,
        color: "text-sky-400",
        badgeBg: "bg-sky-500/15 border-sky-500/30 text-sky-400",
        cardBorder: "border-sky-500/35 hover:border-sky-500/60",
        cardBg: "bg-sky-950/25 hover:bg-sky-950/35",
        accent: "border-sky-500/40",
      };
    }
    if (c.includes("renewal") || c.includes("buffer")) {
      return {
        label: "Renewal",
        Icon: Coffee,
        color: "text-amber-400",
        badgeBg: "bg-amber-500/15 border-amber-500/30 text-amber-400",
        cardBorder: "border-amber-500/35 hover:border-amber-500/60",
        cardBg: "bg-amber-950/25 hover:bg-amber-950/35",
        accent: "border-amber-500/40",
      };
    }
    return {
      label: "Deep Work",
      Icon: Brain,
      color: "text-primary",
      badgeBg: "bg-primary/15 border-primary/30 text-primary",
      cardBorder: "border-primary/35 hover:border-primary/60",
      cardBg: "bg-[#0d1d24] hover:bg-[#12252e]",
      accent: "border-primary/40",
    };
  };

  const renderHourSlot = (
    slot: (typeof full24Hours)[0],
    options?: { isInsideGroup?: boolean; groupType?: string }
  ) => {
    const isPastHour =
      selectedDate < todayStr ||
      (selectedDate === todayStr && slot.hour < currentHour);
    const isCurrent = isSelectedToday && currentHour === slot.hour;
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
        try {
          if (typeof window !== "undefined" && navigator?.vibrate) {
            navigator.vibrate(40);
          }
        } catch {}
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
          onContextMenu={(e) => { if (isPastHour) e.preventDefault(); }}
          className={`group flex items-center gap-3 p-3 rounded-2xl cursor-pointer select-none transition-all duration-300 active:scale-[0.99] border ${cat.cardBorder} ${
            options?.isInsideGroup ? "bg-surface-container-high/60 hover:bg-surface-container-high" : cat.cardBg
          } my-1 shadow-sm ${
            isRecentlySaved
              ? "ring-2 ring-primary border-primary shadow-[0_0_24px_rgba(90,240,179,0.35)] scale-[1.01] bg-[#172033] relative z-20"
              : isCurrent
              ? "ring-2 ring-primary border-primary shadow-[0_0_24px_rgba(90,240,179,0.22)] bg-[#172033] relative z-20"
              : ""
          }`}
        >
          {/* Time Indicator on Left */}
          <div className="flex flex-col items-center justify-center shrink-0 w-14 text-center">
            <span className={`text-xs font-mono font-bold ${isCurrent ? "text-primary font-extrabold" : "text-on-surface"}`}>
              {String(slot.hour).padStart(2, "0")}:00
            </span>
            <span className="text-[10px] font-mono text-on-surface-variant/60">
              {String((slot.hour + 1) % 24 === 0 ? 24 : slot.hour + 1).padStart(2, "0")}:00
            </span>
            {isRecentlySaved ? (
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-primary text-[#003825] font-bold mt-1 shadow-sm animate-pulse">
                SAVED
              </span>
            ) : isCurrent ? (
              <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-primary text-[#003825] font-bold mt-1 shadow-sm">
                NOW
              </span>
            ) : null}
          </div>

          {/* Category Icon */}
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${cat.badgeBg}`}>
            <CatIcon className="w-4 h-4" />
          </div>

          {/* Title & Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className={`text-sm font-semibold truncate ${isCurrent ? "text-white font-bold" : "text-on-surface"}`}>
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

          {/* Right Status: Tick / Cross for completed / missed hours */}
          <div className="flex items-center gap-2 shrink-0">
            {slot.status === "completed" ? (
              <button
                type="button"
                onClick={(e) => handleToggleBlockStatus(e, slot.block, slot.status)}
                title="Completed (tap to toggle)"
                className="w-8 h-8 rounded-full flex items-center justify-center text-emerald-400 hover:bg-emerald-500/10 transition-colors cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5" />
              </button>
            ) : slot.status === "missed" ? (
              <button
                type="button"
                onClick={(e) => handleToggleBlockStatus(e, slot.block, slot.status)}
                title="Missed (tap to toggle)"
                className="w-8 h-8 rounded-full flex items-center justify-center text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            ) : isPastHour ? (
              <button
                type="button"
                onClick={(e) => handleToggleBlockStatus(e, slot.block, slot.status)}
                title="Past hour (tap to mark completed)"
                className="w-8 h-8 rounded-full flex items-center justify-center text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={(e) => handleToggleBlockStatus(e, slot.block, slot.status)}
                title="Tap to mark completed"
                className="w-7 h-7 rounded-full border border-outline/30 hover:border-emerald-400 hover:text-emerald-400 text-on-surface-variant/40 flex items-center justify-center transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      );
    }

    // Open / Unscheduled Slot - Clean, no plus icon
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
        onContextMenu={(e) => { if (isPastHour) e.preventDefault(); }}
        className={`group flex items-center gap-3 p-3 rounded-2xl cursor-pointer select-none transition-all active:scale-[0.99] border ${cat.cardBorder} ${cat.cardBg} my-0.5 ${
          isRecentlySaved
            ? "ring-2 ring-primary border-primary shadow-[0_0_24px_rgba(90,240,179,0.35)] scale-[1.01] bg-[#172033] relative z-20"
            : isCurrent
            ? "ring-2 ring-primary border-primary shadow-[0_0_24px_rgba(90,240,179,0.22)] bg-[#172033] relative z-20"
            : ""
        }`}
      >
        <div className="flex flex-col items-center justify-center shrink-0 w-14 text-center">
          <span className={`text-xs font-mono font-bold ${isCurrent ? "text-primary" : "text-on-surface-variant/50"}`}>
            {String(slot.hour).padStart(2, "0")}:00
          </span>
          {isCurrent && (
            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-primary text-[#003825] font-bold mt-0.5 shadow-sm">
              NOW
            </span>
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
              {isPastHour ? "Hold to schedule past" : "Tap to schedule"}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-xl mx-auto px-4 pb-20 pt-2 space-y-4">

      {/* Infinite Horizontal Date Selector Strip with Sticky Today */}
      <InfiniteDateStrip
        selectedDate={selectedDate}
        onSelectDate={handleSelectDate}
        todayStr={todayStr}
      />

      {/* 24-Hour Category Distribution Box (Tappable for breakdown pop-up) */}
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
        className="p-3.5 rounded-2xl bg-surface-container-low border border-outline/10 hover:border-outline/25 active:scale-[0.99] transition-all cursor-pointer space-y-2.5 group"
      >
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-on-surface flex items-center gap-1.5 group-hover:text-primary transition-colors">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <span>Daily Schedule</span>
          </span>
          <div className="flex items-center gap-1 font-mono text-on-surface-variant text-[11px]">
            <span>Scheduled: {categoryStats.plannedTotal} Hours</span>
            <ChevronRight className="w-3.5 h-3.5 text-on-surface-variant/60 group-hover:text-primary transition-colors" />
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
      </div>

      {/* 24-Hour Chrono Stream Timeline - Grouping adjacent blocks of same type with minimized sleep */}
      <div className="flex flex-col space-y-1">
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

          // 1. Multiple Sleep Hours: Minimized to 1st hour by default with clean expand/collapse toggle
          if (isSleep && group.hours.length > 1) {
            return (
              <div
                key={group.id}
                className={`rounded-3xl border border-indigo-500/35 bg-indigo-950/20 p-2 my-1 space-y-1 shadow-sm transition-all duration-300 ${
                  isRecentlySaved ? "ring-2 ring-primary border-primary shadow-[0_0_24px_rgba(90,240,179,0.35)]" : ""
                }`}
              >
                {/* Render the 1st sleep hour slot */}
                {renderHourSlot(group.slots[0], { isInsideGroup: true, groupType: "sleep" })}

                {/* Minimized expand toggle */}
                {!isExpanded && (
                  <button
                    type="button"
                    onClick={() => toggleGroupExpand(group.id, true)}
                    className="w-full py-1.5 px-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none"
                  >
                    <Moon className="w-3.5 h-3.5 text-indigo-400" />
                    <span>
                      +{group.hours.length - 1} more sleep hours ({String(group.slots[1].hour).padStart(2, "0")}:00 → {String(group.endHour).padStart(2, "0")}:00)
                    </span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Expanded state: render remaining sleep slots and collapse toggle */}
                {isExpanded && (
                  <>
                    {group.slots.slice(1).map((slot) =>
                      renderHourSlot(slot, { isInsideGroup: true, groupType: "sleep" })
                    )}
                    <button
                      type="button"
                      onClick={() => toggleGroupExpand(group.id, false)}
                      className="w-full py-1 px-3 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 text-indigo-300 text-[11px] font-mono flex items-center justify-center gap-1 transition-colors cursor-pointer select-none"
                    >
                      <span>Minimize sleep hours</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                  </>
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
                  isRecentlySaved ? "ring-2 ring-primary border-primary shadow-[0_0_24px_rgba(90,240,179,0.35)]" : ""
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
          <div className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-[#0a121e]/95 border border-primary/50 text-on-surface shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-md">
            <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center text-primary shrink-0 animate-pulse">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="text-xs font-mono">
              <span className="font-bold text-primary">Scheduled: </span>
              <span className="text-white font-semibold">{saveToast.title}</span>
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
