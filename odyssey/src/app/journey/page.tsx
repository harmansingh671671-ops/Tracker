"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useUserStore } from "@/lib/stores/user-store";
import { getJourneyDayNumber } from "@/lib/utils/journey";
import { calculateRank, getRankInfo } from "@/lib/utils/gamification";
import {
  Check,
  Bolt,
  Lock,
  Gift,
  Flame,
  ArrowRight,
} from "lucide-react";

export default function JourneyPage() {
  const { user, fetchUser } = useUserStore();
  const [activeSession, setActiveSession] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const [curvePaths, setCurvePaths] = useState<{
    completedPath: string;
    upcomingPath: string;
  }>({
    completedPath: "",
    upcomingPath: "",
  });

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

  // Generate a window of 11 days centered around activeDay
  const nodes = useMemo(() => {
    const startDay = Math.max(1, activeDay - 3);
    const endDay = startDay + 10;
    const list = [];
    for (let d = startDay; d <= endDay; d++) {
      const isPast = d < activeDay;
      const isCurrent = d === activeDay;
      const isMilestone = d % 7 === 0;

      // Smooth serpentine wave pattern:
      // cycle 0 (activeDay): Center
      // cycle 1: Left
      // cycle 2: Center
      // cycle 3: Right
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
  }, [activeDay]);

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
    // Vertical tangents ensure the line passes vertically through the center of each icon
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

    // Short timeout to guarantee measurement after layout reflow
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
  }, [updatePath, activeSession]);

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
                      data-journey-node={node.day}
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
                  <div
                    data-journey-node={node.day}
                    className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-md shadow-primary/20"
                  >
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
                  data-journey-node={node.day}
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
