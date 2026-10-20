"use client";

/**
 * B4 round 4 — the overlays of the gesture shell, extracted to keep the shell
 * under the repo's component-size limit.
 *
 * `CountedSwipeOptions` is the option rectangles revealed beside a counted
 * card. They hang IMMEDIATELY OUTSIDE the card's left edge (`right: 100%` on
 * an absolutely positioned child of the card's transformed surface) — flush
 * against the card, never on top of it, and they ride every drag with the card
 * for free, exactly as the owner asked ("put the options right to the card,
 * outside the card"). The column is mounted for every counted card and fades
 * through CSS `opacity 140ms`, so both the drag-in and the release-away are
 * continuous rather than a pop.
 *
 * Selecting an option does NOT close the panel by design (owner: "keep it
 * locked with options to select"): `+1` can be tapped repeatedly to tally, and
 * the card only returns to rest when swiped back left or tapped (handled by
 * the shell, not here).
 */

import { Check, Pencil } from "lucide-react";
import { SWIPE_LOCK_PX } from "@/lib/utils/swipe-gesture";

const OPTION_BUTTON =
  "h-6.5 w-full rounded-md border px-2 py-0 text-[11px] font-mono font-bold shadow-sm bg-surface-container-high text-on-surface border-outline/30 hover:bg-surface-container-highest active:scale-95 transition-all cursor-pointer";

type CountedKind = "all" | "half" | "one";

interface CountedSwipeOptionsProps {
  half: number;
  habitColor: string;
  /** 0..1 — how far the card has travelled toward / is at its locked spot. */
  progress: number;
  /** Clickable only once the card is locked; during the drag they are a ghost. */
  interactive: boolean;
  onAction: (kind: CountedKind) => void;
}

export function CountedSwipeOptions({
  half,
  habitColor,
  progress,
  interactive,
  onAction,
}: CountedSwipeOptionsProps) {
  // The option buttons must stop the pointer events the shell tracks, or
  // tapping "All Done" would also arm a card hold or start a new swipe.
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  const pick = (kind: CountedKind) => (e: React.MouseEvent) => {
    e.stopPropagation();
    onAction(kind);
  };
  return (
    <div
      className="absolute right-full top-1/2 z-20 mr-1.5 flex flex-col gap-1"
      style={{
        width: SWIPE_LOCK_PX - 10,
        opacity: progress,
        transform: `translateY(-50%) translateX(${(progress - 1) * 20}px)`,
        transition: "opacity 140ms ease-out",
        pointerEvents: interactive ? "auto" : "none",
      }}
    >
      <button
        type="button"
        onMouseDown={stop}
        onTouchStart={stop}
        onClick={pick("all")}
        className={OPTION_BUTTON}
        style={{ backgroundColor: `${habitColor}25`, borderColor: `${habitColor}60`, color: habitColor }}
      >
        All Done
      </button>
      {half >= 1 && (
        <button
          type="button"
          onMouseDown={stop}
          onTouchStart={stop}
          onClick={pick("half")}
          className={OPTION_BUTTON}
        >
          +{half}
        </button>
      )}
      <button
        type="button"
        onMouseDown={stop}
        onTouchStart={stop}
        onClick={pick("one")}
        className={OPTION_BUTTON}
      >
        +1
      </button>
    </div>
  );
}

interface GestureHintBadgesProps {
  habitColor: string;
  /** Swipe in progress to the left (edit) — never shown while locked. */
  editVisible: boolean;
  /** Swipe in progress to the right on a SIMPLE habit (done). */
  doneVisible: boolean;
}

/** Subtle one-word direction hints while a drag is in progress. */
export function GestureHintBadges({ habitColor, editVisible, doneVisible }: GestureHintBadgesProps) {
  if (!editVisible && !doneVisible) return null;
  const badge = "absolute z-10 top-1/2 -translate-y-1/2 flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-mono font-bold pointer-events-none";
  if (editVisible) {
    return (
      <div
        className={`${badge} right-3`}
        style={{ backgroundColor: `${habitColor}20`, color: habitColor }}
      >
        <Pencil className="w-3 h-3" />
        Edit
      </div>
    );
  }
  return (
    <div
      className={`${badge} left-3`}
      style={{ backgroundColor: `${habitColor}20`, color: habitColor }}
    >
      <Check className="w-3 h-3" />
      Done
    </div>
  );
}
