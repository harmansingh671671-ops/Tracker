"use client";

/**
 * `A6` -- the app's one loading indicator.
 *
 * ## The spec's premise did not match this app
 *
 * `A6` asks for animation *"instead of blank processing screens"*. Measured: **there
 * were none.** `day-schedule` already had a spinner plus a label, the modal had
 * near-identical markup, and three more places use *inline placeholders* sized to
 * their real content so nothing shifts when data lands. This module consolidates
 * that, it does not fill a gap.
 *
 * **The three inline placeholders are deliberately NOT converted.** The planner
 * header's skeleton and the two date strips' grey bars exist to hold the content's
 * exact height; dropping a 32px ring into a 14px inline slot would reintroduce the
 * layout jump their comments say they are there to prevent. A ring is a *processing*
 * indicator; a same-height bar is a *shape reservation*. Different jobs.
 *
 * ## Why orbital dots rather than another `Loader2`
 *
 * `M17` names *"multi-colour orbital dot animation (HabitDriven style)"*, and two
 * screens already spin a `Loader2` -- so a third spinner would have unified the
 * markup while changing nothing anyone could see. Three dots on a shared orbit use
 * the app's own `--primary` / `--secondary` / `--tertiary`, so the indicator is
 * violet-on-light and mint-on-dark without a second set of tokens, and it reads as
 * this app's rather than as a browser default.
 *
 * ## Motion
 *
 * One rotating container, three dots at different offsets -- so the whole thing is
 * a single keyframe and three `animation-delay`s rather than three animations.
 * Keyframes live inside `prefers-reduced-motion: no-preference` in `globals.css`
 * with `animation: none` under `reduce`, per the `keystonePulse` / `slateSweep` /
 * `perfectDayGlow` convention: honouring reduced motion then costs no JS.
 *
 * Under `reduce` the dots are laid out at rest on the same orbit, so the indicator
 * still reads as "busy" without moving.
 */

type Size = "sm" | "md";

interface LoadingIndicatorProps {
  /**
   * What is being loaded. **Rendered, not just announced** -- the spec asks to
   * "show what is happening", and a generic spinner says only that *something* is.
   */
  label?: string;
  size?: Size;
  /** Extra classes for the layout wrapper. */
  className?: string;
}

const RING_PX: Record<Size, number> = { sm: 16, md: 34 };

/** Dot colour per position. Uses theme tokens, so it re-themes for free. */
const DOT_CLASS = [
  "bg-primary",
  "bg-secondary",
  "bg-tertiary",
] as const;

export function LoadingIndicator({
  label,
  size = "md",
  className = "",
}: LoadingIndicatorProps) {
  const ring = RING_PX[size];
  const dot = Math.max(3, Math.round(ring * 0.24));
  const orbit = Math.max(4, Math.round((ring - dot) / 2));

  return (
    <div
      // Announced as a status so a screen reader is told what is happening rather
      // than hearing nothing. `polite`, not assertive: loading is not an emergency.
      role={label ? "status" : "presentation"}
      aria-live={label ? "polite" : undefined}
      aria-busy="true"
      className={`flex flex-col items-center justify-center gap-2.5 ${className}`}
    >
      <span
        aria-hidden="true"
        className="odyssey-load-orbit relative inline-flex items-center justify-center"
        style={{ width: ring, height: ring }}
      >
        {DOT_CLASS.map((cls, i) => (
          <span
            key={cls}
            className={`absolute rounded-full ${cls} odyssey-load-dot`}
            style={{
              width: dot,
              height: dot,
              // Each dot sits on the same radius, rotated to a third of the
              // circle; the shared container animation then carries all three.
              transform: `rotate(${(360 / DOT_CLASS.length) * i}deg) translateY(-${orbit}px)`,
              animationDelay: `${(i * -1) / DOT_CLASS.length}s`,
            }}
          />
        ))}
      </span>

      {label && (
        <span
          className={`font-mono text-on-surface-variant ${
            size === "sm" ? "text-[10px]" : "text-xs"
          }`}
        >
          {label}
        </span>
      )}
    </div>
  );
}