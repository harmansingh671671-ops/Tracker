/**
 * Sentence-shaped summaries of a habit-form draft, for the live preview card
 * (B2, 2026-10-25).
 *
 * Pure: no React, no db. Every line the preview prints is decided here so the
 * same wording cannot drift between the create and edit forms — the two forms
 * render this card, and a duplicated template literal is how the copy diverged
 * everywhere else before the shared modules were built.
 */

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** The user-facing schedule line. Sorted, exit-by-exit, no invented claims. */
export function scheduleSummary(days?: number[]): string {
  if (!days || days.length === 0) return "No days picked yet";
  const sorted = [...days].sort((a, b) => a - b);
  const isSet = (expected: number[]) =>
    sorted.length === expected.length && expected.every((d, i) => sorted[i] === d);
  if (isSet([1, 2, 3, 4, 5, 6, 7])) return "Every day";
  if (isSet([1, 2, 3, 4, 5])) return "Weekdays";
  if (isSet([6, 7])) return "Weekends";
  return sorted.map((d) => DAY_NAMES[d - 1] ?? "").filter(Boolean).join(", ");
}

/** The when-on-the-day line. Unknown anchors are "Anytime" by definition. */
export function periodSummary(timeOfDay?: string): string {
  switch (timeOfDay) {
    case "morning": return "Mornings";
    case "afternoon": return "Afternoons";
    case "evening": return "Evenings";
    default: return "Anytime";
  }
}

export interface GoalSummaryInput {
  type?: string;
  unit?: string;
  /** The form holds typed text; accept either before the write. */
  targetValue?: string | number;
}

/** The what-completes-a-day line, in the wording the card hooks already use. */
export function goalSummary({ type, unit, targetValue }: GoalSummaryInput): string {
  if (type === "avoid") return "Quit habit — a clean day is the win";
  if (type === "counted") {
    const n = typeof targetValue === "number"
      ? targetValue
      : typeof targetValue === "string" ? Number(targetValue.trim()) : NaN;
    if (Number.isFinite(n) && n > 0) return `${n} ${unit?.trim() || "units"} a day`;
    return "Counted — no daily target set";
  }
  return "Simple — tap or hold to complete";
}

/** Priority chip text. Absent is Focus — the form's own default. */
export function prioritySummary(priority?: string): string {
  if (priority === "critical") return "Critical";
  if (priority === "optional") return "Optional";
  return "Focus";
}
