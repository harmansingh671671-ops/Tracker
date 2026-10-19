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
 * Deliberately unlabelled and small: it sits where the dragged block and the
 * finger both cover it, so its own state has to carry the meaning -- the red
 * fill and glow are the whole message, and anything written under the circle
 * would be read through the block hovering over it.
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
      className={`pointer-events-none fixed bottom-28 left-1/2 z-[60] flex h-12 w-12 -translate-x-1/2 items-center justify-center rounded-full border-2 transition-all duration-150 animate-in fade-in ${
        armed
          ? "scale-110 border-error bg-error/25 text-error shadow-[0_0_24px_rgba(244,63,94,0.45)]"
          : near
            ? "scale-105 border-error/60 bg-error/15 text-error"
            : "border-outline/40 bg-surface-container-highest/85 text-on-surface-variant/60"
      }`}
    >
      <X className="h-5 w-5" strokeWidth={2.5} />
    </div>
  );
}
