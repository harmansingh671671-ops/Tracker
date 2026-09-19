"use client";

import { useEffect, useState, useMemo } from "react";
import { createPortal } from "react-dom";
import { useUserStore } from "@/lib/stores/user-store";
import { useScheduleStore } from "@/lib/stores/schedule-store";
import { type ScheduleBlock } from "@/lib/db";
import {
  ArrowLeft,
  Calendar,
  Moon,
  Sparkles,
  Check,
  X,
  MoreVertical,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

type NormalizedCategory = "sleep" | "work" | "habits" | "buffer";

interface TimelineGroup {
  type: "group";
  id: string;
  category: NormalizedCategory;
  startTime: string;
  endTime: string;
  totalHours: number;
  blocks: ScheduleBlock[];
}

interface TimelineSingle {
  type: "single";
  id: string;
  block: ScheduleBlock;
}

interface TimelineEmpty {
  type: "empty";
  id: string;
  hour: number;
  startTime: string;
  endTime: string;
  timeRangeStr: string;
}

type TimelineItem = TimelineGroup | TimelineSingle | TimelineEmpty;

function normalizeCategory(category: string, title?: string): NormalizedCategory {
  const c = (category || "").toLowerCase();
  const t = (title || "").toLowerCase();
  if (c.includes("sleep") || c.includes("rest") || t.includes("sleep") || t.includes("slumber")) return "sleep";
  if (c.includes("work") || c.includes("study") || t.includes("study") || t.includes("deep work") || t.includes("focus")) return "work";
  if (c.includes("habit") || c.includes("health") || c.includes("vitality") || t.includes("gym") || t.includes("workout")) return "habits";
  return "buffer";
}

function formatCleanHourRange(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return "";
  const [sHStr] = startTime.split(":");
  const [eHStr] = endTime.split(":");
  const sH = parseInt(sHStr, 10);
  let eH = parseInt(eHStr, 10);

  if (endTime === "24:00" || (eH === 0 && sH > 0)) {
    eH = 24;
  }

  const startFmt = sH.toString().padStart(2, "0");
  const endFmt = eH.toString().padStart(2, "0");
  return `${startFmt}-${endFmt}`;
}

function parseHour(time: string): number {
  if (!time) return 0;
  return parseInt(time.split(":")[0], 10);
}

function getBlockEndHour(block: ScheduleBlock): number {
  if (!block.endTime) return 0;
  const h = parseInt(block.endTime.split(":")[0], 10);
  if (block.endTime === "24:00" || (h === 0 && parseHour(block.startTime) > 0)) return 24;
  return h;
}

interface JourneyDayScheduleProps {
  dateStr: string;
  dayNum: number;
  isToday: boolean;
  onBack: () => void;
  onScheduleUpdated: () => void;
}

export function JourneyDaySchedule({
  dateStr,
  dayNum,
  isToday,
  onBack,
  onScheduleUpdated,
}: JourneyDayScheduleProps) {
  const { user, addXp } = useUserStore();
  const {
    blocks,
    fetchBlocksForDate,
    updateBlock,
    addBlock,
    deleteBlock,
    autoFillSleep,
  } = useScheduleStore();

  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [autoFillLocked, setAutoFillLocked] = useState<boolean>(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editCategory, setEditCategory] = useState<NormalizedCategory>("work");
  const [editStatus, setEditStatus] = useState<"pending" | "completed" | "missed">("pending");

  // Inline Task Writer State for empty hours
  const [inlineTaskTitles, setInlineTaskTitles] = useState<Record<number, string>>({});
  const [inlineCategories, setInlineCategories] = useState<Record<number, NormalizedCategory>>({});

  // Group Collapses (Sleep collapsed by default)
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Client mount check for React Portal
  const [mounted, setMounted] = useState<boolean>(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent background scrolling while edit modal is open
  useEffect(() => {
    if (isEditModalOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = orig;
      };
    }
  }, [isEditModalOpen]);

  // Clock ticker for live and past hour evaluations
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 5000);
    return () => clearInterval(timer);
  }, []);

  const currentHourFloat = useMemo(() => {
    return (
      currentTime.getHours() +
      currentTime.getMinutes() / 60 +
      currentTime.getSeconds() / 3600
    );
  }, [currentTime]);

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const isDayPast = dateStr < todayStr;

  // Formatted date string
  const formattedDate = useMemo(() => {
    if (!dateStr) return "";
    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [dateStr]);

  // Load blocks on mount & when date changes
  useEffect(() => {
    if (user?.id) {
      fetchBlocksForDate(user.id, dateStr);
    }
  }, [user?.id, dateStr, fetchBlocksForDate]);

  // Map of hours occupied by blocks
  const hourBlockMap = useMemo(() => {
    const map: Record<number, ScheduleBlock> = {};
    for (const b of blocks) {
      const sH = parseInt(b.startTime.split(":")[0], 10);
      let eH = parseInt(b.endTime.split(":")[0], 10);
      if (b.endTime === "24:00" || (eH === 0 && sH > 0)) eH = 24;

      for (let h = sH; h < eH; h++) {
        map[h] = { ...b, id: `${b.id}-h${h}` };
      }
    }
    return map;
  }, [blocks]);

  // Total scheduled hours
  const scheduledHours = useMemo(() => {
    return Object.keys(hourBlockMap).length;
  }, [hourBlockMap]);

  // Calculate category distribution
  const { sleepHours, workHours, habitHours, bufferHours } = useMemo(() => {
    let s = 0,
      w = 0,
      h = 0,
      b = 0;
    for (let hr = 0; hr < 24; hr++) {
      const blk = hourBlockMap[hr];
      if (blk) {
        const cat = normalizeCategory(blk.category, blk.title);
        if (cat === "sleep") s++;
        else if (cat === "work") w++;
        else if (cat === "habits") h++;
        else b++;
      }
    }
    return { sleepHours: s, workHours: w, habitHours: h, bufferHours: b };
  }, [hourBlockMap]);

  const percentage = Math.round((scheduledHours / 24) * 100);

  // Group consecutive hours and pre-generate empty hours
  const timelineItems = useMemo<TimelineItem[]>(() => {
    const items: TimelineItem[] = [];
    let currentGroup: ScheduleBlock[] = [];
    let currentCat: NormalizedCategory | "" = "";

    const flushGroup = () => {
      if (currentGroup.length === 0) return;
      if (currentGroup.length >= 2) {
        const first = currentGroup[0];
        const last = currentGroup[currentGroup.length - 1];
        const cat = currentCat as NormalizedCategory;
        items.push({
          type: "group",
          id: `group-${cat}-${first.startTime}-${last.endTime}-${first.id}`,
          category: cat,
          startTime: first.startTime,
          endTime: last.endTime,
          totalHours: currentGroup.length,
          blocks: [...currentGroup],
        });
      } else {
        items.push({
          type: "single",
          id: currentGroup[0].id,
          block: currentGroup[0],
        });
      }
      currentGroup = [];
      currentCat = "";
    };

    for (let h = 0; h < 24; h++) {
      const block = hourBlockMap[h];

      if (block) {
        const cat = normalizeCategory(block.category, block.title);

        if (activeFilter !== "all" && activeFilter !== cat) {
          flushGroup();
          continue;
        }

        if (currentGroup.length === 0) {
          currentGroup.push(block);
          currentCat = cat;
        } else if (currentCat === cat) {
          currentGroup.push(block);
        } else {
          flushGroup();
          currentGroup.push(block);
          currentCat = cat;
        }
      } else {
        flushGroup();

        if (activeFilter === "all") {
          const sStr = `${h.toString().padStart(2, "0")}:00`;
          const nextH = h + 1;
          const eStr = nextH === 24 ? "24:00" : `${nextH.toString().padStart(2, "0")}:00`;
          items.push({
            type: "empty",
            id: `empty-hour-${h}`,
            hour: h,
            startTime: sStr,
            endTime: eStr,
            timeRangeStr: formatCleanHourRange(sStr, eStr),
          });
        }
      }
    }
    flushGroup();

    return items;
  }, [hourBlockMap, activeFilter]);

  const toggleGroupCollapse = (groupId: string, defaultCollapsed: boolean) => {
    setCollapsedGroups((prev) => {
      const current = prev[groupId] !== undefined ? prev[groupId] : defaultCollapsed;
      return { ...prev, [groupId]: !current };
    });
  };

  // Focus next available unwritten hour input
  const focusNextHourInput = (currentH: number) => {
    let nextTargetH = -1;
    for (let h = currentH + 1; h < 24; h++) {
      if (document.getElementById(`journey-hour-input-${h}`)) {
        nextTargetH = h;
        break;
      }
    }
    if (nextTargetH === -1) {
      for (let h = 0; h < currentH; h++) {
        if (document.getElementById(`journey-hour-input-${h}`)) {
          nextTargetH = h;
          break;
        }
      }
    }

    if (nextTargetH !== -1) {
      const el = document.getElementById(`journey-hour-input-${nextTargetH}`) as HTMLInputElement | null;
      if (el) {
        el.focus();
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  // Save an inline unassigned hour directly & advance to next hour
  const handleSaveInlineHour = async (h: number, focusNext: boolean = true) => {
    const title = (inlineTaskTitles[h] || "").trim();
    if (!title || !user) return;

    const cat = inlineCategories[h] || "work";
    const startStr = `${h.toString().padStart(2, "0")}:00`;
    const nextH = h + 1;
    const endStr = nextH === 24 ? "24:00" : `${nextH.toString().padStart(2, "0")}:00`;

    if (focusNext) {
      setTimeout(() => focusNextHourInput(h), 50);
    }

    await addBlock({
      userId: user.id,
      date: dateStr,
      startTime: startStr,
      endTime: endStr,
      title,
      category: cat,
      tag:
        cat === "work"
          ? "Deep Work"
          : cat === "habits"
          ? "Vitality"
          : cat === "sleep"
          ? "Rest"
          : "Buffer",
      status: "pending",
      isCommitted: true,
    });

    setInlineTaskTitles((prev) => {
      const copy = { ...prev };
      delete copy[h];
      return copy;
    });

    await fetchBlocksForDate(user.id, dateStr);
    onScheduleUpdated();

    if (focusNext) {
      setTimeout(() => focusNextHourInput(h), 120);
    }
  };

  // Autofill sleep
  const handleAutoFillSleep = async () => {
    if (!user) return;
    await autoFillSleep(user.id, dateStr);
    setAutoFillLocked(true);
    await fetchBlocksForDate(user.id, dateStr);
    onScheduleUpdated();
    setTimeout(() => setAutoFillLocked(false), 2000);
  };

  // Clear day
  const handleClearDay = async () => {
    if (!user || blocks.length === 0) return;
    if (!confirm(`Are you sure you want to clear all scheduled hours for ${formattedDate}?`)) return;
    const uniqueIds = Array.from(new Set(blocks.map((b) => b.id.split("-h")[0])));
    for (const id of uniqueIds) {
      await deleteBlock(id);
    }
    await fetchBlocksForDate(user.id, dateStr);
    onScheduleUpdated();
  };

  // Mark Followed / Missed
  const handleMarkFollowed = async (block: ScheduleBlock, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const actualId = block.id.split("-h")[0];
    const newStatus = block.status === "completed" ? "pending" : "completed";
    await updateBlock(actualId, {
      status: newStatus,
      completedAt: newStatus === "completed" ? new Date().toISOString() : undefined,
    });
    if (newStatus === "completed") {
      addXp(25);
    }
    await fetchBlocksForDate(user!.id, dateStr);
    onScheduleUpdated();
  };

  const handleMarkMissed = async (block: ScheduleBlock, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const actualId = block.id.split("-h")[0];
    const newStatus = block.status === "missed" ? "pending" : "missed";
    await updateBlock(actualId, {
      status: newStatus,
      missReason: newStatus === "missed" ? "Did not follow" : undefined,
    });
    await fetchBlocksForDate(user!.id, dateStr);
    onScheduleUpdated();
  };

  // Edit modal handlers
  const handleOpenEditModal = (block: ScheduleBlock, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const actualId = block.id.split("-h")[0];
    const originalBlock = blocks.find((b) => b.id === actualId) || block;
    setEditingBlockId(actualId);
    setEditTitle(originalBlock.title);
    setEditDesc(originalBlock.description || "");
    setEditCategory(normalizeCategory(originalBlock.category, originalBlock.title));
    setEditStatus((originalBlock.status as "pending" | "completed" | "missed") || "pending");
    setIsEditModalOpen(true);
  };

  const handleSaveEditModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBlockId || !editTitle.trim() || !user) return;

    await updateBlock(editingBlockId, {
      title: editTitle.trim(),
      description: editDesc.trim() || undefined,
      category: editCategory,
      status: editStatus,
      completedAt: editStatus === "completed" ? new Date().toISOString() : undefined,
      missReason: editStatus === "missed" ? "Did not follow" : undefined,
      tag:
        editCategory === "work"
          ? "Deep Work"
          : editCategory === "habits"
          ? "Vitality"
          : editCategory === "sleep"
          ? "Rest"
          : "Break",
    });

    setIsEditModalOpen(false);
    setEditingBlockId(null);
    await fetchBlocksForDate(user.id, dateStr);
    onScheduleUpdated();
  };

  const handleDeleteFromEditModal = async () => {
    if (!editingBlockId || !user) return;
    await deleteBlock(editingBlockId);
    setIsEditModalOpen(false);
    setEditingBlockId(null);
    await fetchBlocksForDate(user.id, dateStr);
    onScheduleUpdated();
  };

  const categoryConfig = {
    work: {
      label: "Deep Work & Study",
      headerIconColor: "text-primary",
      borderColor: "border-primary/40 hover:border-primary/60",
      cardBorder: "border-primary/20",
      cardHoverBorder: "hover:border-primary/40",
    },
    sleep: {
      label: "Sleep & Recovery",
      headerIconColor: "text-emerald-400",
      borderColor: "border-emerald-500/40 hover:border-emerald-500/60",
      cardBorder: "border-emerald-500/20",
      cardHoverBorder: "hover:border-emerald-500/40",
    },
    habits: {
      label: "Habits & Vitality",
      headerIconColor: "text-tertiary",
      borderColor: "border-tertiary/40 hover:border-tertiary/60",
      cardBorder: "border-tertiary/15",
      cardHoverBorder: "hover:border-tertiary/40",
    },
    buffer: {
      label: "Buffer & Breaks",
      headerIconColor: "text-on-surface-variant",
      borderColor: "border-surface-variant/50 hover:border-surface-variant/70",
      cardBorder: "border-surface-variant/20",
      cardHoverBorder: "hover:border-surface-variant/50",
    },
  };

  // Render an individual occupied hourly block card
  const renderHourlyCard = (
    block: ScheduleBlock,
    isInsideGroup: boolean,
    categoryKey?: NormalizedCategory
  ) => {
    const cat = categoryKey || normalizeCategory(block.category, block.title);
    const startH = parseHour(block.startTime);
    const endH = getBlockEndHour(block);
    const isLive = isToday && currentHourFloat >= startH && currentHourFloat < endH;
    const isPast = isDayPast || (isToday && currentHourFloat >= endH);
    const isFollowed = block.status === "completed";
    const isMissed = block.status === "missed";
    const timeRangeStr = formatCleanHourRange(block.startTime, block.endTime);
    const cfg = categoryConfig[cat];

    let catBadgeText = "Buffer";
    if (cat === "sleep") catBadgeText = "Sleep";
    else if (cat === "habits") catBadgeText = "Vitality";
    else if (cat === "work") catBadgeText = "Deep Work";

    const followBorderClass = isFollowed
      ? "border-emerald-500/40 bg-emerald-500/5 shadow-emerald-500/5"
      : isMissed
      ? "border-rose-500/40 bg-rose-500/5 shadow-rose-500/5"
      : "";

    if (isLive) {
      const totalMinutes = Math.max(1, (endH - startH) * 60);
      const elapsedMinutes = Math.max(
        0,
        Math.min(totalMinutes, (currentHourFloat - startH) * 60)
      );
      const remainingMinutes = Math.max(0, Math.round(totalMinutes - elapsedMinutes));

      return (
        <div
          key={block.id}
          className={`relative p-3 sm:p-3.5 rounded-xl bg-surface-container-high transition-all duration-300 overflow-hidden shadow-lg border border-primary/50 ${
            isInsideGroup ? "my-1" : ""
          }`}
        >
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-primary/15 blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-mono whitespace-nowrap overflow-hidden shrink-0">
              <span className="font-bold text-on-surface">{timeRangeStr}</span>
              {!isInsideGroup && (
                <>
                  <span className="text-on-surface-variant/40">•</span>
                  <span className="text-primary font-semibold">{catBadgeText}</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex items-center gap-1 bg-primary/20 px-2 py-0.5 rounded-md border border-primary/30">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                </span>
                <span className="text-[10px] font-mono text-primary font-bold tracking-wider">
                  LIVE NOW
                </span>
              </div>
              <button
                onClick={(e) => handleOpenEditModal(block, e)}
                className="w-5 h-5 rounded-md hover:bg-surface-bright text-on-surface-variant/50 hover:text-on-surface flex items-center justify-center transition-colors cursor-pointer"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>

          <h3 className="font-bold text-sm sm:text-base text-on-surface">{block.title}</h3>
          {block.description && (
            <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed line-clamp-2">
              {block.description}
            </p>
          )}

          <div className="flex items-center justify-between pt-1.5 mt-2 border-t border-primary/15 text-[11px] text-on-surface-variant">
            <span className="text-primary/90">Completes at {block.endTime}</span>
            <span className="font-mono text-primary font-bold">{remainingMinutes}m left</span>
          </div>
        </div>
      );
    }

    return (
      <div
        key={block.id}
        className={`transition-all duration-200 ${followBorderClass} ${
          isInsideGroup
            ? `p-2.5 sm:p-3 rounded-xl bg-surface-container/80 border ${followBorderClass || cfg.cardBorder} ${cfg.cardHoverBorder} hover:bg-surface-container shadow-xs`
            : `p-3 sm:p-3.5 rounded-2xl bg-surface-container-low border ${followBorderClass || "border-outline/15 hover:border-primary/30"} shadow-xs`
        }`}
      >
        <div className="flex items-center justify-between gap-1.5 mb-1">
          <div className="flex items-center gap-1.5 text-xs font-mono whitespace-nowrap overflow-hidden min-w-0">
            <span className="font-bold text-on-surface text-[12px]">{timeRangeStr}</span>
            {!isInsideGroup && (
              <>
                <span className="text-on-surface-variant/40">•</span>
                <span className={`font-semibold text-[11px] ${cfg.headerIconColor}`}>
                  {catBadgeText}
                </span>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {isPast && (
              <div className="flex items-center gap-0.5 bg-surface-container-high/90 p-0.5 rounded-lg border border-outline/15 shadow-xs">
                <button
                  type="button"
                  onClick={(e) => handleMarkFollowed(block, e)}
                  className={`h-5 sm:h-6 px-1.5 rounded flex items-center gap-1 text-[10px] sm:text-[11px] font-bold font-mono transition-all cursor-pointer ${
                    isFollowed
                      ? "bg-emerald-500 text-black shadow-xs"
                      : "text-on-surface-variant/70 hover:text-emerald-400 hover:bg-emerald-500/15"
                  }`}
                  title={isFollowed ? "Done (tap to undo)" : "Mark as Done (+25 XP)"}
                >
                  <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                  {isFollowed && <span>Done</span>}
                </button>
                <button
                  type="button"
                  onClick={(e) => handleMarkMissed(block, e)}
                  className={`h-5 sm:h-6 px-1.5 rounded flex items-center gap-1 text-[10px] sm:text-[11px] font-bold font-mono transition-all cursor-pointer ${
                    isMissed
                      ? "bg-rose-500 text-white shadow-xs"
                      : "text-on-surface-variant/70 hover:text-rose-400 hover:bg-rose-500/15"
                  }`}
                  title={isMissed ? "Missed (tap to undo)" : "Mark as Missed"}
                >
                  <X className="w-3.5 h-3.5 stroke-[2.5]" />
                  {isMissed && <span>Missed</span>}
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={(e) => handleOpenEditModal(block, e)}
              className="w-5 h-5 sm:w-6 sm:h-6 rounded-md hover:bg-surface-bright text-on-surface-variant/50 hover:text-on-surface flex items-center justify-center transition-colors cursor-pointer"
              title="Edit Hour Block"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div>
          <h4 className="font-semibold text-xs sm:text-sm leading-snug break-words text-on-surface">
            {block.title}
          </h4>
          {block.description && (
            <p className="text-[11px] sm:text-xs text-on-surface-variant mt-0.5 break-words line-clamp-2">
              {block.description}
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="view-transition min-h-screen bg-surface">
      <div className="flex flex-col w-full max-w-xl sm:max-w-2xl mx-auto px-3 sm:px-4 pb-28 space-y-3 touch-pan-y">
        {/* Top Back Navigation Bar */}
        <div className="pt-1">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-bright text-primary text-xs font-mono font-bold cursor-pointer transition-all active:scale-95 border border-outline/15 shadow-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Journey Trail</span>
          </button>
        </div>

        {/* Header Bar: Date Title & Actions */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 text-primary">
              <Calendar className="w-4 h-4 shrink-0" />
              <span className="text-[11px] uppercase tracking-wider font-semibold">
                {isToday ? "Today's Cadence" : `Day ${dayNum} Cadence Plan`}
              </span>
            </div>

            <h1 className="text-lg sm:text-xl text-on-surface font-bold tracking-tight mt-0.5">
              {formattedDate}
            </h1>
          </div>

          {/* Quick Header Actions: Auto-fill Sleep on top, Clear Day stacked below */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleAutoFillSleep}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full bg-surface-container-high text-secondary hover:bg-surface-bright active:scale-95 transition-all shadow-sm border border-secondary/20 shrink-0 text-xs font-semibold cursor-pointer"
              title="Auto-fill Sleep hours (23:00 - 07:00)"
            >
              {autoFillLocked ? (
                <>
                  <Check className="w-3.5 h-3.5 text-primary" />
                  <span className="text-primary font-semibold">Locked</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5" />
                  <span>Auto-fill Sleep</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleClearDay}
              disabled={blocks.length === 0}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-rose-400 bg-rose-500/10 hover:bg-rose-500/20 active:scale-95 disabled:opacity-30 disabled:pointer-events-none border border-rose-500/20 text-[11px] font-mono font-semibold transition-all shadow-xs cursor-pointer shrink-0"
              title="Clear all scheduled blocks for this day"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear Day</span>
            </button>
          </div>
        </div>

        {/* Planned Hours Gauge & Distribution Matrix */}
        <div className="flex flex-col p-3.5 sm:p-4 rounded-2xl bg-surface-container-low shadow-sm gap-2.5 border border-outline/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-on-surface">
                Cadence Completion
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-primary">
              {scheduledHours} / 24 hrs ({percentage}%)
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>

          <div className="grid grid-cols-4 gap-1.5 pt-1 text-center font-mono">
            <div className="p-1.5 rounded-lg bg-surface-container">
              <span className="text-[10px] text-emerald-400 block font-semibold">Sleep</span>
              <span className="text-xs font-bold text-on-surface">{sleepHours}h</span>
            </div>
            <div className="p-1.5 rounded-lg bg-surface-container">
              <span className="text-[10px] text-primary block font-semibold">Work</span>
              <span className="text-xs font-bold text-on-surface">{workHours}h</span>
            </div>
            <div className="p-1.5 rounded-lg bg-surface-container">
              <span className="text-[10px] text-purple-400 block font-semibold">Habits</span>
              <span className="text-xs font-bold text-on-surface">{habitHours}h</span>
            </div>
            <div className="p-1.5 rounded-lg bg-surface-container">
              <span className="text-[10px] text-amber-400 block font-semibold">Buffer</span>
              <span className="text-xs font-bold text-on-surface">{bufferHours}h</span>
            </div>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs font-medium">
          {["all", "sleep", "work", "habits", "buffer"].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              className={`px-3 py-1 rounded-full capitalize font-mono text-[11px] transition-colors shrink-0 cursor-pointer ${
                activeFilter === filter
                  ? "bg-primary text-on-primary font-bold shadow-xs"
                  : "bg-surface-container text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {filter === "all" ? "All 24 Hours" : filter}
            </button>
          ))}
        </div>

        {/* Full 24-Hour Already-Generated Chronological Timeline */}
        <div className="space-y-2 pt-1">
          {timelineItems.map((item) => {
            // Grouped Consecutive Hours Box
            if (item.type === "group") {
              const cfg = categoryConfig[item.category];
              const defaultCollapsed = item.category === "sleep";
              const isCollapsed =
                collapsedGroups[item.id] !== undefined
                  ? collapsedGroups[item.id]
                  : defaultCollapsed;
              const timeRange = formatCleanHourRange(item.startTime, item.endTime);

              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border ${cfg.borderColor} bg-surface-container-low overflow-hidden transition-all shadow-sm`}
                >
                  <div
                    onClick={() => toggleGroupCollapse(item.id, defaultCollapsed)}
                    className="p-3 sm:p-3.5 flex items-center justify-between gap-2 cursor-pointer select-none hover:bg-surface-container/60 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex flex-col min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs sm:text-sm font-bold text-on-surface">
                            {timeRange}
                          </span>
                          <span
                            className={`text-xs font-bold uppercase tracking-wider ${cfg.headerIconColor}`}
                          >
                            • {cfg.label}
                          </span>
                        </div>
                        <span className="text-[11px] text-on-surface-variant font-mono">
                          {item.totalHours} hours consecutive block
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="px-2 py-0.5 rounded-full bg-surface-container text-xs font-mono font-semibold text-on-surface-variant">
                        {item.totalHours}h
                      </span>
                      {isCollapsed ? (
                        <ChevronDown className="w-4 h-4 text-on-surface-variant" />
                      ) : (
                        <ChevronUp className="w-4 h-4 text-on-surface-variant" />
                      )}
                    </div>
                  </div>

                  {!isCollapsed && (
                    <div className="px-2.5 pb-2.5 space-y-1.5 border-t border-outline/10 pt-2">
                      {item.blocks.map((b) => renderHourlyCard(b, true, item.category))}
                    </div>
                  )}
                </div>
              );
            }

            // Standalone Occupied Hour Card
            if (item.type === "single") {
              return renderHourlyCard(item.block, false);
            }

            // Pre-Generated Empty Hour Slot (Full handsome card matching top cards)
            const h = item.hour;
            const currentTitle = inlineTaskTitles[h] || "";
            const currentCat = inlineCategories[h] || "work";
            const cfg = categoryConfig[currentCat];

            let catLabel = "Deep Work";
            if (currentCat === "sleep") catLabel = "Sleep";
            else if (currentCat === "habits") catLabel = "Vitality";
            else if (currentCat === "buffer") catLabel = "Buffer";

            return (
              <div
                key={item.id}
                className="p-3 sm:p-3.5 rounded-2xl bg-surface-container-low/80 border border-outline/15 hover:border-outline/35 transition-all shadow-xs space-y-2"
              >
                {/* Header Row: Time Range, Category Tag & Category Dropdown */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-mono whitespace-nowrap min-w-0">
                    <span className="font-bold text-on-surface text-[12px]">
                      {item.timeRangeStr}
                    </span>
                    <span className="text-on-surface-variant/40">•</span>
                    <span className={`font-semibold text-[11px] ${cfg.headerIconColor}`}>
                      {catLabel}
                    </span>
                  </div>

                  {/* Sleek Category Dropdown */}
                  <div className="relative flex items-center shrink-0">
                    <select
                      value={currentCat}
                      onChange={(e) =>
                        setInlineCategories((prev) => ({
                          ...prev,
                          [h]: e.target.value as NormalizedCategory,
                        }))
                      }
                      className="appearance-none bg-surface-container border border-outline/25 hover:border-primary/40 rounded-xl pl-2.5 pr-6 py-1 text-[11px] font-mono font-medium text-on-surface focus:outline-none focus:border-primary cursor-pointer transition-colors shadow-xs"
                    >
                      <option value="work">💼 Work / Study</option>
                      <option value="habits">⚡ Habits / Health</option>
                      <option value="sleep">🌙 Sleep & Rest</option>
                      <option value="buffer">☕ Buffer / Break</option>
                    </select>
                    <ChevronDown className="w-3 h-3 text-on-surface-variant pointer-events-none absolute right-1.5" />
                  </div>
                </div>

                {/* Main Task Input Box — Full width, comfortable typing */}
                <div className="relative w-full">
                  <input
                    id={`journey-hour-input-${h}`}
                    type="text"
                    placeholder={`Enter task for ${item.timeRangeStr}...`}
                    value={currentTitle}
                    onChange={(e) =>
                      setInlineTaskTitles((prev) => ({ ...prev, [h]: e.target.value }))
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSaveInlineHour(h, true);
                      }
                    }}
                    className="w-full bg-surface-container-high/70 border border-outline/20 focus:border-primary focus:bg-surface-container-high rounded-xl px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none transition-all"
                  />
                </div>

                {/* Footer Row: Status hint & Save Hour Button */}
                <div className="flex items-center justify-between pt-1 border-t border-outline/10 text-[11px]">
                  <span className="font-mono text-on-surface-variant/60">
                    1h unassigned slot
                  </span>

                  <button
                    type="button"
                    onClick={() => handleSaveInlineHour(h, true)}
                    disabled={!currentTitle.trim()}
                    className="px-3 py-1 rounded-xl bg-primary text-on-primary text-xs font-mono font-bold hover:bg-primary-fixed active:scale-95 disabled:opacity-25 disabled:pointer-events-none transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Save Hour</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit Modal for Blocks (Rendered via React Portal directly into document.body to avoid parent container transform/scroll clipping) */}
      {isEditModalOpen && mounted && createPortal(
        <div
          onClick={() => setIsEditModalOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm max-h-[90vh] overflow-y-auto bg-surface-container-high border border-outline/30 rounded-2xl p-4 shadow-2xl space-y-3 text-left"
          >
            <div className="flex items-center justify-between border-b border-outline/15 pb-2">
              <h3 className="text-sm font-bold text-on-surface">Edit Time Block</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditModal} className="space-y-2.5">
              <div>
                <label className="text-[11px] font-mono text-on-surface-variant block mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-surface-container-highest border border-outline/30 rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-on-surface-variant block mb-1">
                  Category
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as NormalizedCategory)}
                  className="w-full bg-surface-container-highest border border-outline/30 rounded-xl px-3 py-2 text-xs font-mono text-on-surface focus:outline-none focus:border-primary cursor-pointer"
                >
                  <option value="work">Deep Work & Study</option>
                  <option value="habits">Habits & Vitality</option>
                  <option value="buffer">Buffer & Breaks</option>
                  <option value="sleep">Sleep & Recovery</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-mono text-on-surface-variant block mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full bg-surface-container-highest border border-outline/30 rounded-xl px-3 py-2 text-xs text-on-surface focus:outline-none focus:border-primary resize-none h-16"
                  placeholder="Additional context or sub-tasks..."
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-on-surface-variant block mb-1">
                  Follow Status
                </label>
                <div className="grid grid-cols-3 gap-1.5 font-mono text-xs">
                  <button
                    type="button"
                    onClick={() => setEditStatus("pending")}
                    className={`py-1.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                      editStatus === "pending"
                        ? "bg-surface-bright border-primary text-primary font-bold shadow-xs"
                        : "bg-surface-container-highest border-outline/20 text-on-surface-variant/70 hover:text-on-surface"
                    }`}
                  >
                    Unmarked
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStatus("completed")}
                    className={`py-1.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                      editStatus === "completed"
                        ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 font-bold shadow-xs"
                        : "bg-surface-container-highest border-outline/20 text-on-surface-variant/70 hover:text-emerald-400"
                    }`}
                  >
                    Done
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditStatus("missed")}
                    className={`py-1.5 px-2 rounded-xl border text-center transition-all cursor-pointer ${
                      editStatus === "missed"
                        ? "bg-rose-500/20 border-rose-500 text-rose-400 font-bold shadow-xs"
                        : "bg-surface-container-highest border-outline/20 text-on-surface-variant/70 hover:text-rose-400"
                    }`}
                  >
                    Missed
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-outline/15">
                <button
                  type="button"
                  onClick={handleDeleteFromEditModal}
                  className="px-3 py-1.5 rounded-xl bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-3 py-1.5 rounded-xl bg-surface-container text-on-surface-variant text-xs font-bold hover:bg-surface-bright transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-fixed transition-all cursor-pointer shadow-sm"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
