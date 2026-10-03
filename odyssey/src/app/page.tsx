"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  Circle,
  Smartphone,
  ShieldCheck,
  Zap,
  Flame,
  Award,
  ChevronRight,
  Brain,
  Heart,
  MessageSquare,
  Coffee,
  Moon,
  Radio,
  Play,
  Layers,
  Lock,
  Compass,
  Check,
  Activity,
  Sliders,
  Sun,
} from "lucide-react";

// Interactive Circadian Time Segments for Dial Simulation
const TIME_SLICES = [
  {
    hour: 7,
    timeStr: "07:00",
    name: "Morning Vitality & Sunlight",
    category: "Vitality",
    catKey: "vitality",
    color: "#34D399",
    bgClass: "from-emerald-50 via-white to-violet-50 dark:from-emerald-950/50 dark:via-surface-container dark:to-violet-950/50",
    badgeBg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
    icon: Heart,
    desc: "Hydration, breathwork, Zone 2 movement",
  },
  {
    hour: 9,
    timeStr: "09:00",
    name: "Deep Architectural Focus",
    category: "Deep Focus",
    catKey: "work",
    color: "#6C00FF",
    bgClass: "from-violet-50 via-white to-violet-50 dark:from-violet-950/50 dark:via-surface-container dark:to-violet-950/50",
    badgeBg: "bg-primary/15 border-primary/30 text-primary",
    icon: Brain,
    desc: "Zero-distraction high cognitive output",
  },
  {
    hour: 13,
    timeStr: "13:00",
    name: "Midday Renewal & Fuel",
    category: "Renewal",
    catKey: "renewal",
    color: "#FBBF24",
    bgClass: "from-amber-50 via-white to-violet-50 dark:from-amber-950/50 dark:via-surface-container dark:to-violet-950/50",
    badgeBg: "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-400",
    icon: Coffee,
    desc: "Clean nutrition, mental decompression",
  },
  {
    hour: 15,
    timeStr: "15:00",
    name: "Product Sprint & Sync",
    category: "Active Sync",
    catKey: "sync",
    color: "#38BDF8",
    bgClass: "from-sky-50 via-white to-violet-50 dark:from-sky-950/50 dark:via-surface-container dark:to-violet-950/50",
    badgeBg: "bg-sky-500/15 border-sky-500/30 text-sky-700 dark:text-sky-400",
    icon: MessageSquare,
    desc: "Asynchronous updates, strategic alignments",
  },
  {
    hour: 22,
    timeStr: "22:00",
    name: "Circadian Rest & Sleep",
    category: "Rest & Sleep",
    catKey: "sleep",
    color: "#818CF8",
    bgClass: "from-indigo-50 via-white to-violet-50 dark:from-indigo-950/50 dark:via-surface-container dark:to-violet-950/50",
    badgeBg: "bg-indigo-500/15 border-indigo-500/30 text-indigo-700 dark:text-indigo-400",
    icon: Moon,
    desc: "Melatonin ramp, sleep architecture protection",
  },
];

