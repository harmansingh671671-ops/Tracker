"use client";

import type * as React from "react";
import { X } from "lucide-react";

interface DeleteTargetProps {
  /**
   * The circle itself. The parent measures this to decide whether a release
   * landed on it -- the circle cannot answer pointer events of its own.
   */
  elRef: React.RefObject<HTMLDivElement | null>;
  /** The finger is on the circle: releasing here removes the block. */
  armed: boolean;
  /** The finger is close: the circle reads as a target before it is hit. */
  near: boolean;
}

/**
 * The drop-to-delete target, shown for the length of a drag of a displaced
 * block. It marks the one place where letting go does not mean "put it on this
 * hour".
 *
 * `pointer-events: none` is deliberate and load-bearing: the hour underneath
 * must stay the hour the release hit test sees, so the parent measures this
 * circle's box instead of asking it whether it was hit.
 *
 * The entrance animation is opacity only (`fade-in`). A `zoom-in-*` here would
 * keep `transform: scale(1)` applied after it finished -- `.animate-in` fills
 * forwards -- and the armed `scale` below would never be seen.
 */
export function DeleteTarget({ elRef, armed, near }: DeleteTargetProps) {
  return (
    <div
      ref={elRef}
      data-delete-target
      aria-hidden="true"
      className="pointer-events-none fixed bottom-28 left-1/2 z-[60] flex -translate-x-1/2 flex-col items-center gap-1 animate-in fade-in"
    >
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-full border-2 backdrop-blur-md transition-all duration-150 ${
          armed
            ? "scale-110 border-error bg-error/25 text-error shadow-[0_0_28px_rgba(244,63,94,0.45)]"
            : near
              ? "scale-105 border-error/60 bg-error/15 text-error"
              : "border-outline/40 bg-surface-container-highest/85 text-on-surface-variant/60"
        }`}
      >
        <X className="h-7 w-7" strokeWidth={2.5} />
      </div>
      <span
        className={`rounded-full px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide backdrop-blur-sm transition-colors duration-150 ${
          armed
            ? "bg-error/20 text-error"
            : near
              ? "bg-error/10 text-error/90"
              : "bg-surface-container-highest/90 text-on-surface-variant"
        }`}
      >
        Delete
      </span>
    </div>
  );
}
