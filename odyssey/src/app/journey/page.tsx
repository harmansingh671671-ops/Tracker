"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/lib/stores/user-store";
import { db, type ScheduleBlock } from "@/lib/db";
import { getJourneyDayNumber, getDateForJourneyDay } from "@/lib/utils/journey";
import { calculateRank, getRankInfo } from "@/lib/utils/gamification";
import { evaluateDayCompletion, type DayCompletionStats } from "@/lib/utils/day-status";
import {
  Check,
  Bolt,
  Lock,
  Gift,
  Flame,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
  Clock,
  CircleDot,
} from "lucide-react";

export default function JourneyPage() {
  const router = useRouter();
  const { user, fetchUser } = useUserStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLDivElement>(null);
  const [isTodayInView, setIsTodayInView] = useState(true);
  const [allBlocks, setAllBlocks] = useState<ScheduleBlock[]>([]);

  // Dynamic day range: allows extending infinitely forward and scrolling back to Day 1
  const [pastDaysCount, setPastDaysCount] = useState<number>(3);
  const [futureDaysCount, setFutureDaysCount] = useState<number>(7);

  const [curvePaths, setCurvePaths] = useState<{
    completedPath: string;
    upcomingPath: string;
  }>({
    completedPath: "",
    upcomingPath: "",
  });

  useEffect(() => {
    fetchUser();
    db.scheduleBlocks.toArray().then(setAllBlocks);
  }, [fetchUser]);

  const activeDay = useMemo(() => {
    return getJourneyDayNumber(user?.createdAt);
  }, [user?.createdAt]);

  const rankInfo = useMemo(() => {
    return getRankInfo(user?.militaryRank || calculateRank(user?.streak ?? 0));
  }, [user?.militaryRank, user?.streak]);

  const currentLevel = user?.level || (Math.floor((user?.xp ?? 0) / 500) + 1);
  const currentXp = user?.xp ?? 0;
  const targetXp = currentLevel * 500;
  const xpPercent = Math.min(100, Math.round(((currentXp % 500) / 500) * 100));

  const startDay = useMemo(() => {
    return Math.max(1, activeDay - pastDaysCount);
  }, [activeDay, pastDaysCount]);

  const endDay = useMemo(() => {
    return activeDay + futureDaysCount;
  }, [activeDay, futureDaysCount]);

  // Map of completion statistics for every day in range
  const dayStatsMap = useMemo(() => {
    const map: Record<number, DayCompletionStats> = {};
    for (let d = startDay; d <= endDay; d++) {
      const dateStr = getDateForJourneyDay(d, user?.createdAt);
      const blocksForDay = allBlocks.filter((b) => b.date === dateStr);
      map[d] = evaluateDayCompletion(blocksForDay, dateStr, d);
    }
    return map;
  }, [allBlocks, startDay, endDay, user?.createdAt]);

  // Generate nodes from startDay (down to 1) to endDay (extended as user wants)
  const nodes = useMemo(() => {
    const list = [];
    for (let d = startDay; d <= endDay; d++) {
      const isPast = d < activeDay;
      const isCurrent = d === activeDay;
      const isMilestone = d % 7 === 0;

      // Smooth serpentine wave pattern:
      const diff = d - activeDay;
      const cycle = ((diff % 4) + 4) % 4;
      const offset =
        cycle === 0
          ? "translate-x-0"
          : cycle === 1
          ? "-translate-x-14 sm:-translate-x-20"
          : cycle === 2
          ? "translate-x-0"
          : "translate-x-14 sm:translate-x-20";

      list.push({ day: d, isPast, isCurrent, isMilestone, offset });
    }
    return list;
  }, [startDay, endDay, activeDay]);

  // Compute smooth curved SVG paths that pass through the center of every icon
  const updatePath = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();

    const points: { x: number; y: number; day: number; isPast: boolean; isCurrent: boolean }[] = [];

    nodes.forEach((node) => {
      const el = container.querySelector<HTMLElement>(`[data-journey-node="${node.day}"]`);
      if (el) {
        const r = el.getBoundingClientRect();
        points.push({
          x: r.left + r.width / 2 - containerRect.left,
          y: r.top + r.height / 2 - containerRect.top,
          day: node.day,
          isPast: node.isPast,
          isCurrent: node.isCurrent,
        });
      }
    });

    if (points.length < 2) return;

    // Helper to generate cubic Bezier segment between (p0) and (p1)
    const buildSegment = (p0: { x: number; y: number }, p1: { x: number; y: number }) => {
      const dy = p1.y - p0.y;
      const cp1y = p0.y + dy * 0.5;
      const cp2y = p1.y - dy * 0.5;
      return `C ${p0.x.toFixed(1)} ${cp1y.toFixed(1)}, ${p1.x.toFixed(1)} ${cp2y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
    };

    const activeIdx = points.findIndex((p) => p.isCurrent);
    const splitIdx = activeIdx !== -1 ? activeIdx : points.length - 1;

    // Completed path (solid & radiant)
    let compPath = "";
    if (splitIdx > 0) {
      compPath = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
      for (let i = 0; i < splitIdx; i++) {
        compPath += " " + buildSegment(points[i], points[i + 1]);
      }
    }

    // Upcoming path (dashed)
    let upPath = "";
    if (splitIdx < points.length - 1) {
      upPath = `M ${points[splitIdx].x.toFixed(1)} ${points[splitIdx].y.toFixed(1)}`;
      for (let i = splitIdx; i < points.length - 1; i++) {
        upPath += " " + buildSegment(points[i], points[i + 1]);
      }
    }

    setCurvePaths({ completedPath: compPath, upcomingPath: upPath });
  }, [nodes]);

  useEffect(() => {
    updatePath();
    const handleResize = () => updatePath();
    window.addEventListener("resize", handleResize);

    const timer = setTimeout(updatePath, 60);

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && containerRef.current) {
      ro = new ResizeObserver(() => updatePath());
      ro.observe(containerRef.current);
    }

    return () => {
      window.removeEventListener("resize", handleResize);
      clearTimeout(timer);
      ro?.disconnect();
    };
  }, [updatePath]);

  // Smooth scroll to Today
  const scrollToToday = useCallback((smooth: boolean = true) => {
    if (todayRef.current) {
      todayRef.current.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "center",
      });
    }
  }, []);

  // Center Today on initial arrival
  useEffect(() => {
    const timer = setTimeout(() => {
      scrollToToday(false);
    }, 200);
    return () => clearTimeout(timer);
  }, [scrollToToday]);

  // Track if Today is in the user's viewport
  useEffect(() => {
    const target = todayRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsTodayInView(entry.isIntersecting);
      },
      {
        root: null,
        threshold: 0.15,
      }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [nodes]);

  // Extend future days
  const handleExtendJourney = () => {
    setFutureDaysCount((prev) => prev + 7);
  };

  // Load earlier past days (steps of 7 or all the way to 1)
  const handleLoadEarlierDays = () => {
    setPastDaysCount((prev) => prev + 7);
  };

  const handleLoadAllEarlierDays = () => {
    setPastDaysCount(activeDay - 1);
  };

  const handleOpenDaySchedule = (dayNum: number) => {
    const dateStr = getDateForJourneyDay(dayNum, user?.createdAt);
    router.push(`/day-schedule?date=${dateStr}&day=${dayNum}`);
  };

  const getSavedDayName = (dayNum: number, dateStr?: string) => {
    if (typeof window === "undefined") return "";
    try {
      return (
        localStorage.getItem(`odyssey_day_name_day_${dayNum}`) ||
        (dateStr ? localStorage.getItem(`odyssey_day_name_${dateStr}`) : null) ||
        ""
      );
    } catch {
      return "";
    }
  };

  return (
    <div className="flex-1 flex flex-col w-full max-w-xl mx-auto px-4 pb-20 pt-2 space-y-6">
      {/* Odyssey Progress Summary Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-surface-container p-5 border border-outline/10 shadow-xl space-y-4">
        <div className="absolute -right-12 -top-12 w-40 h-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-40 h-40 rounded-full bg-secondary-container/20 blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold text-primary px-3 py-1 rounded-full bg-primary/15 border border-primary/30">
              Day {activeDay} Active
            </span>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-amber-400 text-xs font-mono font-bold">
              <Flame className="w-3.5 h-3.5" />
              <span>{user?.streak || 1}d Streak</span>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold tracking-tight text-on-surface">Odyssey Trail</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container-low text-on-surface text-xs font-mono font-semibold border border-outline/10">
                <span>{rankInfo.badge}</span>
                <span className="text-primary">{rankInfo.name}</span>
                <span className="text-on-surface-variant">• Level {currentLevel}</span>
              </div>
            </div>
          </div>

          {/* XP Gauge - Single Line Without Line Break */}
          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs font-mono whitespace-nowrap overflow-hidden">
              <span className="truncate">
                <span className="text-on-surface-variant">From Level {currentLevel}: </span>
                <span className="text-primary font-bold">{currentXp} / {targetXp} XP ({xpPercent}%)</span>
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-surface-container-lowest overflow-hidden p-0.5 border border-outline/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary-container shadow-sm shadow-primary/50 transition-all duration-700"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Gamified Winding Journey Road Canvas */}
      <div ref={containerRef} className="relative w-full flex flex-col items-center py-6">
        {/* Fluid Curved Path Background SVG passing through the exact center of every icon */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-visible"
          fill="none"
        >
          <defs>
            <linearGradient id="journeyCompletedGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="1" />
            </linearGradient>
            <filter id="journeyGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Completed Track Outer Glow */}
          {curvePaths.completedPath && (
            <path
              d={curvePaths.completedPath}
              stroke="#10b981"
              strokeWidth="8"
              strokeOpacity="0.25"
              strokeLinecap="round"
              fill="none"
              filter="url(#journeyGlow)"
            />
          )}

          {/* Completed Vibrant Track */}
          {curvePaths.completedPath && (
            <path
              d={curvePaths.completedPath}
              stroke="url(#journeyCompletedGrad)"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
          )}

          {/* Upcoming Dashed Track */}
          {curvePaths.upcomingPath && (
            <path
              d={curvePaths.upcomingPath}
              stroke="rgba(148, 163, 184, 0.4)"
              strokeWidth="3.5"
              strokeDasharray="7 7"
              strokeLinecap="round"
              fill="none"
            />
          )}
        </svg>

        {/* Top Earlier Days Expanders */}
        {startDay > 1 ? (
          <div className="pb-8 flex flex-col items-center z-10 animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleLoadEarlierDays}
                className="px-4 py-2 rounded-full bg-surface-container-high border border-outline/20 hover:border-primary/50 text-xs font-mono font-semibold text-on-surface hover:text-primary shadow-sm flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
              >
                <ChevronUp className="w-4 h-4" />
                <span>Earlier Days (+7)</span>
              </button>
              <button
                type="button"
                onClick={handleLoadAllEarlierDays}
                className="px-4 py-2 rounded-full bg-surface-container-low border border-outline/15 hover:border-primary/40 text-xs font-mono text-on-surface-variant hover:text-primary transition-all active:scale-95 cursor-pointer"
              >
                <span>Back to Day 1</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="pb-8 flex flex-col items-center z-10 animate-in fade-in duration-200">
            <span className="px-3.5 py-1 rounded-full bg-surface-container-low border border-outline/15 text-[11px] font-mono text-on-surface-variant flex items-center gap-1.5 shadow-sm">
              <span>🚀</span>
              <span>Journey Origin • Day 1</span>
            </span>
          </div>
        )}

        {/* Nodes Flow */}
        <div className="w-full flex flex-col items-center space-y-10 z-10">
          {nodes.map((node) => {
            const dateStr = getDateForJourneyDay(node.day, user?.createdAt);
            const dayStat = dayStatsMap[node.day] || evaluateDayCompletion([], dateStr, node.day);
            const customDayName = getSavedDayName(node.day, dateStr);

            if (node.isCurrent) {
              return (
                <div
                  key={node.day}
                  ref={todayRef}
                  className={`relative flex flex-col items-center ${node.offset} transition-transform`}
                >
                  {/* Today's Radiant Pulsing Beacon */}
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-20 h-20 rounded-full bg-primary/20 animate-ping" />
                    <div className="absolute w-16 h-16 rounded-full bg-primary/30 blur-md" />
                    <button
                      data-journey-node={node.day}
                      type="button"
                      onClick={() => handleOpenDaySchedule(node.day)}
                      className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-primary to-primary-container text-on-primary flex items-center justify-center shadow-lg shadow-primary/40 hover:scale-110 active:scale-95 transition-all cursor-pointer group"
                      title={`Open Today's Schedule (Day ${node.day})`}
                    >
                      <Bolt className="w-7 h-7 fill-current group-hover:scale-110 transition-transform" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenDaySchedule(node.day)}
                    className="mt-2 px-3 py-1 rounded-full bg-primary/15 border border-primary/30 text-primary hover:bg-primary/25 text-xs font-mono font-bold transition-colors cursor-pointer shadow-sm"
                  >
                    {customDayName ? `${customDayName} (Day ${node.day})` : `Day ${node.day} • Today`}
                  </button>
                </div>
              );
            }

            if (node.isPast) {
              // Day completion styling based on schedule & review status
              return (
                <div key={node.day} className={`flex flex-col items-center ${node.offset} transition-transform`}>
                  <button
                    type="button"
                    data-journey-node={node.day}
                    onClick={() => handleOpenDaySchedule(node.day)}
                    className={`w-12 h-12 rounded-full flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-all cursor-pointer group hover:ring-2 ${
                      dayStat.status === "fully_completed"
                        ? "bg-primary text-on-primary shadow-primary/25 hover:ring-primary/40 ring-1 ring-emerald-300"
                        : dayStat.status === "planned_unreviewed"
                        ? "bg-amber-500/20 border-2 border-amber-500 text-amber-400 shadow-amber-500/20 hover:ring-amber-400/40"
                        : dayStat.status === "mostly_reviewed" || dayStat.status === "partially_reviewed"
                        ? "bg-emerald-800/40 border-2 border-emerald-500/70 text-emerald-400 shadow-emerald-500/20 hover:ring-emerald-400/40"
                        : "bg-surface-container border-2 border-outline/30 text-on-surface-variant/50 hover:border-outline/50 hover:text-on-surface hover:ring-outline/40"
                    }`}
                    title={`Open Day ${node.day} Schedule (${dayStat.status})`}
                  >
                    {dayStat.status === "fully_completed" ? (
                      <Check className="w-6 h-6 stroke-[3] group-hover:scale-110 transition-transform" />
                    ) : dayStat.status === "planned_unreviewed" ? (
                      <Clock className="w-5 h-5 group-hover:scale-110 transition-transform text-amber-400" />
                    ) : dayStat.status === "mostly_reviewed" || dayStat.status === "partially_reviewed" ? (
                      <Sparkles className="w-5 h-5 group-hover:scale-110 transition-transform text-emerald-400" />
                    ) : (
                      <CircleDot className="w-5 h-5 group-hover:scale-110 transition-transform text-on-surface-variant/50" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenDaySchedule(node.day)}
                    className={`mt-1 px-2.5 py-0.5 rounded-full text-[11px] font-mono transition-colors cursor-pointer border ${
                      dayStat.status === "fully_completed"
                        ? "bg-surface-container hover:bg-surface-container-high text-emerald-400 border-emerald-500/20"
                        : dayStat.status === "planned_unreviewed"
                        ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30"
                        : dayStat.status === "mostly_reviewed" || dayStat.status === "partially_reviewed"
                        ? "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/20"
                        : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant/70 border-outline/10"
                    }`}
                  >
                    {customDayName ? (
                      customDayName
                    ) : dayStat.status === "fully_completed" ? (
                      `Day ${node.day} Completed`
                    ) : dayStat.status === "planned_unreviewed" ? (
                      `Day ${node.day} Needs Review`
                    ) : dayStat.status === "mostly_reviewed" || dayStat.status === "partially_reviewed" ? (
                      `Day ${node.day} (${dayStat.reviewedHours}/${dayStat.plannedHours}h)`
                    ) : (
                      `Day ${node.day} Incomplete`
                    )}
                  </button>
                </div>
              );
            }

            // Upcoming Node
            return (
              <div key={node.day} className={`flex flex-col items-center ${node.offset} transition-transform opacity-80 hover:opacity-100`}>
                <button
                  type="button"
                  data-journey-node={node.day}
                  onClick={() => handleOpenDaySchedule(node.day)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center border hover:scale-110 active:scale-95 transition-all cursor-pointer group hover:ring-2 hover:ring-primary/40 ${
                    node.isMilestone
                      ? "bg-secondary-container/60 border-secondary text-secondary shadow-md hover:bg-secondary-container"
                      : "bg-surface-container border-outline/20 text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"
                  }`}
                  title={`Plan Day ${node.day} Schedule`}
                >
                  {node.isMilestone ? (
                    <Gift className="w-6 h-6 group-hover:scale-110 transition-transform" />
                  ) : (
                    <Lock className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenDaySchedule(node.day)}
                  className="mt-1 px-2.5 py-0.5 rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface text-[11px] font-mono transition-colors cursor-pointer"
                >
                  {customDayName
                    ? customDayName
                    : node.isMilestone
                    ? `Day ${node.day} Milestone Chest`
                    : `Day ${node.day}`}
                </button>
              </div>
            );
          })}
        </div>

        {/* Expansion Button at Bottom */}
        <div className="pt-10 pb-4 flex flex-col items-center z-10">
          <button
            type="button"
            onClick={handleExtendJourney}
            className="px-5 py-2.5 rounded-full bg-surface-container-high border border-outline/25 hover:border-primary/50 text-xs sm:text-sm font-mono font-semibold text-on-surface hover:text-primary shadow-lg flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span>Extend</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          <span className="text-[10px] font-mono text-on-surface-variant/60 mt-1.5">
            Plan as many days ahead as you want
          </span>
        </div>
      </div>

      {/* Floating Quick Return to Today Button (Visible when scrolled away from Today) */}
      {!isTodayInView && (
        <button
          type="button"
          onClick={() => scrollToToday(true)}
          className="fixed bottom-20 right-4 sm:right-6 z-40 flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-surface-container-highest/95 border border-primary/40 shadow-2xl text-primary font-mono text-xs font-bold backdrop-blur-md hover:scale-105 active:scale-95 transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 group cursor-pointer"
          title="Scroll to Today"
        >
          <div className="relative flex items-center justify-center">
            <span className="w-2.5 h-2.5 rounded-full bg-primary/40 animate-ping absolute" />
            <Zap className="w-4 h-4 fill-primary shrink-0" />
          </div>
          <span className="tracking-wide">Go to Today</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
            Day {activeDay}
          </span>
        </button>
      )}
    </div>
  );
}
