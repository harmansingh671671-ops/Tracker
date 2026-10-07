"use client";

/**
 * Step 4 -- the Day 1 Protocol, and the commitment spread.
 *
 * **There is no progress bar.** The owner's instruction: while the user holds,
 * a circle spreads from the button until it covers the screen, then one second
 * later the app opens. The spread *is* the progress indicator, and it doubles as
 * the transition, so there is nothing to draw a bar about.
 *
 * Behaviour, all of it deliberate:
 *   - The circle starts at exactly the button's radius, so it does not pop.
 *   - It is driven by wall-clock elapsed time through a rAF loop, not by a
 *     frame counter, so a dropped frame or a backgrounded tab cannot shorten the
 *     commitment.
 *   - Releasing early cancels and shrinks it back.
 *   - The radius target is the viewport's HALF-DIAGONAL, not its half-height.
 *     A circle sized to the shorter side leaves the corners showing.
 *   - Coverage is binary. `hasCoveredViewport` demands exactly 1, because a
 *     partly covered screen must not commit to a route change.
 *   - Reduced motion skips the animation and commits immediately.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Flame } from "lucide-react";
import {
  SPREAD_SETTLE_MS,
  hasCoveredViewport,
  spreadProgress,
  spreadRadiusPx,
} from "@/lib/utils/onboarding-flow";

interface StepProtocolProps {
  /** Called once the settle pause has elapsed. */
  onCommit: () => void;
}

export function StepProtocol({ onCommit }: StepProtocolProps) {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isCommitted, setIsCommitted] = useState(false);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });

  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitRef = useRef(onCommit);

  // Keep the commit callback fresh without putting it in the rAF loop's closure
  // dependencies. Assigning during render is what the `react-hooks/refs` rule
  // forbids, so this is an effect.
  useEffect(() => {
    commitRef.current = onCommit;
  }, [onCommit]);

  // Measured rather than hardcoded, because the coverage radius depends on the
  // device's real dimensions and it is measured in CSS pixels.
  useEffect(() => {
    const measure = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, []);

  const stopLoop = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // Everything that must not outlive the component. A leaked rAF loop or settle
  // timer here would navigate to the app from an unmounted step, which is the
  // exact class of bug the codebase already logged as D4.
  useEffect(() => {
    return () => {
      stopLoop();
      if (settleTimerRef.current !== null) clearTimeout(settleTimerRef.current);
    };
  }, [stopLoop]);

  const finish = useCallback(() => {
    setIsCommitted(true);
    settleTimerRef.current = setTimeout(() => commitRef.current(), SPREAD_SETTLE_MS);
  }, []);

  const beginHold = useCallback(() => {
    if (isCommitted) return;

    // Honour reduced motion by completing rather than animating. The commitment
    // is the press, not the picture.
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setIsCommitted(true);
      commitRef.current();
      return;
    }

    setIsHolding(true);
    startedAtRef.current = performance.now();

    const tick = () => {
      const elapsed = performance.now() - startedAtRef.current;
      const p = spreadProgress(elapsed);
      setProgress(p);

      if (hasCoveredViewport(p)) {
        setIsHolding(false);
        stopLoop();
        finish();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
  }, [isCommitted, finish, stopLoop]);

  const cancelHold = useCallback(() => {
    if (isCommitted) return;
    stopLoop();
    setIsHolding(false);
    // Shrink back rather than snapping to zero, so an accidental early release
    // does not feel like a rejection.
    setProgress(0);
  }, [isCommitted, stopLoop]);

  // Keyboard parity. Every gesture needs a non-gesture equivalent, and the whole
  // step is one gesture, so without this the flow is unreachable by keyboard.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== " " && e.key !== "Enter") return;
    e.preventDefault();
    if (!isHolding) beginHold();
  };
  const onKeyUp = (e: React.KeyboardEvent) => {
    if (e.key !== " " && e.key !== "Enter") return;
    e.preventDefault();
    cancelHold();
  };

  const radius = spreadRadiusPx(progress, viewport.w, viewport.h);
  const covered = progress > 0;

  return (
    <section className="space-y-6">
      <div className="space-y-1.5 text-center">
        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-primary">
          The Day 1 Protocol
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
          Commitment Over Motivation
        </h1>
        <p className="text-xs sm:text-sm text-on-surface-variant max-w-md mx-auto leading-relaxed">
          Hold to begin. Don&apos;t let go until the screen fills.
        </p>
      </div>

      <div className="relative flex items-center justify-center pt-6">
        <button
          type="button"
          onPointerDown={beginHold}
          onPointerUp={cancelHold}
          onPointerLeave={cancelHold}
          onPointerCancel={cancelHold}
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
              {isCommitted ? "LOCKED IN" : isHolding ? "HOLD" : "HOLD"}
            </span>
          </span>
        </button>

        {/* The spreading circle. `clip-path` on a full-viewport layer rather than
            a scaled element: no layout, no reflow, and the radius is expressible
            directly in the same pixels the maths produced. */}
        {covered && !isCommitted && (
          <div
            aria-hidden="true"
            className="fixed inset-0 z-50 pointer-events-none bg-primary"
            style={{
              clipPath: `circle(${radius}px at 50% 50%)`,
              transition: isHolding ? "none" : "clip-path 320ms ease-out",
            }}
          />
        )}
      </div>

      <p
        className="text-center text-[11px] font-mono text-on-surface-variant"
        role="status"
        aria-live="polite"
      >
        {isCommitted
          ? "✓ Day 1 initiated. Opening your app…"
          : isHolding
            ? "Keep holding…"
            : "Press and hold, or hold Space"}
      </p>
    </section>
  );
}