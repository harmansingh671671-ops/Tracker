"use client";

/**
 * B4 — the gesture wrapper for habit cards (list view AND heatmap view).
 *
 * Three gestures replace what used to be hold-to-edit:
 *   - hold (~400 ms, with a haptic tick) → mark the habit FULLY done for the
 *     selected day (simple and counted; quit habits are excluded — they have
 *     their own clean/slip control);
 *   - swipe left → open the habit's edit sheet;
 *   - swipe right → simple: mark done · counted: reveal three small action
 *     rectangles (All Done / +X where X is half the target rounded down / +1).
 *
 * Round 2 (owner): swipes work DIRECTLY, no hold-then-drag. The gesture's
 * axis is decided once, from the first 8px of travel (`decideGestureAxis`):
 * horizontally-locked swipes commit even if the finger drifts vertically and
 * the list scrolls underneath; vertically-locked drags are inert scrolls. The
 * shell never calls `preventDefault` — the list scroll must keep working.
 *
 * The gesture handlers deliberately use the legacy `onTouchStart`/`onMouseDown`
 * events rather than Pointer Events: every interactive child inside the card
 * (the completion ring, the counted progress bar, the avoid control) already
 * stops those events, which is what keeps a press on them from starting a card
 * hold. Pointer Events would bubble past those child guards and reintroduce
 * the problem.
 *
 * The drag tracking also uses refs alongside state values: the release
 * handler must read the *last* offset and the locked axis, and a `useCallback`
 * closure would otherwise see a stale state snapshot.
 */

import { useCallback, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Check, ListPlus, Pencil } from "lucide-react";
import { type Habit } from "@/lib/db";
import {
  GESTURE_START_PX,
  type GestureAxis,
  decideGestureAxis,
  halfTargetFloor,
  swipeDirection,
} from "@/lib/utils/swipe-gesture";
import { getHabitColor } from "@/lib/utils/habit-colors";
import { logWarn } from "@/lib/utils/logger";

const HOLD_MS = 400;

type CountedKind = "all" | "half" | "one";

function triggerHaptic() {
  try {
    if (typeof window !== "undefined" && navigator?.vibrate) navigator.vibrate(50);
  } catch (e) {
    logWarn("habit-gesture-card", "haptic feedback failed", e);
  }
}

/** Mouse and touch in one shape; a touchend can carry no touches, in which
 * case the last changed touch is the closest we have to "where it ended". */
function pointOf(e: React.MouseEvent | React.TouchEvent): { x: number; y: number } {
  if ("touches" in e) {
    const t = e.touches.length > 0 ? e.touches[0] : e.changedTouches[0];
    return t ? { x: t.clientX, y: t.clientY } : { x: 0, y: 0 };
  }
  return { x: e.clientX, y: e.clientY };
}

interface HabitGestureCardProps {
  habit: Habit;
  className?: string;
  style?: React.CSSProperties;
  /** Body tap. Heatmap rows deliberately pass nothing — only the matrix cells react there. */
  onCardClick?: (habit: Habit, e: React.MouseEvent | React.TouchEvent) => void;
  onEdit: (habit: Habit) => void;
  /** Hold, or a committed swipe-right on a simple habit. */
  onComplete: (habit: Habit) => void;
  onCountedAction: (habit: Habit, kind: CountedKind) => void;
  children: React.ReactNode;
}

