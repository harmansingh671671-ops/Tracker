"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useUserStore } from "@/lib/stores/user-store";
import { db } from "@/lib/db";
import { calculateRank, getRankInfo } from "@/lib/utils/gamification";
import {
  Flame,
  Gem,
  Zap,
  TrendingUp,
  Clock,
  Sparkles,
  ShieldCheck,
  Award,
  Activity,
  Smartphone,
  Layers,
  ArrowRight,
  CheckCircle2,
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
    <div className="flex-1 flex flex-col w-full max-w-xl mx-auto px-4 pb-20 pt-2 space-y-4">
      {/* Title & Filter */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-on-surface">Analytics & Stats</h2>
          <div className="flex items-center gap-2 text-xs text-on-surface-variant font-mono mt-0.5">
            <span className="flex items-center gap-1 text-primary">
              <Activity className="w-3.5 h-3.5" />
              <span>Performance Analytics</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-secondary" />
              <span>7D Window</span>
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-container-high text-secondary text-xs font-mono font-semibold border border-outline/10">
          <Activity className="w-3.5 h-3.5" />
          <span>Active</span>
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
              <div className="flex items-center gap-2 text-xs font-mono text-on-surface-variant mt-1">
                <span className="flex items-center gap-1 text-primary">
                  <Award className="w-3.5 h-3.5" />
                  <span>Top 8%</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-secondary">
                  <Zap className="w-3.5 h-3.5" />
                  <span>Lv. {currentLevel}</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-amber-400">
                  <Flame className="w-3.5 h-3.5" />
                  <span>{user?.streak || 1}d</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Streak Requirement Bar */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="flex items-center gap-1 text-on-surface-variant">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>Next Division Tier</span>
            </span>
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

      {/* 2-TASK WALLPAPER GATEWAY CARD */}
      <Link
        href="/wallpaper"
        className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#121B2B] via-[#0E1624] to-[#0A0F1A] border border-primary/30 hover:border-primary/60 p-4 sm:p-5 shadow-[0_0_24px_rgba(90,240,179,0.08)] hover:shadow-[0_0_32px_rgba(90,240,179,0.18)] transition-all duration-300 block"
      >
        <div className="absolute -right-8 -bottom-8 w-32 h-32 rounded-full bg-primary/15 blur-2xl pointer-events-none group-hover:bg-primary/25 transition-all" />
        <div className="absolute top-0 right-0 w-24 h-24 bg-secondary/10 rounded-full blur-xl pointer-events-none" />

        <div className="flex items-center justify-between gap-3 relative z-10">
          {/* Left: Mini stylized 2-task silhouette */}
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-14 rounded-2xl bg-[#090E17] border border-primary/40 flex flex-col justify-between p-1.5 shrink-0 shadow-inner group-hover:scale-105 transition-transform">
              <div className="w-full h-4 rounded-md bg-primary/20 border border-primary/60 flex items-center justify-between px-1">
                <span className="text-[7px] font-mono font-bold text-primary">NOW</span>
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              </div>
              <div className="w-full h-4 rounded-md bg-secondary/15 border border-secondary/30 flex items-center px-1">
                <span className="text-[7px] font-mono font-bold text-secondary">NEXT</span>
              </div>
            </div>

            {/* Middle: Title & Symbolic Specs */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-mono font-bold border border-primary/30">
                  <Sparkles className="w-3 h-3" />
                  <span>2-TASK PREVIEW</span>
                </span>
                <span className="flex items-center gap-1 text-[10px] font-mono text-secondary">
                  <Layers className="w-3 h-3" />
                  <span>Lock • Home</span>
                </span>
              </div>

              <h3 className="text-sm sm:text-base font-bold text-white group-hover:text-primary transition-colors flex items-center gap-1.5">
                <span>Wallpaper Studio</span>
              </h3>

              <div className="flex items-center gap-3 text-[11px] font-mono text-on-surface-variant">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                  <span>Live 60 FPS</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-amber-200">
                  <Clock className="w-3 h-3" />
                  <span>NOW + NEXT</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right: Action pill button */}
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/15 group-hover:bg-primary text-primary group-hover:text-[#003825] border border-primary/30 group-hover:border-primary shrink-0 transition-all duration-300 shadow-md group-hover:scale-110">
            <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>
      </Link>

      {/* 2x2 KPI Matrix */}
      <div className="grid grid-cols-2 gap-3">
        {/* Streak */}
        <div className="p-4 rounded-2xl bg-surface-container-low border border-outline/10 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-amber-400 flex items-center gap-1">
              <Flame className="w-4 h-4" />
              <span>Streak</span>
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
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-on-surface-variant mt-1">
              <CheckCircle2 className="w-3 h-3 text-amber-400" />
              <span>Daily Check-in</span>
            </div>
          </div>
        </div>

        {/* Diamonds */}
        <div className="p-4 rounded-2xl bg-surface-container-low border border-outline/10 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-primary flex items-center gap-1">
              <Gem className="w-4 h-4" />
              <span>Diamonds</span>
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
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-on-surface-variant mt-1">
              <Gem className="w-3 h-3 text-primary" />
              <span>Armory Vault</span>
            </div>
          </div>
        </div>

        {/* Total XP */}
        <div className="p-4 rounded-2xl bg-surface-container-low border border-outline/10 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-secondary flex items-center gap-1">
              <Zap className="w-4 h-4" />
              <span>Total XP</span>
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
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-on-surface-variant mt-1">
              <Zap className="w-3 h-3 text-secondary" />
              <span>+{targetXp - currentXp} to Lv.{currentLevel + 1}</span>
            </div>
          </div>
        </div>

        {/* Adherence */}
        <div className="p-4 rounded-2xl bg-surface-container-low border border-outline/10 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-emerald-400 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" />
              <span>Adherence</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-400/15 text-emerald-400 font-bold">
              Optimal
            </span>
          </div>
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold font-mono text-on-surface">93%</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-on-surface-variant mt-1">
              <Clock className="w-3 h-3 text-emerald-400" />
              <span>{totalPlannedHours}h Structured</span>
            </div>
          </div>
        </div>
      </div>

      {/* Weekly Rhythm Adherence Chart */}
      <div className="p-5 rounded-3xl bg-surface-container-low border border-outline/10 space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-on-surface">Weekly Rhythm Adherence</h3>
            <div className="flex items-center gap-2 text-xs font-mono text-on-surface-variant mt-0.5">
              <span className="flex items-center gap-1 text-primary">
                <Clock className="w-3.5 h-3.5" />
                <span>46.5h / 50.0h</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-400">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>93% Adherence</span>
              </span>
            </div>
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
