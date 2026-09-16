"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUserStore } from "@/lib/stores/user-store";
import { db } from "@/lib/db";
import {
  Check,
  Zap,
  Clock,
  Play,
  CheckCircle2,
  Trophy,
  Gift,
  Award,
  Crown,
  Sparkles,
  Compass,
  Calendar,
  Plus,
  ChevronDown,
} from "lucide-react";

interface MilestoneInfo {
  title: string;
  badge: string;
  reward: string;
  Icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}

function getMilestoneForDay(day: number): MilestoneInfo | null {
  if (day % 7 !== 0) return null;
  const weekNum = day / 7;
  if (weekNum === 1) {
    return {
      title: "Week 1 Foundations",
      badge: "Chapter I Milestone",
      reward: "+25 Gems • Streak Freeze",
      Icon: Gift,
      accentColor: "text-amber-400 bg-amber-400/10 border-amber-400/30",
    };
  }
  if (weekNum === 2) {
    return {
      title: "Fortnight Momentum",
      badge: "Chapter II Milestone",
      reward: "+50 Gems • Scholar Division",
      Icon: Award,
      accentColor: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
    };
  }
  if (weekNum === 3) {
    return {
      title: "Master of Consistency",
      badge: "Chapter III Checkpoint",
      reward: "+50 Gems • Aura Frame",
      Icon: Trophy,
      accentColor: "text-cyan-400 bg-cyan-400/10 border-cyan-400/30",
    };
  }
  return {
    title: `Week ${weekNum} Ascension`,
    badge: `Milestone Week ${weekNum}`,
    reward: `+${Math.min(100, 25 * weekNum)} Gems • Celestial Crown`,
    Icon: Crown,
    accentColor: "text-purple-400 bg-purple-400/10 border-purple-400/30",
  };
}

// Duolingo winding serpentine horizontal offsets (in pixels)
const DUO_OFFSETS = [0, -55, -75, -40, 0, 40, 75, 55];

function getNodeOffset(index: number): number {
  return DUO_OFFSETS[index % DUO_OFFSETS.length];
}

