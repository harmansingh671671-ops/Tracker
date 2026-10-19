"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type * as React from "react";
import { type ScheduleBlock } from "@/lib/db";
import { DeleteTarget } from "@/components/planner/delete-target";
import { getPlannerCatStyle } from "@/lib/utils/planner-category-style";
import {
  hourFromSlot,
  hourSlotFromPoint,
  setHourHighlight,
} from "@/lib/utils/planner-hour-hit";

interface FloatingBlockProps {
  block: ScheduleBlock;
  /** Called with the hour the icon was released over (any hour, past included). */
  onDrop: (block: ScheduleBlock, hour: number) => void;
  /** Called when the icon was released on the cross instead of an hour. */
  onDelete: (block: ScheduleBlock) => void;
}

/** Distance from the top or bottom edge at which the page starts scrolling. */
const EDGE_BAND = 96;
/** Pixels per frame at the very edge; leans in linearly from zero at EDGE_BAND. */
const EDGE_MAX_SPEED = 18;
/** A finger is not a mouse pointer, so the cross accepts a release near its edge. */
const CROSS_SLACK = 16;
/** How close the finger gets before the cross reads as a target. */
const CROSS_NEAR = 130;

/**
 * A block displaced off the timeline. It stays draggable until the user drops
 * it on an hour -- dropping it on an occupied hour displaces that block too --
 * or drops it on the cross, which removes it.
 */
