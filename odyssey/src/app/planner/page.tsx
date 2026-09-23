"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
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
  Plus,
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

  const toggleGroupExpand = (groupId: string) => {
    setExpandedGroupIds((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // Persist selectedDate to localStorage whenever changed
  useEffect(() => {
    if (typeof window !== "undefined" && selectedDate) {
      try {
        localStorage.setItem("odyssey_planner_selected_date", selectedDate);
      } catch {}
    }
  }, [selectedDate]);

  // Restore previously opened date when app is reopened/resumed from minimized state
  useEffect(() => {
    const handleReopen = () => {
      if (document.visibilityState === "visible") {
        try {
          const saved = localStorage.getItem("odyssey_planner_selected_date");
          if (saved && /^\d{4}-\d{2}-\d{2}$/.test(saved) && saved !== selectedDate) {
            setSelectedDate(saved);
            const cached = getCachedBlocks(saved);
            if (cached.length > 0) setBlocks(cached);
          }
        } catch {}
      } else if (document.visibilityState === "hidden") {
        if (selectedDate) {
          try {
            localStorage.setItem("odyssey_planner_selected_date", selectedDate);
          } catch {}
        }
      }
    };

    document.addEventListener("visibilitychange", handleReopen);
    window.addEventListener("focus", handleReopen);

    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const d = p.get("date");
      if (d && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
        setSelectedDate(d);
      }
    }

    return () => {
      document.removeEventListener("visibilitychange", handleReopen);
      window.removeEventListener("focus", handleReopen);
    };
  }, [selectedDate]);

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
        Icon: Plus,
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
          const isCurrent =
            isSelectedToday &&
            currentHour >= group.startHour &&
            currentHour < group.endHour;
          const isSleep = group.type === "sleep";
          const isExpanded = !!expandedGroupIds[group.id];
          const cat = getCatStyle(group.category, group.isCustom);
          const CatIcon = cat.Icon;
          const isMultiHour = group.hours.length > 1;

          // Default Minimized Sleep Group
          if (isSleep && !isExpanded) {
            return (
              <div
                key={group.id}
                onClick={() => toggleGroupExpand(group.id)}
                className={`group flex items-center justify-between p-3 rounded-2xl bg-[#0a0f1d]/90 border border-indigo-500/25 hover:border-indigo-500/45 transition-all cursor-pointer shadow-sm select-none my-0.5 ${
                  isCurrent
                    ? "ring-2 ring-primary border-primary shadow-[0_0_20px_rgba(90,240,179,0.2)] bg-[#11192e]"
                    : ""
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
                    <Moon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-on-surface">
                        {String(group.startHour).padStart(2, "0")}:00 → {String(group.endHour).padStart(2, "0")}:00
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 font-semibold border border-indigo-500/25">
                        {group.hours.length}h Sleep
                      </span>
                      {isCurrent && (
                        <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-primary text-[#003825] font-bold">
                          NOW
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-on-surface-variant/70 truncate mt-0.5">
                      {group.title || "Circadian Rest & Slumber"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenHour(group.startHour, group.primaryBlock, group.endHour);
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors cursor-pointer"
                  >
                    Edit
                  </button>
                  <div className="w-6 h-6 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant group-hover:text-primary transition-colors">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            );
          }

          // Expanded Sleep Group OR Unified Multi-Hour/Single Custom Group
          if (group.isCustom) {
            return (
              <div
                key={group.id}
                onClick={() => handleOpenHour(group.startHour, group.primaryBlock, group.endHour)}
                className={`group flex items-center gap-3 p-3.5 rounded-2xl cursor-pointer transition-all active:scale-[0.99] border ${cat.cardBorder} ${cat.cardBg} my-1 shadow-sm ${
                  isCurrent
                    ? "ring-2 ring-primary border-primary shadow-[0_0_24px_rgba(90,240,179,0.22)] bg-[#172033] relative z-20"
                    : ""
                }`}
              >
                {/* Time Indicator on Left */}
                <div className="flex flex-col items-center justify-center shrink-0 w-14 text-center">
                  <span className={`text-xs font-mono font-bold ${isCurrent ? "text-primary font-extrabold" : "text-on-surface"}`}>
                    {String(group.startHour).padStart(2, "0")}:00
                  </span>
                  {isMultiHour ? (
                    <>
                      <span className="text-[9px] font-mono text-on-surface-variant/40 leading-none my-0.5">↓</span>
                      <span className="text-[11px] font-mono font-semibold text-on-surface-variant/80">
                        {String(group.endHour).padStart(2, "0")}:00
                      </span>
                    </>
                  ) : null}
                  {isCurrent && (
                    <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-primary text-[#003825] font-bold mt-1 shadow-sm">
                      NOW
                    </span>
                  )}
                </div>

                {/* Category Icon */}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${cat.badgeBg}`}>
                  <CatIcon className="w-5 h-5" />
                </div>

                {/* Title & Group Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={`text-sm font-semibold truncate ${isCurrent ? "text-white font-bold" : "text-on-surface"}`}>
                      {group.title || cat.label}
                    </h4>
                    {isMultiHour && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface font-semibold border border-outline/10 shrink-0">
                        {group.hours.length} Hours
                      </span>
                    )}
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  </div>

                  {/* Subtext: Category and details */}
                  <div className="flex items-center gap-1.5 mt-0.5 text-[11px] font-mono">
                    <span className={`font-semibold ${cat.color}`}>{cat.label}</span>
                    {group.primaryBlock?.description && (
                      <>
                        <span className="text-on-surface-variant/30">•</span>
                        <span className="text-on-surface-variant truncate">
                          {group.primaryBlock.description}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Right Actions: Minimize (if expanded sleep) or Status Icon */}
                <div className="flex items-center gap-2 shrink-0">
                  {isSleep && isExpanded ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleGroupExpand(group.id);
                      }}
                      className="px-2 py-1 rounded-lg text-[10px] font-mono text-on-surface-variant hover:text-primary hover:bg-surface-container transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <span>Minimize</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                  ) : group.status === "completed" ? (
                    <div className="text-emerald-400">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  ) : (
                    <div className="text-on-surface-variant/30 group-hover:text-primary transition-colors">
                      <Plus className="w-4 h-4" />
                    </div>
                  )}
                </div>
              </div>
            );
          }

          // Open / Unscheduled Hour Slot
          return (
            <div
              key={group.id}
              onClick={() => handleOpenHour(group.startHour, null, group.endHour)}
              className={`group flex items-center gap-3 p-3 rounded-2xl cursor-pointer transition-all active:scale-[0.99] border ${cat.cardBorder} ${cat.cardBg} my-0.5 ${
                isCurrent
                  ? "ring-2 ring-primary border-primary shadow-[0_0_24px_rgba(90,240,179,0.22)] bg-[#172033] relative z-20"
                  : ""
              }`}
            >
              {/* Hour Time Indicator */}
              <div className="flex flex-col items-center justify-center shrink-0 w-14 text-center">
                <span className={`text-xs font-mono font-bold ${isCurrent ? "text-primary" : "text-on-surface-variant/50"}`}>
                  {String(group.startHour).padStart(2, "0")}:00
                </span>
                {isCurrent && (
                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded-full bg-primary text-[#003825] font-bold mt-0.5 shadow-sm">
                    NOW
                  </span>
                )}
              </div>

              {/* Status Dot / Category Icon */}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${cat.badgeBg}`}>
                <CatIcon className="w-4 h-4" />
              </div>

              {/* Title & Prompt */}
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-mono text-on-surface-variant/40 italic">
                  Empty Slot
                </h4>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] font-mono text-on-surface-variant/35 group-hover:text-primary transition-colors flex items-center gap-1">
                    + Tap to schedule
                  </span>
                </div>
              </div>

              <div className="shrink-0 text-on-surface-variant/20 group-hover:text-primary transition-colors">
                <Plus className="w-4 h-4" />
              </div>
            </div>
          );
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
    </div>
  );
}
