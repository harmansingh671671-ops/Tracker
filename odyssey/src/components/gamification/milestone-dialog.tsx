"use client";

/**
 * S24 -- the day-milestone popup.
 *
 * Presentation only, like `rank-up-dialog`: it renders an entry that
 * `use-days-done-milestones` has already confirmed was crossed, so there is no
 * branch here that can congratulate someone for standing still. The queue (one
 * popup at a time, next on dismiss) lives in the hook, not here.
 *
 * The page mounts this on demand and unmounts it on dismiss, so the dialog is
 * always open for its whole life -- there is no dead `open` prop to be false.
 * That is also what keeps the base-ui dialog kit out of the route's first load
 * (PERF-5, same reason `rank-up-dialog` is dynamic in `header.tsx`).
 */

import { useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { MilestoneEntry } from "@/components/habits/use-days-done-milestones";
import { triggerStreaksConfetti } from "@/lib/utils/confetti";

interface MilestoneDialogProps {
  entry: MilestoneEntry | null;
  onClose: () => void;
}

export function MilestoneDialog({ entry, onClose }: MilestoneDialogProps) {
  // Habit + rung, not the rung alone: rung ids are shared across habits, so a
  // second habit reaching 7 must still get its own burst. Cleared with the
  // entry, which is what lets a later popup fire.
  const entryKey = entry ? `${entry.habitId}:${entry.achievement.id}` : null;
  const firedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!entryKey) {
      firedRef.current = null;
      return;
    }
    if (firedRef.current === entryKey) return;
    firedRef.current = entryKey;
    // The confetti helper self-gates on `window` but ignores
    // `prefers-reduced-motion`, and the repo gates motion in CSS rather than
    // with a shared JS helper (PERF-5), so this is the one local check.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    triggerStreaksConfetti();
  }, [entryKey]);

  if (!entry) return null;

  const { achievement, habitName } = entry;

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-sm text-center">
        <p className="text-xs font-mono uppercase tracking-widest text-on-surface-variant">
          Milestone
        </p>
        <p className="break-words text-sm font-semibold text-on-surface">{habitName}</p>
        <div
          aria-hidden="true"
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-container text-4xl"
        >
          🏆
        </div>
        <DialogTitle className="font-heading text-xl">{achievement.title}</DialogTitle>
        <DialogDescription className="text-sm leading-relaxed">
          {achievement.narrative}
        </DialogDescription>
        <DialogFooter>
          <Button onClick={onClose}>Keep going</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