export function FloatingBlock({ block, onDrop, onDelete }: FloatingBlockProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [crossArmed, setCrossArmed] = useState(false);
  const [crossNear, setCrossNear] = useState(false);
  const startRef = useRef({ x: 0, y: 0, active: false, dragging: false });
  const pointerRef = useRef({ x: 0, y: 0 });
  const highlightRef = useRef<HTMLElement | null>(null);
  const crossRef = useRef<HTMLDivElement | null>(null);
  // A held block is by definition a saved one, so its category styling is the
  // "custom" variant -- the same call the rail makes for its own cards.
  const cat = getPlannerCatStyle(block.category, true);
  const CatIcon = cat.Icon;

  const isOverCross = useCallback((clientX: number, clientY: number) => {
    const rect = crossRef.current?.getBoundingClientRect();
    if (!rect) return false;
    return (
      clientX >= rect.left - CROSS_SLACK &&
      clientX <= rect.right + CROSS_SLACK &&
      clientY >= rect.top - CROSS_SLACK &&
      clientY <= rect.bottom + CROSS_SLACK
    );
  }, []);

  const updateCross = useCallback(
    (clientX: number, clientY: number) => {
      const rect = crossRef.current?.getBoundingClientRect();
      const armed = isOverCross(clientX, clientY);
      setCrossArmed(armed);
      setCrossNear(
        !!rect &&
          Math.hypot(
            clientX - (rect.left + rect.width / 2),
            clientY - (rect.top + rect.height / 2)
          ) <= CROSS_NEAR
      );
      return armed;
    },
    [isOverCross]
  );

  // The ring marks the hour a release would land the block on. Over the cross
  // there is no such hour, and a ring there would promise the wrong thing.
  const aimAt = useCallback(
    (clientX: number, clientY: number, overCross: boolean) => {
      const next = overCross ? null : hourSlotFromPoint(clientX, clientY);
      if (next === highlightRef.current) return;
      setHourHighlight(highlightRef.current, false);
      setHourHighlight(next, true);
      highlightRef.current = next;
    },
    []
  );

  // Reach the hours that are off-screen: scrolling while the finger rests near
  // an edge. The icon is fixed and follows the finger, so it stays put on screen
  // while the rail moves under it.
  useEffect(() => {
    if (!dragging) return;
    let frame = 0;
    const tick = () => {
      const { x, y } = pointerRef.current;
      const height = window.innerHeight;
      let delta = 0;
      if (y < EDGE_BAND) {
        delta = -Math.ceil(((EDGE_BAND - y) / EDGE_BAND) * EDGE_MAX_SPEED);
      } else if (y > height - EDGE_BAND) {
        delta = Math.ceil(((y - (height - EDGE_BAND)) / EDGE_BAND) * EDGE_MAX_SPEED);
      }
      if (delta !== 0) {
        window.scrollBy(0, delta);
        // The page moved under a finger that did not, so what the drag is aiming
        // at -- and whether it is over the cross -- changed with it.
        aimAt(x, y, updateCross(x, y));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    // The loop lives exactly as long as the drag does; the state that starts it
    // is also what stops it.
    return () => cancelAnimationFrame(frame);
  }, [dragging, aimAt, updateCross]);

  // A drag can also end by this icon unmounting (a re-read repaints the rail),
  // which never reaches `onPointerUp`: the ring would be left on a stale hour.
  useEffect(() => {
    return () => setHourHighlight(highlightRef.current, false);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    startRef.current = { x: e.clientX, y: e.clientY, active: true, dragging: false };
    pointerRef.current = { x: e.clientX, y: e.clientY };
    try {
      (e.target as Element).setPointerCapture(e.pointerId);
    } catch (err) {
      void err;
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    // `active` is what makes this a drag rather than a hover. Without it the icon
    // jumps to the cursor's raw screen coordinates the moment the pointer crosses
    // it, because the deltas are measured from an untouched {0,0} origin.
    if (!startRef.current.active) return;
    pointerRef.current = { x: e.clientX, y: e.clientY };
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    // A tap must not be read as a drag, or the icon jumps under the finger.
    if (!startRef.current.dragging && Math.hypot(dx, dy) < 8) return;
    startRef.current.dragging = true;
    setDragging(true);
    setOffset({ x: dx, y: dy });
    aimAt(e.clientX, e.clientY, updateCross(e.clientX, e.clientY));
  };

  const endDrag = (clientX: number, clientY: number, commit: boolean) => {
    if (startRef.current.active && startRef.current.dragging) {
      setHourHighlight(highlightRef.current, false);
      highlightRef.current = null;
      // Read live rather than from state: a release can arrive in the same frame
      // as the move that armed the cross, and the state would not have settled.
      if (commit && isOverCross(clientX, clientY)) onDelete(block);
      else if (commit) {
        const hour = hourFromSlot(hourSlotFromPoint(clientX, clientY));
        if (hour !== null) onDrop(block, hour);
      }
    }
    startRef.current.active = false;
    startRef.current.dragging = false;
    setDragging(false);
    setCrossArmed(false);
    setCrossNear(false);
    setOffset({ x: 0, y: 0 });
  };

  return (
    <>
      {dragging && <DeleteTarget elRef={crossRef} armed={crossArmed} near={crossNear} />}
      <div
        data-floating-icon
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(e) => endDrag(e.clientX, e.clientY, true)}
        onPointerCancel={() => endDrag(0, 0, false)}
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
        className="relative z-50 cursor-grab touch-none select-none active:cursor-grabbing"
      >
        {/* The pop-in is on this inner box, not the one the drag writes a
            transform to -- a running animation would win over that inline
            transform and freeze the icon mid-screen.

            Title and category badge only, no hour: the icon has to be readable
            at a glance while it is being dragged, and the hour it was taken from
            is not the hour it is going to. */}
        <div
          className={`displaced-icon-in flex items-center gap-2 rounded-2xl border px-3 py-2 shadow-lg transition-all duration-150 ${
            crossArmed
              ? "border-error/70 bg-error/15 opacity-60"
              : "border-primary/30 bg-surface-container-low"
          }`}
        >
          <div
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border ${cat.badgeBg}`}
          >
            <CatIcon className="h-3.5 w-3.5" />
          </div>
          <div className="max-w-[110px] truncate text-xs font-semibold">{block.title}</div>
        </div>
      </div>
    </>
  );
}
