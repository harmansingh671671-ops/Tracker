"use client";

/**
 * S19 — the keystone marker.
 *
 * One component for the list card and the heatmap card: the two used to carry
 * separate copies of this pill and drifted in size.
 *
 * Word-only, deliberately: the app has no keystone glyph, and a dependency for
 * one word is a poor trade.
 */
export function KeystoneBadge() {
  return (
    <span className="inline-flex items-center px-1.5 py-0.2 rounded-md border border-primary/40 bg-primary/10 text-primary text-[9.5px] font-mono font-bold shrink-0">
      Keystone
    </span>
  );
}
