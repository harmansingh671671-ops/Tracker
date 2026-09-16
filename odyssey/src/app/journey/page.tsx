"use client";

import { useEffect, useState } from "react";
import { useUserStore } from "@/lib/stores/user-store";
import {
  Check,
  Lock,
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
} from "lucide-react";

interface Milestone {
  day: number;
  title: string;
  badge: string;
  reward: string;
  Icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
}

const MILESTONES: Record<number, Milestone> = {
  7: {
    day: 7,
    title: "Week 1 Foundations",
    badge: "Chapter I Milestone",
    reward: "+25 Gems • Streak Freeze",
    Icon: Gift,
    accentColor: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  },
  14: {
    day: 14,
    title: "Fortnight Momentum",
    badge: "Chapter II Milestone",
    reward: "+50 Gems • Scholar Division",
    Icon: Award,
    accentColor: "text-emerald-400 bg-emerald-400/10 border-emerald-400/30",
  },
  21: {
    day: 21,
    title: "Master of Consistency",
    badge: "Chapter III Checkpoint",
    reward: "+50 Gems • Aura Frame",
    Icon: Trophy,
    accentColor: "text-cyan-400 bg-cyan-400/10 border-cyan-400/30",
  },
  30: {
    day: 30,
    title: "Odyssey Ascension",
    badge: "Grandmaster Finale",
    reward: "+100 Gems • Celestial Crown",
    Icon: Crown,
    accentColor: "text-purple-400 bg-purple-400/10 border-purple-400/30",
  },
};

export default function JourneyPage() {
  const { user, fetchUser, addXp, addDiamonds } = useUserStore();
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isChallengeStarted, setIsChallengeStarted] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const activeDay = Math.max(1, (user?.streak ?? 0) + 1);
  const activeChapter = activeDay <= 7 ? 1 : activeDay <= 14 ? 2 : activeDay <= 21 ? 3 : 4;
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

  const handleStartChallenge = async () => {
    if (isChallengeStarted) return;
    setIsChallengeStarted(true);
    await addXp(50);
    await addDiamonds(5);
    if (user && user.streak === 0) {
      await useUserStore.getState().updateUser({ streak: 1, highestStreak: Math.max(1, user.highestStreak) });
    }
    setToastMsg(`Day ${activeDay} Challenge Complete! +50 XP & +5 Gems awarded.`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const daysArray = Array.from({ length: 30 }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-surface">
      <div className="w-full max-w-xl sm:max-w-2xl mx-auto px-3 sm:px-4 pb-28 pt-2 space-y-4">
        {/* Top Header Progress Card — No duplicate streak or level info */}
        <section className="rounded-2xl bg-surface-container-high/90 border border-outline/15 p-3.5 sm:p-4 shadow-sm space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 text-primary">
                <Compass className="w-4 h-4" />
                <span className="text-[11px] uppercase tracking-wider font-semibold">
                  30-Day Odyssey
                </span>
              </div>
              <h1 className="text-lg sm:text-xl text-on-surface font-bold tracking-tight mt-0.5">
                Chapter {activeChapter}: {chapterTitle}
              </h1>
              <span className="text-xs text-on-surface-variant mt-0.5">
                Day {activeDay} of 30 • {30 - activeDay} days remaining
              </span>
            </div>

            <div className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/25 text-primary font-mono text-xs font-bold shrink-0">
              Day {activeDay} Active
            </div>
          </div>

          {/* XP Progress Bar to Next Rank */}
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

        {/* Vertical Journey Trail */}
        <div className="relative flex flex-col items-center py-2 space-y-6">
          {/* Continuous Center Spine Line */}
          <div className="absolute top-6 bottom-6 w-0.5 bg-gradient-to-b from-emerald-500/80 via-primary/70 to-outline/20 pointer-events-none" />

          {daysArray.map((day) => {
            const isCompleted = day < activeDay;
            const isCurrent = day === activeDay;
            const isLocked = day > activeDay;
            const milestone = MILESTONES[day];

            return (
              <div key={day} className="relative z-10 flex flex-col items-center w-full max-w-sm">
                {/* Milestone Reward Card */}
                {milestone && (
                  <div className="w-full mb-3 p-3 rounded-xl bg-surface-container border border-outline/20 shadow-sm flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${milestone.accentColor}`}>
                        <milestone.Icon className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-bold font-mono uppercase tracking-wider text-amber-400 truncate">
                          {milestone.badge}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-on-surface truncate">
                          {milestone.title}
                        </h4>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-surface-container-high text-[10.5px] font-mono font-semibold text-on-surface-variant shrink-0">
                      {milestone.reward}
                    </span>
                  </div>
                )}

                {/* Completed Day Node */}
                {isCompleted && (
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-12 h-12 rounded-full bg-surface-container-high border-2 border-emerald-500/70 flex items-center justify-center text-emerald-400 shadow-md shadow-emerald-500/15 transition-transform hover:scale-105">
                      <Check className="w-5 h-5 stroke-[2.5]" />
                    </div>
                    <div className="px-2.5 py-0.5 rounded-full bg-surface-container-high border border-emerald-500/30 text-[10.5px] font-mono font-semibold text-emerald-400 shadow-xs">
                      Day {day} • Done (+50 XP)
                    </div>
                  </div>
                )}

                {/* Today's Active Day Node & Focus Card */}
                {isCurrent && (
                  <div className="flex flex-col items-center w-full space-y-3">
                    <div className="relative flex items-center justify-center">
                      <div className="absolute -inset-2 rounded-full bg-primary/25 blur-md animate-pulse pointer-events-none" />
                      <button
                        onClick={handleStartChallenge}
                        className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-primary to-primary-container p-0.5 shadow-xl shadow-primary/25 transition-transform active:scale-95 flex items-center justify-center cursor-pointer"
                        title="Start Day Challenge"
                      >
                        <div className="w-full h-full rounded-full bg-surface-container-lowest flex flex-col items-center justify-center text-primary">
                          <Zap className="w-6 h-6 fill-primary" />
                          <span className="text-[9px] font-bold font-mono tracking-wider -mt-0.5">
                            {isChallengeStarted ? "ACTIVE" : "START"}
                          </span>
                        </div>
                      </button>
                    </div>

                    <div className="px-3 py-1 rounded-full bg-primary text-on-primary text-xs font-bold font-mono shadow-md">
                      Day {day} • TODAY
                    </div>

                    {/* Integrated Focus Card (Direct In-Place Action) */}
                    <div className="w-full p-3.5 sm:p-4 rounded-2xl bg-surface-container-high/95 border border-primary/35 shadow-xl space-y-2.5 text-left">
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

                        {/* Clean in-place action button */}
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
                  </div>
                )}

                {/* Locked Upcoming Day Node */}
                {isLocked && (
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full bg-surface-container border border-outline/20 flex items-center justify-center text-on-surface-variant/50 shadow-xs">
                      <Lock className="w-4 h-4 stroke-[1.75]" />
                    </div>
                    <span className="text-[10px] font-mono text-on-surface-variant/60 font-medium">
                      Day {day}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
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
