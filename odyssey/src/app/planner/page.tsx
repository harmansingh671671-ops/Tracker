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
      label: "SLEEP & CIRCADIAN RECOVERY",
      subLabel: "Rest & Cellular Rejuvenation",
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
      label: "STUDY & DEEP WORK",
      subLabel: "High-Focus Cognitive Sprint",
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
      label: "HABITS & VITALITY",
      subLabel: "Physical & Mental Well-Being",
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
      label: "BUFFER & BREAK",
      subLabel: "Recharge & Flexibility Interval",
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

    // Live Now Card — Fully synchronized with system time; completes naturally with time
    if (isLive) {
      const totalMinutes = Math.max(1, (endH - startH) * 60);
      const elapsedMinutes = Math.max(0, Math.min(totalMinutes, (currentHourFloat - startH) * 60));
      const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedMinutes / totalMinutes) * 100)));
      const remainingMinutes = Math.max(0, Math.round(totalMinutes - elapsedMinutes));

      return (
        <div
          key={block.id}
          className={`timeline-block relative p-4 rounded-xl bg-surface-container-high transition-all duration-300 overflow-hidden shadow-lg border border-primary/50 ${
            isInsideGroup ? "my-1" : ""
          }`}
        >
          <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-primary/15 blur-2xl pointer-events-none" />
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
              </span>
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-bold">
                Live Now
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant font-mono">
                {block.startTime} – {block.endTime}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full bg-primary-container/30 text-primary font-label-sm text-label-sm font-semibold">
                In Progress
              </span>
              <button
                onClick={(e) => handleDeleteBlock(block.id, e)}
                className="w-6 h-6 rounded-full hover:bg-surface-bright text-on-surface-variant/40 hover:text-red-400 flex items-center justify-center transition-colors"
                title="Delete Hour"
              >
                <span className="material-symbols-outlined text-[15px]">delete</span>
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1 mb-2.5">
            <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              {block.title}
            </h3>
            {block.description && (
              <p className="font-body-sm text-body-sm text-on-surface-variant">
                {block.description}
              </p>
            )}
          </div>

          {/* Dynamic Real-Time Synchronized Progress Bar */}
          <div className="flex flex-col gap-1.5 mb-2.5">
            <div className="flex justify-between font-label-sm text-label-sm">
              <span className="text-on-surface font-medium flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span>Session Elapsed</span>
              </span>
              <span className="text-primary font-mono font-semibold">
                {Math.round(elapsedMinutes)}m / {Math.round(totalMinutes)}m ({progressPercent}%)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-container-lowest overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Natural Completion Notice — No premature complete button */}
          <div className="flex items-center justify-between pt-2 border-t border-primary/20 text-xs text-on-surface-variant">
            <div className="flex items-center gap-1.5 text-primary font-medium">
              <span className="material-symbols-outlined text-[16px] animate-pulse">schedule</span>
              <span>Completes automatically at {block.endTime}</span>
            </div>
            <span className="font-mono text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-full">
              {remainingMinutes}m left
            </span>
          </div>
        </div>
      );
    }

    // Badge, Icon, Color attributes for standard card
    let badgeBg = "bg-surface-variant text-on-surface-variant";
    let badgeText = "Buffer Slot";
    let iconName = "coffee";
    let iconColor = "text-on-surface-variant";

    if (cat === "sleep") {
      badgeBg = "bg-secondary-container/30 text-secondary";
      badgeText = "Sleep & Rest";
      iconName = block.startTime.startsWith("06") ? "verified" : "bedtime";
      iconColor = block.startTime.startsWith("06") ? "text-primary" : "text-secondary";
    } else if (cat === "habits") {
      badgeBg = "bg-tertiary-container/20 text-tertiary";
      badgeText = block.tag?.includes("streak") ? "Habit Ritual" : "Vitality";
      iconName = block.title.toLowerCase().includes("strength") || block.title.toLowerCase().includes("gym")
        ? "fitness_center"
        : block.title.toLowerCase().includes("reading")
        ? "auto_stories"
        : "wb_sunny";
      iconColor = "text-tertiary";
    } else if (cat === "work") {
      badgeBg = "bg-primary/10 text-primary";
      badgeText = block.title.toLowerCase().includes("sync") || block.title.toLowerCase().includes("review") ? "Collaboration" : "Deep Work";
      iconName = block.title.toLowerCase().includes("sync")
        ? "groups"
        : block.title.toLowerCase().includes("review")
        ? "rate_review"
        : "psychology";
      iconColor = "text-primary";
    }

    const cfg = categoryConfig[cat];

    return (
      <div
        key={block.id}
        className={`timeline-block transition-all duration-300 ${
          isInsideGroup
            ? `p-3 rounded-xl bg-surface-container/70 border ${cfg.cardBorder} ${cfg.cardHoverBorder} hover:bg-surface-container shadow-xs`
            : "p-3.5 rounded-xl bg-surface-container-low border border-outline/15 hover:border-primary/30 shadow-xs"
        }`}
      >
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-2">
            <span className="font-label-md text-label-md text-on-surface-variant font-mono">
              {block.startTime} – {block.endTime}
            </span>
            <span
              className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${badgeBg}`}
            >
              {badgeText}
            </span>

            {/* Status Chips for passed hours */}
            {isPast && isFollowed && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[12px]">check</span>
                FOLLOWED
              </span>
            )}
            {isPast && isMissed && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-0.5">
                <span className="material-symbols-outlined text-[12px]">close</span>
                MISSED
              </span>
            )}
            {isPast && !isFollowed && !isMissed && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-surface-variant/40 text-on-surface-variant">
                PENDING REVIEW
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Post-Hour Reflection: Tick and Cross buttons ONLY on passed-out hours */}
            {isPast && (
              <div className="flex items-center gap-1 bg-surface-container-high/80 px-1.5 py-0.5 rounded-lg border border-outline/15 shadow-xs">
                <span className="text-[10px] uppercase font-mono font-bold text-on-surface-variant/80 mr-0.5 hidden sm:inline">
                  Followed?
                </span>
                <button
                  onClick={(e) => handleMarkFollowed(block, e)}
                  className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                    isFollowed
                      ? "bg-emerald-500/30 text-emerald-400 border border-emerald-500/50 shadow-xs font-bold"
                      : "hover:bg-emerald-500/15 text-on-surface-variant hover:text-emerald-400"
                  }`}
                  title={isFollowed ? "Marked as Followed (+25 XP, tap to undo)" : "I followed this hour (+25 XP)"}
                >
                  <span className="material-symbols-outlined text-[15px] font-bold">check</span>
                </button>
                <button
                  onClick={(e) => handleMarkMissed(block, e)}
                  className={`w-6 h-6 rounded-md flex items-center justify-center transition-all ${
                    isMissed
                      ? "bg-rose-500/30 text-rose-400 border border-rose-500/50 shadow-xs font-bold"
                      : "hover:bg-rose-500/15 text-on-surface-variant hover:text-rose-400"
                  }`}
                  title={isMissed ? "Marked as Missed (tap to undo)" : "I missed this hour"}
                >
                  <span className="material-symbols-outlined text-[15px] font-bold">close</span>
                </button>
              </div>
            )}

            <span className={`material-symbols-outlined text-[17px] ${iconColor}`}>
              {iconName}
            </span>
            <button
              onClick={(e) => handleDeleteBlock(block.id, e)}
              className="w-6 h-6 rounded-full hover:bg-surface-bright text-on-surface-variant/30 hover:text-red-400 flex items-center justify-center transition-colors ml-1"
              title="Delete Hour"
            >
              <span className="material-symbols-outlined text-[15px]">delete</span>
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className={`font-body-md text-body-md font-medium ${isMissed ? "line-through text-on-surface-variant/60" : "text-on-surface"}`}>
              {block.title}
            </span>
            {block.description && (
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                {block.description}
              </span>
            )}
          </div>
          {block.tag && (
            <span className="font-label-sm text-label-sm text-primary/80 font-mono shrink-0 ml-2">
              {block.tag}
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-surface">
      <div className="flex flex-col w-full px-margin pb-24 gap-space-md select-none">
        {/* Day Planner Header Block */}
        <div className="flex items-end justify-between pt-space-xs">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-primary">
              <span className="material-symbols-outlined text-[17px]">sync_alt</span>
              <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                Today's Cadence
              </span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight mt-0.5">
              24-Hour Planner
            </h1>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {formattedDate}
            </span>
          </div>

          {/* Auto-Fill Sleep Action */}
          <button
            onClick={handleAutoFillSleep}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-surface-container-high text-secondary hover:bg-surface-bright active:scale-95 transition-all shadow-sm border border-secondary/20"
          >
            {autoFillLocked ? (
              <>
                <span className="material-symbols-outlined text-[18px] text-primary">done_all</span>
                <span className="font-label-md text-label-md text-primary font-semibold">
                  Circadian Locked
                </span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">bedtime</span>
                <span className="font-label-md text-label-md font-semibold">Auto-fill Sleep</span>
              </>
            )}
          </button>
        </div>

        {/* Planned Hours Gauge & Category Matrix */}
        <div className="flex flex-col p-4 rounded-xl bg-surface-container-low shadow-sm gap-3 border border-outline/10">
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
          <div className="w-full h-2.5 rounded-full bg-surface-container-highest overflow-hidden flex gap-0.5 p-0.5">
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

          {/* Metric Pill Matrix */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-container">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary" />
              <span className="font-body-sm text-body-sm text-on-surface flex-1">Sleep</span>
              <span className="font-label-md text-label-md text-on-surface-variant font-semibold">
                {sleepHours.toFixed(1)}h
              </span>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-container">
              <span className="w-2.5 h-2.5 rounded-full bg-primary" />
              <span className="font-body-sm text-body-sm text-on-surface flex-1">Deep Work</span>
              <span className="font-label-md text-label-md text-on-surface-variant font-semibold">
                {workHours.toFixed(1)}h
              </span>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-container">
              <span className="w-2.5 h-2.5 rounded-full bg-tertiary-container" />
              <span className="font-body-sm text-body-sm text-on-surface flex-1">
                Habits &amp; Health
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant font-semibold">
                {habitHours.toFixed(1)}h
              </span>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-container">
              <span className="w-2.5 h-2.5 rounded-full bg-surface-variant" />
              <span className="font-body-sm text-body-sm text-on-surface flex-1">
                Buffer &amp; Rest
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant font-semibold">
                {bufferHours.toFixed(1)}h
              </span>
            </div>
          </div>
        </div>

        {/* Filter Stream Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md font-semibold shrink-0 transition-transform active:scale-95 shadow-sm ${
              activeFilter === "all"
                ? "bg-primary text-on-primary"
                : "bg-surface-container-high text-on-surface-variant hover:bg-surface-bright"
            }`}
          >
            All 24 Hours
          </button>
          <button
            onClick={() => setActiveFilter("sleep")}
            className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md font-medium shrink-0 transition-all ${
              activeFilter === "sleep"
                ? "bg-secondary text-on-secondary font-semibold"
                : "bg-surface-container-high text-secondary hover:bg-surface-bright"
            }`}
          >
            Sleep ({sleepHours.toFixed(0)}h)
          </button>
          <button
            onClick={() => setActiveFilter("work")}
            className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md font-medium shrink-0 transition-all ${
              activeFilter === "work"
                ? "bg-primary text-on-primary font-semibold"
                : "bg-surface-container-high text-primary hover:bg-surface-bright"
            }`}
          >
            Deep Work ({workHours.toFixed(0)}h)
          </button>
          <button
            onClick={() => setActiveFilter("habits")}
            className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md font-medium shrink-0 transition-all ${
              activeFilter === "habits"
                ? "bg-tertiary-container text-on-tertiary font-semibold"
                : "bg-surface-container-high text-tertiary hover:bg-surface-bright"
            }`}
          >
            Habits &amp; Vitality
          </button>
          <button
            onClick={() => setActiveFilter("buffer")}
            className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md font-medium shrink-0 transition-all ${
              activeFilter === "buffer"
                ? "bg-surface-variant text-on-surface font-semibold"
                : "bg-surface-container-high text-on-surface-variant hover:bg-surface-bright"
            }`}
          >
            Buffer &amp; Social
          </button>
        </div>

        {/* Continuous Timeline Section */}
        <div className="flex flex-col gap-space-sm relative">
          {timelineItems.length === 0 ? (
            <div className="p-8 rounded-2xl bg-surface-container-low border border-dashed border-outline/20 text-center flex flex-col items-center justify-center gap-3 my-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[24px]">schedule</span>
              </div>
              <div className="space-y-1">
                <h4 className="font-headline-sm text-[16px] font-bold text-on-surface">
                  Your 24-Hour Slate is Clean
                </h4>
                <p className="font-body-sm text-[13px] text-on-surface-variant max-w-xs mx-auto">
                  0 of 24 hours currently planned. Tap &ldquo;Auto-fill Sleep&rdquo; above to lock circadian recovery, or add your first hourly block below.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleAutoFillSleep}
                  className="px-4 py-2 rounded-xl bg-secondary-container text-on-secondary-container text-xs font-bold shadow-sm flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <span className="material-symbols-outlined text-[16px]">bedtime</span>
                  <span>Auto-fill Sleep (8h)</span>
                </button>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
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
                  className={`category-block-box rounded-2xl border ${cfg.borderColor} ${cfg.containerBg} p-3.5 sm:p-4 shadow-md transition-all ${
                    isCollapsed ? "" : "space-y-2"
                  }`}
                >
                  {/* Category Box Header */}
                  <div className={`flex items-center justify-between ${isCollapsed ? "" : "pb-2 border-b border-outline/10"}`}>
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center border shadow-xs ${cfg.headerIconBg} ${cfg.headerIconColor}`}
                      >
                        <span
                          className="material-symbols-outlined text-[20px]"
                          style={{ fontVariationSettings: "'FILL' 1" }}
                        >
                          {cfg.headerIcon}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-label-sm text-[10.5px] uppercase font-bold tracking-wider opacity-90 text-on-surface-variant font-mono">
                            {cfg.label}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold tracking-tight">
                            {group.startTime} – {group.endTime}
                          </h3>
                          <span className="text-xs text-on-surface-variant hidden sm:inline">
                            ({cfg.subLabel})
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-mono font-semibold border shadow-xs ${cfg.badgeBg}`}
                      >
                        {group.totalHours} hrs block
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
                    <div className={`pt-2 pl-2.5 sm:pl-3 border-l-2 ${cfg.accentBorder} space-y-2 ml-1`}>
                      {group.blocks.map((block) => renderHourlyCard(block, true, group.category))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Floating Add Hourly Block Button */}
        <div className="fixed bottom-24 left-0 right-0 px-margin flex justify-center z-40 pointer-events-none">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="pointer-events-auto flex items-center gap-2 px-5 py-3 rounded-full bg-primary text-on-primary shadow-xl shadow-primary/20 active:scale-95 transition-all hover:bg-primary-fixed"
          >
            <span className="material-symbols-outlined text-[20px] font-bold">add</span>
            <span className="font-label-lg text-label-lg font-bold tracking-tight">
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
                      Overlaps with: <span className="text-on-surface font-medium">{conflictingBlocks.map(b => `${b.title} (${b.startTime}–${b.endTime})`).slice(0, 3).join(', ')}</span>
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
