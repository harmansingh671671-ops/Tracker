"use client";

/**
 * M25 — the habits screen's skeleton. While the view preference is being
 * resolved or the first habit fetch is in flight, this stands in for the card
 * list so the screen paints its shell instantly instead of flashing the
 * default heatmap, the empty state, or an empty scroll area (skeleton-first,
 * the pattern data-heavy habit apps use). Replaced by real content the moment
 * either is ready — revisits with cached data essentially never see it.
 */

export function HabitsSkeleton() {
  return (
    <div className="space-y-2.5" aria-hidden="true">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-[104px] rounded-2xl bg-surface-container border border-outline/10 animate-pulse"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}
