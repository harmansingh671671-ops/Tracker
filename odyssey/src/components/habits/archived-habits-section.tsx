"use client";

import { useState } from "react";
import { ArchiveRestore, Trash2, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import { type Habit } from "@/lib/db";
import { HabitIcon } from "./habit-icon";
import { getHabitColor } from "@/lib/utils/habit-colors";
import { motion, AnimatePresence } from "framer-motion";

/**
 * B13 (owner extras): the archive, hidden when empty (the header carries only
 * a small archive icon) and toggleable when there is something to show.
 * "Let go" puts a habit here WITH its full history; Restore returns it to the
 * list unchanged. Delete-forever is the ONLY destructive path, and it rests
 * behind a two-click confirm because it removes the habit AND its history.
 */
interface ArchivedHabitsSectionProps {
  archivedHabits: Habit[];
  onRestore: (habitId: string) => void;
  /** True delete: the habit and all of its logs. Two-click confirmed. */
  onDeleteForever: (habitId: string) => void;
}

function ArchivedRow({
  habit,
  onRestore,
  onDeleteForever,
}: {
  habit: Habit;
  onRestore: (habitId: string) => void;
  onDeleteForever: (habitId: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const habitColor = getHabitColor(habit);

  return (
    <div className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl bg-surface-container border border-outline/10">
      <div
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border opacity-70"
        style={{ backgroundColor: `${habitColor}18`, borderColor: `${habitColor}35` }}
      >
        <HabitIcon icon={habit.icon} name={habit.name} className="w-3.5 h-3.5 shrink-0" style={{ color: habitColor }} />
      </div>
      <div className="min-w-0 flex-1">
        <span className="text-xs font-bold text-on-surface-variant truncate block" title={habit.name}>
          {habit.name}
        </span>
        <span className="text-[9px] font-mono text-on-surface-variant/70">
          Archived {new Date(habit.archivedAt ?? "").toLocaleDateString()}
        </span>
      </div>
      <button
        type="button"
        onClick={() => onRestore(habit.id)}
        title="Bring it back to the habits list"
        className="shrink-0 h-7 px-2.5 rounded-lg bg-surface-container-high text-primary text-[10px] font-mono font-bold border border-outline/15 hover:bg-primary/10 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
      >
        <ArchiveRestore className="w-3 h-3" />
        Restore
      </button>
      {confirming ? (
        <button
          type="button"
          onClick={() => onDeleteForever(habit.id)}
          title="This permanently deletes the habit and its history."
          className="shrink-0 h-7 px-2 rounded-lg bg-error text-on-error text-[10px] font-mono font-bold border border-error shadow-md animate-pulse flex items-center gap-1 cursor-pointer"
        >
          <AlertTriangle className="w-3 h-3" />
          Confirm
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          title="Delete forever"
          className="shrink-0 w-7 h-7 rounded-lg bg-surface-container-high text-error/70 hover:text-error hover:border-error/30 border border-outline/15 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

export function ArchivedHabitsSection({
  archivedHabits,
  onRestore,
  onDeleteForever,
}: ArchivedHabitsSectionProps) {
  const [expanded, setExpanded] = useState(true);

  if (archivedHabits.length === 0) return null; // owner rule: empty archive renders nothing

  return (
    <motion.section
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="rounded-2xl bg-surface-container/50 border border-outline/10 p-2.5 space-y-1.5"
      aria-label="Archived habits"
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between gap-2 px-0.5 cursor-pointer"
        aria-expanded={expanded}
      >
        <span className="text-[11px] font-mono font-bold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
          <ArchiveRestore className="w-3 h-3" />
          Archived ({archivedHabits.length})
        </span>
        {expanded ? (
          <ChevronUp className="w-3.5 h-3.5 text-on-surface-variant" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-on-surface-variant" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0, transition: { duration: 0.15 } }}
            className="overflow-hidden space-y-1.5"
          >
            {archivedHabits.map((h) => (
              <ArchivedRow key={h.id} habit={h} onRestore={onRestore} onDeleteForever={onDeleteForever} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
