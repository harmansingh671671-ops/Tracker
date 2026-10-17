"use client";

/**
 * The visual layer of the commitment step: the spreading fill, the rim riding its
 * boundary, and the status line.
 *
 * **Extracted because `step-protocol.tsx` crossed the 250-line limit when `A5`'s
 * identity line was added to it.** That is the rule doing its job, not a
 * refactor in its own right — but the split is on a real seam anyway: everything
 * here is presentational and geometry-driven, while `step-protocol.tsx` keeps the
 * hold state machine and the button's own handlers.
 *
 * Both layers share the circle's centre and radius with the maths in
 * `onboarding-flow.ts`, which is why they are passed the geometry rather than
 * recomputing it: two derivations of the same number would be free to disagree.
 */

/** How far the rim glow reaches inside and outside the clip boundary. */
const RIM_INNER_PX = 16;
const RIM_OUTER_PX = 6;

export interface CommitmentSpreadProps {
  radius: number;
  originX: number;
  originY: number;
  /** Drawn only once a hold has actually started. */
  covered: boolean;
  /** `true` while the user is holding — the spread must not ease during the press. */
  isHolding: boolean;
  isCommitted: boolean;
}

export function CommitmentSpread({
  radius,
  originX,
  originY,
  covered,
  isHolding,
  isCommitted,
}: CommitmentSpreadProps) {
  if (!covered || isCommitted) return null;

  const clip = `circle(${radius}px at ${originX}px ${originY}px)`;

  return (
    <>
      {/* The spreading circle. `clip-path` on a full-viewport layer rather than a
          scaled element: no layout, no reflow, and the radius is expressible
          directly in the same pixels the maths produced. The centre is the
          measured button position, so it starts under the finger. */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-50 pointer-events-none bg-primary"
        style={{
          clipPath: clip,
          transition: isHolding ? "none" : "clip-path 320ms ease-out",
        }}
      />

      {/* The boundary itself. A radial-gradient ring sharing the circle's exact
          centre and radius, so it rides the clip edge instead of being a separate
          element that could drift from it. Painted ABOVE the fill, so the half of
          the band that falls inside the spread is not swallowed by it — the edge
          reads as the source rather than as an edge. */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-[51] pointer-events-none odyssey-hold-rim"
        style={{
          background: `radial-gradient(circle at ${originX}px ${originY}px, transparent ${Math.max(
            0,
            radius - RIM_INNER_PX
          )}px, var(--primary) ${Math.max(0, radius - 2)}px, transparent ${radius + RIM_OUTER_PX}px)`,
        }}
      />
    </>
  );
}

export function CommitmentStatus({
  isCommitted,
  isHolding,
}: {
  isCommitted: boolean;
  isHolding: boolean;
}) {
  return (
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
  );
}