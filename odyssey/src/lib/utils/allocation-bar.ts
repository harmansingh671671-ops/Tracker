/**
 * Geometry for the "Daily Allocation" bar — the thin horizontal strip that
 * summarises a day as a 24-hour capsule.
 *
 * It used to be five flex children sized as a share of 24 (all Focus, then all
 * Vitality, then Sync, Renewal, Rest). That layout could not be read as a day: a
 * day running Sleep → Vitality → Sleep → Work → Sleep rendered as one indigo
 * block beside one violet block, with the order of the day thrown away. The bar
 * is now 24 one-hour slices laid out left to right in time order — 00:00
 * first, 23:00 last — so it reads as the day it summarises. Adjacent hours of
 * the same category still merge into one band, because that is what the shape
 * of the day actually looks like.
 *
 * Two properties this module exists to guarantee, both of which are easy to
 * lose by inlining the arithmetic into a component:
 *
 * 1. The slices TILE the capsule exactly. Each slice starts at hour/24 and is
 *    exactly 1/24 wide, so there is no seam and nothing over-constrains the
 *    row. The old flex version added a 2px `gap` between every child on top of
 *    widths that already summed to 100%, so flexbox silently shrank all 24 to
 *    make room — 23 gaps ate roughly 15% of every slice.
 * 2. The FIRST and LAST slice reach both rounded ends. The track is
 *    `rounded-full overflow-hidden`, so slice 0 (0 → 4.167%) fills the left
 *    semicircular cap and slice 23 (95.833% → 100%) fills the right one.
 *    Nothing notches the caps.
 */

/** Hours in a day. The bar is one slice per hour, always. */
export const ALLOCATION_SLOT_COUNT = 24;

/**
 * One entry per category: the slice's fill colour and its name.
 *
 * This lives here rather than on either page because the two pages that render
 * this bar keep their own `getCatStyle` maps (the planner's has no `dotClass`,
 * only an `accentGlow`), so reusing those for the bar would have meant a third
 * and fourth spelling of the same five colours. One map, both screens.
 *
 * The names match the hour cards on purpose, so hovering a slice says the same
 * word the card says. No raw hex — these are the palette classes already in use.
 */
const ALLOCATION_CATEGORIES: Record<string, { fill: string; label: string }> = {
  // B5: "Deep Focus" — the legend's names exist to match the hour cards
  // (see the comment above), and the cards say Deep Focus since the two
  // screens' palettes merged into one source.
  work: { fill: "bg-primary", label: "Deep Focus" },
  vitality: { fill: "bg-emerald-500", label: "Vitality" },
  sync: { fill: "bg-sky-500", label: "Active Sync" },
  renewal: { fill: "bg-amber-500", label: "Renewal" },
  sleep: { fill: "bg-indigo-500", label: "Rest & Sleep" },
};

/**
 * Fill + label for a category key, falling back to Deep Work for an empty or
 * unrecognised one. Both pages already treated an empty category as focus when
 * counting hours, so this fallback keeps the bar agreeing with the legend
 * instead of dropping an uncoloured slice into the strip.
 */
export function allocationCategory(key: string | null | undefined): {
  fill: string;
  label: string;
} {
  return ALLOCATION_CATEGORIES[key ?? ""] ?? ALLOCATION_CATEGORIES.work;
}

export interface AllocationSlice {
  /** 0 … 23. `slices[hour].hour === hour` is an invariant, pinned by tests. */
  hour: number;
  /**
   * Whether this hour counts as planned. A false slice renders as the empty
   * track rather than a colour.
   *
   * The caller decides this, and deliberately: the two screens that render this
   * bar do not count a planned hour the same way (one also accepts a typed
   * title, the other only accepts a saved block), so this module must not
   * quietly pick one and change what the legend under the bar reports.
   */
  filled: boolean;
  /** Hour range, e.g. "00:00–01:00". Midnight wraps rather than reading "24:00". */
  label: string;
  /**
   * Absolute offsets for a positioned slice. Absolute rather than flex
   * precisely so the 24 slices tile the capsule and the rounded ends.
   */
  style: { left: string; width: string };
}

const pad = (h: number) => String(h).padStart(2, "0");

/** "00:00–01:00". Hour 23 reads "23:00–00:00": a day ends, it does not reach 24. */
export function formatAllocationSlotRange(hour: number): string {
  return `${pad(hour)}:00–${pad((hour + 1) % ALLOCATION_SLOT_COUNT)}:00`;
}

/**
 * Build the 24 slices of the bar from a per-hour "is this planned" list.
 *
 * Always returns 24 slices, whatever the input length: a short or absent list
 * yields open hours, never a collapsed bar. The bar is a fixed frame of
 * reference for the day, so a data glitch must leave it full-width rather than
 * quietly shrink it.
 */
export function buildAllocationSlices(filled: readonly boolean[]): AllocationSlice[] {
  return Array.from({ length: ALLOCATION_SLOT_COUNT }, (_, hour) => ({
    hour,
    filled: !!filled[hour],
    label: formatAllocationSlotRange(hour),
    style: {
      left: `${(hour / ALLOCATION_SLOT_COUNT) * 100}%`,
      width: `${100 / ALLOCATION_SLOT_COUNT}%`,
    },
  }));
}