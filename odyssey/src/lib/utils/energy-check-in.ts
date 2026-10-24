/**
 * S25 — the daily energy check-in, as pure decisions.
 *
 * The prompt is five seconds of UI; everything that could quietly go wrong is
 * here, away from React: the scale, what counts as an answer, the per-day keys,
 * and the four reasons not to ask.
 *
 * The rule that protects trust is `shouldShowEnergyCheckIn`: ask an established
 * user once a day, then leave them alone. "Skip for today" and "already
 * answered" are both terminal for the day.
 */

export interface EnergyLevel {
  level: 1 | 2 | 3 | 4 | 5;
  emoji: string;
  label: string;
}

/**
 * The scale is frozen at five: the spec is a 1-to-5 prompt, and a four- or
 * six-point scale would make old answers incomparable to new ones.
 */
export const ENERGY_LEVELS: readonly EnergyLevel[] = [
  { level: 1, emoji: "😴", label: "Drained" },
  { level: 2, emoji: "😕", label: "Low" },
  { level: 3, emoji: "😐", label: "Okay" },
  { level: 4, emoji: "🙂", label: "Good" },
  { level: 5, emoji: "⚡", label: "Charged" },
];

/**
 * A valid level is a whole number from 1 to 5. Everything else is rejected
 * rather than rounded or coerced: "3" from stale storage, 2.5 from a mis-sized
 * button, or NaN from a broken write must never become a logged answer.
 */
export function normaliseEnergyLevel(value: unknown): 1 | 2 | 3 | 4 | 5 | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < 1 || value > 5) return null;
  return value as 1 | 2 | 3 | 4 | 5;
}

/** One log per user per day, so a second write replaces rather than duplicates. */
export function energyLogId(userId: string, dateStr: string): string {
  return `${userId}:${dateStr}`;
}

/** The per-day "don't ask again today" marker. A preference, not a log. */
export function energySkipKey(dateStr: string): string {
  return `odyssey_energy_skip_${dateStr}`;
}

export interface EnergyCheckInFacts {
  profileReady: boolean;
  habitCount: number;
  hasLogToday: boolean;
  skippedToday: boolean;
}

export function shouldShowEnergyCheckIn(facts: EnergyCheckInFacts): boolean {
  return (
    facts.profileReady &&
    // A profile with no habits is still onboarding; interrupting it would be
    // the app asking a stranger how their energy is before saying hello.
    facts.habitCount > 0 &&
    !facts.hasLogToday &&
    !facts.skippedToday
  );
}
