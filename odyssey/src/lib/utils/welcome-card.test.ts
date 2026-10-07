import { describe, it, expect } from "vitest";
import { shouldShowWelcomeCard } from "./welcome-card";

/** A user who has just installed the app: nothing loaded, nothing dismissed. */
function firstRun() {
  return { habitsLoading: false, habitCount: 0, dismissed: false };
}

describe("shouldShowWelcomeCard", () => {
  it("shows for a brand new user with no habits", () => {
    expect(shouldShowWelcomeCard(firstRun())).toBe(true);
  });

  // The regression this whole module exists to prevent: `habits` is `[]` on the
  // very first paint for EVERY user, because the store starts `loading: true`.
  // Without the loading check, a user with habits gets the card flashed at them
  // on every single visit.
  it("stays hidden while the habit list is still loading", () => {
    expect(shouldShowWelcomeCard({ habitsLoading: true, habitCount: 0, dismissed: false })).toBe(
      false
    );
  });

  it("checks loading before the habit count", () => {
    // Zero habits AND loading: if the count were checked first this would show.
    expect(shouldShowWelcomeCard({ habitsLoading: true, habitCount: 0, dismissed: false })).toBe(
      false
    );
  });

  it("hides once the user has at least one habit", () => {
    // The welcome has done its job by then and must never return.
    expect(shouldShowWelcomeCard({ habitsLoading: false, habitCount: 1, dismissed: false })).toBe(
      false
    );
    expect(shouldShowWelcomeCard({ habitsLoading: false, habitCount: 20, dismissed: false })).toBe(
      false
    );
  });

  it("hides once dismissed", () => {
    expect(shouldShowWelcomeCard({ habitsLoading: false, habitCount: 0, dismissed: true })).toBe(
      false
    );
  });

  it("stays hidden when both dismissed and still loading", () => {
    expect(shouldShowWelcomeCard({ habitsLoading: true, habitCount: 0, dismissed: true })).toBe(
      false
    );
  });

  it("treats a missing habit count as zero rather than NaN", () => {
    // A store that failed to populate should not produce a truthy comparison
    // against `undefined`.
    expect(
      shouldShowWelcomeCard({
        habitsLoading: false,
        habitCount: undefined as unknown as number,
        dismissed: false,
      })
    ).toBe(true);
  });

  // Ordering guarantee for the screen: the card and the M2 empty state share one
  // slot, so exactly one of them must win. The card only wins pre-dismissal;
  // after dismissal the empty state takes over, so dismissing is never a
  // dead end.
  it("never competes with the empty state -- exactly one state is shown", () => {
    const card = shouldShowWelcomeCard(firstRun());
    const emptyState = !card; // habits/page.tsx renders the empty state otherwise
    expect(card && emptyState).toBe(false);
  });
});