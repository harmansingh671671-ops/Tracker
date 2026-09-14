"use client";

import { useEffect, useState, useMemo } from "react";
import { useUserStore } from "@/lib/stores/user-store";
import { useHabitStore } from "@/lib/stores/habit-store";
import { useScheduleStore } from "@/lib/stores/schedule-store";
import Link from "next/link";

export default function StatsPage() {
  const { user, fetchUser, addXp } = useUserStore();
  const { habits, fetchHabits } = useHabitStore();
  const { blocks, fetchBlocksForDate } = useScheduleStore();

  const [isReflecting, setIsReflecting] = useState(false);
  const [reflectionText, setReflectionText] = useState("");
  const [reflectionSubmitted, setReflectionSubmitted] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);

  useEffect(() => {
    fetchUser().then((u) => {
      if (u) {
        fetchHabits(u.id, today);
        fetchBlocksForDate(u.id, today);
      }
    });
  }, [fetchUser, fetchHabits, fetchBlocksForDate, today]);

  const handleCompleteReflection = () => {
    if (!reflectionText.trim()) return;
    addXp(25);
    setReflectionSubmitted(true);
    setToastMsg("Weekly Reflection saved! +25 XP awarded.");
    setTimeout(() => {
      setIsReflecting(false);
      setReflectionSubmitted(false);
      setReflectionText("");
      setToastMsg(null);
    }, 2000);
  };

  const handleExportCSV = () => {
    setExporting(true);
    
    // Generate CSV content from habits and schedule
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Category,Item,Status,Metric\n";
    csvContent += `Profile,Streak,Active,${user?.streak ?? 0} days\n`;
    csvContent += `Profile,Discipline,Score,${user?.integrityScore ?? 100}%\n`;
    csvContent += `Profile,Total XP,Current,${user?.xp ?? 0}\n`;
    csvContent += `Profile,Diamonds,Balance,${user?.diamonds ?? 0}\n`;

    habits.forEach((h) => {
      csvContent += `Habit,${h.name},Streak,${h.currentStreak}d\n`;
    });

    blocks.forEach((b) => {
      csvContent += `Schedule,${b.startTime}-${b.endTime} ${b.title},${b.category},${b.status}\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `odyssey_metrics_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => {
      setExporting(false);
      setToastMsg("Metric sheet exported successfully!");
      setTimeout(() => setToastMsg(null), 2500);
    }, 1000);
  };

  const streakReqPercent = Math.min(100, Math.round(((user?.streak ?? 0) / 7) * 100));
  const remainingCheckins = Math.max(0, 7 - (user?.streak ?? 0));

  return (
    <div className="min-h-screen bg-surface">
      <div className="flex flex-col w-full px-gutter space-y-space-lg pb-space-2xl">
        {/* Screen Title & Context */}
        <div className="flex flex-col gap-1 pt-2">
          <div className="flex items-center justify-between">
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
              Analytics &amp; Stats
            </h1>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high text-secondary hover:bg-surface-bright transition-colors">
              <span className="material-symbols-outlined text-[16px]">calendar_view_week</span>
              <span className="font-label-sm text-label-sm font-semibold">This Week</span>
              <span className="material-symbols-outlined text-[14px]">expand_more</span>
            </button>
          </div>
          <p className="font-body-sm text-body-sm text-on-surface-variant">
            Performance, discipline score &amp; rank metrics
          </p>
        </div>

        {/* Hero Rank & Streak Status Card */}
        <div className="relative overflow-hidden rounded-xl bg-surface-container-low p-space-md shadow-md border border-outline/10">
          <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
          
          <div className="flex items-start justify-between gap-space-sm mb-4">
            <div className="flex items-center gap-space-sm">
              <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-surface-container-high text-primary shadow-inner">
                <span className="material-symbols-outlined text-[28px]">local_library</span>
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-on-primary font-label-sm text-[9px] font-bold">
                  {user?.level ?? 1}
                </span>
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    {user?.militaryRank || "Civilian"}
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[10px] uppercase tracking-wider font-semibold">
                    {(user?.level ?? 1) > 1 ? "Division II" : "Division I"}
                  </span>
                </div>
                <span className="font-body-sm text-body-sm text-on-surface-variant">
                  Foundation Tier • {user?.integrityScore ?? 100}% consistency
                </span>
              </div>
            </div>
            <button className="px-3 py-1 rounded-full bg-surface-container-highest text-secondary hover:bg-surface-bright transition-colors font-label-sm text-label-sm font-medium flex items-center gap-1">
              <span>Tier Perks</span>
              <span className="material-symbols-outlined text-[14px]">chevron_right</span>
            </button>
          </div>

          {/* Streak Progress Track */}
          <div className="space-y-2">
            <div className="flex items-center justify-between font-label-sm text-label-sm">
              <span className="text-on-surface-variant">Next Rank Streak Requirement</span>
              <span className="text-primary font-semibold font-label-md text-label-md">
                {user?.streak ?? 0} / 7 days
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
              <div
                className="h-full bg-primary-container rounded-full transition-all duration-700"
                style={{ width: `${streakReqPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-on-surface-variant/80 pt-0.5">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-primary">verified</span>
                {remainingCheckins > 0 ? `${remainingCheckins} consecutive check-ins remaining` : "Promotion Ready!"}
              </span>
              <span className="text-secondary font-medium">Scholar Unlock</span>
            </div>
          </div>
        </div>

        {/* 2x2 Core Gamified KPI Matrix */}
        <div className="grid grid-cols-2 gap-space-sm">
          {/* 1. Streak Card */}
          <div className="flex flex-col justify-between p-space-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors shadow-sm relative overflow-hidden border border-outline/10">
            <div className="flex items-center justify-between mb-3">
              <span className="font-label-md text-label-md text-tertiary-container font-semibold flex items-center gap-1">
                <span
                  className="material-symbols-outlined text-[16px] text-tertiary-container"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  local_fire_department
                </span>
                Streak
              </span>
              <span className="font-label-sm text-[10px] px-1.5 py-0.5 rounded bg-tertiary-container/15 text-tertiary font-semibold">
                {(user?.streak ?? 0) > 0 ? "Active" : "Starting"}
              </span>
            </div>
            <div className="flex flex-col">
              <div className="flex items-baseline gap-1">
                <span className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
                  {user?.streak ?? 0}
                </span>
                <span className="font-body-sm text-body-sm text-on-surface-variant">days</span>
              </div>
              <span className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                Best: {user?.highestStreak ?? user?.streak ?? 0} days
              </span>
            </div>
            <div className="mt-3 pt-2 flex items-center justify-between text-[11px] text-on-surface-variant border-t border-outline/10">
              <span>Daily check-in</span>
              <span className="text-primary font-medium">
                {(user?.streak ?? 0) > 0 ? "Logged" : "Pending"}
              </span>
            </div>
          </div>

          {/* 2. Diamonds / Gems Card */}
          <div className="flex flex-col justify-between p-space-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors shadow-sm relative overflow-hidden border border-outline/10">
            <div className="flex items-center justify-between mb-3">
              <span className="font-label-md text-label-md text-primary font-semibold flex items-center gap-1">
                <span
                  className="material-symbols-outlined text-[16px] text-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  diamond
                </span>
                Diamonds
              </span>
              <span className="font-label-sm text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-semibold">
                +{user?.diamonds ?? 0} wk
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
                {user?.diamonds ?? 0}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                Earned via rituals
              </span>
            </div>
            <div className="mt-3 pt-2 flex items-center justify-between text-[11px] text-on-surface-variant border-t border-outline/10">
              <span>Spendable</span>
              <Link href="/shop" className="text-secondary hover:underline font-medium">
                Shop
              </Link>
            </div>
          </div>

          {/* 3. Total XP Card */}
          <div className="flex flex-col justify-between p-space-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors shadow-sm relative overflow-hidden border border-outline/10">
            <div className="flex items-center justify-between mb-3">
              <span className="font-label-md text-label-md text-secondary font-semibold flex items-center gap-1">
                <span
                  className="material-symbols-outlined text-[16px] text-secondary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  bolt
                </span>
                Total XP
              </span>
              <span className="font-label-sm text-[10px] px-1.5 py-0.5 rounded bg-secondary/15 text-secondary font-semibold">
                Lvl {user?.level ?? 1}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
                {(user?.xp ?? 0).toLocaleString()}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                All-time lifetime XP
              </span>
            </div>
            <div className="mt-3 pt-2 flex items-center justify-between text-[11px] text-on-surface-variant border-t border-outline/10">
              <span>Odyssey rank</span>
              <span className="text-on-surface font-medium">#{Math.max(1, 500 - (user?.xp ?? 0))}</span>
            </div>
          </div>

          {/* 4. Discipline Score Card */}
          <div className="flex flex-col justify-between p-space-md rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors shadow-sm relative overflow-hidden border border-outline/10">
            <div className="flex items-center justify-between mb-3">
              <span className="font-label-md text-label-md text-primary font-semibold flex items-center gap-1">
                <span
                  className="material-symbols-outlined text-[16px] text-primary"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  verified_user
                </span>
                Discipline
              </span>
              <span className="font-label-sm text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-semibold">
                Active
              </span>
            </div>
            <div className="flex flex-col">
              <span className="font-headline-lg text-headline-lg text-on-surface font-bold tracking-tight">
                {user?.integrityScore ?? 100}%
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant mt-1">
                Consistency score
              </span>
            </div>
            <div className="mt-3 pt-2 flex items-center justify-between text-[11px] text-on-surface-variant border-t border-outline/10">
              <span>Scheduled vs done</span>
              <span className="text-primary font-medium">Optimal</span>
            </div>
          </div>
        </div>

        {/* Weekly Rhythm Adherence Stacked Chart */}
        {(() => {
          const todayHours = blocks.reduce((acc, b) => {
            const start = parseInt(b.startTime.split(':')[0], 10);
            const end = parseInt(b.endTime.split(':')[0], 10);
            return acc + (end > start ? end - start : 1);
          }, 0);
          const goalPct = Math.round((todayHours / 24) * 100);
          const days = ["M", "T", "W", "T", "F", "S", "S"];
          const todayIdx = (new Date().getDay() + 6) % 7;

          return (
            <div className="flex flex-col p-space-md rounded-xl bg-surface-container-low shadow-sm space-y-space-md border border-outline/10">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    Weekly Cadence Adherence
                  </h2>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    {todayHours.toFixed(1)} hours logged of 24.0h scheduled
                  </span>
                </div>
                <div className="px-2.5 py-1 rounded-full bg-surface-container-high text-primary font-label-md text-label-md font-semibold">
                  {goalPct}% Goal
                </div>
              </div>

              {/* Stacked Bar Chart */}
              <div className="w-full pt-2">
                <div className="grid grid-cols-7 gap-2 items-end h-40 pb-2">
                  {days.map((day, idx) => {
                    const isToday = idx === todayIdx;
                    const dayHrs = isToday ? todayHours : 0;
                    const heightPct = isToday ? Math.min(100, Math.max(12, Math.round((dayHrs / 24) * 100))) : 8;

                    return (
                      <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end">
                        <span
                          className={`text-[10px] font-label-sm ${
                            isToday ? "text-primary font-semibold" : "text-on-surface-variant"
                          }`}
                        >
                          {dayHrs.toFixed(1)}h
                        </span>
                        <div
                          className={`w-full max-w-[24px] flex flex-col-reverse rounded-t-md overflow-hidden bg-surface-container-highest ${
                            isToday ? "ring-1 ring-primary/40" : ""
                          }`}
                          style={{ height: `${heightPct}%` }}
                        >
                          <div className="bg-primary-container w-full" style={{ height: "60%" }} />
                          <div className="bg-secondary w-full" style={{ height: "25%" }} />
                          <div className="bg-surface-bright w-full" style={{ height: "15%" }} />
                        </div>
                        <span
                          className={`text-[11px] font-label-sm ${
                            isToday ? "text-primary font-bold" : "text-on-surface-variant"
                          }`}
                        >
                          {day}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chart Legend */}
              <div className="flex items-center justify-between pt-2 border-t border-surface-container-highest/60 text-body-sm">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-primary-container" />
                  <span className="text-on-surface-variant text-[12px]">Focus Rhythms</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-secondary" />
                  <span className="text-on-surface-variant text-[12px]">Vitality &amp; Sleep</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-surface-bright" />
                  <span className="text-on-surface-variant text-[12px]">Buffer Rest</span>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Habit Mastery Matrix (7-Day Check-in Grid) */}
        {(() => {
          const days = ["M", "T", "W", "T", "F", "S", "S"];
          const todayIdx = (new Date().getDay() + 6) % 7;
          const completedCount = habits.filter(h => (h.currentStreak || 0) > 0).length;

          return (
            <div className="flex flex-col p-space-md rounded-xl bg-surface-container-low shadow-sm space-y-space-sm border border-outline/10">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    Habit Mastery Matrix
                  </h2>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">
                    Continuous adherence for this cycle
                  </span>
                </div>
                <span className="font-label-sm text-label-sm text-primary font-semibold px-2 py-0.5 rounded bg-primary/10">
                  {completedCount}/{habits.length} Active
                </span>
              </div>

              {/* Days Row Indicator */}
              <div className="grid grid-cols-8 gap-1 pt-2 pb-1 text-center font-label-sm text-[11px] text-on-surface-variant border-b border-outline/10">
                <span className="text-left font-medium">Habit</span>
                {days.map((d, i) => (
                  <span key={i} className={i === todayIdx ? "text-primary font-bold" : ""}>
                    {d}
                  </span>
                ))}
              </div>

              {/* Habit Rows */}
              {habits.slice(0, 5).map((h, i) => {
                const habitStreak = h.currentStreak || 0;

                return (
                  <div
                    key={h.id || i}
                    className="grid grid-cols-8 gap-1 items-center py-1.5 border-t border-surface-container-highest/40"
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="material-symbols-outlined text-[15px] text-primary">
                        {h.icon || "check_circle"}
                      </span>
                      <span className="font-body-sm text-body-sm text-on-surface truncate">
                        {h.name}
                      </span>
                    </div>
                    {days.map((_, di) => {
                      const isToday = di === todayIdx;
                      const isCompleted = isToday
                        ? habitStreak > 0
                        : di < todayIdx && (todayIdx - di) <= habitStreak;

                      return (
                        <div key={di} className="flex justify-center">
                          {isCompleted ? (
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-bold ${
                                isToday ? "bg-primary text-on-primary" : "bg-primary-container text-on-primary"
                              }`}
                            >
                              ✓
                            </span>
                          ) : (
                            <span className="w-5 h-5 rounded-full bg-surface-container-highest text-on-surface-variant flex items-center justify-center text-[10px]">
                              ·
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* Rank Progression Ladder */}
        <div className="flex flex-col p-space-md rounded-xl bg-surface-container-low shadow-sm space-y-space-md border border-outline/10">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Rank Progression Ladder
              </h2>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Tier rewards and milestone progression
              </span>
            </div>
            <span className="font-label-sm text-label-sm text-secondary font-medium">
              Division Path
            </span>
          </div>

          <div className="relative flex flex-col space-y-3 pl-2">
            <div className="absolute left-6 top-3 bottom-3 w-0.5 bg-surface-container-highest" />

            {/* Rank 1: Civilian */}
            <div className="relative flex items-center gap-space-md bg-surface-container p-space-sm rounded-lg shadow-sm ring-1 ring-primary/40">
              <div className="z-10 flex items-center justify-center w-8 h-8 rounded-full bg-primary-container text-on-primary shadow-sm animate-pulse">
                <span className="material-symbols-outlined text-[18px]">psychology</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-headline-sm text-[15px] text-on-surface font-semibold">
                    Civilian (Lvl 1)
                  </span>
                  <span className="font-label-sm text-[11px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
                    {(user?.level ?? 1) > 1 ? "Completed" : "In Progress"}
                  </span>
                </div>
                <span className="font-body-sm text-[12px] text-on-surface-variant">
                  Base habits unlocked • Initial circadian cadence
                </span>
              </div>
            </div>

            {/* Rank 2: Scholar */}
            <div className={`relative flex items-center gap-space-md p-space-sm rounded-lg ${
              (user?.level ?? 1) >= 2
                ? "bg-surface-container shadow-sm ring-1 ring-primary/40"
                : "bg-surface-container/60 opacity-85"
            }`}>
              <div className={`z-10 flex items-center justify-center w-8 h-8 rounded-full ${
                (user?.level ?? 1) >= 2 ? "bg-primary text-on-primary" : "bg-surface-container-highest text-on-surface-variant"
              }`}>
                <span className="material-symbols-outlined text-[18px]">
                  {(user?.level ?? 1) >= 2 ? "school" : "lock"}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-headline-sm text-[15px] text-on-surface font-medium">
                    Scholar (Lvl 2)
                  </span>
                  <span className="font-label-sm text-[11px] text-on-surface-variant font-medium">
                    {(user?.level ?? 1) >= 2 ? "Unlocked" : "Req. 500 XP"}
                  </span>
                </div>
                <span className="font-body-sm text-[12px] text-on-surface-variant">
                  Focus timer multiplier x1.2 • Daily insights
                </span>
              </div>
            </div>

            {/* Rank 3: Ascendant */}
            <div className="relative flex items-center gap-space-md bg-surface-container/40 p-space-sm rounded-lg opacity-75">
              <div className="z-10 flex items-center justify-center w-8 h-8 rounded-full bg-surface-container-highest text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">lock</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-headline-sm text-[15px] text-on-surface font-medium">
                    Ascendant
                  </span>
                  <span className="font-label-sm text-[11px] text-on-surface-variant font-medium">
                    Req. 21 Days
                  </span>
                </div>
                <span className="font-body-sm text-[12px] text-on-surface-variant">
                  Custom theme palette • Detailed bio-rhythm stats
                </span>
              </div>
            </div>

            {/* Rank 4: Titan */}
            <div className="relative flex items-center gap-space-md bg-surface-container/20 p-space-sm rounded-lg opacity-50">
              <div className="z-10 flex items-center justify-center w-8 h-8 rounded-full bg-surface-container-highest text-on-surface-variant">
                <span className="material-symbols-outlined text-[18px]">military_tech</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-headline-sm text-[15px] text-on-surface font-medium">
                    Titan
                  </span>
                  <span className="font-label-sm text-[11px] text-on-surface-variant font-medium">
                    Req. 60 Days
                  </span>
                </div>
                <span className="font-body-sm text-[12px] text-on-surface-variant">
                  Grandmaster badge • Lifelong momentum aura
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Reflection Companion Insight */}
        <div className="p-space-md rounded-xl bg-surface-container-high/60 flex items-center gap-space-md border border-outline/10">
          <div className="w-10 h-10 rounded-full bg-secondary/15 text-secondary flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[22px]">auto_awesome</span>
          </div>
          <div className="flex flex-col">
            <span className="font-label-md text-label-md text-secondary font-semibold">
              Weekly Milestone Insight
            </span>
            <p className="font-body-sm text-body-sm text-on-surface-variant leading-relaxed">
              You completed 92% of scheduled rhythms before 2 PM. Your morning discipline is your
              primary superpower.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-space-sm pt-2">
          <button
            onClick={() => setIsReflecting(true)}
            className="w-full py-3.5 px-space-md rounded-xl bg-primary text-on-primary font-headline-sm text-[16px] font-bold flex items-center justify-center gap-2 shadow-lg active:scale-[0.98] transition-transform hover:bg-primary-fixed"
          >
            <span className="material-symbols-outlined text-[20px]">rate_review</span>
            <span>Complete Weekly Reflection</span>
          </button>
          <button
            onClick={handleExportCSV}
            disabled={exporting}
            className="w-full py-3 px-space-md rounded-xl bg-surface-container text-secondary font-label-lg text-label-lg font-semibold flex items-center justify-center gap-2 hover:bg-surface-bright active:scale-[0.98] transition-all border border-outline/10"
          >
            <span className="material-symbols-outlined text-[18px]">
              {exporting ? "downloading" : "ios_share"}
            </span>
            <span>{exporting ? "Exporting CSV Data..." : "Export Detailed Metric Sheet"}</span>
          </button>
        </div>

        {/* Toast Notification */}
        {toastMsg && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-primary text-on-primary shadow-2xl flex items-center gap-2 transition-all">
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
            <span className="font-label-md text-label-md font-bold">{toastMsg}</span>
          </div>
        )}

        {/* Reflection Modal */}
        {isReflecting && (
          <div
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
            onClick={() => setIsReflecting(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-surface-container p-6 shadow-2xl border border-outline/20 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[22px]">
                    rate_review
                  </span>
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                    Weekly Reflection
                  </h3>
                </div>
                <button
                  onClick={() => setIsReflecting(false)}
                  className="w-8 h-8 rounded-full bg-surface-bright flex items-center justify-center text-on-surface-variant hover:text-on-surface"
                >
                  ✕
                </button>
              </div>

              <p className="text-body-sm text-on-surface-variant">
                What went well this week? What rhythm or friction can you calibrate for next week?
              </p>

              <textarea
                rows={4}
                value={reflectionText}
                onChange={(e) => setReflectionText(e.target.value)}
                placeholder="Write your mindful insights..."
                className="w-full p-3 rounded-xl bg-surface-container-low border border-outline/20 text-on-surface text-sm focus:outline-none focus:border-primary resize-none"
              />

              <button
                onClick={handleCompleteReflection}
                disabled={reflectionSubmitted || !reflectionText.trim()}
                className="w-full py-3 rounded-xl bg-primary disabled:opacity-50 text-on-primary font-label-lg font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">
                  {reflectionSubmitted ? "done" : "auto_awesome"}
                </span>
                <span>{reflectionSubmitted ? "Reflection Saved (+25 XP)" : "Submit Reflection (+25 XP)"}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
