"use client";

/**
 * M14 -- the rank level-up dialog.
 *
 * Shows the newly earned rank's unique lore (`rank-lore.ts`) exactly once per
 * promotion. Detection is deliberately separated from presentation: this
 * component only ever renders a celebration that `getRankUpCelebration` has
 * already confirmed, so there is no branch here that can congratulate someone
 * for standing still or for a rank they just lost.
 *
 * ## Why the previous rank lives in localStorage
 *
 * The rank is derived from the days-done count, which the app recomputes in a
 * store the component never sees. So the *previous* rank has to be remembered
 * from last time this component ran. Three consequences, all deliberate:
 *
 * - **First run stores the current rank without a dialog.** A new user has not
 *   earned anything by opening the app; showing "Welcome, Novice!" for the rank
 *   they were born into would be a fabricated achievement.
 * - **A drop updates the stored value silently.** Losing days should not leave a
 *   stale high-water mark that fires a false promotion later.
 * - **Dismissing is permanent for that promotion.** The rank is written back
 *   immediately, so a refresh cannot replay the dialog.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { calculateRank } from "@/lib/utils/gamification";
import { getRankUpCelebration, type RankUpCelebration } from "@/lib/utils/rank-lore";
import { readString, writeString } from "@/lib/utils/logger";

const STORAGE_KEY = "odyssey_last_seen_rank";

interface RankUpDialogProps {
  /** The user's app-wide days-done count. Ranks are earned in days done (ADR 0005). */
  daysDone: number | undefined;
}

export function RankUpDialog({ daysDone }: RankUpDialogProps) {
  const [celebration, setCelebration] = useState<RankUpCelebration | null>(null);
  const seenRef = useRef<string | null>(null);
  // The deferred promotion can outlive an unmount if the user navigates in the
  // same tick, and React would warn about setting state on a dead component.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const currentRankName = calculateRank(daysDone ?? 0);

  const record = useCallback((rankName: string) => {
    seenRef.current = rankName;
    writeString(STORAGE_KEY, rankName);
  }, []);

  useEffect(() => {
    // Nothing to compare against before the profile has loaded; an absent count
    // would otherwise read as rank zero and fire a false promotion.
    if (!currentRankName) return;
    if (daysDone === undefined || daysDone === null) return;

    // `setState` is deferred out of the effect body: calling it synchronously
    // here cascades a second render pass, which the react-hooks lint rule
    // (and rightly) refuses. The promotion is still recorded immediately, so a
    // deferred render can never show it twice.
    const show = (promo: RankUpCelebration) => {
      queueMicrotask(() => {
        if (mountedRef.current) setCelebration(promo);
      });
    };

    if (seenRef.current === null) {
      // First evaluation for this mount: read what was stored last session.
      const stored = readString(STORAGE_KEY);
      if (stored) {
        seenRef.current = stored;
        const promo = getRankUpCelebration(stored, currentRankName);
        if (promo) {
          record(currentRankName);
          show(promo);
          return;
        }
      }
      // No stored rank at all -- a first launch. Record silently: nothing has
      // been earned by opening the app.
      record(currentRankName);
      return;
    }

    if (seenRef.current !== currentRankName) {
      const promo = getRankUpCelebration(seenRef.current, currentRankName);
      record(currentRankName);
      // A demotion yields no promo, so the stored value is updated without a
      // dialog -- the high-water mark must not survive a drop.
      if (promo) show(promo);
    }
  }, [currentRankName, daysDone, record]);

  return (
    <Dialog open={celebration !== null} onOpenChange={(open) => !open && setCelebration(null)}>
      <DialogContent className="sm:max-w-sm text-center">
        {celebration && (
          <>
            <p className="text-xs font-mono uppercase tracking-widest text-on-surface-variant">
              {celebration.previousRank
                ? `${celebration.previousRank.name} → ${celebration.rank.name}`
                : celebration.rank.division}
            </p>
            <div
              aria-hidden="true"
              className="mx-auto my-3 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-container text-4xl"
            >
              {celebration.rank.badge}
            </div>
            <DialogTitle className="text-xl">
              {celebration.rank.name}
            </DialogTitle>
            <DialogDescription className="text-sm leading-relaxed">
              {celebration.lore}
            </DialogDescription>
            <p className="text-xs text-on-surface-variant font-mono">
              {celebration.rank.description}
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}