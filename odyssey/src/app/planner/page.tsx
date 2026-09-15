"use client";

import { useEffect, useState, useMemo } from "react";
import { useUserStore } from "@/lib/stores/user-store";
import { useScheduleStore } from "@/lib/stores/schedule-store";
import { type ScheduleBlock } from "@/lib/db";

// Normalized category types
type NormalizedCategory = 'sleep' | 'work' | 'habits' | 'buffer';

interface TimelineGroup {
  type: 'group';
  id: string;
  category: NormalizedCategory;
  startTime: string;
  endTime: string;
  totalHours: number;
  blocks: ScheduleBlock[];
}

interface TimelineSingle {
  type: 'single';
  id: string;
  block: ScheduleBlock;
}

type TimelineItem = TimelineGroup | TimelineSingle;

function normalizeCategory(category: string, title?: string): NormalizedCategory {
  const c = (category || '').toLowerCase();
  const t = (title || '').toLowerCase();
  if (c.includes('sleep') || c.includes('rest') || t.includes('sleep') || t.includes('slumber')) return 'sleep';
  if (c.includes('work') || c.includes('study') || t.includes('study') || t.includes('deep work') || t.includes('focus')) return 'work';
  if (c.includes('habit') || c.includes('health') || c.includes('vitality') || t.includes('gym') || t.includes('workout')) return 'habits';
  return 'buffer';
}

function parseHour(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':');
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1] || '0', 10);
  return h + m / 60;
}

function getBlockEndHour(block: ScheduleBlock): number {
  const startH = parseHour(block.startTime);
  const endH = parseHour(block.endTime);
  if (endH === 0 && startH >= 20) return 24;
  if (block.endTime === '24:00') return 24;
  return endH;
}

// Clean time range formatter e.g. "10 – 11", "08 – 13", "00 – 07"
function formatCleanHourRange(startTime: string, endTime: string): string {
  if (!startTime || !endTime) return '';
  const [sHStr, sMStr] = startTime.split(':');
  const [eHStr, eMStr] = endTime.split(':');
  const sH = parseInt(sHStr, 10);
  const sM = parseInt(sMStr || '0', 10);
  let eH = parseInt(eHStr, 10);
  const eM = parseInt(eMStr || '0', 10);

  if (endTime === '24:00' || (eH === 0 && sH > 0)) {
    eH = 24;
  }

  // If both start and end have 0 minutes, format as clean integer hour range "10 – 11"
  if (sM === 0 && eM === 0) {
    const startFmt = sH.toString().padStart(2, '0');
    const endFmt = eH.toString().padStart(2, '0');
    return `${startFmt} – ${endFmt}`;
  }

  // Fallback for non-zero minutes
  return `${startTime} – ${endTime}`;
}

