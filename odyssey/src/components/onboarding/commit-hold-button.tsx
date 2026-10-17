"use client";

import { Flame } from "lucide-react";
import { ForwardedRef } from "react";

/**
 * The press-and-hold control on the commitment step.
 *
 * **Extracted because `step-protocol.tsx` crossed the 250-line limit once `A5`'s
 * identity line went in.** The keyboard handling came with it deliberately: it is
 * this button's parity behaviour, and leaving `onKeyDown`/`onKeyUp` behind in the
 * parent meant two files had to agree about what "holding" means.
 */

interface CommitHoldButtonProps {
  isHolding: boolean;
  isCommitted: boolean;
  /** True once the spread has started, which brightens the flame. */
  covered: boolean;
  onHoldStart: () => void;
  onHoldCancel: () => void;
  btnRef: ForwardedRef<HTMLButtonElement>;
}

export function CommitHoldButton({
  isHolding,
  isCommitted,
  covered,
  onHoldStart,
  onHoldCancel,
  btnRef,
}: CommitHoldButtonProps) {
  // Keyboard parity. Every gesture needs a non-gesture equivalent, and this step
  // is one gesture, so without this the whole flow is unreachable by keyboard.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== " " && e.key !== "Enter") return;
    e.preventDefault();
    if (!isHolding) onHoldStart();
  };
  const onKeyUp = (e: React.KeyboardEvent) => {
    if (e.key !== " " && e.key !== "Enter") return;
    e.preventDefault();
    onHoldCancel();
  };

  /**
   * Pointer capture, and it is load-bearing.
   *
   * Measured, not theorised: without it the browser fires `pointerout` /
   * `pointerleave` on this button in the SAME TICK as `pointerdown` (it decides
   * mid-gesture that it wants the pointer), so the old `onPointerLeave={cancel}`
   * cancelled the hold instantly. The circle never appeared to spread at all —
   * and because `page.evaluate(el.click())` bypasses pointer routing entirely,
   * every DOM-driven check passed while the feature was dead for a real finger.
   *
   * Capturing pins the pointer to this element for the whole gesture, so the hold
   * is about **holding**, not about keeping a finger perfectly still.
   */
  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    onHoldStart();
  };

  return (
    <button
      ref={btnRef}
      type="button"
      onPointerDown={onPointerDown}
      onPointerUp={onHoldCancel}
      onPointerCancel={onHoldCancel}
      onLostPointerCapture={onHoldCancel}
      onKeyDown={onKeyDown}
      onKeyUp={onKeyUp}
      onContextMenu={(e) => e.preventDefault()}
      aria-label="Hold to commit to your first day"
      className="relative w-28 h-28 rounded-full bg-surface-container border-2 border-primary/30 flex items-center justify-center select-none cursor-pointer touch-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
    >
      <span className="flex flex-col items-center justify-center text-center pointer-events-none">
        <Flame
          className={`w-7 h-7 transition-opacity ${
            isCommitted || covered ? "text-primary opacity-100" : "text-primary/60"
          }`}
        />
        <span className="text-[10px] font-mono font-bold text-on-surface mt-1">
          {isCommitted ? "LOCKED IN" : "HOLD"}
        </span>
      </span>
    </button>
  );
}