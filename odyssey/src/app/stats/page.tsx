"use client";

import { useEffect, useState, useMemo } from "react";
import { useUserStore } from "@/lib/stores/user-store";
import { useHabitStore } from "@/lib/stores/habit-store";
import { useScheduleStore } from "@/lib/stores/schedule-store";
import { getRankInfo, calculateRank } from "@/lib/utils/gamification";
import {
  BarChart3,
  Flame,
  Sparkles,
  Zap,
  ShieldCheck,
  Download,
  Edit3,
  X,
  CheckCircle2,
  Trophy,
} from "lucide-react";

export default function StatsPage() {
  const { user, fetchUser, addXp } = useUserStore();
  const { habits, fetchHabits } = useHabitStore();
  const { blocks, fetchBlocksForDate } = useScheduleStore();

  const [isReflecting, setIsReflecting] = useState(false);
  const [reflectionText, setReflectionText] = useState("");
  const [exporting, setExporting] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().split("T")[0], []);

  const rankInfo = useMemo(
    () => getRankInfo(user?.militaryRank || calculateRank(user?.streak ?? 0, user?.integrityScore ?? 100)),
    [user?.militaryRank, user?.streak, user?.integrityScore]
  );

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
    setToastMsg("Weekly Reflection saved! +25 XP awarded.");
    setIsReflecting(false);
    setReflectionText("");
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleExportCSV = () => {
    setExporting(true);

    let csvContent = "data:text/csv;charset=utf-8,Category,Item,Status,Metric\n";
    csvContent += `Profile,Streak,Active,${user?.streak ?? 0} days\n`;
    csvContent += `Profile,Discipline,Score,${user?.integrityScore ?? 100}%\n`;
    csvContent += `Profile,Total XP,Current,${user?.xp ?? 0}\n`;
    csvContent += `Profile,Diamonds,Balance,${user?.diamonds ?? 0}\n`;

    habits.forEach((h) => {
      csvContent += `Habit,${h.name},Streak,${h.currentStreak || 0}d\n`;
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
      setToastMsg("Metrics sheet exported successfully!");
      setTimeout(() => setToastMsg(null), 2500);
    }, 800);
  };

  const todayHours = useMemo(() => {
    return blocks.reduce((acc, b) => {
      const start = parseInt(b.startTime.split(":")[0], 10);
      let end = parseInt(b.endTime.split(":")[0], 10);
      if (b.endTime === "24:00" || (end === 0 && start > 0)) end = 24;
      return acc + (end > start ? end - start : 1);
    }, 0);
  }, [blocks]);

  const goalPct = Math.min(100, Math.round((todayHours / 24) * 100));
  const days = ["M", "T", "W", "T", "F", "S", "S"];
  const todayIdx = (new Date().getDay() + 6) % 7;

  const xpCurrent = user ? user.xp % 500 : 0;
  const xpPercent = Math.min(100, Math.round((xpCurrent / 500) * 100));

  return (
    <div className="view-transition min-h-screen bg-surface">
      <div className="flex flex-col w-full max-w-xl sm:max-w-2xl mx-auto px-3 sm:px-4 pb-28 pt-2 space-y-3 touch-pan-y">
        {/* Header Bar: Matching Today and Journey */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 text-primary">
              <BarChart3 className="w-4 h-4 shrink-0" />
              <span className="text-[11px] uppercase tracking-wider font-semibold font-mono">
                Performance & Analytics
              </span>
            </div>
            <h1 className="text-lg sm:text-xl text-on-surface font-bold tracking-tight mt-0.5">
              Discipline & Stats
            </h1>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => setIsReflecting(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-bright text-primary text-xs font-mono font-bold border border-primary/20 transition-all active:scale-95 cursor-pointer shadow-xs"
              title="Record Weekly Reflection"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Reflect</span>
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              disabled={exporting}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-high hover:bg-surface-bright text-secondary text-xs font-mono font-bold border border-secondary/20 transition-all active:scale-95 cursor-pointer shadow-xs"
              title="Export CSV Metric Sheet"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exporting ? "..." : "Export"}</span>
            </button>
          </div>
        </div>

        {/* Hero Rank & Level Progress Card */}
        <section className="rounded-2xl bg-surface-container-low border border-outline/10 p-3.5 sm:p-4 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary font-mono font-black text-sm shrink-0">
                L{user?.level ?? 1}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-base">{rankInfo.badge}</span>
                  <h3 className="font-bold text-sm sm:text-base text-on-surface truncate">
                    {rankInfo.name}
                  </h3>
                  <span className="px-2 py-0.2 rounded-full bg-secondary/15 border border-secondary/25 text-secondary text-[10px] font-mono font-bold">
                    {rankInfo.division} Division
                  </span>
                </div>
                <span className="text-[11px] font-mono text-on-surface-variant">
                  {user?.integrityScore ?? 100}% Integrity • {user?.streak ?? 0} Day Cadence
                </span>
              </div>
            </div>

            <span className="text-xs font-mono font-bold text-secondary shrink-0">
              {xpCurrent} / 500 XP
            </span>
          </div>

          {/* XP Progress Bar */}
          <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
              style={{ width: `${xpPercent}%` }}
            />
          </div>
        </section>

        {/* 2x2 Core Gamified KPI Matrix */}
        <div className="grid grid-cols-2 gap-2">
          {/* 1. Streak */}
          <div className="p-3 rounded-2xl bg-surface-container-low border border-outline/10 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-amber-400">
              <div className="flex items-center gap-1 text-[11px] font-mono font-bold uppercase tracking-wider">
                <Flame className="w-3.5 h-3.5 fill-amber-400" />
                <span>Streak</span>
              </div>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-amber-400/15">
                Active
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black font-mono text-on-surface">
                {user?.streak ?? 0}
              </span>
              <span className="text-xs font-mono text-on-surface-variant font-medium">days</span>
            </div>
            <span className="text-[10.5px] font-mono text-on-surface-variant block">
              Best: {user?.highestStreak ?? user?.streak ?? 0}d
            </span>
          </div>

          {/* 2. Diamonds */}
          <div className="p-3 rounded-2xl bg-surface-container-low border border-outline/10 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-primary">
              <div className="flex items-center gap-1 text-[11px] font-mono font-bold uppercase tracking-wider">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Diamonds</span>
              </div>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-primary/15">
                Vault
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black font-mono text-on-surface">
                {user?.diamonds ?? 0}
              </span>
              <span className="text-xs font-mono text-on-surface-variant font-medium">gems</span>
            </div>
            <span className="text-[10.5px] font-mono text-on-surface-variant block">
              Spend in Shop
            </span>
          </div>

          {/* 3. Total XP */}
          <div className="p-3 rounded-2xl bg-surface-container-low border border-outline/10 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-secondary">
              <div className="flex items-center gap-1 text-[11px] font-mono font-bold uppercase tracking-wider">
                <Zap className="w-3.5 h-3.5" />
                <span>Total XP</span>
              </div>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-secondary/15">
                Lvl {user?.level ?? 1}
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black font-mono text-on-surface">
                {(user?.xp ?? 0).toLocaleString()}
              </span>
              <span className="text-xs font-mono text-on-surface-variant font-medium">XP</span>
            </div>
            <span className="text-[10.5px] font-mono text-on-surface-variant block">
              Lifetime progress
            </span>
          </div>

          {/* 4. Discipline Integrity */}
          <div className="p-3 rounded-2xl bg-surface-container-low border border-outline/10 shadow-xs space-y-1">
            <div className="flex items-center justify-between text-emerald-400">
              <div className="flex items-center gap-1 text-[11px] font-mono font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Discipline</span>
              </div>
              <span className="text-[10px] font-mono font-semibold px-1.5 py-0.2 rounded bg-emerald-400/15">
                Optimal
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-2xl font-black font-mono text-on-surface">
                {user?.integrityScore ?? 100}%
              </span>
            </div>
            <span className="text-[10.5px] font-mono text-on-surface-variant block">
              Cadence adherence
            </span>
          </div>
        </div>

        {/* Weekly Cadence Adherence Chart */}
        <section className="rounded-2xl bg-surface-container-low border border-outline/10 p-3.5 sm:p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-primary">
              <Trophy className="w-4 h-4" />
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-on-surface">
                Weekly Cadence Adherence
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-primary">
              {todayHours}h / 24h ({goalPct}%)
            </span>
          </div>

          {/* 7-Day Bar Chart */}
          <div className="grid grid-cols-7 gap-2 items-end h-32 pt-2 pb-1 border-b border-outline/10">
            {days.map((day, idx) => {
              const isToday = idx === todayIdx;
              const dayHrs = isToday ? todayHours : 0;
              const heightPct = isToday
                ? Math.min(100, Math.max(16, Math.round((dayHrs / 24) * 100)))
                : 10;

              return (
                <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end">
                  <span
                    className={`text-[10px] font-mono ${
                      isToday ? "text-primary font-bold" : "text-on-surface-variant/60"
                    }`}
                  >
                    {dayHrs}h
                  </span>
                  <div
                    className={`w-full max-w-[28px] rounded-t-lg transition-all ${
                      isToday
                        ? "bg-gradient-to-t from-primary to-secondary shadow-sm shadow-primary/20"
                        : "bg-surface-container"
                    }`}
                    style={{ height: `${heightPct}%` }}
                  />
                  <span
                    className={`text-[11px] font-mono ${
                      isToday ? "text-primary font-bold" : "text-on-surface-variant/70"
                    }`}
                  >
                    {day}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-on-surface-variant">
            <span>24h Daily Target</span>
            <span className="text-primary font-semibold">
              {todayHours >= 24 ? "24h Target Reached" : `${24 - todayHours}h Remaining Today`}
            </span>
          </div>
        </section>

        {/* Milestone Ladder / Division Path */}
        <section className="rounded-2xl bg-surface-container-low border border-outline/10 p-3.5 sm:p-4 shadow-sm space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-on-surface">
              Division Progression Path
            </span>
            <span className="text-[11px] font-mono text-secondary font-semibold">
              Level {user?.level ?? 1} Active
            </span>
          </div>

          <div className="grid grid-cols-4 gap-1.5 pt-1 text-center font-mono">
            {[
              { name: "Beginner", req: "Starter", badge: "🌱", unlocked: (user?.streak ?? 0) >= 0 },
              { name: "Builder", req: "14 Days", badge: "🔨", unlocked: (user?.streak ?? 0) >= 14 },
              { name: "Expert", req: "90 Days", badge: "⚔️", unlocked: (user?.streak ?? 0) >= 90 },
              { name: "Legend", req: "365 Days", badge: "👑", unlocked: (user?.streak ?? 0) >= 365 },
            ].map((tier, i) => (
              <div
                key={i}
                className={`p-2 rounded-xl border text-center transition-all ${
                  tier.unlocked
                    ? "bg-surface-container-high border-primary/30 text-primary"
                    : "bg-surface-container border-outline/10 text-on-surface-variant/50"
                }`}
              >
                <span className="text-sm block">{tier.badge}</span>
                <span className="text-[11px] font-bold block truncate">{tier.name}</span>
                <span className="text-[9.5px] opacity-75 block mt-0.5">{tier.req}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Toast Notification */}
        {toastMsg && (
          <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-primary text-on-primary shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
            <span>{toastMsg}</span>
          </div>
        )}

        {/* Reflection Modal */}
        {isReflecting && (
          <div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
            onClick={() => setIsReflecting(false)}
          >
            <div
              className="w-full max-w-sm rounded-2xl bg-surface-container p-5 shadow-2xl border border-outline/20 space-y-3.5 text-left"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-outline/10 pb-2">
                <div className="flex items-center gap-1.5 text-primary">
                  <Edit3 className="w-4 h-4" />
                  <h3 className="text-sm font-bold text-on-surface">Weekly Reflection</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReflecting(false)}
                  className="w-7 h-7 rounded-lg bg-surface-bright flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs text-on-surface-variant">
                What went well this week? What rhythm or friction can you calibrate for next week?
              </p>

              <textarea
                rows={4}
                value={reflectionText}
                onChange={(e) => setReflectionText(e.target.value)}
                placeholder="Write your mindful insights..."
                className="w-full p-3 rounded-xl bg-surface-container-low border border-outline/20 text-on-surface text-xs focus:outline-none focus:border-primary resize-none"
              />

              <div className="flex items-center justify-end gap-2 pt-1 border-t border-outline/10">
                <button
                  type="button"
                  onClick={() => setIsReflecting(false)}
                  className="px-3 py-1.5 rounded-xl text-xs font-mono font-medium text-on-surface-variant hover:text-on-surface cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCompleteReflection}
                  disabled={!reflectionText.trim()}
                  className="px-4 py-1.5 rounded-xl bg-primary disabled:opacity-50 text-on-primary text-xs font-mono font-bold hover:bg-primary-fixed active:scale-95 transition-all shadow-md cursor-pointer"
                >
                  Save Reflection (+25 XP)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
