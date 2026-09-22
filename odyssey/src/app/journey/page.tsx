"use client";

import { useEffect, useState, useMemo } from "react";
import { useUserStore } from "@/lib/stores/user-store";
import { getJourneyDayNumber, getDateForJourneyDay } from "@/lib/utils/journey";
import { calculateRank, getRankInfo } from "@/lib/utils/gamification";
import {
  Check,
  Bolt,
  Lock,
  Gift,
  Trophy,
  Award,
  Sparkles,
  Flame,
  ArrowRight,
} from "lucide-react";

export default function JourneyPage() {
  const { user, fetchUser } = useUserStore();
  const [activeSession, setActiveSession] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const activeDay = useMemo(() => {
    return getJourneyDayNumber(user?.createdAt);
  }, [user?.createdAt]);

  const rankInfo = useMemo(() => {
    return getRankInfo(user?.militaryRank || calculateRank(user?.streak ?? 0));
  }, [user?.militaryRank, user?.streak]);

  const currentLevel = user?.level || 1;
  const currentXp = user?.xp || 420;
  const targetXp = currentLevel * 1000;
  const xpPercent = Math.min(100, Math.round((currentXp / targetXp) * 100));

  // Generate a window of 14 days centered around activeDay
  const nodes = useMemo(() => {
    const startDay = Math.max(1, activeDay - 3);
    const endDay = startDay + 10;
    const list = [];
    for (let d = startDay; d <= endDay; d++) {
      const isPast = d < activeDay;
      const isCurrent = d === activeDay;
      const isMilestone = d % 7 === 0;
      // Zigzag horizontal offset
      const offset = (d % 3 === 0) ? "translate-x-12" : (d % 3 === 1) ? "-translate-x-12" : "translate-x-0";
      list.push({ day: d, isPast, isCurrent, isMilestone, offset });
    }
    return list;
  }, [activeDay]);

  return (
    <div className="flex-1 flex flex-col w-full max-w-xl mx-auto px-4 pb-16 pt-2 space-y-6">
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
            <h2 className="text-xl font-bold tracking-tight text-on-surface">Endless Odyssey Trail</h2>
            <div className="flex items-center gap-2 mt-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-container-low text-on-surface text-xs font-mono font-semibold border border-outline/10">
                <span>{rankInfo.badge}</span>
                <span className="text-primary">{rankInfo.name}</span>
                <span className="text-on-surface-variant">• Level {currentLevel}</span>
              </div>
            </div>
          </div>

          {/* XP Gauge */}
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-on-surface-variant">Progression to Level {currentLevel + 1}</span>
              <span className="text-primary font-bold">{currentXp} / {targetXp} XP ({xpPercent}%)</span>
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
      <div className="relative w-full flex flex-col items-center py-6">
        {/* Curved Path Background SVG */}
        <div className="absolute inset-0 flex justify-center pointer-events-none -z-0">
          <div className="w-1 h-full bg-gradient-to-b from-primary via-primary-container to-surface-container-highest rounded-full" />
        </div>

        {/* Nodes Flow */}
        <div className="w-full flex flex-col items-center space-y-10 z-10">
          {nodes.map((node) => {
            if (node.isCurrent) {
              return (
                <div key={node.day} className="relative flex flex-col items-center w-full">
                  {/* Today's Radiant Pulsing Beacon */}
                  <div className="relative flex items-center justify-center">
                    <div className="absolute w-20 h-20 rounded-full bg-primary/20 animate-ping" />
                    <div className="absolute w-16 h-16 rounded-full bg-primary/30 blur-md" />
                    <button
                      onClick={() => setActiveSession(!activeSession)}
                      className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-primary to-primary-container text-on-primary flex items-center justify-center shadow-lg shadow-primary/40 hover:scale-105 active:scale-95 transition-transform"
                    >
                      <Bolt className="w-7 h-7 fill-current" />
                    </button>
                  </div>

                  {/* Attached Active Day Card */}
                  <div className="w-full max-w-sm mt-3 bg-surface-container rounded-2xl p-4 shadow-xl border border-primary/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-mono uppercase text-primary font-bold">TODAY'S ANCHOR</span>
                        <h3 className="text-base font-bold text-on-surface">Day {node.day} Exploration</h3>
                      </div>
                      <span className="text-2xl">🌱</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-mono font-semibold">
                        +50 XP
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-secondary/10 text-secondary text-xs font-mono font-semibold">
                        +10 💎
                      </span>
                    </div>

                    <button
                      onClick={() => setActiveSession(!activeSession)}
                      className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                        activeSession
                          ? "bg-surface-container-highest text-primary"
                          : "bg-primary text-on-primary shadow-md shadow-primary/20 hover:opacity-95"
                      }`}
                    >
                      <span>{activeSession ? "Session Active (44:59)" : "Begin Daily Focus Cadence"}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            }

            if (node.isPast) {
              return (
                <div key={node.day} className={`flex flex-col items-center ${node.offset} transition-transform`}>
                  <div className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md shadow-primary/20">
                    <Check className="w-6 h-6 stroke-[3]" />
                  </div>
                  <span className="mt-1 px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[11px] font-mono">
                    Day {node.day} Completed
                  </span>
                </div>
              );
            }

            // Upcoming Locked Node
            return (
              <div key={node.day} className={`flex flex-col items-center ${node.offset} transition-transform opacity-75`}>
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center border ${
                    node.isMilestone
                      ? "bg-secondary-container/50 border-secondary text-secondary shadow-md"
                      : "bg-surface-container border-outline/20 text-on-surface-variant"
                  }`}
                >
                  {node.isMilestone ? <Gift className="w-6 h-6" /> : <Lock className="w-5 h-5" />}
                </div>
                <span className="mt-1 px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant text-[11px] font-mono">
                  {node.isMilestone ? `Day ${node.day} Milestone Chest` : `Day ${node.day}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