export default function JourneyPage() {
  const router = useRouter();
  const { user, fetchUser, addXp, addDiamonds } = useUserStore();
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isChallengeStarted, setIsChallengeStarted] = useState(false);

  // Endless chain window: loads initial 7 days (Today + next 7 days = 8 days total)
  const [windowDaysCount, setWindowDaysCount] = useState<number>(8);

  // Map of scheduled hours for each date string
  const [scheduledHoursMap, setScheduledHoursMap] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const activeDay = Math.max(1, (user?.streak ?? 0) + 1);
  const activeChapter = Math.ceil(activeDay / 7);
  const chapterTitle =
    activeChapter === 1
      ? "Initiating Foundations"
      : activeChapter === 2
      ? "Grounded Momentum"
      : activeChapter === 3
      ? "Deep Mastery"
      : "Transcendence";

  const xpCurrent = user ? user.xp % 500 : 0;
  const xpPercent = Math.min(100, Math.round((xpCurrent / 500) * 100));

  // Generate date information relative to activeDay
  const getDayMeta = useCallback(
    (dayNum: number) => {
      const d = new Date();
      d.setDate(d.getDate() + (dayNum - activeDay));
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;
      const dayLabel = d.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      return {
        dateStr,
        dayLabel,
        isPast: dayNum < activeDay,
        isToday: dayNum === activeDay,
        isTomorrow: dayNum === activeDay + 1,
      };
    },
    [activeDay]
  );

  // Array of days currently rendered in the window
  const visibleDays = useMemo(() => {
    const days: number[] = [];
    if (activeDay > 1) {
      days.push(activeDay - 1);
    }
    for (let i = 0; i < windowDaysCount; i++) {
      days.push(activeDay + i);
    }
    return days;
  }, [activeDay, windowDaysCount]);

  // Query planned hours for all visible days from Dexie DB
  const loadScheduledHours = useCallback(async () => {
    if (!user) return;
    const hoursRecord: Record<string, number> = {};

    for (const d of visibleDays) {
      const { dateStr } = getDayMeta(d);
      const blocks = await db.scheduleBlocks
        .where("[userId+date]")
        .equals([user.id, dateStr])
        .toArray();

      const occupied = new Set<number>();
      for (const b of blocks) {
        const sH = parseInt(b.startTime.split(":")[0], 10);
        let eH = parseInt(b.endTime.split(":")[0], 10);
        if (b.endTime === "24:00" || (eH === 0 && sH > 0)) eH = 24;
        for (let h = sH; h < eH; h++) {
          occupied.add(h);
        }
      }
      hoursRecord[dateStr] = occupied.size;
    }
    setScheduledHoursMap(hoursRecord);
  }, [user, visibleDays, getDayMeta]);

  useEffect(() => {
    loadScheduledHours();
  }, [loadScheduledHours]);

  const handleStartChallenge = async () => {
    if (isChallengeStarted) return;
    setIsChallengeStarted(true);
    await addXp(50);
    await addDiamonds(5);
    if (user && user.streak === 0) {
      await useUserStore.getState().updateUser({
        streak: 1,
        highestStreak: Math.max(1, user.highestStreak),
      });
    }
    setToastMsg(`Day ${activeDay} Challenge Complete! +50 XP & +5 Gems awarded.`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Directly navigate to full schedule page in front of user (no popup!)
  const handleOpenScheduler = (dayNum: number) => {
    const meta = getDayMeta(dayNum);
    if (meta.isToday) {
      router.push("/planner");
    } else {
      router.push(`/planner?date=${meta.dateStr}&day=${dayNum}`);
    }
  };

  const handleLoadMoreDays = () => {
    setWindowDaysCount((prev) => prev + 7);
  };

  return (
    <div className="min-h-screen bg-surface">
      <div className="w-full max-w-md sm:max-w-lg mx-auto px-3 sm:px-4 pb-28 pt-2 space-y-4">
        {/* Top Header Progress Card */}
        <section className="rounded-2xl bg-surface-container-high/90 border border-outline/15 p-3.5 sm:p-4 shadow-sm space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 text-primary">
                <Compass className="w-4 h-4" />
                <span className="text-[11px] uppercase tracking-wider font-semibold">
                  Endless Odyssey Trail
                </span>
              </div>
              <h1 className="text-lg sm:text-xl text-on-surface font-bold tracking-tight mt-0.5">
                Chapter {activeChapter}: {chapterTitle}
              </h1>
              <span className="text-xs text-on-surface-variant mt-0.5">
                Day {activeDay} Active • 7-Day Rolling Path
              </span>
            </div>

            <div className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary font-mono text-xs font-bold shrink-0">
              Day {activeDay} Today
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="space-y-1.5 pt-1 border-t border-outline/10">
            <div className="flex justify-between items-center text-xs font-mono">
              <span className="text-on-surface-variant font-medium">
                Division Rank: <span className="text-on-surface font-bold">{user?.militaryRank || "Civilian"} Div I</span>
              </span>
              <span className="text-secondary font-bold">
                {xpCurrent} / 500 XP
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-surface-container overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>
        </section>

        {/* Duolingo Winding Curved Trail */}
        <div className="relative flex flex-col items-center py-4 select-none">
          {visibleDays.map((day, idx) => {
            const meta = getDayMeta(day);
            const isCompleted = day < activeDay;
            const isCurrent = day === activeDay;
            const milestone = getMilestoneForDay(day);
            const plannedHours = scheduledHoursMap[meta.dateStr] || 0;

            const offsetX = getNodeOffset(idx);
            const nextDay = idx < visibleDays.length - 1 ? visibleDays[idx + 1] : null;
            const nextOffsetX = nextDay !== null ? getNodeOffset(idx + 1) : 0;
            const isNextCompleted = nextDay !== null && nextDay < activeDay;
            const isNextCurrent = nextDay !== null && nextDay === activeDay;

            return (
              <div key={day} className="flex flex-col items-center w-full">
                {/* Milestone Banner if applicable */}
                {milestone && (
                  <div className="w-full max-w-xs my-2 p-2.5 rounded-2xl bg-surface-container border border-outline/20 shadow-sm flex items-center justify-between gap-2.5 z-20">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg border flex items-center justify-center shrink-0 ${milestone.accentColor}`}
                      >
                        <milestone.Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[9.5px] font-bold font-mono uppercase tracking-wider text-amber-400 truncate">
                          {milestone.badge}
                        </span>
                        <h4 className="text-xs font-bold text-on-surface truncate">
                          {milestone.title}
                        </h4>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-surface-container-high text-[10px] font-mono font-semibold text-on-surface-variant shrink-0">
                      {milestone.reward}
                    </span>
                  </div>
                )}

                {/* Node Container with Duolingo Winding Horizontal Offset */}
                <div
                  style={{ transform: `translateX(${offsetX}px)` }}
                  className="relative z-10 flex flex-col items-center transition-transform duration-300 my-1"
                >
                  {/* Completed Step */}
                  {isCompleted && (
                    <div className="flex flex-col items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenScheduler(day)}
                        className="w-14 h-14 rounded-full bg-emerald-500 border-b-4 border-emerald-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-105 active:translate-y-1 active:border-b-0 cursor-pointer"
                        title="View Day schedule"
                      >
                        <Check className="w-6 h-6 stroke-[3]" />
                      </button>

                      <div className="flex items-center gap-1">
                        <span className="px-2 py-0.5 rounded-full bg-surface-container border border-emerald-500/30 text-[10px] font-mono font-semibold text-emerald-400">
                          Day {day}
                        </span>
                        {plannedHours > 0 && (
                          <span className="text-[9.5px] font-mono text-on-surface-variant">
                            {plannedHours}h
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Active Today Step (Hero Node with Pulse) */}
                  {isCurrent && (
                    <div className="flex flex-col items-center space-y-2">
                      <div className="relative flex items-center justify-center">
                        <div className="absolute -inset-3 rounded-full bg-primary/25 blur-md animate-pulse pointer-events-none" />
                        <button
                          type="button"
                          onClick={() => handleOpenScheduler(day)}
                          className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-primary to-primary-container border-b-4 border-primary-fixed-dim p-0.5 shadow-xl shadow-primary/30 transition-all hover:scale-105 active:translate-y-1 active:border-b-0 flex items-center justify-center cursor-pointer"
                          title="Open Today's schedule"
                        >
                          <div className="w-full h-full rounded-full bg-surface-container-lowest flex flex-col items-center justify-center text-primary">
                            <Zap className="w-6 h-6 fill-primary" />
                            <span className="text-[8.5px] font-bold font-mono tracking-wider -mt-0.5">
                              TODAY
                            </span>
                          </div>
                        </button>
                      </div>

                      {/* Status badge pill */}
                      <button
                        type="button"
                        onClick={() => handleOpenScheduler(day)}
                        className={`px-3 py-1 rounded-full text-xs font-mono font-bold border flex items-center gap-1 shadow-xs transition-all cursor-pointer ${
                          plannedHours === 24
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                            : plannedHours > 0
                            ? "bg-amber-400/15 border-amber-400/40 text-amber-400"
                            : "bg-primary text-on-primary border-primary hover:bg-primary-fixed"
                        }`}
                      >
                        <Calendar className="w-3 h-3" />
                        <span>
                          {plannedHours === 24
                            ? "24h Locked"
                            : plannedHours > 0
                            ? `${plannedHours}h Planned`
                            : "Plan Today"}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Upcoming Future Step (Clickable to open schedule page directly in front of user!) */}
                  {!isCompleted && !isCurrent && (
                    <div className="flex flex-col items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenScheduler(day)}
                        className={`w-13 h-13 rounded-full border-b-4 flex flex-col items-center justify-center font-mono font-bold transition-all hover:scale-105 active:translate-y-1 active:border-b-0 cursor-pointer shadow-md ${
                          plannedHours === 24
                            ? "bg-surface-container-high border-emerald-500/50 text-emerald-400 hover:border-emerald-500"
                            : plannedHours > 0
                            ? "bg-surface-container-high border-amber-400/50 text-amber-400 hover:border-amber-400"
                            : "bg-surface-container border-outline/35 text-on-surface hover:border-primary/50"
                        }`}
                        title={`Write schedule for Day ${day}`}
                      >
                        <span className="text-sm">{day}</span>
                        {meta.isTomorrow && (
                          <span className="text-[8px] uppercase tracking-tighter text-amber-400 -mt-0.5">
                            TMRW
                          </span>
                        )}
                      </button>

                      {/* Quick status pill under the node */}
                      <button
                        type="button"
                        onClick={() => handleOpenScheduler(day)}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold border flex items-center gap-1 transition-all cursor-pointer ${
                          plannedHours === 24
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : plannedHours > 0
                            ? "bg-amber-400/10 border-amber-400/30 text-amber-400"
                            : "bg-surface-container-high border-outline/20 text-on-surface-variant hover:text-primary hover:border-primary/40"
                        }`}
                      >
                        {plannedHours === 24 ? (
                          <>
                            <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                            <span>24h</span>
                          </>
                        ) : plannedHours > 0 ? (
                          <>
                            <Clock className="w-2.5 h-2.5" />
                            <span>{plannedHours}h</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-2.5 h-2.5" />
                            <span>Plan</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* Today's Focus Card */}
                {isCurrent && (
                  <div className="w-full max-w-sm my-3 p-3.5 sm:p-4 rounded-2xl bg-surface-container-high/95 border border-primary/35 shadow-xl space-y-2.5 text-left z-20">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10.5px] uppercase font-bold tracking-wider text-primary font-mono flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                        Today's Focus Anchor
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-surface-bright text-tertiary text-[11px] font-mono font-semibold flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        45m
                      </span>
                    </div>

                    <div>
                      <h3 className="font-bold text-sm sm:text-base text-on-surface">
                        {day === 1
                          ? "Mindful Intention & Hydration Anchor"
                          : `Day ${day} Deep Cadence & Focus Anchor`}
                      </h3>
                      <p className="text-xs text-on-surface-variant mt-0.5 leading-relaxed">
                        {day === 1
                          ? "Initiate your mindful journey with an intentional deep focus block and hydration check."
                          : "Complete your core deep work block without distractions and maintain steady daily rhythm."}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-outline/10 gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[11px] font-mono font-bold">
                          +50 XP
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container text-[11px] font-mono font-semibold">
                          +5 Gems
                        </span>
                      </div>

                      <button
                        onClick={handleStartChallenge}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 shadow-md ${
                          isChallengeStarted
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                            : "bg-primary text-on-primary hover:bg-primary-fixed shadow-primary/20"
                        }`}
                      >
                        {isChallengeStarted ? (
                          <>
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Completed</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-3.5 h-3.5 fill-current" />
                            <span>Begin Challenge</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Duolingo S-Curved Connector Ribbon to Next Node */}
                {nextDay !== null && (
                  <div className="w-full flex items-center justify-center my-1 pointer-events-none">
                    <svg
                      className="w-64 h-14 overflow-visible"
                      viewBox="0 0 256 56"
                      fill="none"
                    >
                      <defs>
                        <linearGradient
                          id={`duo-curve-${idx}`}
                          x1="0%"
                          y1="0%"
                          x2="0%"
                          y2="100%"
                        >
                          <stop
                            offset="0%"
                            stopColor={isCompleted ? "#10b981" : isCurrent ? "#6366f1" : "#475569"}
                            stopOpacity={isCompleted ? "0.9" : "0.7"}
                          />
                          <stop
                            offset="100%"
                            stopColor={
                              isNextCompleted
                                ? "#10b981"
                                : isNextCurrent
                                ? "#6366f1"
                                : "#475569"
                            }
                            stopOpacity={isNextCompleted ? "0.9" : "0.6"}
                          />
                        </linearGradient>
                      </defs>

                      {/* Outer Track 3D Bevel/Shadow */}
                      <path
                        d={`M ${128 + offsetX} 0 C ${128 + offsetX} 28, ${128 + nextOffsetX} 28, ${128 + nextOffsetX} 56`}
                        stroke="rgba(15, 23, 42, 0.85)"
                        strokeWidth="13"
                        strokeLinecap="round"
                      />

                      {/* Main Continuous Curved Trail Ribbon */}
                      <path
                        d={`M ${128 + offsetX} 0 C ${128 + offsetX} 28, ${128 + nextOffsetX} 28, ${128 + nextOffsetX} 56`}
                        stroke={`url(#duo-curve-${idx})`}
                        strokeWidth="7"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}

          {/* Endless Expansion Button at Bottom */}
          <div className="relative z-10 pt-6 flex flex-col items-center">
            <button
              type="button"
              onClick={handleLoadMoreDays}
              className="px-5 py-2.5 rounded-full bg-surface-container-high border border-outline/25 hover:border-primary/50 text-xs sm:text-sm font-mono font-semibold text-on-surface hover:text-primary shadow-lg flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Extend Journey (+7 Days)</span>
              <ChevronDown className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-mono text-on-surface-variant/60 mt-1.5">
              Chain extends endlessly • Plan as many days ahead as you want
            </span>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMsg && (
          <div className="fixed top-18 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-primary text-on-primary shadow-2xl flex items-center gap-2 text-xs font-bold">
            <Sparkles className="w-4 h-4" />
            <span>{toastMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
