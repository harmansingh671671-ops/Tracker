"use client";

import { useRef, useState } from "react";
import type * as React from "react";
import { type ScheduleBlock } from "@/lib/db";

interface FloatingBlockProps {
  block: ScheduleBlock;
  /** Called with the hour the icon was released over (any hour, past included). */
  onDrop: (block: ScheduleBlock, hour: number) => void;
}

/**
 * A block displaced off the timeline. It stays draggable until the user drops it
 * on an hour; dropping it on an occupied hour displaces that block too.
 */
export function FloatingBlock({ block, onDrop }: FloatingBlockProps) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const startRef = useRef({ x: 0, y: 0, active: false, dragging: false });

  const handlePointerDown = (e: React.PointerEvent) => {
    startRef.current = { x: e.clientX, y: e.clientY, active: true, dragging: false };
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
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    // A tap must not be read as a drag, or the icon jumps under the finger.
    if (!startRef.current.dragging && Math.hypot(dx, dy) < 8) return;
    startRef.current.dragging = true;
    setOffset({ x: dx, y: dy });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (startRef.current.active && startRef.current.dragging) {
      // The icon follows the finger, so `elementFromPoint` would return the icon
      // itself -- walk the whole stack to find the hour slot underneath it.
      const slot = document
        .elementsFromPoint(e.clientX, e.clientY)
        .map((el) => el.closest("[data-hour]"))
        .find((el): el is Element => el !== null);
      const hour = slot ? parseInt(slot.getAttribute("data-hour") as string, 10) : NaN;
      if (!Number.isNaN(hour)) onDrop(block, hour);
    }
    startRef.current.active = false;
    startRef.current.dragging = false;
    setOffset({ x: 0, y: 0 });
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
      className="relative z-50 cursor-grab touch-none rounded-2xl border border-primary/30 bg-surface-container-low px-3 py-2 shadow-lg"
    >
      <div className="text-[10px] uppercase tracking-wide text-on-surface-variant/60">Floating</div>
      <div className="max-w-[140px] truncate text-xs font-semibold">{block.title}</div>
    </div>
  );
}