export default function PlannerPage() {
  const { user, fetchUser, addXp } = useUserStore();
  const { blocks, fetchBlocksForDate, updateBlock, addBlock, deleteBlock, autoFillSleep } = useScheduleStore();
  
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [autoFillLocked, setAutoFillLocked] = useState<boolean>(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  // Dynamic real-time clock synchronization with zero device load (ticks every 5 seconds)
  const [currentTime, setCurrentTime] = useState<Date>(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const currentHourFloat = useMemo(() => {
    return currentTime.getHours() + currentTime.getMinutes() / 60 + currentTime.getSeconds() / 3600;
  }, [currentTime]);
  
  // New Block Form State
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState<'sleep' | 'work' | 'habits' | 'buffer'>('work');
  const [newStartTime, setNewStartTime] = useState("10:00");
  const [newEndTime, setNewEndTime] = useState("11:00");

  // Real-time conflict detection with existing blocks in the selected time range
  const conflictingBlocks = useMemo(() => {
    if (!isAddModalOpen || !newStartTime || !newEndTime) return [];

    const startH = parseHour(newStartTime);
    let endH = parseHour(newEndTime);
    if (endH === 0 && startH > 0) endH = 24;
    if (newEndTime === '24:00') endH = 24;

    if (endH <= startH) return [];

    return blocks.filter((b) => {
      const bStart = parseHour(b.startTime);
      let bEnd = parseHour(b.endTime);
      if (bEnd === 0 && bStart > 0) bEnd = 24;
      if (b.endTime === '24:00') bEnd = 24;

      // Overlap condition: max(start1, start2) < min(end1, end2)
      return Math.max(startH, bStart) < Math.min(endH, bEnd);
    });
  }, [isAddModalOpen, newStartTime, newEndTime, blocks]);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const formattedDate = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    }) + " • Balanced Flow";
  }, []);

  useEffect(() => {
    fetchUser().then((u) => {
      if (u) {
        fetchBlocksForDate(u.id, today);
      }
    });
  }, [fetchUser, fetchBlocksForDate, today]);

  // Compute category hours strictly from DB blocks (starts from 0)
  const { sleepHours, workHours, habitHours, bufferHours, totalHours } = useMemo(() => {
    let sleep = 0, work = 0, habit = 0, buffer = 0;
    
    blocks.forEach((b) => {
      const start = parseInt(b.startTime.split(':')[0], 10);
      const end = parseInt(b.endTime.split(':')[0], 10);
      const normalizedEnd = (end === 0 && start > 0) ? 24 : end;
      const diff = normalizedEnd > start ? normalizedEnd - start : 1;
      
      const cat = normalizeCategory(b.category, b.title);
      if (cat === 'sleep') sleep += diff;
      else if (cat === 'work') work += diff;
      else if (cat === 'habits') habit += diff;
      else buffer += diff;
    });

    const total = Math.min(24, sleep + work + habit + buffer);
    return {
      sleepHours: sleep,
      workHours: work,
      habitHours: habit,
      bufferHours: buffer,
      totalHours: total,
    };
  }, [blocks]);

  const percentage = Math.round((totalHours / 24) * 100);

  // Determine current active hour for Live block
  const liveBlock = useMemo(() => {
    return blocks.find((b) => {
      const startH = parseHour(b.startTime);
      const endH = getBlockEndHour(b);
      return currentHourFloat >= startH && currentHourFloat < endH;
    }) || null;
  }, [blocks, currentHourFloat]);

  // Filter blocks
  const filteredBlocks = useMemo(() => {
    if (activeFilter === "all") return blocks;
    return blocks.filter((b) => {
      const cat = normalizeCategory(b.category, b.title);
      if (activeFilter === "sleep") return cat === "sleep";
      if (activeFilter === "work") return cat === "work";
      if (activeFilter === "habits") return cat === "habits";
      if (activeFilter === "buffer") return cat === "buffer";
      return true;
    });
  }, [blocks, activeFilter]);

  // Expand any multi-hour block into discrete 1-hour slots so each hour is individually represented
  const expandedBlocks = useMemo(() => {
    const result: ScheduleBlock[] = [];
    for (const b of filteredBlocks) {
      const startH = parseInt(b.startTime.split(':')[0], 10);
      const endH = parseInt(b.endTime.split(':')[0], 10);
      const normalizedEndH = (endH === 0 && startH > 0) ? 24 : (b.endTime === '24:00' ? 24 : endH);
      
      if (normalizedEndH - startH > 1) {
        for (let h = startH; h < normalizedEndH; h++) {
          const sStr = `${h.toString().padStart(2, '0')}:00`;
          const nextH = h + 1;
          const eStr = nextH === 24 ? '24:00' : `${nextH.toString().padStart(2, '0')}:00`;
          result.push({
            ...b,
            id: `${b.id}-h${h}`,
            startTime: sStr,
            endTime: eStr,
          });
        }
      } else {
        result.push(b);
      }
    }
    return result.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [filteredBlocks]);

  // Group consecutive hours of the same category
  // Rule: If 2 or more consecutive hours belong to same category -> Group Box
  // If only 1 hour alone -> Standalone card (no box)
  // Non-adjacent periods (e.g. 08-13 study, 13-14 break, 14-19 study) or (00-07 sleep and 22-24 sleep) form separate blocks
  const timelineItems = useMemo<TimelineItem[]>(() => {
    if (expandedBlocks.length === 0) return [];

    const items: TimelineItem[] = [];
    let currentGroup: ScheduleBlock[] = [];
    let currentCategory: NormalizedCategory | '' = '';

    const flushGroup = () => {
      if (currentGroup.length === 0) return;
      if (currentGroup.length >= 2) {
        const first = currentGroup[0];
        const last = currentGroup[currentGroup.length - 1];
        const cat = normalizeCategory(first.category, first.title);
        items.push({
          type: 'group',
          id: `group-${cat}-${first.startTime}-${last.endTime}-${first.id}`,
          category: cat,
          startTime: first.startTime,
          endTime: last.endTime,
          totalHours: currentGroup.length,
          blocks: [...currentGroup],
        });
      } else {
        items.push({
          type: 'single',
          id: currentGroup[0].id,
          block: currentGroup[0],
        });
      }
      currentGroup = [];
      currentCategory = '';
    };

    for (let i = 0; i < expandedBlocks.length; i++) {
      const block = expandedBlocks[i];
      const cat = normalizeCategory(block.category, block.title);

      if (currentGroup.length === 0) {
        currentGroup.push(block);
        currentCategory = cat;
      } else {
        const prevBlock = currentGroup[currentGroup.length - 1];
        const prevEndH = getBlockEndHour(prevBlock);
        const currStartH = parseHour(block.startTime);

        // Check if adjacent in time AND same category
        const isTimeAdjacent = Math.abs(prevEndH - currStartH) < 0.05;
        const isSameCategory = cat === currentCategory;

        if (isTimeAdjacent && isSameCategory) {
          currentGroup.push(block);
        } else {
          flushGroup();
          currentGroup.push(block);
          currentCategory = cat;
        }
      }
    }

    flushGroup();
    return items;
  }, [expandedBlocks]);

  const handleAutoFillSleep = async () => {
    if (!user) return;
    await autoFillSleep(user.id, today);
    setAutoFillLocked(true);
    setTimeout(() => setAutoFillLocked(false), 2500);
  };

  const handleMarkFollowed = async (block: ScheduleBlock, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const actualId = block.id.split('-h')[0];
    const newStatus = block.status === 'completed' ? 'pending' : 'completed';
    await updateBlock(actualId, {
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date().toISOString() : undefined,
    });
    if (newStatus === 'completed') {
      addXp(25);
    }
  };

  const handleMarkMissed = async (block: ScheduleBlock, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const actualId = block.id.split('-h')[0];
    const newStatus = block.status === 'missed' ? 'pending' : 'missed';
    await updateBlock(actualId, {
      status: newStatus,
      missReason: newStatus === 'missed' ? 'Did not follow' : undefined,
    });
  };

  const handleDeleteBlock = async (blockId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const actualId = blockId.split('-h')[0];
    await deleteBlock(actualId);
  };

  const toggleGroupCollapse = (groupId: string, defaultCollapsed: boolean) => {
    setCollapsedGroups((prev) => {
      const current = prev[groupId] !== undefined ? prev[groupId] : defaultCollapsed;
      return {
        ...prev,
        [groupId]: !current,
      };
    });
  };

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTitle.trim()) return;

    const startH = parseInt(newStartTime.split(':')[0], 10);
    const endH = parseInt(newEndTime.split(':')[0], 10);
    const normalizedEndH = (endH === 0 && startH > 0) ? 24 : (newEndTime === '24:00' ? 24 : endH);

    // If there are conflicting blocks, remove them so the new block(s) replace them
    if (conflictingBlocks.length > 0) {
      for (const oldBlock of conflictingBlocks) {
        await deleteBlock(oldBlock.id);
      }
    }

    // If duration is greater than 1 hour, insert each 1-hour block into DB
    // so every individual hour is preserved and properly represented
    if (normalizedEndH > startH + 1) {
      for (let h = startH; h < normalizedEndH; h++) {
        const sStr = `${h.toString().padStart(2, '0')}:00`;
        const nextH = h + 1;
        const eStr = nextH === 24 ? '24:00' : `${nextH.toString().padStart(2, '0')}:00`;
        await addBlock({
          userId: user.id,
          date: today,
          startTime: sStr,
          endTime: eStr,
          title: newTitle.trim(),
          description: newDesc.trim() || undefined,
          category: newCategory,
          tag: newCategory === 'work' ? 'Deep Work' : newCategory === 'habits' ? 'Vitality' : newCategory === 'sleep' ? 'Rest' : 'Break',
          status: 'pending',
          isCommitted: true,
        });
      }
    } else {
      await addBlock({
        userId: user.id,
        date: today,
        startTime: newStartTime,
        endTime: newEndTime,
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        category: newCategory,
        tag: newCategory === 'work' ? 'Deep Work' : newCategory === 'habits' ? 'Vitality' : newCategory === 'sleep' ? 'Rest' : 'Break',
        status: 'pending',
        isCommitted: true,
      });
    }

    setNewTitle("");
    setNewDesc("");
    setIsAddModalOpen(false);
  };

  // Color / Icon configuration per Category
  const categoryConfig: Record<NormalizedCategory, {
    containerBg: string;
    borderColor: string;
    headerIcon: string;
    headerIconColor: string;
    headerIconBg: string;
    badgeBg: string;
    label: string;
    subLabel: string;
    accentBorder: string;
    cardBorder: string;
    cardHoverBorder: string;
  }> = {
    sleep: {
      containerBg: "bg-gradient-to-b from-secondary-container/20 via-surface-container-low/90 to-surface-container-low/90",
      borderColor: "border-secondary/40 hover:border-secondary/60",
      headerIcon: "bedtime",
      headerIconColor: "text-secondary",
      headerIconBg: "bg-secondary/15 border-secondary/30",
      badgeBg: "bg-secondary-container/40 text-secondary border-secondary/30",
      label: "Sleep & Recovery",
      subLabel: "Circadian Rest",
      accentBorder: "border-secondary/35",
      cardBorder: "border-secondary/15",
      cardHoverBorder: "hover:border-secondary/40",
    },
    work: {
      containerBg: "bg-gradient-to-b from-primary-container/20 via-surface-container-low/90 to-surface-container-low/90",
      borderColor: "border-primary/40 hover:border-primary/60",
      headerIcon: "psychology",
      headerIconColor: "text-primary",
      headerIconBg: "bg-primary/15 border-primary/30",
      badgeBg: "bg-primary-container/40 text-primary border-primary/30",
      label: "Deep Work & Study",
      subLabel: "Cognitive Sprint",
      accentBorder: "border-primary/35",
      cardBorder: "border-primary/15",
      cardHoverBorder: "hover:border-primary/40",
    },
    habits: {
      containerBg: "bg-gradient-to-b from-tertiary-container/20 via-surface-container-low/90 to-surface-container-low/90",
      borderColor: "border-tertiary/40 hover:border-tertiary/60",
      headerIcon: "spa",
      headerIconColor: "text-tertiary",
      headerIconBg: "bg-tertiary/15 border-tertiary/30",
      badgeBg: "bg-tertiary-container/40 text-tertiary border-tertiary/30",
      label: "Habits & Vitality",
      subLabel: "Physical & Mental",
      accentBorder: "border-tertiary/35",
      cardBorder: "border-tertiary/15",
      cardHoverBorder: "hover:border-tertiary/40",
    },
    buffer: {
      containerBg: "bg-gradient-to-b from-surface-variant/20 via-surface-container-low/90 to-surface-container-low/90",
      borderColor: "border-surface-variant/50 hover:border-surface-variant/70",
      headerIcon: "coffee",
      headerIconColor: "text-on-surface-variant",
      headerIconBg: "bg-surface-variant/25 border-surface-variant/40",
      badgeBg: "bg-surface-variant/30 text-on-surface-variant border-surface-variant/40",
      label: "Buffer & Breaks",
      subLabel: "Recharge Interval",
      accentBorder: "border-surface-variant/35",
      cardBorder: "border-surface-variant/20",
      cardHoverBorder: "hover:border-surface-variant/50",
    },
  };

  // Helper to render an individual hourly block card
  const renderHourlyCard = (block: ScheduleBlock, isInsideGroup: boolean, categoryKey?: NormalizedCategory) => {
    const startH = parseHour(block.startTime);
    const endH = getBlockEndHour(block);
    const isLive = currentHourFloat >= startH && currentHourFloat < endH;
    const isPast = currentHourFloat >= endH;
    const cat = categoryKey || normalizeCategory(block.category, block.title);
    const isFollowed = block.status === 'completed';
    const isMissed = block.status === 'missed';
    const timeRangeStr = formatCleanHourRange(block.startTime, block.endTime);
    const cfg = categoryConfig[cat];

    let catBadgeText = "Buffer";
    if (cat === "sleep") catBadgeText = "Sleep";
    else if (cat === "habits") catBadgeText = "Vitality";
    else if (cat === "work") catBadgeText = "Deep Work";

    // Live Now Card — Fully synchronized with system time; completes naturally with time
    if (isLive) {
      const totalMinutes = Math.max(1, (endH - startH) * 60);
      const elapsedMinutes = Math.max(0, Math.min(totalMinutes, (currentHourFloat - startH) * 60));
      const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedMinutes / totalMinutes) * 100)));
      const remainingMinutes = Math.max(0, Math.round(totalMinutes - elapsedMinutes));

      return (
        <div
          key={block.id}
          className={`timeline-block relative p-3 sm:p-3.5 rounded-xl bg-surface-container-high transition-all duration-300 overflow-hidden shadow-lg border border-primary/50 ${
            isInsideGroup ? "my-1" : ""
          }`}
        >
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-primary/15 blur-2xl pointer-events-none" />
          
          {/* Subheading row: Time, Category, Live status — strictly single line, no folding */}
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <div className="flex items-center gap-1.5 text-xs font-mono whitespace-nowrap overflow-hidden shrink-0">
              <span className="font-bold text-on-surface">{timeRangeStr}</span>
              <span className="text-on-surface-variant/40">•</span>
              <span className="text-primary font-semibold">{catBadgeText}</span>
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold border border-primary/30">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
                <span>LIVE</span>
              </span>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={(e) => handleDeleteBlock(block.id, e)}
                className="w-6 h-6 rounded-md hover:bg-surface-bright text-on-surface-variant/40 hover:text-rose-400 flex items-center justify-center transition-colors"
                title="Delete Hour"
              >
                <span className="material-symbols-outlined text-[15px]">delete</span>
              </button>
            </div>
          </div>

          {/* Main Task Title — completely visible, full width, no squishing */}
          <div className="mb-2">
            <h4 className="font-bold text-sm sm:text-base text-on-surface leading-snug break-words">
              {block.title}
            </h4>
            {block.description && (
              <p className="text-xs text-on-surface-variant mt-0.5 break-words line-clamp-2">
                {block.description}
              </p>
            )}
          </div>

          {/* Dynamic Real-Time Synchronized Progress Bar */}
          <div className="flex flex-col gap-1 mb-2">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-on-surface-variant flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span>Elapsed</span>
              </span>
              <span className="text-primary font-semibold">
                {Math.round(elapsedMinutes)}m / {Math.round(totalMinutes)}m ({progressPercent}%)
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-surface-container-lowest overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Natural Completion Notice */}
          <div className="flex items-center justify-between pt-1.5 border-t border-primary/15 text-[11px] text-on-surface-variant">
            <span className="text-primary/90">Completes at {formatCleanHourRange(block.endTime, block.endTime) || block.endTime}</span>
            <span className="font-mono text-primary font-bold">{remainingMinutes}m left</span>
          </div>
        </div>
      );
    }

    // Standard Hourly Block Card
    return (
      <div
        key={block.id}
        className={`timeline-block transition-all duration-200 ${
          isInsideGroup
            ? `p-2.5 sm:p-3 rounded-xl bg-surface-container/80 border ${cfg.cardBorder} ${cfg.cardHoverBorder} hover:bg-surface-container shadow-xs`
            : "p-3 rounded-xl bg-surface-container-low border border-outline/15 hover:border-primary/30 shadow-xs"
        }`}
      >
        {/* Top Subheading Row: Time • Category • Status Badge ───── [✓] [✕]  (trash) */}
        <div className="flex items-center justify-between gap-1.5 mb-1">
          <div className="flex items-center gap-1.5 text-xs font-mono whitespace-nowrap overflow-hidden min-w-0">
            <span className="font-bold text-on-surface text-[12px]">{timeRangeStr}</span>
            <span className="text-on-surface-variant/40">•</span>
            <span className={`font-semibold text-[11px] ${cfg.headerIconColor}`}>
              {catBadgeText}
            </span>

            {/* Status Chips for passed hours */}
            {isPast && isFollowed && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                <span className="material-symbols-outlined text-[11px]">check</span>
                DONE
              </span>
            )}
            {isPast && isMissed && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">
                <span className="material-symbols-outlined text-[11px]">close</span>
                MISSED
              </span>
            )}
            {isPast && !isFollowed && !isMissed && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9.5px] font-mono font-medium bg-surface-variant/40 text-on-surface-variant shrink-0">
                REVIEW
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {/* Post-Hour Reflection: Tick and Cross buttons ONLY on passed-out hours */}
            {isPast && (
              <div className="flex items-center gap-0.5 bg-surface-container-high/90 p-0.5 rounded-lg border border-outline/15 shadow-xs">
                <button
                  onClick={(e) => handleMarkFollowed(block, e)}
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center transition-all ${
                    isFollowed
                      ? "bg-emerald-500/30 text-emerald-400 border border-emerald-500/50 shadow-xs font-bold"
                      : "hover:bg-emerald-500/15 text-on-surface-variant/70 hover:text-emerald-400"
                  }`}
                  title={isFollowed ? "Marked as Followed (+25 XP, tap to undo)" : "I followed this hour (+25 XP)"}
                >
                  <span className="material-symbols-outlined text-[14px] sm:text-[15px] font-bold">check</span>
                </button>
                <button
                  onClick={(e) => handleMarkMissed(block, e)}
                  className={`w-5 h-5 sm:w-6 sm:h-6 rounded flex items-center justify-center transition-all ${
                    isMissed
                      ? "bg-rose-500/30 text-rose-400 border border-rose-500/50 shadow-xs font-bold"
                      : "hover:bg-rose-500/15 text-on-surface-variant/70 hover:text-rose-400"
                  }`}
                  title={isMissed ? "Marked as Missed (tap to undo)" : "I missed this hour"}
                >
                  <span className="material-symbols-outlined text-[14px] sm:text-[15px] font-bold">close</span>
                </button>
              </div>
            )}

            <button
              onClick={(e) => handleDeleteBlock(block.id, e)}
              className="w-5 h-5 sm:w-6 sm:h-6 rounded-md hover:bg-surface-bright text-on-surface-variant/30 hover:text-rose-400 flex items-center justify-center transition-colors"
              title="Delete Hour"
            >
              <span className="material-symbols-outlined text-[14px] sm:text-[15px]">delete</span>
            </button>
          </div>
        </div>

        {/* Main Task Title & Description — Full width, prominent, completely visible */}
        <div>
          <h4
            className={`font-semibold text-xs sm:text-sm leading-snug break-words ${
              isMissed ? "line-through text-on-surface-variant/60" : "text-on-surface"
            }`}
          >
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
    <div className="min-h-screen bg-surface">
      <div className="flex flex-col w-full max-w-xl sm:max-w-2xl mx-auto px-3 sm:px-4 pb-24 space-y-3 select-none">
        {/* Day Planner Header Block */}
        <div className="flex items-start sm:items-end justify-between gap-2 pt-1">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 text-primary">
              <span className="material-symbols-outlined text-[16px]">sync_alt</span>
              <span className="text-[11px] uppercase tracking-wider font-semibold">
                Today's Cadence
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl text-on-surface font-bold tracking-tight mt-0.5">
              24-Hour Planner
            </h1>
            <span className="text-xs text-on-surface-variant truncate">
              {formattedDate}
            </span>
          </div>

          {/* Auto-Fill Sleep Action */}
          <button
            onClick={handleAutoFillSleep}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full bg-surface-container-high text-secondary hover:bg-surface-bright active:scale-95 transition-all shadow-sm border border-secondary/20 shrink-0 text-xs font-semibold"
          >
            {autoFillLocked ? (
              <>
                <span className="material-symbols-outlined text-[16px] text-primary">done_all</span>
                <span className="text-primary font-semibold">Locked</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">bedtime</span>
                <span>Auto-fill Sleep</span>
              </>
            )}
          </button>
        </div>

        {/* Planned Hours Gauge & Category Matrix */}
        <div className="flex flex-col p-3.5 sm:p-4 rounded-xl bg-surface-container-low shadow-sm gap-2.5 border border-outline/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="material-symbols-outlined text-primary text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                auto_awesome
              </span>
              <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Planned Hours
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-headline-sm text-headline-sm text-primary font-bold">
                {totalHours}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                / 24 hrs ({percentage}%)
              </span>
            </div>
          </div>

          {/* Multi-segmented Progress Track */}
          <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden flex gap-0.5 p-0.5">
            <div
              className="h-full bg-secondary rounded-full transition-all duration-500"
              style={{ width: `${(sleepHours / 24) * 100}%` }}
              title={`Sleep: ${sleepHours}h`}
            />
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${(workHours / 24) * 100}%` }}
              title={`Deep Work: ${workHours}h`}
            />
            <div
              className="h-full bg-tertiary-container rounded-full transition-all duration-500"
              style={{ width: `${(habitHours / 24) * 100}%` }}
              title={`Rituals: ${habitHours}h`}
            />
            <div
              className="h-full bg-surface-variant rounded-full transition-all duration-500"
              style={{ width: `${(bufferHours / 24) * 100}%` }}
              title={`Buffer: ${bufferHours}h`}
            />
          </div>

          {/* Metric Pill Matrix — Compact 4-column responsive grid */}
          <div className="grid grid-cols-4 gap-1 sm:gap-1.5 pt-0.5">
            <div className="flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-lg bg-surface-container/60 text-center min-w-0">
              <div className="flex items-center gap-1 max-w-full">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-secondary shrink-0" />
                <span className="text-[9.5px] sm:text-[10px] text-on-surface-variant truncate font-medium">Sleep</span>
              </div>
              <span className="text-[11px] sm:text-xs font-mono font-bold text-on-surface mt-0.5">{sleepHours.toFixed(1)}h</span>
            </div>
            <div className="flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-lg bg-surface-container/60 text-center min-w-0">
              <div className="flex items-center gap-1 max-w-full">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-primary shrink-0" />
                <span className="text-[9.5px] sm:text-[10px] text-on-surface-variant truncate font-medium">Work</span>
              </div>
              <span className="text-[11px] sm:text-xs font-mono font-bold text-on-surface mt-0.5">{workHours.toFixed(1)}h</span>
            </div>
            <div className="flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-lg bg-surface-container/60 text-center min-w-0">
              <div className="flex items-center gap-1 max-w-full">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-tertiary-container shrink-0" />
                <span className="text-[9.5px] sm:text-[10px] text-on-surface-variant truncate font-medium">Habits</span>
              </div>
              <span className="text-[11px] sm:text-xs font-mono font-bold text-on-surface mt-0.5">{habitHours.toFixed(1)}h</span>
            </div>
            <div className="flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-lg bg-surface-container/60 text-center min-w-0">
              <div className="flex items-center gap-1 max-w-full">
                <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-surface-variant shrink-0" />
                <span className="text-[9.5px] sm:text-[10px] text-on-surface-variant truncate font-medium">Buffer</span>
              </div>
              <span className="text-[11px] sm:text-xs font-mono font-bold text-on-surface mt-0.5">{bufferHours.toFixed(1)}h</span>
            </div>
          </div>
        </div>

        {/* Filter Stream Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-3 py-1 rounded-full text-xs font-semibold shrink-0 transition-transform active:scale-95 shadow-sm ${
              activeFilter === "all"
                ? "bg-primary text-on-primary"
                : "bg-surface-container-high text-on-surface-variant hover:bg-surface-bright"
            }`}
          >
            All 24 Hours
          </button>
          <button
            onClick={() => setActiveFilter("sleep")}
            className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all ${
              activeFilter === "sleep"
                ? "bg-secondary text-on-secondary font-semibold"
                : "bg-surface-container-high text-secondary hover:bg-surface-bright"
            }`}
          >
            Sleep ({sleepHours.toFixed(0)}h)
          </button>
          <button
            onClick={() => setActiveFilter("work")}
            className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all ${
              activeFilter === "work"
                ? "bg-primary text-on-primary font-semibold"
                : "bg-surface-container-high text-primary hover:bg-surface-bright"
            }`}
          >
            Deep Work ({workHours.toFixed(0)}h)
          </button>
          <button
            onClick={() => setActiveFilter("habits")}
            className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all ${
              activeFilter === "habits"
                ? "bg-tertiary-container text-on-tertiary font-semibold"
                : "bg-surface-container-high text-tertiary hover:bg-surface-bright"
            }`}
          >
            Habits &amp; Vitality
          </button>
          <button
            onClick={() => setActiveFilter("buffer")}
            className={`px-3 py-1 rounded-full text-xs font-medium shrink-0 transition-all ${
              activeFilter === "buffer"
                ? "bg-surface-variant text-on-surface font-semibold"
                : "bg-surface-container-high text-on-surface-variant hover:bg-surface-bright"
            }`}
          >
            Buffer &amp; Social
          </button>
        </div>

        {/* Continuous Timeline Section */}
        <div className="flex flex-col gap-2 relative">
          {timelineItems.length === 0 ? (
            <div className="p-6 rounded-2xl bg-surface-container-low border border-dashed border-outline/20 text-center flex flex-col items-center justify-center gap-3 my-2">
              <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[22px]">schedule</span>
              </div>
              <div className="space-y-1">
                <h4 className="font-headline-sm text-[15px] font-bold text-on-surface">
                  Your 24-Hour Slate is Clean
                </h4>
                <p className="font-body-sm text-xs text-on-surface-variant max-w-xs mx-auto">
                  0 of 24 hours currently planned. Tap &ldquo;Auto-fill Sleep&rdquo; above to lock circadian recovery, or add your first hourly block below.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleAutoFillSleep}
                  className="px-3.5 py-1.5 rounded-xl bg-secondary-container text-on-secondary-container text-xs font-bold shadow-sm flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <span className="material-symbols-outlined text-[15px]">bedtime</span>
                  <span>Auto-fill Sleep (8h)</span>
                </button>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-3.5 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <span className="material-symbols-outlined text-[15px]">add</span>
                  <span>Add First Block</span>
                </button>
              </div>
            </div>
          ) : (
            timelineItems.map((item) => {
              if (item.type === 'single') {
                // Standalone 1-hour block: rendered as normal card without surrounding category box
                return renderHourlyCard(item.block, false);
              }

              // Group of 2 or more consecutive hours of the same category: wrapped in a Category Box
              const group = item;
              const cfg = categoryConfig[group.category];
              const defaultCollapsed = group.category === 'sleep';
              const isCollapsed = collapsedGroups[group.id] !== undefined
                ? collapsedGroups[group.id]
                : defaultCollapsed;

              return (
                <div
                  key={group.id}
                  className={`category-block-box rounded-2xl border ${cfg.borderColor} ${cfg.containerBg} p-2.5 sm:p-3.5 shadow-md transition-all ${
                    isCollapsed ? "" : "space-y-2"
                  }`}
                >
                  {/* Category Box Header */}
                  <div className={`flex items-center justify-between ${isCollapsed ? "" : "pb-2 border-b border-outline/10"}`}>
                    <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center border shadow-xs shrink-0 ${cfg.headerIconBg} ${cfg.headerIconColor}`}
                      >
                        <span
                          className="material-symbols-outlined text-[18px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          {cfg.headerIcon}
                        </span>
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] uppercase font-bold tracking-wider opacity-90 text-on-surface-variant font-mono truncate">
                          {cfg.label}
                        </span>
                        <h3 className="font-bold text-sm sm:text-base text-on-surface tracking-tight font-mono">
                          {formatCleanHourRange(group.startTime, group.endTime)}
                        </h3>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-mono font-semibold border shadow-xs ${cfg.badgeBg}`}
                      >
                        {group.totalHours}h block
                      </span>
                      <button
                        onClick={() => toggleGroupCollapse(group.id, defaultCollapsed)}
                        className="w-7 h-7 rounded-lg bg-surface-container hover:bg-surface-bright flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
                        title={isCollapsed ? "Expand hours" : "Collapse hours"}
                      >
                        <span className="material-symbols-outlined text-[18px]">
                          {isCollapsed ? "chevron_right" : "expand_more"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Individual Hourly Blocks Inside Box */}
                  {!isCollapsed && (
                    <div className={`pt-1.5 pl-1.5 sm:pl-2 border-l-2 ${cfg.accentBorder} space-y-1.5 ml-0.5`}>
                      {group.blocks.map((block) => renderHourlyCard(block, true, group.category))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Floating Add Hourly Block Button */}
        <div className="fixed bottom-24 left-0 right-0 px-3 sm:px-4 max-w-xl sm:max-w-2xl mx-auto flex justify-center z-40 pointer-events-none">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="pointer-events-auto flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-primary text-on-primary shadow-xl shadow-primary/20 active:scale-95 transition-all hover:bg-primary-fixed"
          >
            <span className="material-symbols-outlined text-[19px] font-bold">add</span>
            <span className="text-xs sm:text-sm font-bold tracking-tight">
              Add Hourly Block
            </span>
          </button>
        </div>
      </div>

      {/* Add Block Modal */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-surface-container p-6 shadow-2xl border border-outline/20 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                Add Hourly Block
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-bright flex items-center justify-center text-on-surface-variant hover:text-on-surface"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBlock} className="space-y-3">
              <div>
                <label className="font-label-sm text-[11px] text-on-surface-variant uppercase font-semibold block mb-1">
                  Block Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Study, Deep Work, Reading, etc."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline/20 text-on-surface text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="font-label-sm text-[11px] text-on-surface-variant uppercase font-semibold block mb-1">
                  Description / Focus Tag
                </label>
                <input
                  type="text"
                  placeholder="e.g. Calculus chapter 4, PR review, etc."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline/20 text-on-surface text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-label-sm text-[11px] text-on-surface-variant uppercase font-semibold block mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline/20 text-on-surface text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-[11px] text-on-surface-variant uppercase font-semibold block mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline/20 text-on-surface text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="font-label-sm text-[11px] text-on-surface-variant uppercase font-semibold block mb-1">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline/20 text-on-surface text-sm focus:outline-none focus:border-primary"
                >
                  <option value="work">Study / Deep Work</option>
                  <option value="habits">Habits &amp; Vitality</option>
                  <option value="buffer">Break &amp; Buffer</option>
                  <option value="sleep">Sleep &amp; Rest</option>
                </select>
              </div>

              {/* Real-time Time Conflict Warning Indicator */}
              {conflictingBlocks.length > 0 && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
                  <span
                    className="material-symbols-outlined text-[19px] text-amber-400 shrink-0 mt-0.5"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    warning
                  </span>
                  <div className="flex flex-col text-xs leading-snug">
                    <span className="font-bold text-amber-300">
                      Existing Block Conflict ({conflictingBlocks.length} {conflictingBlocks.length === 1 ? 'hour' : 'hours'})
                    </span>
                    <p className="text-on-surface-variant text-[11px] mt-0.5">
                      Overlaps with: <span className="text-on-surface font-medium">{conflictingBlocks.map(b => `${b.title} (${formatCleanHourRange(b.startTime, b.endTime)})`).slice(0, 3).join(', ')}</span>
                      {conflictingBlocks.length > 3 ? ` and ${conflictingBlocks.length - 3} more` : ''}.
                    </p>
                    <span className="text-amber-400/90 text-[10.5px] font-medium mt-1">
                      Notice: Saving will overwrite and replace existing {conflictingBlocks.length === 1 ? 'block' : 'blocks'} in this time interval.
                    </span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className={`w-full py-3 rounded-xl font-label-lg font-bold shadow-lg active:scale-95 transition-all mt-2 flex items-center justify-center gap-2 ${
                  conflictingBlocks.length > 0
                    ? "bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/25"
                    : "bg-primary text-on-primary shadow-primary/20 hover:bg-primary-fixed"
                }`}
              >
                <span className="material-symbols-outlined text-[20px] font-bold">
                  {conflictingBlocks.length > 0 ? "published_with_changes" : "add"}
                </span>
                <span>
                  {conflictingBlocks.length > 0 ? "Update Schedule" : "Schedule Block"}
                </span>
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
