"use client";

import { useEffect, useState, useMemo } from "react";
import { useUserStore } from "@/lib/stores/user-store";
import { db } from "@/lib/db";
import { calculateRank, getRankInfo } from "@/lib/utils/gamification";
import {
  Flame,
  Gem,
  Zap,
  TrendingUp,
  Calendar,
  Sparkles,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";

export default function StatsPage() {
  const { user, fetchUser } = useUserStore();
  const [totalPlannedHours, setTotalPlannedHours] = useState(0);
  const [totalHabitsCount, setTotalHabitsCount] = useState(0);

  useEffect(() => {
    fetchUser();
    db.scheduleBlocks.count().then(setTotalPlannedHours);
    db.habits.count().then(setTotalHabitsCount);
  }, [fetchUser]);

  const rankInfo = useMemo(() => {
    return getRankInfo(user?.militaryRank || calculateRank(user?.streak ?? 0));
  }, [user?.militaryRank, user?.streak]);

  const currentLevel = user?.level || 1;
  const currentXp = user?.xp || 420;
  const targetXp = currentLevel * 1000;
  const xpPercent = Math.min(100, Math.round((currentXp / targetXp) * 100));

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
    <div className="flex-1 flex flex-col w-full max-w-xl mx-auto px-4 pb-16 pt-2 space-y-5">
      {/* Title & Filter */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-on-surface">Analytics & Stats</h2>
          <p className="text-xs text-on-surface-variant">Consistency metrics & cadence adherence</p>
        </div>
        <div className="px-3 py-1.5 rounded-full bg-surface-container-high text-secondary text-xs font-mono font-semibold border border-outline/10">
          This Week
        </div>
      </div>

      {/* Hero Rank Card */}
      <div className="relative overflow-hidden rounded-3xl bg-surface-container-low p-5 border border-outline/10 shadow-md space-y-3.5">
        <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-container-high text-primary flex items-center justify-center text-2xl shadow-inner border border-primary/20">
              {rankInfo.badge}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-on-surface">{rankInfo.name}</h3>
                <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[10px] font-mono font-bold">
                  Division II
                </span>
              </div>
              <p className="text-xs text-on-surface-variant font-mono mt-0.5">
                Top 8% Cadence Consistency
              </p>
            </div>
          </div>
        </div>

        {/* Streak Requirement Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-on-surface-variant">Next Division Requirement</span>
            <span className="text-primary font-bold">{user?.streak || 1} / 7 days</span>
          </div>
          <div className="w-full h-2 rounded-full bg-surface-container-highest overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700 shadow-sm shadow-primary/40"
              style={{ width: `${Math.min(100, Math.round(((user?.streak || 1) / 7) * 100))}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2x2 KPI Matrix */}
      <div className="grid grid-cols-2 gap-3">
        {/* Streak */}
        <div className="p-4 rounded-2xl bg-surface-container-low border border-outline/10 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-amber-400 flex items-center gap-1">
              <Flame className="w-4 h-4" />
              Streak
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-400 font-bold">
              Active
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold font-mono text-on-surface">{user?.streak || 1}</span>
              <span className="text-xs text-on-surface-variant">days</span>
            </div>
            <p className="text-[11px] text-on-surface-variant mt-1 font-mono">Daily check-in logged</p>
          </div>
        </div>

        {/* Diamonds */}
        <div className="p-4 rounded-2xl bg-surface-container-low border border-outline/10 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-primary flex items-center gap-1">
              <Gem className="w-4 h-4" />
              Diamonds
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/15 text-primary font-bold">
              +35 wk
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold font-mono text-on-surface">{user?.diamonds || 0}</span>
              <span className="text-xs text-on-surface-variant">💎</span>
            </div>
            <p className="text-[11px] text-on-surface-variant mt-1 font-mono">Spendable in Armory</p>
          </div>
        </div>

        {/* Total XP */}
        <div className="p-4 rounded-2xl bg-surface-container-low border border-outline/10 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-secondary flex items-center gap-1">
              <Zap className="w-4 h-4" />
              Total XP
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary/15 text-secondary font-bold">
              Lv. {currentLevel}
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold font-mono text-on-surface">{currentXp}</span>
              <span className="text-xs text-on-surface-variant">XP</span>
            </div>
            <p className="text-[11px] text-on-surface-variant mt-1 font-mono">+{targetXp - currentXp} XP to next</p>
          </div>
        </div>

        {/* Adherence */}
        <div className="p-4 rounded-2xl bg-surface-container-low border border-outline/10 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              Adherence
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-400/15 text-emerald-400 font-bold">
              Optimal
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold font-mono text-on-surface">93%</span>
            </div>
            <p className="text-[11px] text-on-surface-variant mt-1 font-mono">{totalPlannedHours} Hours structured</p>
          </div>
        </div>
      </div>

      {/* Weekly Rhythm Adherence Chart */}
      <div className="p-5 rounded-3xl bg-surface-container-low border border-outline/10 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-on-surface">Weekly Rhythm Adherence</h3>
            <p className="text-xs text-on-surface-variant font-mono">46.5 hours logged of 50.0h scheduled</p>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-surface-container text-primary font-mono text-xs font-bold border border-primary/20">
            93% Goal
          </span>
        </div>

        {/* Stacked Bars */}
        <div className="grid grid-cols-7 gap-2 items-end h-36 pt-2 pb-1">
          {weekBars.map((bar, idx) => (
            <div key={idx} className="flex flex-col items-center gap-1.5 h-full justify-end">
              <span className="text-[9px] font-mono text-on-surface-variant">{bar.hours}h</span>
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
