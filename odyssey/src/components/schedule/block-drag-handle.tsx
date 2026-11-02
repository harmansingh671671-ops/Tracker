"use client";

import { useRef } from "react";
import { pxPerMinuteToDelta, PX_PER_MINUTE } from "@/lib/utils/block-resize";

/**
 * The bottom-border drag handle for a quick schedule card (`C2` follow-up):
 * press inside the strip and drag — vertical movement maps 1:1 onto minutes
 * through `PX_PER_MINUTE` and reports the CUMULATIVE delta since press, so the
 * owner's drag can be quantised to 5 minutes by the caller with one growing
 * stream of pointer moves.
 *
 * Pointer Capture keeps the stream alive when the finger leaves the strip mid
 * drag (the usual case, since cards grow under it), and `stopPropagation` plus
 * `touch-action: none` keep the surrounding page from scrolling or arming the
 * card's other gestures. The handle is a dedicated strip, not the card itself,
 * precisely so the cards stay normal tap targets.
 */
export function BlockDragHandle({
  onResize,
  onEnd,
  disabled = false,
  step = PX_PER_MINUTE,
}: {
  /** Cumulative minutes since press (can exceed the block's own duration). */
  onResize: (deltaMinutes: number) => void;
  /** Pointer released or lost — commit or roll back happens in the caller. */
  onEnd: () => void;
  disabled?: boolean;
  /** px → minutes factor; tests pass a huge one to skip pixel math. */
  step?: number;
}) {
  const startYRef = useRef<number | null>(null);

  if (disabled) return null;

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label="Drag to change duration"
      data-drag-handle
      onPointerDown={(e) => {
        if (e.button !== 0 && e.pointerType === "mouse") return;
        startYRef.current = e.clientY;
        e.currentTarget.setPointerCapture(e.pointerId);
        e.preventDefault();
        e.stopPropagation();
      }}
      onPointerMove={(e) => {
        if (startYRef.current === null) return;
        onResize(pxPerMinuteToDelta(e.clientY - startYRef.current, step));
      }}
      onPointerUp={(e) => {
        if (startYRef.current === null) return;
        startYRef.current = null;
        e.currentTarget.releasePointerCapture?.(e.pointerId);
        onEnd();
      }}
      onPointerCancel={() => {
        if (startYRef.current === null) return;
        startYRef.current = null;
        onEnd();
      }}
      onContextMenu={(e) => e.preventDefault()}
      className="absolute inset-x-0 bottom-0 z-30 h-5 cursor-ns-resize touch-none flex items-end justify-center group/drag"
    >
      {/* Grip pill: invisible until pressed or hovering so a still day reads
          clean, then obvious — the affordance has to be discoverable on touch,
          which has no hover. */}
      <span className="mb-0.5 h-1 w-10 rounded-full bg-outline/30 transition-colors group-hover/drag:bg-primary/60 group-active/drag:bg-primary" />
    </div>
  );
}