const SHEET_BUTTON_CLASS =
  "rounded-md border px-2.5 py-1.5 text-xs font-mono font-bold shadow-sm bg-surface-container-high text-on-surface border-outline/30 hover:bg-surface-container-highest active:scale-95 transition-all cursor-pointer";

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
  const [dragDx, setDragDx] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  // After a hold or a committed swipe the browser still synthesizes a click on
  // release; this flag eats exactly that one click so it cannot undo or redo
  // what the gesture just did.
  const suppressClickRef = useRef(false);
  const moveRef = useRef<{ dx: number; dy: number } | null>(null);
  // The axis, decided ONCE per gesture from the first 8px of travel. After the
  // lock a horizontal swipe commits whatever the finger drifts to, and a
  // vertically-locked drag is inert — this is what makes a casual swipe work
  // directly instead of needing a deliberate hold-then-drag.
  const axisRef = useRef<GestureAxis | null>(null);

  const clearHold = useCallback(() => {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
  }, []);

  const startGesture = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if ("button" in e && e.button !== 0) return;
      startPosRef.current = pointOf(e);
      moveRef.current = null;
      axisRef.current = null;
      setDragDx(null);
      clearHold();
      holdTimerRef.current = setTimeout(() => {
        holdTimerRef.current = null;
        suppressClickRef.current = true;
        triggerHaptic();
        onComplete(habit);
      }, HOLD_MS);
    },
    [habit, onComplete, clearHold]
  );

  const moveGesture = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const start = startPosRef.current;
      if (!start) return;
      const point = pointOf(e);
      const dx = point.x - start.x;
      const dy = point.y - start.y;
      moveRef.current = { dx, dy };
      if (Math.hypot(dx, dy) > GESTURE_START_PX) clearHold();
      // Lock the axis the first time the travel passes the slop; after that
      // the decision is final for this drag.
      if (axisRef.current === null) {
        axisRef.current = decideGestureAxis(dx, dy);
      }
      // Only a horizontally-locked drag gets the visual translation; a
      // vertically-locked one is a list scroll and must not move the card.
      setDragDx(axisRef.current === "x" ? Math.max(-96, Math.min(96, dx)) : null);
    },
    [clearHold]
  );

  const endGesture = useCallback(() => {
    clearHold();
    startPosRef.current = null;
    const move = moveRef.current;
    const axis = axisRef.current;
    moveRef.current = null;
    axisRef.current = null;
    setDragDx(null);
    if (!move) return;
    const dir = swipeDirection(axis, move.dx);
    if (!dir) return;
    suppressClickRef.current = true;
    if (dir === "left") {
      onEdit(habit);
    } else if (habitType === "simple") {
      onComplete(habit);
    } else if (habitType === "counted") {
      setSheetOpen(true);
    }
    // `avoid`: swipes deliberately do nothing — completion there is the
    // clean/slip pair, not a "done" state.
  }, [habit, habitType, onComplete, onEdit, clearHold]);

  const handleClick = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        e.stopPropagation();
        return;
      }
      if (!onCardClick) return;
      onCardClick(habit, e);
    },
    [habit, onCardClick]
  );

  const dismissSheet = useCallback(() => setSheetOpen(false), []);
  // The scrim and the rectangle buttons must stop the pointer events the shell
  // tracks, or tapping "All Done" would also start (and possibly fire) a card hold.
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const sheetAction = (kind: CountedKind) => {
    setSheetOpen(false);
    onCountedAction(habit, kind);
  };

  const editVisible = dragDx !== null && dragDx < -24;
  const completeVisible = dragDx !== null && dragDx > 24;

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
      {/* The gesture + visual surface sits INSIDE the motion element: framer's
          layout spring drives `transform` on the element itself, so an inline
          drag translation there would fight it. */}
      <div
        className={`relative select-none ${className}`}
        style={{ ...style, touchAction: "pan-y", transform: `translateX(${dragDx ?? 0}px)`, transition: "transform 160ms ease-out" }}
        onTouchStart={startGesture}
        onTouchMove={moveGesture}
        onTouchEnd={endGesture}
        onTouchCancel={endGesture}
        onMouseDown={startGesture}
        onMouseMove={moveGesture}
        onMouseUp={endGesture}
        onMouseLeave={() => {
          clearHold();
          startPosRef.current = null;
          moveRef.current = null;
          axisRef.current = null;
          setDragDx(null);
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onEdit(habit);
        }}
        onClick={handleClick}
      >
        {children}

        {/* Direction hints while the drag is in progress (visible but subtle). */}
        {editVisible && (
          <div
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-mono font-bold pointer-events-none"
            style={{ backgroundColor: `${habitColor}20`, color: habitColor }}
          >
            <Pencil className="w-3 h-3" />
            Edit
          </div>
        )}
        {completeVisible && habitType !== "avoid" && (
          <div
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-mono font-bold pointer-events-none"
            style={{ backgroundColor: `${habitColor}20`, color: habitColor }}
          >
            {habitType === "simple" ? (
              <>
                <Check className="w-3 h-3" />
                Done
              </>
            ) : (
              <>
                <ListPlus className="w-3 h-3" />
                Options
              </>
            )}
          </div>
        )}

        {/* The three rectangles a counted habit's swipe-right reveals. */}
        {sheetOpen && (
          <>
            <div
              className="absolute inset-0 z-10 rounded-2xl"
              onMouseDown={stop}
              onTouchStart={stop}
              onClick={(e) => {
                e.stopPropagation();
                dismissSheet();
              }}
            />
            <div className="absolute inset-x-3 bottom-2.5 z-20 flex justify-end gap-1.5">
              <button
                type="button"
                onMouseDown={stop}
                onTouchStart={stop}
                onClick={(e) => {
                  e.stopPropagation();
                  sheetAction("all");
                }}
                className={SHEET_BUTTON_CLASS}
                style={{ backgroundColor: `${habitColor}25`, borderColor: `${habitColor}60`, color: habitColor }}
              >
                All Done
              </button>
              {half >= 1 && (
                <button
                  type="button"
                  onMouseDown={stop}
                  onTouchStart={stop}
                  onClick={(e) => {
                    e.stopPropagation();
                    sheetAction("half");
                  }}
                  className={SHEET_BUTTON_CLASS}
                >
                  +{half}
                </button>
              )}
              <button
                type="button"
                onMouseDown={stop}
                onTouchStart={stop}
                onClick={(e) => {
                  e.stopPropagation();
                  sheetAction("one");
                }}
                className={SHEET_BUTTON_CLASS}
              >
                +1
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}
