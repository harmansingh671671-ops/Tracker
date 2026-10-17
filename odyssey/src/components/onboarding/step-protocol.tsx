"use client";

/**
 * Step 6 -- the Day 1 Protocol: the hold state machine and the step around it.
 *
 * **There is no progress bar.** The owner's instruction: while the user holds, a
 * circle spreads from the button until it covers the screen, then one second later
 * the app opens. The spread *is* the progress indicator, and it doubles as the
 * transition, so there is nothing to draw a bar about.
 *
 * Behaviour, all of it deliberate:
 *   - **The circle is centred on the BUTTON, not on the viewport.** It used to be
 *     pinned to `50% 50%`, which is only correct on a layout that happens to put
 *     the button there. It does not: the button's centre sits 103px (360x780) to
 *     180px (430x932) above the middle of the screen, so the spread began up to
 *     180px from the finger pressing it, while the comments here claimed it
 *     "starts exactly on the button".
 *   - Coverage is therefore computed FROM that origin -- a half-diagonal is only
 *     correct from the centre, and from an off-centre one it leaves the bottom
 *     corners bare, committing on a half-filled screen.
 *   - Wall-clock elapsed time through a rAF loop, not a frame counter, so a dropped
 *     frame or a backgrounded tab cannot shorten the commitment.
 *   - Releasing early cancels and shrinks it back. Coverage is binary:
 *     `hasCoveredViewport` demands exactly 1.
 *   - Reduced motion skips the animation and commits immediately.
 *
 * The visuals are in `commitment-spread.tsx`, the button and its pointer handling
 * in `commit-hold-button.tsx`, and the `A5` identity line in `identity-line.tsx` --
 * split because this file passed the 250-line limit once the identity line went in.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { IdentityLine } from "@/components/onboarding/identity-line";
import { CommitHoldButton } from "@/components/onboarding/commit-hold-button";
import {
  CommitmentSpread,
  CommitmentStatus,
} from "@/components/onboarding/commitment-spread";
import {
  SPREAD_SETTLE_MS,
  hasCoveredViewport,
  spreadProgress,
  spreadRadiusPx,
} from "@/lib/utils/onboarding-flow";

interface StepProtocolProps {
  /** Called once the settle pause has elapsed. */
  onCommit: () => void;
  /**
   * `A5` -- leave without doing the hold. Until this existed `protocol` had **no
   * exit at all**: the shell hides Next on the last step and the hold was the only
   * way forward, so anyone who did not discover the press-and-hold was stuck here
   * permanently. Same destination and same completion flag as the hold -- skipping
   * is *declining the ritual*, not the app.
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
  const sectionRef = useRef<HTMLElement>(null);
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
  //
  // **The ResizeObserver is load-bearing.** `A5`'s identity line reads its text from
  // storage in an effect, so it fills in a moment after mount and moves the button
  // UP by 45px. The viewport never changes, so `resize` never fires and the circle
  // keeps a stale origin — measured 45px off at 430x932. Observing the SECTION
  // catches any shift. `setOrigin` cannot loop: origin feeds only `clip-path`,
  // which changes no layout.
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

    let ro: ResizeObserver | null = null;
    const host = sectionRef.current;
    if (host && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(measure);
      ro.observe(host);
    }

    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      ro?.disconnect();
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


  const radius = spreadRadiusPx(progress, viewport.w, viewport.h, origin.x, origin.y);
  const covered = progress > 0;

  return (
    <section ref={sectionRef} className="space-y-6">
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

      {/* A5 -- the identity line, above the button so it is read before the hold.
          Deliberately NOT lifted above the spread: that would need the text to
          change colour as the circle passes it, and `on-primary` on the page
          background is a contrast risk on one of the two themes. */}
      {!isHolding && !isCommitted && <IdentityLine />}

      <div className="relative flex items-center justify-center pt-6">
        <CommitHoldButton
          btnRef={btnRef}
          isHolding={isHolding}
          isCommitted={isCommitted}
          covered={covered}
          onHoldStart={beginHold}
          onHoldCancel={cancelHold}
        />

        {/* The circle and the rim on its edge. Both take the geometry rather than
            recomputing it: two derivations of one number could disagree. */}
        <CommitmentSpread
          radius={radius}
          originX={origin.x}
          originY={origin.y}
          covered={covered}
          isHolding={isHolding}
          isCommitted={isCommitted}
        />
      </div>

      <CommitmentStatus isCommitted={isCommitted} isHolding={isHolding} />

      {/* Hidden while a hold is in progress: a second finger here would exit from under
          someone halfway to committing. It comes BACK on release. */}
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