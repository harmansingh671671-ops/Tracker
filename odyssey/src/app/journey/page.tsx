"use client";

import { useEffect, useState } from "react";
import { useUserStore } from "@/lib/stores/user-store";

export default function JourneyPage() {
  const { user, fetchUser, addXp, addDiamonds } = useUserStore();
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isChallengeStarted, setIsChallengeStarted] = useState(false);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const handleStartChallenge = async () => {
    if (isChallengeStarted) return;
    setIsChallengeStarted(true);
    await addXp(50);
    await addDiamonds(5);
    if (user && user.streak === 0) {
      await useUserStore.getState().updateUser({ streak: 1, highestStreak: Math.max(1, user.highestStreak) });
    }
    setToastMsg(`Day ${activeDay} Challenge Launched! +50 XP & +5 Gems awarded.`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const activeDay = Math.max(1, (user?.streak ?? 0) + 1);
  const activeChapter = activeDay <= 7 ? 1 : activeDay <= 14 ? 2 : activeDay <= 21 ? 3 : 4;
  const chapterTitle = activeChapter === 1 
    ? "Chapter 1: Initiating Foundations" 
    : activeChapter === 2 
    ? "Chapter 2: Grounded Momentum" 
    : activeChapter === 3 
    ? "Chapter 3: Deep Mastery" 
    : "Chapter 4: Transcendence";

  const xpCurrent = user ? user.xp % 500 : 0;
  const xpPercent = Math.min(100, Math.round((xpCurrent / 500) * 100));

  return (
    <div className="min-h-screen bg-surface">
      <div className="flex flex-col w-full relative">
        {/* Subtle Ambient Glow Orbs */}
        <div className="relative w-full overflow-hidden px-gutter pb-space-2xl">
          <div className="absolute top-10 -left-20 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="absolute top-96 -right-20 w-80 h-80 rounded-full bg-secondary/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-40 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-tertiary-container/10 blur-3xl pointer-events-none" />

          {/* Overview Hero Card */}
          <section className="relative z-10 w-full mt-space-sm rounded-xl bg-surface-container-high/90 backdrop-blur-md p-space-md shadow-xl border border-outline/10">
            {/* Top Row: Division & Streak */}
            <div className="flex items-center justify-between gap-space-sm mb-space-sm">
              <div className="flex items-center gap-space-xs min-w-0">
                <div className="w-9 h-9 rounded-lg bg-surface-container flex items-center justify-center text-primary flex-shrink-0">
                  <span
                    className="material-symbols-outlined text-[20px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    eco
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-headline-sm text-headline-sm text-on-surface font-bold truncate">
                      {user?.militaryRank || "Civilian"}
                    </span>
                    <span className="px-1.5 py-0.5 rounded-full bg-surface-bright font-label-sm text-label-sm text-secondary font-semibold">
                      Div I
                    </span>
                  </div>
                  <span className="font-body-sm text-body-sm text-on-surface-variant truncate">
                    Level {user?.level ?? 1} Path Seeker
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-surface-container-highest text-tertiary-container flex-shrink-0 shadow-sm">
                <span
                  className="material-symbols-outlined text-[17px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  local_fire_department
                </span>
                <span className="font-label-md text-label-md font-bold text-tertiary">
                  {user?.streak ?? 0} Day Streak
                </span>
              </div>
            </div>

            {/* Chapter Badge */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary mb-space-sm">
              <span className="material-symbols-outlined text-[14px]">flag</span>
              <span className="font-label-sm text-label-sm font-semibold">
                Day {activeDay} of 30 • {chapterTitle}
              </span>
            </div>

            {/* XP Bar */}
            <div className="space-y-1.5 mt-1">
              <div className="flex justify-between items-center text-on-surface-variant font-label-sm text-label-sm">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                  {xpCurrent} / 500 XP
                </span>
                <span className="text-secondary font-medium">To Next Division Rank</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-surface-container-lowest overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary-fixed-dim via-primary to-primary-container transition-all duration-500"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
            </div>
          </section>

          {/* Trail Legend & Filter Switch */}
          <div className="relative z-10 flex items-center justify-between mt-space-lg mb-space-xs px-1">
            <div className="flex items-center gap-2">
              <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Journey Trail
              </span>
              <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-label-sm text-label-sm">
                Act II
              </span>
            </div>
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
              <span className="material-symbols-outlined text-[15px] text-primary">navigation</span>
              <span>Curved Path</span>
            </div>
          </div>

          {/* Stepping Stone Interactive Path Canvas */}
          <div className="relative w-full mt-space-sm pt-space-xs pb-space-lg">
            {/* Background SVG curved path */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              fill="none"
              preserveAspectRatio="none"
              viewBox="0 0 360 880"
            >
              <defs>
                <linearGradient id="trailWeek1" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.75" />
                </linearGradient>
                <linearGradient id="trailWeek1To2" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#34d399" stopOpacity="0.95" />
                </linearGradient>
                <linearGradient id="trailWeek2" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#34d399" stopOpacity="0.95" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.85" />
                </linearGradient>
                <linearGradient id="trailWeek2To3" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                  <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.4" />
                </linearGradient>
                <linearGradient id="trailWeek3" x1="0%" x2="0%" y1="0%" y2="100%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.2" />
                </linearGradient>
              </defs>
              <path
                d="M 140,40 Q 190,95 240,150"
                stroke="url(#trailWeek1To2)"
                strokeDasharray="6 6"
                strokeLinecap="round"
                strokeWidth="4"
              />
              <path
                d="M 240,150 Q 230,210 190,260"
                stroke="url(#trailWeek2)"
                strokeDasharray="6 6"
                strokeLinecap="round"
                strokeWidth="4"
              />
              <path
                d="M 190,260 Q 170,300 180,335"
                stroke="url(#trailWeek2)"
                strokeDasharray="6 6"
                strokeLinecap="round"
                strokeWidth="4"
              />
              <path
                d="M 180,380 Q 140,460 135,530"
                stroke="url(#trailWeek2To3)"
                strokeDasharray="6 6"
                strokeLinecap="round"
                strokeWidth="4"
              />
              <path
                d="M 135,530 Q 130,590 165,640 T 215,740 T 180,800"
                stroke="url(#trailWeek3)"
                strokeDasharray="6 6"
                strokeLinecap="round"
                strokeWidth="4"
              />
            </svg>

            {/* Phase I: Days 1-10 */}
            <div className="relative z-10 flex items-center justify-between px-3 py-1 mb-3 -mt-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0284c7]/20 border border-[#38bdf8]/30 text-[#38bdf8] font-label-sm text-label-sm font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] animate-pulse" />
                <span>Phase I • Foundation (Days 1–10)</span>
              </div>
              <span className="font-label-sm text-label-sm text-[#38bdf8]/80 font-medium">
                Azure Realm
              </span>
            </div>

            {/* Phase Badge */}
            <div className="relative z-10 flex items-center justify-between px-3 py-1 mb-3 -mt-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-primary font-label-sm text-label-sm font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <span>
                  {activeDay <= 7
                    ? "Phase I • Foundation (Days 1–7)"
                    : activeDay <= 14
                    ? "Phase II • Momentum (Days 8–14)"
                    : "Phase III • Mastery (Days 15–21)"}
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-primary font-medium">
                {activeDay <= 7 ? "Azure Realm" : activeDay <= 14 ? "Emerald Path" : "Amber Haven"}
              </span>
            </div>

            {/* Preceding Completed Node (if activeDay > 1) */}
            {activeDay > 1 && (
              <div
                className="relative z-10 flex flex-col items-center mb-8"
                style={{ transform: "translateX(-20px)" }}
              >
                <div className="relative w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center shadow-lg">
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#0284c7] to-[#38bdf8] flex items-center justify-center text-on-surface font-bold shadow-md">
                    <span
                      className="material-symbols-outlined text-[24px] text-white"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      check
                    </span>
                  </div>
                </div>
                <div className="mt-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-highest/90 border border-[#38bdf8]/30 backdrop-blur-sm text-center">
                  <span className="font-label-sm text-label-sm text-on-surface font-semibold">
                    Day {activeDay - 1}
                  </span>
                  <span className="font-label-sm text-label-sm text-[#38bdf8] block text-[10px] font-medium">
                    Fulfilled (+50 XP)
                  </span>
                </div>
              </div>
            )}

            {/* TODAY Active Node & Anchor Card */}
            <div className="relative z-20 flex flex-col items-center my-4">
              <div className="relative flex items-center justify-center">
                <div className="absolute -inset-3 rounded-full bg-primary/25 blur-md animate-pulse" />
                <div className="absolute -inset-1 rounded-full bg-primary/40 animate-ping opacity-30" />
                <button
                  onClick={handleStartChallenge}
                  className="relative w-20 h-20 rounded-full bg-gradient-to-tr from-primary via-primary-fixed to-primary-container p-1 shadow-2xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <div className="w-full h-full rounded-full bg-surface-container-lowest flex flex-col items-center justify-center text-primary">
                    <span
                      className="material-symbols-outlined text-[28px] animate-bounce"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      bolt
                    </span>
                    <span className="font-label-sm text-label-sm font-bold text-on-surface -mt-0.5 tracking-wider">
                      {isChallengeStarted ? "ACTIVE" : "START"}
                    </span>
                  </div>
                </button>
              </div>
              <div className="mt-2 px-3 py-1 rounded-full bg-primary text-on-primary font-label-md text-label-md font-bold shadow-md">
                Day {activeDay} • TODAY
              </div>

              {/* Anchor Card */}
              <div className="w-full max-w-sm mt-4 p-space-md rounded-xl bg-surface-container-high/95 backdrop-blur-lg shadow-xl text-left relative overflow-hidden border border-outline/10">
                <div className="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-full blur-xl pointer-events-none" />
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
                    <span className="font-label-sm text-label-sm font-semibold uppercase tracking-wider text-primary">
                      Today's Focus Anchor
                    </span>
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-surface-bright text-tertiary font-label-sm text-label-sm font-semibold">
                    <span className="material-symbols-outlined text-[14px]">schedule</span>
                    <span>45m</span>
                  </div>
                </div>
                <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold mb-1">
                  {activeDay === 1
                    ? "Mindful Intention & Hydration Anchor"
                    : `Day ${activeDay} Deep Work & Vitality Anchor`}
                </h3>
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-sm leading-relaxed">
                  {activeDay === 1
                    ? "Eliminate cognitive fragmentation. Initiate your very first mindful session with a tall glass of water."
                    : "Maintain your momentum. Complete one uninterrupted deep work block and stay in steady cadence."}
                </p>
                <div className="flex items-center justify-between pt-space-xs">
                  <div className="flex items-center gap-space-xs">
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary font-label-sm text-label-sm font-bold">
                      <span className="material-symbols-outlined text-[14px]">bolt</span>
                      <span>+50 XP</span>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-label-sm font-semibold">
                      <span className="material-symbols-outlined text-[13px]">diamond</span>
                      <span>+5 Gems</span>
                    </div>
                  </div>
                  <button
                    onClick={handleStartChallenge}
                    className="px-3 py-1.5 rounded-lg bg-primary text-on-primary font-label-sm text-label-sm font-bold flex items-center gap-1 active:scale-95 transition-transform shadow-md hover:bg-primary-fixed"
                  >
                    <span>{isChallengeStarted ? "Completed" : "Begin"}</span>
                    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Next Locked Milestone Node (Day + 1) */}
            <div
              className="relative z-10 flex flex-col items-center my-8"
              style={{ transform: "translateX(45px)" }}
            >
              <div className="relative group">
                <div className="absolute -inset-1 rounded-full bg-tertiary-container/15 blur-sm" />
                <div className="relative w-13 h-13 rounded-full bg-surface-container-high/90 border border-tertiary-container/30 backdrop-blur-sm flex items-center justify-center text-tertiary shadow-md">
                  <span className="material-symbols-outlined text-[20px]">lock</span>
                </div>
              </div>
              <div className="mt-1.5 px-2.5 py-0.5 rounded-full bg-surface-container/90 border border-tertiary-container/20 text-center">
                <span className="font-label-sm text-label-sm text-tertiary font-medium">
                  Day {activeDay + 1}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant block text-[10px]">
                  Requires Day {activeDay}
                </span>
              </div>
            </div>

            {/* Locked Milestone Node (Day + 2) */}
            <div
              className="relative z-10 flex flex-col items-center my-8"
              style={{ transform: "translateX(-25px)" }}
            >
              <div className="relative group">
                <div className="absolute -inset-1 rounded-full bg-tertiary-container/15 blur-sm" />
                <div className="relative w-13 h-13 rounded-full bg-surface-container-high/90 border border-tertiary-container/30 backdrop-blur-sm flex items-center justify-center text-tertiary shadow-md">
                  <span className="material-symbols-outlined text-[20px]">lock</span>
                </div>
              </div>
              <div className="mt-1.5 px-2.5 py-0.5 rounded-full bg-surface-container/90 border border-tertiary-container/20 text-center">
                <span className="font-label-sm text-label-sm text-tertiary font-medium">
                  Day {activeDay + 2}
                </span>
                <span className="font-label-sm text-label-sm text-on-surface-variant block text-[10px]">
                  Locked Ritual
                </span>
              </div>
            </div>

            {/* Day 17 Cache */}
            <div
              className="relative z-10 flex flex-col items-center my-8"
              style={{ transform: "translateX(35px)" }}
            >
              <div className="relative group cursor-pointer">
                <div className="absolute -inset-1.5 rounded-2xl bg-gradient-to-r from-tertiary-container/40 via-tertiary/30 to-tertiary-container/40 blur-md group-hover:blur-lg transition-all" />
                <div className="relative px-3.5 py-2.5 rounded-xl bg-surface-container-high border border-tertiary-container/40 flex items-center gap-2.5 shadow-lg">
                  <div className="w-9 h-9 rounded-lg bg-tertiary-container text-on-tertiary flex items-center justify-center shadow-inner">
                    <span
                      className="material-symbols-outlined text-[22px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      redeem
                    </span>
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-1">
                      <span className="font-label-sm text-label-sm font-bold text-tertiary">
                        Day 17 Cache
                      </span>
                      <span className="material-symbols-outlined text-[14px] text-tertiary-container">
                        lock
                      </span>
                    </div>
                    <span className="font-label-sm text-label-sm text-on-surface-variant block text-[11px]">
                      Streak Freeze or 25 Gems
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Week 3 Checkpoint Card */}
            <div className="relative z-10 mt-12 w-full max-w-sm mx-auto">
              <div className="rounded-xl bg-gradient-to-br from-surface-container-highest via-surface-container-high to-surface-container p-space-md shadow-2xl relative overflow-hidden border border-tertiary-container/20">
                <div className="absolute -right-4 -bottom-4 text-tertiary/10 pointer-events-none">
                  <span
                    className="material-symbols-outlined text-[110px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    military_tech
                  </span>
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-tertiary-container/20 border border-tertiary-container/30 text-tertiary font-label-sm text-label-sm font-bold">
                    <span
                      className="material-symbols-outlined text-[15px]"
                      style={{ fontVariationSettings: "'FILL' 1" }}
                    >
                      emoji_events
                    </span>
                    <span>WEEK 3 CHECKPOINT • DAY 21</span>
                  </div>
                  <span className="font-label-sm text-label-sm text-secondary font-semibold">
                    7 Days Left
                  </span>
                </div>
                <h4 className="font-headline-sm text-headline-sm text-on-surface font-bold mb-1">
                  Master of Consistency
                </h4>
                <p className="font-body-sm text-body-sm text-on-surface-variant mb-space-sm">
                  Complete the second chapter to unlock the Celestial Avatar Frame, claim +50 Gems,
                  and earn immediate promotion into the Scholar Division.
                </p>
                <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                  <div className="p-2 rounded-lg bg-surface-container-lowest/80 flex flex-col items-center">
                    <span className="material-symbols-outlined text-secondary text-[20px] mb-0.5">
                      verified
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface font-bold text-[10px]">
                      Scholar Title
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-surface-container-lowest/80 flex flex-col items-center">
                    <span className="material-symbols-outlined text-primary text-[20px] mb-0.5">
                      diamond
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface font-bold text-[10px]">
                      +50 Gems
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-surface-container-lowest/80 flex flex-col items-center">
                    <span className="material-symbols-outlined text-tertiary text-[20px] mb-0.5">
                      shield
                    </span>
                    <span className="font-label-sm text-label-sm text-on-surface font-bold text-[10px]">
                      Aura Frame
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Persistent Action Trigger Banner */}
          <div className="sticky bottom-2 z-30 w-full mt-space-md">
            <div className="p-2 rounded-2xl bg-surface-container-high/90 backdrop-blur-xl shadow-2xl border border-outline/10">
              <button
                onClick={handleStartChallenge}
                className="w-full py-3.5 px-4 rounded-xl bg-primary hover:bg-primary-container text-on-primary font-headline-sm text-headline-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-98"
              >
                <span
                  className="material-symbols-outlined text-[22px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  play_circle
                </span>
                <span>Enter Day {activeDay} Challenge (+50 XP)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Toast Notification */}
        {toastMsg && (
          <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full bg-primary text-on-primary shadow-2xl flex items-center gap-2 transition-all">
            <span
              className="material-symbols-outlined text-[20px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              celebration
            </span>
            <span className="font-label-md text-label-md font-bold">{toastMsg}</span>
          </div>
        )}
      </div>
    </div>
  );
}
