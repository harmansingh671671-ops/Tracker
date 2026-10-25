/**
 * Counted-habit unit presets and the one rule that decides behavior from a
 * unit string (D1/D2 session work, 2026-10-25).
 *
 * `Habit.unit` is a free-form display string — always has been — so the
 * timer-or-counter decision must be derivable from that string alone. A preset
 * writes a canonical id ("minutes", "pages", ...), a custom unit writes
 * whatever the user typed, and legacy habits keep whatever they already had.
 * `timeUnitMinuteFactor` is therefore label-based, not id-based: nothing in
 * `select count(*) from habits` migrates, and "Minutes" typed by hand before
 * this feature existed still opens the timer.
 *
 * Pure: no db, no stores, no React.
 */

export interface UnitPreset {
  /** Stored in `Habit.unit` verbatim — it doubles as the display label. */
  id: string;
  /** What the picker chip shows. */
  label: string;
  emoji: string;
  /** Pre-filled target when the preset is chosen and no target was typed. */
  defaultTarget: number;
}

export const UNIT_PRESETS: UnitPreset[] = [
  { id: "minutes", label: "Time", emoji: "⏱", defaultTarget: 25 },
  { id: "pages", label: "Pages", emoji: "📖", defaultTarget: 20 },
  { id: "glasses", label: "Glasses", emoji: "💧", defaultTarget: 8 },
  { id: "reps", label: "Reps", emoji: "💪", defaultTarget: 20 },
];

/**
 * True when `unit` is one of the picker's preset ids. Legacy free-text units
 * (anything the user typed before this picker existed) are custom by
 * definition — the custom column must pre-fill with them or editing a habit
 * silently renames its unit.
 */
export function isUnitPresetId(unit: string | null | undefined): boolean {
  return typeof unit === "string" && UNIT_PRESETS.some((p) => p.id === unit);
}

/**
 * How many minutes one unit of this habit's `targetValue` is, when the unit is
 * a time unit; null when the habit is a counter.
 *
 * "time" is deliberately accepted as minutes: it reads as a duration to a
 * user, it is the obvious thing they type custom, and pretending it is unclear
 * would strand such a habit on the counter.
 */
export function timeUnitMinuteFactor(unit: string | null | undefined): number | null {
  if (typeof unit !== "string") return null;
  const u = unit.trim().toLowerCase();
  if (u === "") return null;
  if (u === "time") return 1;
  // Singular+plural forms are listed rather than regexed, so adding a unit is
  // a reviewed decision, never a surprise match.
  if (["min", "mins", "minute", "minutes"].includes(u)) return 1;
  if (["hr", "hrs", "hour", "hours"].includes(u)) return 60;
  return null;
}

/**
 * One logged count from any input the counter view accepts — typed text, a
 * stepper calculation, an API of stray `Number` results. Integer, >= 0, never
 * NaN/Infinity, garbage clamps to 0 rather than throwing (a missing habit
 * target must not turn a log write into a crash).
 */
export function clampCountedValue(raw: unknown): number {
  const n = typeof raw === "number" ? raw : typeof raw === "string" ? Number(raw.trim()) : NaN;
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.round(n));
}
