"use client";

import { getPlannerCatStyle } from "@/lib/utils/planner-category-style";
import { calculateBlockHeight } from "@/lib/utils/planner-block-time";

/** The data a vanished row leaves behind for its collapse animation. */
export interface CollapsingRowGhostData {
  /** The vanished block's id — also the ghost's identity for removal. */
  key: string;
  startMin: number;
  endMin: number;
  category: string;
}

interface CollapsingRowGhostProps {
  ghost: CollapsingRowGhostData;
  /** Called when the collapse animation finishes, so the ghost unmounts. */
  onGone: (key: string) => void;
}

/**
 * Exit animation for a schedule row that was swallowed (drag absorb or a
 * save-time merge): the card shell keeps its shape and collapses away, so the
 * space it occupied closes smoothly instead of snapping shut. Purely visual —
 * not interactive, hidden from assistive tech, removed when its animation ends.
 * Under reduced motion the CSS hides it outright and the parent's fallback
 * timeout clears the state.
 */
export function CollapsingRowGhost({ ghost, onGone }: CollapsingRowGhostProps) {
  const cat = getPlannerCatStyle(ghost.category, false);
  return (
    <div
      aria-hidden
      className={`row-collapse pointer-events-none relative rounded-2xl border border-l-4 ${cat.leftBorder} ${cat.cardBg} my-1 p-3`}
      style={{ minHeight: calculateBlockHeight(ghost.endMin - ghost.startMin) }}
      onAnimationEnd={() => onGone(ghost.key)}
    />
  );
}
