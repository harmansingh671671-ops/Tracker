"use client";

import { motion } from "framer-motion";
import { ArrowRight, Compass, Sparkles } from "lucide-react";

interface StepIntroProps {
  onBegin: () => void;
  /** The habits already added, so the hero can acknowledge real progress. */
  addedCount: number;
}

export function StepIntro({ onBegin, addedCount }: StepIntroProps) {
  return (
    <section className="text-center space-y-5 py-6">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-surface-container-high/90 border border-primary/35 text-primary text-xs font-mono font-bold"
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>SCHEDULE · HABITS · WALLPAPER</span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="text-3xl sm:text-5xl font-extrabold tracking-tight leading-[1.15] text-on-surface"
      >
        Master Every Hour. <br />
        Transform Every Habit.
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="text-sm sm:text-base text-on-surface-variant max-w-md mx-auto leading-relaxed"
      >
        Five short steps. You&apos;ll see your day as a shape, add one habit, and
        be in.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="pt-3 flex flex-col items-center gap-3"
      >
        <button
          type="button"
          onClick={onBegin}
          className="w-full sm:w-auto py-3.5 px-7 rounded-2xl bg-primary hover:bg-primary/95 text-on-primary font-bold text-sm sm:text-base shadow-[0_0_24px_rgba(108,0,255,0.35)] active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer font-mono focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span>Begin Your Odyssey</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        {addedCount > 0 && (
          <p className="text-[11px] font-mono text-on-surface-variant">
            {addedCount === 1 ? "1 habit saved so far" : `${addedCount} habits saved so far`}
          </p>
        )}
      </motion.div>

      <div className="pt-4 flex items-center justify-center gap-2 text-[11px] font-mono text-on-surface-variant/80">
        <Compass className="w-3.5 h-3.5 text-primary" />
        <span>Everything stays on this device.</span>
      </div>
    </section>
  );
}