"use client";

/**
 * Step 1 -- the interactive circadian timeline simulation.
 *
 * Extracted from the old landing page rather than rewritten: the time slices,
 * the phone mockup and the auto-play already existed and worked. What changed
 * is that it is now a *step* in a flow, so the auto-advance is bounded -- the old
 * version cycled forever on a marketing page, which would have made the user
 * wait for it to come round.
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Coffee, Heart, MessageSquare, Moon, Sliders, Zap } from "lucide-react";

const TIME_SLICES = [
  {
    hour: 7,
    timeStr: "07:00",
    name: "Morning Vitality & Sunlight",
    color: "#34D399",
    bgClass:
      "from-emerald-50 via-white to-violet-50 dark:from-emerald-950/50 dark:via-surface-container dark:to-violet-950/50",
    badgeBg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
    icon: Heart,
    desc: "Hydration, breathwork, Zone 2 movement",
  },
  {
    hour: 9,
    timeStr: "09:00",
    name: "Deep Architectural Focus",
    color: "#6C00FF",
    bgClass:
      "from-violet-50 via-white to-violet-50 dark:from-violet-950/50 dark:via-surface-container dark:to-violet-950/50",
    badgeBg: "bg-primary/15 border-primary/30 text-primary",
    icon: Brain,
    desc: "Zero-distraction high cognitive output",
  },
  {
    hour: 13,
    timeStr: "13:00",
    name: "Midday Renewal & Fuel",
    color: "#FBBF24",
    bgClass:
      "from-amber-50 via-white to-violet-50 dark:from-amber-950/50 dark:via-surface-container dark:to-violet-950/50",
    badgeBg: "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-400",
    icon: Coffee,
    desc: "Clean nutrition, mental decompression",
  },
  {
    hour: 15,
    timeStr: "15:00",
    name: "Product Sprint & Sync",
    color: "#38BDF8",
    bgClass:
      "from-sky-50 via-white to-violet-50 dark:from-sky-950/50 dark:via-surface-container dark:to-violet-950/50",
    badgeBg: "bg-sky-500/15 border-sky-500/30 text-sky-700 dark:text-sky-400",
    icon: MessageSquare,
    desc: "Asynchronous updates, strategic alignments",
  },
  {
    hour: 22,
    timeStr: "22:00",
    name: "Circadian Rest & Sleep",
    color: "#818CF8",
    bgClass:
      "from-indigo-50 via-white to-violet-50 dark:from-indigo-950/50 dark:via-surface-container dark:to-indigo-950/50",
    badgeBg: "bg-indigo-500/15 border-indigo-500/30 text-indigo-700 dark:text-indigo-400",
    icon: Moon,
    desc: "Melatonin ramp, sleep architecture protection",
  },
];

const AUTO_PLAY_MS = 4200;

export function StepCircadian() {
  const [selected, setSelected] = useState(1);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const active = TIME_SLICES[selected];

  useEffect(() => {
    if (!isAutoPlaying) return;
    const timer = setInterval(() => {
      setSelected((prev) => (prev + 1) % TIME_SLICES.length);
    }, AUTO_PLAY_MS);
    return () => clearInterval(timer);
  }, [isAutoPlaying]);

  return (
    <section className="space-y-6">
      <div className="text-center space-y-1.5">
        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-primary flex items-center justify-center gap-1.5">
          <Sliders className="w-3.5 h-3.5" />
          Interactive Circadian Timeline Simulation
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
          Watch Your Routine Transform Across 24 Hours
        </h1>
        <p className="text-xs text-on-surface-variant max-w-md mx-auto leading-relaxed">
          This is your day, on your lock screen. Tap a time to move through it.
        </p>
      </div>

      {/* Time pills */}
      <div className="flex items-center justify-center flex-wrap gap-2 p-1.5 rounded-2xl bg-surface-container-low/90 border border-outline/[0.08] max-w-xl mx-auto">
        {TIME_SLICES.map((slice, idx) => {
          const isSelected = selected === idx;
          const IconComp = slice.icon;
          return (
            <button
              key={slice.hour}
              type="button"
              aria-pressed={isSelected}
              onClick={() => {
                setSelected(idx);
                setIsAutoPlaying(false);
              }}
              className={`py-2 px-3 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${
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

      {/* Phone mockup */}
      <div className="relative w-full max-w-[300px] mx-auto rounded-[40px] p-3 bg-surface-container border-[3px] border-outline/[0.15] shadow-[0_24px_60px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between px-5 pt-1 pb-2">
          <span className="text-[11px] font-mono font-bold text-on-surface">
            {active.timeStr}
          </span>
          <div className="w-14 h-2.5 rounded-full bg-black/50 border border-outline/[0.1]" />
          <span className="text-[11px] font-mono font-bold text-primary flex items-center gap-0.5">
            <span>94%</span>
            <Zap className="w-3 h-3" />
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={active.hour}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.3 }}
            className={`rounded-[28px] bg-gradient-to-b ${active.bgClass} border border-outline/[0.08] p-3.5 space-y-2.5 overflow-hidden select-none`}
          >
            <div className="p-2.5 rounded-2xl bg-surface-container-low/90 border border-outline/[0.08] space-y-1.5">
              <span className="block font-bold text-[10px] font-mono text-on-surface uppercase tracking-wider">
                {active.name}
              </span>
              <span className={`block px-1.5 py-0.5 rounded-md border text-[9px] font-mono font-bold inline-block ${active.badgeBg}`}>
                LIVE
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-surface-container-low/80 border border-outline/[0.08] space-y-1.5">
              <span className="block text-[10px] font-mono font-bold uppercase tracking-wider text-on-surface-variant">
                Current focus
              </span>
              <span className="block text-xs font-bold text-on-surface">{active.name}</span>
              <span className="block text-[10px] leading-snug text-on-surface-variant">
                {active.desc}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-center">
              {["Habits 3/5", "Focus 4h", "Open 14h"].map((t) => (
                <div
                  key={t}
                  className="py-2 rounded-xl bg-surface-container-low/80 border border-outline/[0.08] text-[8px] font-mono text-on-surface-variant"
                >
                  {t}
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <p className="text-center text-[11px] font-mono text-on-surface-variant/70">
        {isAutoPlaying ? "Auto-advancing — tap a time to take control" : "Tap a time to keep exploring"}
      </p>
    </section>
  );
}