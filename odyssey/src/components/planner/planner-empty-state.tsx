"use client";

interface PlannerEmptyStateProps {
  /**
   * A day in the past with nothing on it was not a choice to leave it blank,
   * so it must not be described as one. The copy differs; the shape does not.
   */
  isPastDay: boolean;
}

/**
 * Zero-block state for the Planner (M3).
 *
 * A blank day is a legitimate starting point, not a missing thing, so the copy
 * says so plainly instead of leaving 24 identical "Empty Slot" rows to be
 * interpreted. There is no button here on purpose: the instruction is to tap an
 * hour, and adding a (+) button would be a second, redundant path to a gesture
 * that already works on all 24 rows.
 *
 * The illustration is the planner's own rail — a spine with ticks and one
 * highlighted hour — so it reads as "this surface, empty" rather than as a
 * generic empty-box glyph. The highlighted hour is the only (+) on screen; an
 * earlier pass floated a second pulsing (+) badge over it, which just read as a
 * duplicate control. The pulse is now on that one hour.
 *
 * Both motions are decorative and `aria-hidden`; the real affordance is the
 * timeline below. They are gated on `prefers-reduced-motion` in `globals.css`,
 * matching `keystonePulse` (M2) and `date-ring-pulse`, so honouring reduced
 * motion costs no JS and no hydration-time flash.
 */
export function PlannerEmptyState({ isPastDay }: PlannerEmptyStateProps) {
  return (
    <div className="flex flex-col items-center text-center gap-4 rounded-2xl border border-outline/10 bg-surface-container-low px-6 py-8 sm:py-10">
      <svg
        viewBox="0 0 56 120"
        className="w-14 h-28 sm:w-16 sm:h-32"
        role="presentation"
        aria-hidden="true"
        focusable="false"
      >
        {/* The rail spine. */}
        <line
          x1="18"
          y1="10"
          x2="18"
          y2="110"
          stroke="var(--primary)"
          strokeOpacity="0.35"
          strokeWidth="2"
          strokeLinecap="round"
        />

        {/* Unwritten hours: real ticks, no titles — the same honesty the timeline
            itself keeps when an hour is empty. */}
        {[16, 40, 88, 106].map((y) => (
          <g key={`idle-${y}`}>
            <circle
              cx="18"
              cy={y}
              r="3.5"
              fill="var(--on-surface-variant)"
              fillOpacity="0.25"
            />
            <rect
              x="30"
              y={y - 4}
              width="22"
              height="8"
              rx="4"
              fill="var(--on-surface-variant)"
              fillOpacity="0.15"
            />
          </g>
        ))}

        {/* Glow behind the tappable hour. Only opacity animates: an SVG rect has
            no box-shadow ring to expand, and scaling it would distort the
            stroke. */}
        <rect
          className="slate-tap-pulse"
          x="23"
          y="49"
          width="34"
          height="30"
          rx="11"
          fill="var(--primary)"
        />

        {/* The one tappable hour the copy points at. */}
        <rect
          x="26"
          y="52"
          width="28"
          height="24"
          rx="8"
          fill="var(--primary-container)"
          stroke="var(--primary)"
          strokeWidth="2"
        />
        <path
          d="M36 64 H44 M40 60 V68"
          stroke="var(--primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Travels the spine, so the blank day reads as somewhere to begin. */}
        <rect
          className="slate-sweep"
          x="15"
          y="0"
          width="6"
          height="16"
          rx="3"
          fill="var(--primary)"
          style={{ transformBox: "fill-box" }}
        />
      </svg>

      <div className="space-y-1.5">
        <h3 className="text-base font-bold text-on-surface">
          {isPastDay
            ? "Nothing was scheduled on this day"
            : "Your day is a clean slate"}
        </h3>
        <p className="text-xs text-on-surface-variant max-w-[18rem] mx-auto leading-relaxed">
          {isPastDay
            ? "The day has already passed. Pick another date to plan, or leave it."
            : "Tap any empty hour to schedule your first block."}
        </p>
      </div>
    </div>
  );
}
