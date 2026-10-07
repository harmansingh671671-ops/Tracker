import { Lock } from "lucide-react";
import { cn } from "cn";

/**
 * M1 - local-data trust badge.
 *
 * States the privacy promise out loud so it reads as a feature rather than
 * something the user has to infer. Odyssey is local-only by construction
 * (Dexie/IndexedDB, zero telemetry - see the DoD checklist in main_plan.md),
 * so this is a statement of fact, not a marketing claim.
 *
 * The copy is owner-set and supersedes both research drafts, which worded it
 * differently:
 *   - `MASTER_TODO_REVISED.md §19 L973` "100% Local-First - Your data lives on
 *     your device"
 *   - `Habit Research/integration_roadmap.md M7` "Your data is stored
 *     locally. Nothing leaves your device."
 * Keep it aligned with the M1 / A8 lines in `main_plan.md`.
 *
 * `§19 L973` names three surfaces - Settings, Onboarding, Profile:
 *   - `variant="card"`   its own block, matching the Profile page's cards
 *   - `variant="inline"` nests inside an existing card (Settings' Local Vault,
 *                        and the M6 welcome card)
 *
 * All three now exist. The onboarding surface was absent for the whole of M1's
 * life because there is no `/onboarding` route (A1 is `NOT BUILT`); it arrived
 * with M6, whose welcome card is the first-run surface inside the app. A future
 * `/onboarding` route can reuse the same inline variant.
 *
 * Presentational only - no state, no tests needed. All behaviour lives in the
 * storage layer this is describing.
 */
interface LocalDataTrustBadgeProps {
  /** Extra classes for placement/spacing overrides. */
  className?: string;
  variant?: "card" | "inline";
}

export function LocalDataTrustBadge({
  className,
  variant = "card",
}: LocalDataTrustBadgeProps) {
  return (
    <div
      data-testid="local-data-trust-badge"
      className={cn(
        "flex items-start gap-2.5 text-xs",
        variant === "card"
          ? "rounded-3xl bg-surface-container-low border border-outline/15 p-4 sm:p-5 shadow-sm"
          : "rounded-xl bg-surface-container p-2.5",
        className
      )}
    >
      <span
        aria-hidden="true"
        className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"
      >
        <Lock className="h-3 w-3" />
      </span>

      <p className="leading-snug text-on-surface-variant">
        <span className="font-semibold text-on-surface">
          Your data will not leave your device
        </span>{" "}
        without your consent.
      </p>
    </div>
  );
}