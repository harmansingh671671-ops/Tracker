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
 *   - **The circle is centred on the BUTTON, not on the viewport.** It used to be
 *     pinned to `50% 50%`, which is only the button's centre on a layout that
 *     happens to put it there. It does not: measured in-browser the button's
 *     centre sits 103px (360x780) to 180px (430x932) ABOVE the middle of the
 *     screen, so the spread began up to 180px away from the finger pressing it --
 *     while the comments here claimed it "starts exactly on the button".
 *   - Coverage is therefore computed FROM that origin. A half-diagonal is only
 *     correct from the centre; from an off-centre origin it leaves the bottom
 *     corners bare and the flow would commit on a half-filled screen.
 *   - It is driven by wall-clock elapsed time through a rAF loop, not by a
 *     frame counter, so a dropped frame or a backgrounded tab cannot shorten the
 *     commitment.
 *   - Releasing early cancels and shrinks it back.
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

/** How far the rim glow reaches inside and outside the clip boundary. */
const RIM_INNER_PX = 16;
const RIM_OUTER_PX = 6;

interface StepProtocolProps {
  /** Called once the settle pause has elapsed. */
  onCommit: () => void;
  /**
   * `A5` -- leave without doing the hold. The spec asks for a commitment moment
   * that is *"short, skippable and celebratory"*; until this existed, `protocol`
   * had **no exit at all**, because the shell deliberately hides Next on the last
   * step and the hold was the only way forward. Anyone who did not discover the
   * press-and-hold, or simply declined to, was stuck on this screen permanently.
   *
   * Lands in exactly the same place as the hold and records the same completion
   * flag: skipping is *declining the ritual*, not the app. Nothing is lost --
   * there is nothing on this step but the ritual.
   */
  onSkip: () => void;
}

export function StepProtocol({ onCommit, onSkip }: StepProtocolProps) {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const [isCommitted, setIsCommitted] = useState(false);
  const [viewport, setViewport] = useState({ w: 0, h: 0 });

  /**
   * The button's centre in viewport coordinates -- the circle's true origin.
   * Starts at the viewport centre so the very first frame is sane; nothing is
   * drawn until a hold begins anyway.
   */
  const [origin, setOrigin] = useState({ x: 0, y: 0 });

  const btnRef = useRef<HTMLButtonElement>(null);
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

  // Measured rather than hardcoded, because both the coverage radius and the
  // circle's origin depend on the device's real dimensions and on where the
  // button actually landed. Measured in an effect, never during render, so the
  // server pass and the first client render agree (AGENTS.md rule 15).
  //
  // One effect for both: they are the same resize event, and two listeners that
  // both write layout-derived state are two chances to disagree.
  useEffect(() => {
    const measure = () => {
      const el = btnRef.current;
      setViewport({ w: window.innerWidth, h: window.innerHeight });
      if (!el) return;
      const r = el.getBoundingClientRect();
      setOrigin({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    };
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

  const radius = spreadRadiusPx(progress, viewport.w, viewport.h, origin.x, origin.y);
  const covered = progress > 0;
  const clip = `circle(${radius}px at ${origin.x}px ${origin.y}px)`;

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
          ref={btnRef}
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
            directly in the same pixels the maths produced. The centre is the
            measured button position, so it starts under the finger. */}
        {covered && !isCommitted && (
          <div
            aria-hidden="true"
            className="fixed inset-0 z-50 pointer-events-none bg-primary"
            style={{
              clipPath: clip,
              transition: isHolding ? "none" : "clip-path 320ms ease-out",
            }}
          />
        )}

        {/* The boundary itself. A radial-gradient ring sharing the circle's exact
            centre and radius, so it rides the clip edge instead of being a
            separate element that could drift from it. Painted ABOVE the fill, so
            the half of the band that falls inside the spread is not swallowed by
            it -- the edge reads as the source rather than as an edge. */}
        {covered && !isCommitted && (
          <div
            aria-hidden="true"
            className="fixed inset-0 z-[51] pointer-events-none odyssey-hold-rim"
            style={{
              background: `radial-gradient(circle at ${origin.x}px ${origin.y}px, transparent ${Math.max(
                0,
                radius - RIM_INNER_PX
              )}px, var(--primary) ${Math.max(0, radius - 2)}px, transparent ${radius + RIM_OUTER_PX}px)`,
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

      {/* The skip. Hidden while a hold is in progress: a second finger landing
          here mid-commitment would exit out from under someone who is already
          halfway to the ritual, and a half-performed ceremony is worse than a
          skipped one. It comes BACK when the hold is released or cancelled. */}
      {!isHolding && !isCommitted && (
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={onSkip}
            className="px-4 py-2 rounded-full text-[11px] font-mono font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Skip for now
          </button>
        </div>
      )}
    </section>
  );
}