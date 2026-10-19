"use client";

import type * as React from "react";
import { type ScheduleBlock } from "@/lib/db";
import { getPlannerCatStyle } from "@/lib/utils/planner-category-style";

export interface CornerFlight {
  /** Viewport box of the hour the block was pushed out of. */
  from: { x: number; y: number; width: number; height: number };
  /** Viewport point the corner stacks held blocks around. */
  to: { x: number; y: number };
}

interface FlyingToCornerProps {
  block: ScheduleBlock;
  flight: CornerFlight;
}

/**
 * The block that has just lost its hour, crossing the screen to the corner
 * where held blocks stack.
 *
 * Decorative only, and deliberately not a DOM clone of the rail card: the real
 * icon is already in state and on screen, and this carries the eye from the hour
 * the block left to where it went. It is the icon's own visual at the hour
 * card's size, shrinking and fading into the corner, so the two read as the same
 * block rather than as a second one.
 */
export function FlyingToCorner({ block, flight }: FlyingToCornerProps) {
  const { from, to } = flight;
  const cat = getPlannerCatStyle(block.category, true);
  const CatIcon = cat.Icon;
  // Shrink to roughly a corner icon's width by the time it arrives, whatever
  // width the hour card it left had.
  const scale = Math.max(0.3, Math.min(0.55, 132 / Math.max(from.width, 1)));
  const centreX = from.x + from.width / 2;
  const centreY = from.y + from.height / 2;

  return (
    <div
      aria-hidden="true"
      className="flying-to-corner pointer-events-none fixed z-40"
      style={
        {
          left: from.x,
          top: from.y,
          width: from.width,
          height: from.height,
          transformOrigin: "center center",
          "--fly-dx": `${to.x - centreX}px`,
          "--fly-dy": `${to.y - centreY}px`,
          "--fly-scale": `${scale}`,
        } as React.CSSProperties
      }
    >
      <div className="flex h-full w-full items-center gap-2 rounded-2xl border border-primary/30 bg-surface-container-low px-3 shadow-lg">
        <div
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border ${cat.badgeBg}`}
        >
          <CatIcon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0 flex-1 truncate text-xs font-semibold">{block.title}</div>
      </div>
    </div>
  );
}
