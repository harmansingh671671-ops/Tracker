"use client";

/**
 * B4 — the gesture engine behind `HabitGestureCard`: press, hold-to-complete,
 * axis-locked swipe, and the locked-panel open/close state for counted cards.
 * Extracted from the shell so the shell stays render-only (the repo's
 * component-size rule); the *numbers* stay in `swipe-gesture.ts` because they
 * are the only testable knobs.
 *
 * The handlers deliberately use the legacy `onTouchStart`/`onMouseDown` events
 * rather than Pointer Events: every interactive child inside the card (the
 * completion ring, the counted progress bar, the avoid control) already stops
 * those events, which is what keeps a press on them from starting a card hold.
 * Pointer Events would bubble past those child guards and reintroduce the
 * problem. The hook never calls `preventDefault` — the list scroll must keep
 * working — and locks the drag's axis ONCE from the first slop of travel so a
 * casual swipe commits without a deliberate hold-then-drag (round 2).
 *
 * The tracking uses refs alongside state: the release handler must read the
 * last offset and locked axis, and a `useCallback` closure would otherwise see
 * a stale state snapshot.
 */

import { useCallback, useRef, useState } from "react";
import { type Habit } from "@/lib/db";
import {
  GESTURE_START_PX,
  type GestureAxis,
  decideGestureAxis,
  swipeDirection,
} from "@/lib/utils/swipe-gesture";
import { logWarn } from "@/lib/utils/logger";

const HOLD_MS = 400;

type HabitCardKind = "simple" | "counted" | "avoid";

interface HabitCardGestureOptions {
  habitType: HabitCardKind;
  onEdit: (habit: Habit) => void;
  /** Hold, or a committed swipe-right on a simple habit. */
  onComplete: (habit: Habit) => void;
  /** Hold on a COUNTED habit: opens the session page (2026-10-25, owner
   *  instruction) instead of completing. Absent, or a simple/avoid habit,
   *  hold keeps its original meaning. */
  onHold?: (habit: Habit) => void;
  /** Body tap. Heatmap rows pass nothing — only the matrix cells react there. */
  onCardClick?: (habit: Habit, e: React.MouseEvent | React.TouchEvent) => void;
}

/** Attribute bag spread straight onto the gesture surface (`onClick`, legacy
 * touch/mouse events, context menu). */
type GestureSurfaceHandlers = {
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onTouchCancel: (e: React.TouchEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: (e: React.MouseEvent) => void;
  onMouseLeave: () => void;
  onContextMenu: (e: React.MouseEvent) => void;
  onClick: (e: React.MouseEvent | React.TouchEvent) => void;
};

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

export function useHabitCardGestures(
  habit: Habit,
  { habitType, onEdit, onComplete, onHold, onCardClick }: HabitCardGestureOptions
): {
  /** Counted panel open (card locked right, options selectable). */
  locked: boolean;
  /** Signed drag preview, clamped; null while undecided/vertically locked. */
  dragDx: number | null;
  /** A pointer is down: the surface must follow without transitions. */
  dragging: boolean;
  handlers: GestureSurfaceHandlers;
} {
  const [dragDx, setDragDx] = useState<number | null>(null);
  const [locked, setLocked] = useState(false);
  // While a finger is down the card must FOLLOW it exactly (no transition);
  // on release the return/lock moves through the CSS transition.
  const [dragging, setDragging] = useState(false);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const holdTimerRef = useRef<NodeJS.Timeout | null>(null);
  // After a hold or a committed swipe the browser may still synthesize a click
  // on release; this flag eats exactly that one click so it cannot undo what
  // the gesture just did.
  const suppressClickRef = useRef(false);
  const moveRef = useRef<{ dx: number; dy: number } | null>(null);
  // The axis, decided ONCE per gesture from the first slop of travel; the
  // decision is final, which is what makes a drifting swipe still commit.
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
      // A click that a previous gesture was suppressing has fired (or never
      // will — a travelled touch releases no click); drop the stale flag here
      // or the NEXT tap would be silently swallowed.
      suppressClickRef.current = false;
      startPosRef.current = pointOf(e);
      moveRef.current = null;
      axisRef.current = null;
      setDragging(true);
      setDragDx(null);
      clearHold();
      holdTimerRef.current = setTimeout(() => {
        holdTimerRef.current = null;
        suppressClickRef.current = true;
        triggerHaptic();
        // A counted habit's hold opens the session; completing it in one
        // gesture skipped the very choice the session page exists for.
        if (habitType === "counted" && onHold) onHold(habit);
        else onComplete(habit);
      }, HOLD_MS);
    },
    [habit, habitType, onHold, onComplete, clearHold]
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
      if (axisRef.current === null) axisRef.current = decideGestureAxis(dx, dy);
      // Only a horizontally-locked drag gets the visual; a vertically-locked
      // one is a list scroll and must not move the card.
      setDragDx(axisRef.current === "x" ? Math.max(-96, Math.min(96, dx)) : null);
    },
    [clearHold]
  );

  const endGesture = useCallback(() => {
    setDragging(false);
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
      // While a counted card is locked, leftward is the CLOSE gesture — the
      // card returns to rest, the edit sheet is NOT opened.
      if (locked) {
        setLocked(false);
        return;
      }
      onEdit(habit);
    } else if (habitType === "simple") {
      onComplete(habit);
    } else if (habitType === "counted") {
      // Locked stays locked (an extra rightward push re-commits harmlessly).
      setLocked(true);
    }
    // `avoid`: swipes deliberately do nothing — completion there is the
    // clean/slip pair, not a "done" state.
  }, [habit, habitType, locked, onComplete, onEdit, clearHold]);

  // Tapping the visible part of a locked card returns it to rest; the option
  // buttons sit above this and stop the click themselves.
  const tapGesture = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        e.stopPropagation();
        return;
      }
      if (locked) {
        setLocked(false);
        e.stopPropagation();
        return;
      }
      if (!onCardClick) return;
      onCardClick(habit, e);
    },
    [habit, locked, onCardClick]
  );

  const resetGesture = useCallback(() => {
    setDragging(false);
    clearHold();
    startPosRef.current = null;
    moveRef.current = null;
    axisRef.current = null;
    setDragDx(null);
  }, [clearHold]);

  const handlers: GestureSurfaceHandlers = {
    onTouchStart: startGesture,
    onTouchMove: moveGesture,
    onTouchEnd: endGesture,
    onTouchCancel: endGesture,
    onMouseDown: startGesture,
    onMouseMove: moveGesture,
    onMouseUp: endGesture,
    onMouseLeave: resetGesture,
    onContextMenu: (e) => {
      e.preventDefault();
      e.stopPropagation();
      onEdit(habit);
    },
    onClick: tapGesture,
  };

  return { locked, dragDx, dragging, handlers };
}
