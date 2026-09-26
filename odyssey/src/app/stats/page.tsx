"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/lib/stores/user-store";
import { db, type ScheduleBlock } from "@/lib/db";
import { calculateRank, getRankInfo, getNextRank } from "@/lib/utils/gamification";
import { getJourneyStartDate, getJourneyDayNumberForDate } from "@/lib/utils/journey";
import {
  evaluateDayCompletion,
  getHeatmapCellStyles,
  type DayCompletionStats,
} from "@/lib/utils/day-status";
import {
  Flame,
  Gem,
  Zap,
  TrendingUp,
  Clock,
  ShieldCheck,
  Award,
  Activity,
  Smartphone,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Sparkles,
  AlertCircle,
} from "lucide-react";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const WEEKDAY_NAMES = ["M", "T", "W", "T", "F", "S", "S"];

export default function StatsPage() {
  const router = useRouter();
  const { user, fetchUser } = useUserStore();
  const [totalPlannedHours, setTotalPlannedHours] = useState(0);
  const [allBlocks, setAllBlocks] = useState<ScheduleBlock[]>([]);

  // Month navigation for heatmap
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [today]);

  const startDate = useMemo(() => {
    const startStr = getJourneyStartDate(user?.createdAt);
    const [y, m, d] = startStr.split("-").map(Number);
    return new Date(y, m - 1, d);
  }, [user?.createdAt]);

  const [viewYear, setViewYear] = useState<number>(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(() => {
    const y = new Date().getFullYear();
    const m = String(new Date().getMonth() + 1).padStart(2, "0");
    const d = String(new Date().getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  });

  useEffect(() => {
    fetchUser();
    db.scheduleBlocks.toArray().then((blocks) => {
      setAllBlocks(blocks);
      setTotalPlannedHours(blocks.length);
    });
  }, [fetchUser]);

  // Compute day completion stats for all recorded dates
  const dayStatsByDate = useMemo(() => {
    const map: Record<string, DayCompletionStats> = {};
    const blocksByDate: Record<string, ScheduleBlock[]> = {};

    allBlocks.forEach((b) => {
      if (!blocksByDate[b.date]) blocksByDate[b.date] = [];
      blocksByDate[b.date].push(b);
    });

    Object.keys(blocksByDate).forEach((dateStr) => {
      const jDay = getJourneyDayNumberForDate(dateStr, user?.createdAt);
      map[dateStr] = evaluateDayCompletion(blocksByDate[dateStr], dateStr, jDay);
    });

    return map;
  }, [allBlocks, user?.createdAt]);

  // Only count days that are genuinely completed (fully filled & reviewed)
  const completedDaysCount = useMemo(() => {
    return Object.values(dayStatsByDate).filter((s) => s.status === "fully_completed").length;
  }, [dayStatsByDate]);

  const userStreak = user?.streak ?? 0;
  const currentRankName = user?.militaryRank || calculateRank(completedDaysCount || userStreak);
  const rankInfo = useMemo(() => {
    return getRankInfo(currentRankName);
  }, [currentRankName]);

  const nextRank = useMemo(() => {
    return getNextRank(rankInfo.name);
  }, [rankInfo.name]);

  const divisionProgress = useMemo(() => {
    if (!nextRank) {
      return {
        current: completedDaysCount || userStreak,
        target: rankInfo.streak,
        pct: 100,
        label: "Max Division Reached",
      };
    }
    const target = nextRank.streak;
    const current = completedDaysCount;
    const pct = Math.min(100, Math.max(0, Math.round((current / target) * 100)));
    return {
      current,
      target,
      pct,
      label: `Next: ${nextRank.name} (${nextRank.division})`,
    };
  }, [completedDaysCount, userStreak, rankInfo.streak, nextRank]);

  const currentLevel = user?.level || 1;
  const currentXp = user?.xp || 420;
  const targetXp = currentLevel * 1000;

  // Month options starting from the user's initial join month to current month
  const availableMonths = useMemo(() => {
    const list: { year: number; month: number; label: string }[] = [];
    const curYear = today.getFullYear();
    const curMonth = today.getMonth();

    const startY = startDate.getFullYear();
    const startM = startDate.getMonth();

    for (let y = startY; y <= curYear; y++) {
      const minM = y === startY ? startM : 0;
      const maxM = y === curYear ? curMonth : 11;
      for (let m = minM; m <= maxM; m++) {
        list.push({
          year: y,
          month: m,
          label: `${MONTH_NAMES[m]} ${y}`,
        });
      }
    }
    return list;
  }, [startDate, today]);

  const canGoPrev = useMemo(() => {
    const startY = startDate.getFullYear();
    const startM = startDate.getMonth();
    return viewYear > startY || (viewYear === startY && viewMonth > startM);
  }, [viewYear, viewMonth, startDate]);

  const canGoNext = useMemo(() => {
    const curY = today.getFullYear();
    const curM = today.getMonth();
    return viewYear < curY || (viewYear === curY && viewMonth < curM);
  }, [viewYear, viewMonth, today]);

  const handlePrevMonth = () => {
    if (!canGoPrev) return;
    if (viewMonth === 0) {
      setViewYear((prev) => prev - 1);
      setViewMonth(11);
    } else {
      setViewMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (!canGoNext) return;
    if (viewMonth === 11) {
      setViewYear((prev) => prev + 1);
      setViewMonth(0);
    } else {
      setViewMonth((prev) => prev + 1);
    }
  };

  // Calendar cells for the selected month view
  const monthCells = useMemo(() => {
    // 0 = Monday, 6 = Sunday
    const firstDayIndex = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells: {
      dateStr: string;
      dayNumber: number;
      journeyDay: number;
      stats: DayCompletionStats;
      isPad?: boolean;
    }[] = [];

    // Leading padding days
    for (let p = 0; p < firstDayIndex; p++) {
      cells.push({
        dateStr: `pad-${p}`,
        dayNumber: 0,
        journeyDay: 0,
        stats: evaluateDayCompletion([], "", 0),
        isPad: true,
      });
    }

    // Days in current month (1 to daysInMonth)
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const journeyDay = getJourneyDayNumberForDate(dateStr, user?.createdAt);
      const stats =
        dayStatsByDate[dateStr] ||
        evaluateDayCompletion(
          allBlocks.filter((b) => b.date === dateStr),
          dateStr,
          journeyDay
        );

      cells.push({
        dateStr,
        dayNumber: d,
        journeyDay,
        stats,
      });
    }

    return cells;
  }, [viewYear, viewMonth, dayStatsByDate, allBlocks, user?.createdAt]);

  const selectedDayStats = useMemo(() => {
    if (!selectedDate) return null;
    const jDay = getJourneyDayNumberForDate(selectedDate, user?.createdAt);
    return (
      dayStatsByDate[selectedDate] ||
      evaluateDayCompletion(
        allBlocks.filter((b) => b.date === selectedDate),
        selectedDate,
        jDay
      )
    );
  }, [selectedDate, dayStatsByDate, allBlocks, user?.createdAt]);

  const weekBars = [
    { day: "M", hours: 6.8, heightPct: 78, primaryPct: 60, secPct: 40 },
    { day: "T", hours: 7.2, heightPct: 84, primaryPct: 65, secPct: 35 },
    { day: "W", hours: 8.0, heightPct: 92, primaryPct: 70, secPct: 30 },
    { day: "T", hours: 6.5, heightPct: 74, primaryPct: 55, secPct: 45 },
    { day: "F", hours: 7.5, heightPct: 86, primaryPct: 65, secPct: 35 },
    { day: "S", hours: 5.0, heightPct: 58, primaryPct: 40, secPct: 60 },
    { day: "S", hours: 5.5, heightPct: 64, primaryPct: 45, secPct: 55 },
  ];

  return (
    <div className="flex-1 flex flex-col w-full max-w-xl mx-auto px-4 pb-20 pt-2 space-y-4">
      {/* Title & Filter */}
      <div className="flex items-center justify-between pt-1">
        <h2 className="text-xl font-bold tracking-tight text-on-surface">Analytics &amp; Stats</h2>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-secondary text-xs font-mono font-semibold border border-outline/10 shrink-0">
          <Activity className="w-3.5 h-3.5" />
          <span>Active</span>
        </div>
      </div>

      {/* Hero Rank Card */}
      <div className="relative overflow-hidden rounded-3xl bg-surface-container-low p-4 sm:p-5 border border-outline/10 shadow-md space-y-3.5">
        <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-surface-container-high text-primary flex items-center justify-center text-2xl shadow-inner border border-primary/20 shrink-0">
              {rankInfo.badge}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-base font-bold text-on-surface truncate">{rankInfo.name}</h3>
                <span className="px-2.5 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-mono font-bold whitespace-nowrap">
                  {rankInfo.division} Division
                </span>
              </div>
              <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs font-mono text-on-surface-variant mt-1">
                <span className="inline-flex items-center gap-1 text-primary whitespace-nowrap">
                  <Award className="w-3.5 h-3.5 shrink-0" />
                  <span>Top 8%</span>
                </span>
                <span className="text-outline/40">•</span>
                <span className="inline-flex items-center gap-1 text-secondary whitespace-nowrap">
                  <Zap className="w-3.5 h-3.5 shrink-0" />
                  <span>Lv. {currentLevel}</span>
                </span>
                <span className="text-outline/40">•</span>
                <span className="inline-flex items-center gap-1 text-amber-400 whitespace-nowrap">
                  <Flame className="w-3.5 h-3.5 shrink-0" />
                  <span>{completedDaysCount} Done</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Division Tier Progress Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs font-mono whitespace-nowrap">
            <span className="inline-flex items-center gap-1.5 text-on-surface-variant truncate">
              <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>Next Division Tier</span>
            </span>
            <span className="text-primary font-bold shrink-0 pl-2">
              {divisionProgress.current} / {divisionProgress.target} days
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700 shadow-sm shadow-primary/40"
              style={{ width: `${divisionProgress.pct}%` }}
            />
          </div>
        </div>
      </div>

      {/* MONTHLY HEATMAP CALENDAR */}
      <div className="p-4 sm:p-5 rounded-3xl bg-surface-container-low border border-outline/10 space-y-4 shadow-sm">
        {/* Month Navigation Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary shrink-0" />
            <select
              value={`${viewYear}-${viewMonth}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split("-").map(Number);
                setViewYear(y);
                setViewMonth(m);
              }}
              className="bg-transparent text-sm sm:text-base font-bold text-on-surface cursor-pointer focus:outline-none hover:text-primary transition-colors"
            >
              {availableMonths.map((opt) => (
                <option
                  key={`${opt.year}-${opt.month}`}
                  value={`${opt.year}-${opt.month}`}
                  className="bg-surface-container text-on-surface text-xs"
                >
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handlePrevMonth}
              disabled={!canGoPrev}
              aria-label="Previous Month"
              className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all ${
                canGoPrev
                  ? "bg-surface-container hover:bg-surface-container-high text-on-surface border-outline/15 cursor-pointer active:scale-95"
                  : "bg-surface-container-lowest text-on-surface-variant/30 border-transparent cursor-not-allowed"
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleNextMonth}
              disabled={!canGoNext}
              aria-label="Next Month"
              className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all ${
                canGoNext
                  ? "bg-surface-container hover:bg-surface-container-high text-on-surface border-outline/15 cursor-pointer active:scale-95"
                  : "bg-surface-container-lowest text-on-surface-variant/30 border-transparent cursor-not-allowed"
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Heatmap 7-Column Grid */}
        <div className="space-y-1.5">
          {/* Weekday Labels Header */}
          <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-mono font-bold text-on-surface-variant/70 pb-1">
            {WEEKDAY_NAMES.map((w, idx) => (
              <span key={idx}>{w}</span>
            ))}
          </div>

          {/* Month Days Grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {monthCells.map((cell, idx) => {
              if (cell.isPad) {
                return <div key={`pad-${idx}`} className="w-full aspect-square" />;
              }

              const isSelected = selectedDate === cell.dateStr;
              const isToday = cell.dateStr === todayStr;
              const styles = getHeatmapCellStyles(cell.stats, isSelected, isToday);

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => setSelectedDate(cell.dateStr)}
                  title={`${cell.dateStr} (Day ${cell.journeyDay}): ${styles.label}`}
                  className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center text-xs font-mono border transition-all duration-200 cursor-pointer select-none relative group hover:scale-105 active:scale-95 ${styles.bgClass} ${styles.textClass} ${styles.borderClass} ${styles.glowClass}`}
                >
                  <span className="leading-none">{cell.dayNumber}</span>
                  {cell.stats.status === "fully_completed" && (
                    <span className="w-1 h-1 rounded-full bg-[#003825] mt-0.5" />
                  )}
                  {cell.stats.status === "planned_unreviewed" && (
                    <span className="w-1 h-1 rounded-full bg-white mt-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Heatmap Legend */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-3 border-t border-outline/10 text-[10px] font-mono text-on-surface-variant">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-surface-container-highest/30 border border-outline/15 inline-block" />
            <span>Empty</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-amber-500 border border-amber-400 inline-block shadow-sm" />
            <span>Planned (0 Rev)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-800/60 border border-emerald-700/50 inline-block" />
            <span>1h+ Rev</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-600/80 border border-emerald-500/50 inline-block" />
            <span>50%+ Rev</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded bg-emerald-400 border border-emerald-300 inline-block shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
            <span>100% Done</span>
          </div>
        </div>

        {/* Selected Day Inspection & Schedule Jump */}
        {selectedDayStats && (
          <div className="mt-3 p-3.5 rounded-2xl bg-surface-container-lowest/80 border border-outline/15 space-y-2.5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-mono font-bold text-primary uppercase">
                  Day {selectedDayStats.dayNumber} Overview
                </span>
                <h4 className="text-xs font-bold text-on-surface">
                  {selectedDayStats.date}
                </h4>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                  selectedDayStats.status === "fully_completed"
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                    : selectedDayStats.status === "planned_unreviewed"
                    ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                    : selectedDayStats.status === "mostly_reviewed" || selectedDayStats.status === "partially_reviewed"
                    ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                    : "bg-surface-container text-on-surface-variant border-outline/10"
                }`}
              >
                {selectedDayStats.status === "fully_completed"
                  ? "100% Completed"
                  : selectedDayStats.status === "planned_unreviewed"
                  ? "Planned (0h Reviewed)"
                  : selectedDayStats.status === "mostly_reviewed" || selectedDayStats.status === "partially_reviewed"
                  ? `${selectedDayStats.reviewedHours}/${selectedDayStats.plannedHours}h Reviewed`
                  : "Not Planned"}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-2 text-center text-[11px] font-mono">
              <div className="p-1.5 rounded-xl bg-surface-container-low border border-outline/10">
                <span className="text-[9px] text-on-surface-variant block">Planned</span>
                <span className="font-bold text-primary">{selectedDayStats.plannedHours}h</span>
              </div>
              <div className="p-1.5 rounded-xl bg-surface-container-low border border-outline/10">
                <span className="text-[9px] text-on-surface-variant block">Reviewed</span>
                <span className="font-bold text-secondary">{selectedDayStats.reviewedHours}h</span>
              </div>
              <div className="p-1.5 rounded-xl bg-surface-container-low border border-outline/10">
                <span className="text-[9px] text-on-surface-variant block">Completed</span>
                <span className="font-bold text-emerald-400">{selectedDayStats.completedHours}h</span>
              </div>
              <div className="p-1.5 rounded-xl bg-surface-container-low border border-outline/10">
                <span className="text-[9px] text-on-surface-variant block">Missed</span>
                <span className="font-bold text-rose-400">{selectedDayStats.missedHours}h</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                router.push(
                  `/day-schedule?date=${selectedDayStats.date}&day=${selectedDayStats.dayNumber}`
                )
              }
              className="w-full py-2 px-3 rounded-xl bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
            >
              <span>Open Day {selectedDayStats.dayNumber} Schedule</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* WALLPAPER STUDIO GATEWAY CARD */}
      <Link
        href="/wallpaper"
        className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#121B2B] via-[#0E1624] to-[#0A0F1A] border border-primary/30 hover:border-primary/60 p-4 sm:p-5 shadow-[0_0_24px_rgba(90,240,179,0.08)] hover:shadow-[0_0_32px_rgba(90,240,179,0.18)] transition-all duration-300 block"
      >
        <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-primary/15 blur-2xl pointer-events-none group-hover:bg-primary/25 transition-all" />
        <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-[#090E17] border border-primary/30 flex items-center justify-center text-primary shrink-0 shadow-inner group-hover:scale-105 transition-transform">
              <Smartphone className="w-5 h-5" />
            </div>

            <div className="min-w-0 space-y-0.5">
              <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-primary transition-colors truncate">
                Wallpaper Studio
              </h3>
              <div className="flex items-center gap-2 text-xs font-mono text-on-surface-variant whitespace-nowrap">
                <span className="inline-flex items-center gap-1.5 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  <span>Live 60 FPS</span>
                </span>
                <span className="text-outline/40">•</span>
                <span className="inline-flex items-center gap-1 text-on-surface-variant truncate">
                  <span>Schedule Lockscreen</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/15 group-hover:bg-primary text-primary group-hover:text-[#003825] border border-primary/30 group-hover:border-primary shrink-0 transition-all duration-300 shadow-md group-hover:scale-110">
            <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </Link>

      {/* 2x2 KPI Matrix */}
      <div className="grid grid-cols-2 gap-3">
        {/* Completed Days */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-container-low border border-outline/10 space-y-1.5 overflow-hidden">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
            <Flame className="w-4 h-4 shrink-0" />
            <span>Streak</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-on-surface">{completedDaysCount}</span>
              <span className="text-xs text-on-surface-variant font-mono">days</span>
            </div>
            <p className="text-[11px] font-mono text-on-surface-variant mt-0.5 truncate">
              Completed
            </p>
          </div>
        </div>

        {/* Diamonds */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-container-low border border-outline/10 space-y-1.5 overflow-hidden">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
            <Gem className="w-4 h-4 shrink-0" />
            <span>Diamonds</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-on-surface">{user?.diamonds || 0}</span>
              <span className="text-xs text-on-surface-variant">💎</span>
            </div>
            <p className="text-[11px] font-mono text-on-surface-variant mt-0.5 truncate">
              Armory Vault
            </p>
          </div>
        </div>

        {/* Total XP */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-container-low border border-outline/10 space-y-1.5 overflow-hidden">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-secondary">
            <Zap className="w-4 h-4 shrink-0" />
            <span>Total XP</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-on-surface">{currentXp}</span>
              <span className="text-xs text-on-surface-variant font-mono">XP</span>
            </div>
            <p className="text-[11px] font-mono text-on-surface-variant mt-0.5 truncate">
              Level {currentLevel}
            </p>
          </div>
        </div>

        {/* Adherence */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-container-low border border-outline/10 space-y-1.5 overflow-hidden">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
            <TrendingUp className="w-4 h-4 shrink-0" />
            <span>Adherence</span>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold font-mono text-on-surface">93%</span>
            </div>
            <p className="text-[11px] font-mono text-on-surface-variant mt-0.5 truncate">
              {totalPlannedHours}h Planned
            </p>
          </div>
        </div>
      </div>

      {/* Weekly Rhythm Chart */}
      <div className="p-4 sm:p-5 rounded-3xl bg-surface-container-low border border-outline/10 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-on-surface">Weekly Rhythm</h3>
          <span className="text-xs font-mono text-primary font-bold">46.5h / 50h</span>
        </div>

        {/* Stacked Bars */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 items-end h-32 pt-2 pb-1">
          {weekBars.map((bar, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end">
              <span className="text-[9px] font-mono text-on-surface-variant whitespace-nowrap">{bar.hours}h</span>
              <div
                className="w-full max-w-[24px] flex flex-col-reverse rounded-t-md overflow-hidden bg-surface-container-highest"
                style={{ height: `${bar.heightPct}%` }}
              >
                <div style={{ height: `${bar.primaryPct}%` }} className="bg-primary w-full" />
                <div style={{ height: `${bar.secPct}%` }} className="bg-secondary w-full" />
              </div>
              <span className="text-[10px] font-mono font-bold text-on-surface-variant">{bar.day}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
