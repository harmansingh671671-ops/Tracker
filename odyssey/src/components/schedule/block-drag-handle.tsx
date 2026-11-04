"use client";

import { useRef } from "react";
import { pxPerMinuteToDelta, PX_PER_MINUTE } from "@/lib/utils/block-resize";

/**
 * A draggable border handle for a quick schedule card (`C2` follow-up).
 * Supports BOTH top-edge and bottom-edge dragging (pass `position="top"` or
 * `"bottom"`). Dragging from the TOP edge grows the block upward (start
 * moves earlier); from the BOTTOM it grows downward (end moves later).
 *
 * Press inside the strip and drag — vertical movement maps 1:1 onto minutes
 * through `PX_PER_MINUTE` and reports the CUMULATIVE delta since press, so the
 * owner's drag can be quantised to 5 minutes by the caller with one growing
 * stream of pointer moves.
 *
 * Pointer Capture keeps the stream alive when the finger leaves the strip mid
 * drag (the usual case, since cards grow under it), and `stopPropagation` plus
 * `touch-action: none` keep the surrounding page from scrolling or arming the
 * card's other gestures. The handle is a dedicated strip, not the card itself,
 * precisely so the cards stay normal tap targets.
 *
 * On mobile (touch): the grip is ALWAYS visible so the affordance is
 * discoverable without needing hover.
 */
export function BlockDragHandle({
  onResize,
  onEnd,
  disabled = false,
  step = PX_PER_MINUTE,
  position = "bottom",
}: {
  /** Cumulative minutes since press (can exceed the block's own duration). */
  onResize: (deltaMinutes: number) => void;
  /** Pointer released or lost — commit or roll back happens in the caller. */
  onEnd: () => void;
  disabled?: boolean;
  /** px → minutes factor; tests pass a huge one to skip pixel math. */
  step?: number;
  /** Which edge this handle attaches to. */
  position?: "top" | "bottom";
}) {
  const startYRef = useRef<number | null>(null);

  if (disabled) return null;

  const isTop = position === "top";

  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      aria-label={`Drag to change ${isTop ? "start" : "end"} time`}
      data-drag-handle
      data-drag-position={position}
      onPointerDown={(e) => {
        if (e.button !== 0 && e.pointerType === "mouse") return;
        startYRef.current = e.clientY;
        e.currentTarget.setPointerCapture(e.pointerId);
        e.preventDefault();
        e.stopPropagation();
      }}
      onPointerMove={(e) => {
        if (startYRef.current === null) return;
        const rawDelta = pxPerMinuteToDelta(e.clientY - startYRef.current, step);
        onResize(rawDelta);
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
      className={`absolute inset-x-0 z-30 h-6 cursor-ns-resize touch-none flex items-center justify-center group/drag ${
        isTop ? "top-0" : "bottom-0"
      } ${isTop ? "items-start" : "items-end"}`}
    >
      {/* Grip pill: always-visible on touch (forced via CSS media query below),
          visible on hover on pointer devices. Full size is h-1 w-10. */}
      <span
        className={`mb-0.5 mt-0.5 h-1 w-10 rounded-full bg-outline/30 transition-colors group-hover/drag:bg-primary/60 group-active/drag:bg-primary drag-handle-grip`}
      />
    </div>
  );
}