export default function LandingPage() {
  const router = useRouter();

  // Active Circadian Slice on Dial
  const [selectedSliceIndex, setSelectedSliceIndex] = useState(1); // Default to 09:00 Deep Work
  const activeSlice = TIME_SLICES[selectedSliceIndex];

  // Interactive Habit Rings in Phone Mockup
  const [demoHabits, setDemoHabits] = useState([
    { id: 1, name: "Cold Plunge / Breathwork", color: "#34D399", completed: true, xp: 20 },
    { id: 2, name: "Deep Work Sprint (90m)", color: "#6C00FF", completed: true, xp: 30 },
    { id: 3, name: "Read 15 Pages Philosophy", color: "#60A5FA", completed: false, xp: 15 },
    { id: 4, name: "Zero Blue Light after 21:30", color: "#818CF8", completed: false, xp: 25 },
  ]);

  const [totalXpEarned, setTotalXpEarned] = useState(50);
  const [lastCompletedId, setLastCompletedId] = useState<number | null>(null);

  // Press & Hold Commitment State
  const [holdProgress, setHoldProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [hasCommitted, setHasCommitted] = useState(false);
  const holdIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-play time dial animation unless user manually clicked
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(() => {
      setSelectedSliceIndex((prev) => (prev + 1) % TIME_SLICES.length);
    }, 4200);
    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  // Toggle habit completion in interactive demo
  const handleToggleDemoHabit = (id: number) => {
    setDemoHabits((prev) =>
      prev.map((h) => {
        if (h.id === id) {
          const nextState = !h.completed;
          if (nextState) {
            setTotalXpEarned((x) => x + h.xp);
            setLastCompletedId(id);
            setTimeout(() => setLastCompletedId(null), 1200);
          } else {
            setTotalXpEarned((x) => Math.max(0, x - h.xp));
          }
          return { ...h, completed: nextState };
        }
        return h;
      })
    );
  };

  // Press & Hold ritual handler (Fabulous / Forest style)
  const startHold = () => {
    if (hasCommitted) return;
    setIsHolding(true);
    setHoldProgress(0);

    const stepMs = 25;
    const totalDuration = 1400; // 1.4s
    const increment = (stepMs / totalDuration) * 100;

    holdIntervalRef.current = setInterval(() => {
      setHoldProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(holdIntervalRef.current!);
          setHasCommitted(true);
          try {
            if (typeof window !== "undefined" && navigator?.vibrate) {
              navigator.vibrate([40, 60, 100]);
            }
          } catch {}
          setTimeout(() => {
            router.push("/planner");
          }, 600);
          return 100;
        }
        return next;
      });
    }, stepMs);
  };

  const cancelHold = () => {
    if (hasCommitted) return;
    setIsHolding(false);
    setHoldProgress(0);
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
    };
  }, []);

  const completedHabitsCount = demoHabits.filter((h) => h.completed).length;

  return (
    <div className="min-h-screen bg-transparent text-on-surface overflow-x-hidden relative selection:bg-primary/30 selection:text-primary">
      {/* Dynamic Animated Ambient Background Aura shifting with active slice */}
      <motion.div
        animate={{
          backgroundColor: activeSlice.color,
          opacity: [0.08, 0.16, 0.08],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="fixed -top-40 -left-40 w-[480px] h-[480px] rounded-full blur-[160px] pointer-events-none"
      />
      <div className="fixed top-1/3 -right-40 w-96 h-96 bg-sky-500/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="fixed -bottom-40 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* STICKY FROSTED HEADER */}
      <header className="sticky top-0 z-50 bg-background/85 backdrop-blur-2xl border-b border-outline/[0.08] px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">
          {/* Brand Wordmark & Icon */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/40 flex items-center justify-center text-primary shadow-[0_0_12px_rgba(108,0,255,0.3)] group-hover:scale-105 transition-all">
              <Compass className="w-4 h-4 animate-spin-slow" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-on-surface font-mono">ODYSSEY</span>
              <span className="px-1.5 py-0.2 rounded-full bg-primary/15 text-primary border border-primary/30 text-[9px] font-mono font-bold">
                v2.0 PRO
              </span>
            </div>
          </Link>

          {/* Header Action Link */}
          <Link
            href="/planner"
            className="py-1.5 px-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container-high border border-outline/[0.12] text-xs font-mono font-semibold text-on-surface transition-all active:scale-95 flex items-center gap-1.5"
          >
            <span>Launch App</span>
            <ArrowRight className="w-3.5 h-3.5 text-primary" />
          </Link>
        </div>
      </header>

      {/* MAIN HERO SECTION */}
      <main className="max-w-5xl mx-auto px-4 pt-8 sm:pt-14 pb-20 space-y-16 sm:space-y-24 relative z-10">
        {/* HERO NARRATIVE & CTAs */}
        <section className="text-center space-y-5 max-w-2xl mx-auto">
          {/* Subtitle Telemetry Pill */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-surface-container-high/90 border border-primary/35 text-primary text-xs font-mono font-bold shadow-[0_0_16px_rgba(108,0,255,0.15)]"
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
            <span>⚡ ANDROID LOCKSCREEN ENGINE 2.0</span>
          </motion.div>

          {/* Hero Headline with Shimmer Text */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.15] text-on-surface"
          >
            Master Every Hour. <br />
            <span className="shimmer-text">Transform Every Habit.</span>
          </motion.h1>

          {/* Subheading Narrative */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-sm sm:text-base text-on-surface-variant max-w-xl mx-auto leading-relaxed"
          >
            The world&apos;s first schedule architect that renders your active 24-hour routine and habit rings directly onto your Android lockscreen in real time.
          </motion.p>

          {/* Primary Action Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2"
          >
            <Link
              href="/planner"
              className="w-full sm:w-auto py-3.5 px-7 rounded-2xl bg-primary hover:bg-primary/95 text-on-primary font-bold text-sm sm:text-base shadow-[0_0_24px_rgba(108,0,255,0.35)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer font-mono"
            >
              <span>Begin Your Odyssey</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/habits"
              className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-surface-container/90 hover:bg-surface-container-high text-on-surface border border-outline/[0.12] text-sm font-semibold transition-all active:scale-[0.98] flex items-center justify-center gap-2 font-mono"
            >
              <Sparkles className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              <span>Explore Habit Studio</span>
            </Link>
          </motion.div>

          {/* Trust Metric Strip */}
          <div className="flex items-center justify-center flex-wrap gap-x-4 gap-y-1.5 text-[11px] font-mono text-on-surface-variant pt-3 border-t border-outline/[0.06]">
            <span className="flex items-center gap-1.5 text-on-surface/90">
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
              <span>100% Local-First (Dexie DB)</span>
            </span>
            <span className="text-on-surface/20">•</span>
            <span className="flex items-center gap-1.5 text-on-surface/90">
              <Zap className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Battery Impact &lt;0.8%/day</span>
            </span>
            <span className="text-on-surface/20">•</span>
            <span className="flex items-center gap-1.5 text-on-surface/90">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>0 Runtime Popups</span>
            </span>
          </div>
        </section>

        {/* INTERACTIVE CIRCADIAN TIME DIAL & PHONE SIMULATOR (Inspired by HabitDriven & Regain) */}
        <section className="relative flex flex-col items-center space-y-6">
          {/* Section Header */}
          <div className="text-center space-y-1.5">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-primary flex items-center justify-center gap-1.5">
              <Sliders className="w-3.5 h-3.5" />
              Interactive Circadian Timeline Simulation
            </span>
            <h2 className="text-xl sm:text-2xl font-bold text-on-surface">
              Watch Your Routine Transform Across 24 Hours
            </h2>
          </div>

          {/* Interactive Dial Control Pills (HabitDriven / Motivated style) */}
          <div className="flex items-center justify-center flex-wrap gap-2 p-1.5 rounded-2xl bg-surface-container-low/90 backdrop-blur-xl border border-outline/[0.08] shadow-lg max-w-xl mx-auto">
            {TIME_SLICES.map((slice, idx) => {
              const isSelected = selectedSliceIndex === idx;
              const IconComp = slice.icon;
              return (
                <button
                  key={slice.hour}
                  type="button"
                  onClick={() => {
                    setSelectedSliceIndex(idx);
                    setIsAutoPlaying(false);
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isSelected
                      ? "bg-primary text-on-primary shadow-md shadow-primary/20 scale-105"
                      : "text-on-surface-variant hover:text-on-surface bg-surface-container-low hover:bg-surface-container-high"
                  }`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  <span>{slice.timeStr}</span>
                </button>
              );
            })}
          </div>

          {/* Realistic Mobile Frame */}
          <div className="relative w-full max-w-[340px] sm:max-w-[370px] rounded-[44px] p-3.5 bg-surface-container border-[3px] border-outline/[0.15] shadow-[0_24px_60px_rgba(0,0,0,0.8)]">
            {/* Top Speaker & Punch Hole */}
            <div className="flex items-center justify-between px-6 pt-1 pb-2">
              <span className="text-[11px] font-mono font-bold text-on-surface">{activeSlice.timeStr}</span>
              <div className="w-16 h-3 rounded-full bg-black/60 border border-outline/[0.1] flex items-center justify-center">
                <span className="w-2 h-2 rounded-full bg-surface-container-low" />
              </div>
              <span className="text-[11px] font-mono font-bold text-primary flex items-center gap-0.5">
                <span>94%</span>
                <Zap className="w-3 h-3" />
              </span>
            </div>

            {/* Simulated Dynamic Screen Body */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSlice.hour}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.3 }}
                className={`rounded-[32px] bg-gradient-to-b ${activeSlice.bgClass} border border-outline/[0.08] p-3.5 space-y-3 overflow-hidden select-none`}
              >
                {/* HabitDriven Segmented Date Strip Teaser */}
                <div className="p-2.5 rounded-2xl bg-surface-container-low/90 border border-outline/[0.08] space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="font-bold text-on-surface uppercase tracking-wider">Thursday, Oct 24</span>
                    <span className="text-primary font-bold">{completedHabitsCount}/4 Done</span>
                  </div>

                  {/* 7-Day Mini Date Strip with Colored Rings */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {[
                      { day: "M", num: 21, done: true },
                      { day: "T", num: 22, done: true },
                      { day: "W", num: 23, done: true },
                      { day: "T", num: 24, done: true, current: true },
                      { day: "F", num: 25, done: false },
                      { day: "S", num: 26, done: false },
                      { day: "S", num: 27, done: false },
                    ].map((d, i) => (
                      <div
                        key={i}
                        className={`p-1 rounded-lg flex flex-col items-center gap-0.5 ${
                          d.current
                            ? "bg-primary text-on-primary font-bold shadow-xs"
                            : "bg-surface-container-high/40 text-on-surface-variant"
                        }`}
                      >
                        <span className="text-[8px] font-mono">{d.day}</span>
                        <span className="text-[10px] font-mono font-bold">{d.num}</span>
                        <div className="flex items-center gap-0.5 min-h-[4px]">
                          {d.done ? (
                            <span
                              className={`w-1 h-1 rounded-full ${
                                d.current ? "bg-primary" : "bg-primary shadow-[0_0_4px_rgba(108,0,255,0.8)]"
                              }`}
                            />
                          ) : (
                            <span className="w-1 h-1 rounded-full bg-surface-container-low" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active Focus Slot with Regain LIVE Beacon Radar */}
                <div className="p-3 rounded-2xl bg-surface-container-low/95 border border-outline/[0.12] space-y-2 relative overflow-hidden shadow-lg">
                  {/* Concentric Radar Wave Animation */}
                  <div className="absolute right-3 top-3 w-6 h-6 flex items-center justify-center pointer-events-none">
                    <span className="absolute w-6 h-6 rounded-full border border-primary/40 animate-radar-wave" />
                    <span className="w-2 h-2 rounded-full bg-primary" />
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${activeSlice.badgeBg}`}
                    >
                      {React.createElement(activeSlice.icon, { className: "w-4 h-4" })}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] font-mono font-extrabold uppercase tracking-wider text-primary">
                          LIVE ACTIVE BLOCK
                        </span>
                        <span className="text-[9px] font-mono text-on-surface-variant">• {activeSlice.category}</span>
                      </div>
                      <h4 className="text-xs font-bold text-on-surface truncate">{activeSlice.name}</h4>
                      <p className="text-[10px] text-on-surface-variant mt-0.5 truncate">{activeSlice.desc}</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="space-y-1 pt-1">
                    <div className="flex items-center justify-between text-[9px] font-mono text-on-surface-variant">
                      <span>42 min remaining</span>
                      <span className="text-primary font-bold">68%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-surface-container-highest overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500 shadow-sm"
                        style={{ width: "68%", backgroundColor: activeSlice.color }}
                      />
                    </div>
                  </div>
                </div>

                {/* Interactive Habit Checklist (Tap to toggle with celebratory XP flash!) */}
                <div className="p-2.5 rounded-2xl bg-surface-container-low/90 border border-outline/[0.08] space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="font-bold text-on-surface flex items-center gap-1">
                      <Flame className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                      <span>Daily Habits (Tap to Test)</span>
                    </span>
                    <span className="text-primary font-bold font-mono">+{totalXpEarned} XP</span>
                  </div>

                  <div className="space-y-1.5">
                    {demoHabits.map((h) => {
                      const isJustCompleted = lastCompletedId === h.id;
                      return (
                        <div
                          key={h.id}
                          onClick={() => handleToggleDemoHabit(h.id)}
                          className={`p-2 rounded-xl border flex items-center justify-between gap-2 cursor-pointer transition-all duration-200 active:scale-98 ${
                            h.completed
                              ? "bg-primary/10 border-primary/35 text-on-surface"
                              : "bg-surface-container-high/40 border-outline/[0.06] text-on-surface-variant hover:text-on-surface"
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className={`w-5 h-5 rounded-md flex items-center justify-center border transition-all ${
                                h.completed
                                  ? "bg-primary border-primary text-on-primary"
                                  : "border-outline/20 bg-transparent"
                              }`}
                            >
                              {h.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <span className={`text-[11px] font-semibold truncate ${h.completed ? "line-through text-on-surface/70" : ""}`}>
                              {h.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{ backgroundColor: h.color }}
                            />
                            <span className="text-[9px] font-mono font-bold text-primary">+{h.xp}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        {/* 4 CORE DESIGN PILLARS (Inspired by Akiflow & TickTick) */}
        <section className="space-y-6">
          <div className="text-center space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-bold text-on-surface tracking-tight">
              Surgical Precision for Daily Execution
            </h2>
            <p className="text-xs sm:text-sm font-mono text-on-surface-variant">
              Every detail engineered to eliminate cognitive friction.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Pillar 1: Structured Visual Schedule Rail */}
            <div className="p-5 rounded-3xl bg-surface-container-low/80 backdrop-blur-xl border border-outline/[0.08] space-y-3 hover:border-primary/40 transition-all group">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/25 flex items-center justify-center text-primary group-hover:scale-105 transition-transform">
                <Clock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-on-surface">Structured Visual Schedule Rail</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                24-hour continuous time spine with category color-coded left accents. Review past hours with 3 tactile states (<code className="text-emerald-700 dark:text-emerald-400">✓ Done</code>, <code className="text-rose-700 dark:text-rose-400">✕ Missed</code>, <code className="text-on-surface-variant">◯ Open</code>) while automatically locking future slots.
              </p>
            </div>

            {/* Pillar 2: HabitDriven Intelligence */}
            <div className="p-5 rounded-3xl bg-surface-container-low/80 backdrop-blur-xl border border-outline/[0.08] space-y-3 hover:border-emerald-500/40 transition-all group">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-on-surface">HabitBee 3-Mode Studio</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Seamlessly toggle between <strong className="text-on-surface">List</strong>, <strong className="text-on-surface">Grid</strong>, and <strong className="text-on-surface">Heatmap</strong> views. Track multi-day completion rings beneath every calendar date for instant peripheral awareness.
              </p>
            </div>

            {/* Pillar 3: Native Live Lockscreen Engine */}
            <div className="p-5 rounded-3xl bg-surface-container-low/80 backdrop-blur-xl border border-outline/[0.08] space-y-3 hover:border-sky-500/40 transition-all group">
              <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-600 dark:text-sky-400 group-hover:scale-105 transition-transform">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-on-surface">Live Android Lockscreen Sync</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Renders your current focus block and daily checklist directly onto your device wallpaper. 100% Google Play safe with normal install-time permissions and sub-0.8% battery draw.
              </p>
            </div>

            {/* Pillar 4: RPG Gamified Discipline */}
            <div className="p-5 rounded-3xl bg-surface-container-low/80 backdrop-blur-xl border border-outline/[0.08] space-y-3 hover:border-amber-500/40 transition-all group">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-on-surface">Rank Progression &amp; Vault</h3>
              <p className="text-xs text-on-surface-variant leading-relaxed">
                Level up through military rank tiers from Recruit to Supreme Commander. Earn XP, maintain unbreakable streaks, and unlock vault diamonds as proof of relentless discipline.
              </p>
            </div>
          </div>
        </section>

        {/* INTERACTIVE COMMITMENT RITUAL CARD (Fabulous / Forest style) */}
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-surface-container-low via-surface-container-low to-background border border-primary/30 p-6 sm:p-8 text-center space-y-5 shadow-2xl">
          <div className="space-y-1.5">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-primary">
              The Day 1 Protocol
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-on-surface">
              Commitment Over Motivation.
            </h3>
            <p className="text-xs sm:text-sm text-on-surface-variant max-w-md mx-auto">
              &quot;We don&apos;t rise to the level of our goals. We fall to the level of our systems.&quot;
            </p>
          </div>

          {/* Press & Hold Touch Target */}
          <div className="flex flex-col items-center justify-center pt-2">
            <button
              type="button"
              onMouseDown={startHold}
              onMouseUp={cancelHold}
              onMouseLeave={cancelHold}
              onTouchStart={startHold}
              onTouchEnd={cancelHold}
              onTouchCancel={cancelHold}
              className="relative w-28 h-28 rounded-full bg-surface-container border-2 border-primary/30 flex items-center justify-center select-none cursor-pointer active:scale-95 transition-transform"
            >
              {/* Progress Ring SVG */}
              <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="transparent"
                  stroke="var(--surface-container-highest)"
                  strokeWidth="5"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="transparent"
                  stroke="var(--primary)"
                  strokeWidth="5"
                  strokeDasharray="276.46"
                  strokeDashoffset={276.46 - (276.46 * holdProgress) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-75"
                />
              </svg>

              <div className="flex flex-col items-center justify-center text-center">
                <Flame className={`w-7 h-7 transition-all ${hasCommitted ? "text-primary scale-125" : isHolding ? "text-primary animate-pulse" : "text-primary/60"}`} />
                <span className="text-[10px] font-mono font-bold text-on-surface mt-1">
                  {hasCommitted ? "LOCKED IN" : isHolding ? `${Math.round(holdProgress)}%` : "HOLD"}
                </span>
              </div>
            </button>
            <span className="text-[11px] font-mono text-on-surface-variant/70 mt-3">
              {hasCommitted ? "✓ Day 1 Initiated! Entering Planner..." : "Press & hold for 1.4s to lock in your streak"}
            </span>
          </div>
        </section>

        {/* FOOTER QUICK LINKS */}
        <footer className="pt-8 border-t border-outline/[0.08] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-on-surface-variant">
          <div className="flex items-center gap-2">
            <Compass className="w-4 h-4 text-primary" />
            <span className="text-on-surface font-bold">ODYSSEY</span>
            <span className="text-on-surface/20">•</span>
            <span>Local-First Discipline Engine</span>
          </div>

          <div className="flex items-center flex-wrap gap-4">
            <Link href="/planner" className="hover:text-primary transition-colors">Planner</Link>
            <Link href="/day-schedule" className="hover:text-primary transition-colors">Daily Schedule</Link>
            <Link href="/habits" className="hover:text-primary transition-colors">Habits</Link>
            <Link href="/stats" className="hover:text-primary transition-colors">Stats</Link>
            <Link href="/wallpaper" className="hover:text-primary transition-colors">Wallpaper Studio</Link>
          </div>
        </footer>
      </main>
    </div>
  );
}
