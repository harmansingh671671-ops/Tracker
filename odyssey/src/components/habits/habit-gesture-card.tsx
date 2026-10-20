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
 * Round 3 (owner): the counted card's options ride the DRAG. The card never
 * slides past the row edge — the locked position is a margin/width reflow
 * (right edge fixed, so no horizontal page overflow is ever created) — and the
 * options fade and slide in proportionally with the travel, coming out of the
 * left edge together with the card. Selecting an option applies it and KEEPS
 * the card locked with the options still selectable, so +1 can be tapped
 * repeatedly to tally; the card returns to rest when swiped back left or
 * tapped.
 *
 * Geometry: positive travel (counted) is squeezed on the INNER surface with
 * inline margin/width CSS transitions; negative travel is a plain transform.
 * The surface sits INSIDE the `motion.div` so framer's layout spring never
 * fights the inline drag transform, and the outer block's box is unaffected by
 * the inner width change, so the layout spring stays dormant during the
 * squeeze.
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
    onCardClick,
  });

  // Apply WITHOUT closing: the card stays locked and the options stay
  // selectable, so +1 can be tapped repeatedly to tally.
  const applyOption = useCallback(
    (kind: CountedKind) => onCountedAction(habit, kind),
    [habit, onCountedAction]
  );

  // The squeeze: positive travel for a counted card becomes the margin/width
  // reflow; while locked the margin rests at the lock spot and further
  // rightward travel squeezes a little more, returning on release.
  const positivePreview = dragDx != null && dragDx > 0 ? dragDx : 0;
  const leftPreview = dragDx != null && dragDx < 0 ? dragDx : 0;
  const squeezeOffset = isCounted
    ? locked
      ? SWIPE_LOCK_PX + positivePreview
      : positivePreview
    : 0;
  // Leftward preview is a plain transform for every type; simple habits also
  // drag with the transform on the right (their swipe-right commits a plain
  // completion, with no squeeze needed).
  const previewSlide = isCounted ? leftPreview : dragDx ?? 0;
  const squeezes = isCounted && (locked || positivePreview > 0);
  const progress = locked ? 1 : Math.max(0, Math.min(1, positivePreview / SWIPE_LOCK_PX));

  const innerStyle: React.CSSProperties = {
    ...style,
    touchAction: "pan-y",
    transform: `translateX(${previewSlide}px)`,
    transition: dragging
      ? "none"
      : "transform 160ms ease-out, margin-left 220ms cubic-bezier(0.2, 0.9, 0.3, 1), width 220ms cubic-bezier(0.2, 0.9, 0.3, 1)",
    marginLeft: `${squeezeOffset}px`,
    width: squeezes ? `calc(100% - ${squeezeOffset}px)` : "100%",
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
            visible={locked || positivePreview > 0}
            progress={progress}
            interactive={locked}
            onAction={applyOption}
          />
        )}
      </div>
    </motion.div>
  );
}
