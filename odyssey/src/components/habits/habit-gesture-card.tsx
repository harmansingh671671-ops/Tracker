"use client";

/**
 * B4 — the gesture WRAPPER for habit cards (list view AND heatmap view). The
 * press/swipe/hold engine lives in `use-habit-card-gestures.ts`; overlays are
 * extracted into `habit-gesture-overlays.tsx`. This file is only the locked
 * geometry + wiring.
 *
 * Three gestures: hold (~400 ms) marks the habit fully done (simple and
 * counted; quit habits untouched); swipe left opens the edit sheet — or closes
 * the counted panel while it is locked; swipe right marks a simple habit done
 * / locks a counted card to the right, revealing its three option rectangles.
 *
 * Round 4 (owner: "don't resize the card, move it as it is, and put the
 * options right to the card outside the card"): the locked position is a plain
 * translateX — the card keeps its full size and slides over as one piece. The
 * option rectangles hang IMMEDIATELY OUTSIDE the card's left edge
 * (`right: 100%` on an absolutely positioned child of the transformed
 * surface), so they are flush against the moving card at all times and ride
 * every drag with zero extra choreography. Consequence: the translated card
 * extends past the row's right edge, so the view wrappers carry
 * `overflow-x-clip` — nothing can ever scroll the page horizontally, and the
 * card's far side simply slides past the edge.
 *
 * Geometry: every drag preview and the locked state are inline `transform`
 * values on the surface. The surface sits INSIDE the `motion.div` so framer's
 * layout spring never fights the inline drag transform.
 */

import { useCallback } from "react";
import { motion } from "framer-motion";
import { type Habit } from "@/lib/db";
import { SWIPE_LOCK_PX, halfTargetFloor } from "@/lib/utils/swipe-gesture";
import { getHabitColor } from "@/lib/utils/habit-colors";
import {
  CountedSwipeOptions,
  GestureHintBadges,
} from "@/components/habits/habit-gesture-overlays";
import { useHabitCardGestures } from "@/components/habits/use-habit-card-gestures";

type CountedKind = "all" | "half" | "one";

interface HabitGestureCardProps {
  habit: Habit;
  className?: string;
  style?: React.CSSProperties;
  onCardClick?: (habit: Habit, e: React.MouseEvent | React.TouchEvent) => void;
  onEdit: (habit: Habit) => void;
  onComplete: (habit: Habit) => void;
  /** Hold on a counted habit — opens the session page. See the gesture hook. */
  onHold?: (habit: Habit) => void;
  onCountedAction: (habit: Habit, kind: CountedKind) => void;
  children: React.ReactNode;
}

export function HabitGestureCard({
  habit,
  className = "",
  style,
  onCardClick,
  onEdit,
  onComplete,
  onHold,
  onCountedAction,
  children,
}: HabitGestureCardProps) {
  const habitType = habit.type ?? "simple";
  const half = halfTargetFloor(habit.targetValue);
  const habitColor = getHabitColor(habit);
  const isCounted = habitType === "counted";

  const { locked, dragDx, dragging, handlers } = useHabitCardGestures(habit, {
    habitType,
    onEdit,
    onComplete,
    onHold,
    onCardClick,
  });

  // Apply WITHOUT closing: the card stays locked and the options stay
  // selectable, so +1 can be tapped repeatedly to tally.
  const applyOption = useCallback(
    (kind: CountedKind) => onCountedAction(habit, kind),
    [habit, onCountedAction]
  );

  // Every drag state is a translateX: simple habits drag with their full
  // signed travel; a counted card travels rightward (the locked panel) or
  // leftward again (back to rest) with LOCK + travel while locked.
  const positivePreview = dragDx != null && dragDx > 0 ? dragDx : 0;
  const previewSlide = isCounted
    ? locked
      ? SWIPE_LOCK_PX + (dragDx ?? 0)
      : Math.max(0, dragDx ?? 0)
    : Math.max(-96, Math.min(96, dragDx ?? 0));
  const progress = locked ? 1 : Math.max(0, Math.min(1, positivePreview / SWIPE_LOCK_PX));

  const innerStyle: React.CSSProperties = {
    ...style,
    touchAction: "pan-y",
    transform: `translateX(${previewSlide}px)`,
    transition: dragging ? "none" : "transform 200ms cubic-bezier(0.2, 0.9, 0.3, 1)",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{
        layout: { type: "spring", stiffness: 350, damping: 28 },
        opacity: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
        scale: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
        y: { duration: 0.28, ease: [0.16, 1, 0.3, 1] },
      }}
    >
      <div
        className={`relative select-none ${className}`}
        style={innerStyle}
        {...handlers}
      >
        {children}

        {/* Direction hints while the drag is in progress. While a panel is
            locked, leftward movement is the CLOSE gesture, so no Edit hint. */}
        <GestureHintBadges
          habitColor={habitColor}
          editVisible={dragDx !== null && dragDx < -24 && !locked}
          doneVisible={dragDx !== null && dragDx > 24 && habitType === "simple"}
        />

        {isCounted && (
          <CountedSwipeOptions
            half={half}
            habitColor={habitColor}
            progress={progress}
            interactive={locked}
            onAction={applyOption}
          />
        )}
      </div>
    </motion.div>
  );
}
