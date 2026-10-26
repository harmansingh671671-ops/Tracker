"use client";

import { useState } from "react";
import { X, Pause, Archive, Check } from "lucide-react";
import { type Habit } from "@/lib/db";
import { PauseLengthPicker } from "./pause-length-picker";
import { HabitIcon } from "./habit-icon";
import { getHabitColor } from "@/lib/utils/habit-colors";
import { motion, AnimatePresence } from "framer-motion";

/**
 * B13 (owner option 1A): the 14-day quiet review — a quiet card at the top of
 * the habits screen that asks, per untouched habit: Pause, Let go, or Keep.
 * It is ask-first: nothing is archived or paused automatically, and dismissing
 * the card (Keep / the small ×) stores WHICH habits were dismissed so the card
 * only returns when a NEW habit crosses the 14 quiet days. The card computes
 * from the loaded store — the page renders it only after habits exist.
 */
interface HabitReviewCardProps {
  staleHabits: Habit[];
  onPause: (habitId: string, days: number) => void;
  onLetGo: (habit: Habit) => void;
  /** Keep: dismisses this one habit from the review without touching its data. */
  onKeep: (habitId: string) => void;
  /** Dismiss every habit currently offered, opening the review only again for a NEW stale habit. */
  onDismissAll: () => void;
}

const spring = { type: "spring" as const, stiffness: 300, damping: 25 };

export function HabitReviewCard({
  staleHabits,
  onPause,
  onLetGo,
  onKeep,
  onDismissAll,
}: HabitReviewCardProps) {
  const [pickingId, setPickingId] = useState<string | null>(null);

  if (staleHabits.length === 0) return null;

  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, transition: { duration: 0.15 } }}
      transition={spring}
      aria-label="Habits gone quiet — what should happen to each?"
      className="rounded-2xl bg-surface-container-high/70 border border-outline/15 p-3 space-y-1.5"
    >
      <div className="flex items-center justify-between gap-2 pb-1">
        <p className="text-[11px] font-mono font-bold text-on-surface-variant uppercase tracking-wider">
          Gone quiet — 14+ days
        </p>
        <button
          type="button"
          onClick={onDismissAll}
          title="Keep all for now"
          aria-label="Dismiss review — keep all listed habits"
          className="w-6 h-6 rounded-full flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <AnimatePresence initial={false} mode="popLayout">
        {staleHabits.map((h) => {
          const habitColor = getHabitColor(h);
          const isPicking = pickingId === h.id;
          return (
            <motion.div
              key={h.id}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.12 } }}
              className="rounded-xl bg-surface-container border border-outline/10"
            >
              <div className="flex items-center gap-2 px-2.5 py-2 min-w-0">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border"
                  style={{ backgroundColor: `${habitColor}18`, borderColor: `${habitColor}35` }}
                >
                  <HabitIcon icon={h.icon} name={h.name} className="w-3.5 h-3.5 shrink-0" style={{ color: habitColor }} />
                </div>
                <span className="text-xs font-bold text-on-surface truncate min-w-0 flex-1" title={h.name}>
                  {h.name}
                </span>

                {isPicking ? (
                  <span className="text-[10px] font-mono text-on-surface-variant shrink-0">how long?</span>
                ) : (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setPickingId(h.id)}
                      title="Pause this habit for a while"
                      className="h-7 px-2 rounded-lg bg-surface-container-high text-primary text-[10px] font-mono font-bold border border-outline/15 hover:bg-primary/10 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Pause className="w-3 h-3" />
                      Pause
                    </button>
                    <button
                      type="button"
                      onClick={() => onLetGo(h)}
                      title="Let go — recoverable from the archive"
                      className="h-7 px-2 rounded-lg bg-surface-container-high text-on-surface-variant text-[10px] font-mono font-bold border border-outline/15 hover:text-error hover:border-error/30 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Archive className="w-3 h-3" />
                      Let go
                    </button>
                    <button
                      type="button"
                      onClick={() => onKeep(h.id)}
                      title="Keep it in the list"
                      aria-label={`Keep ${h.name} in the list`}
                      className="h-7 px-2 rounded-lg bg-surface-container-high text-on-surface-variant text-[10px] font-mono font-bold border border-outline/15 hover:text-on-surface active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      Keep
                    </button>
                  </div>
                )}
              </div>
              <AnimatePresence initial={false}>
                {isPicking && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0, transition: { duration: 0.15 } }}
                    className="overflow-hidden"
                  >
                    <div className="px-2.5 pb-2.5">
                      <PauseLengthPicker
                        onConfirm={(days) => {
                          setPickingId(null);
                          onPause(h.id, days);
                        }}
                        onCancel={() => setPickingId(null)}
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </motion.section>
  );
}
