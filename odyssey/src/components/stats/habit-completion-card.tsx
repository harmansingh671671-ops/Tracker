import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { WeekComparison } from "@/lib/utils/weekly-completion";

/**
 * S23 — habit completion, this week against the same days last week.
 *
 * Deliberately NOT "Days Done" (schedule written + reviewed) and NOT the
 * hardcoded Adherence tile. The counts are printed so the percentage can be
 * checked rather than trusted.
 */
interface HabitCompletionCardProps {
  comparison: WeekComparison;
}

function percent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

export function HabitCompletionCard({ comparison }: HabitCompletionCardProps) {
  const { current, previous, deltaPp } = comparison;
  const direction = deltaPp > 0 ? "up" : deltaPp < 0 ? "down" : "flat";

  const tone =
    direction === "up"
      ? "text-emerald-600 dark:text-emerald-400"
      : direction === "down"
        ? "text-amber-600 dark:text-amber-400"
        : "text-on-surface-variant";
  const DeltaIcon = direction === "up" ? TrendingUp : direction === "down" ? TrendingDown : Minus;
  const deltaLabel =
    deltaPp === 0 ? "No change" : `${deltaPp > 0 ? "+" : ""}${deltaPp} pts`;

  return (
    <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-container-low/95 border border-outline/[0.08] space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
          <TrendingUp className="w-4 h-4 shrink-0" />
          <span>Habit completion</span>
        </div>
        <span className={`inline-flex items-center gap-1 text-[11px] font-mono font-bold ${tone}`}>
          <DeltaIcon className="w-3.5 h-3.5" />
          {deltaLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
            This week
          </p>
          <p className="text-2xl font-bold font-mono text-on-surface">{percent(current.rate)}</p>
          <p className="text-[11px] font-mono text-on-surface-variant">
            {current.completed} of {current.due} habits
          </p>
        </div>
        <div>
          <p className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
            Last week
          </p>
          <p className="text-2xl font-bold font-mono text-on-surface-variant">
            {percent(previous.rate)}
          </p>
          <p className="text-[11px] font-mono text-on-surface-variant">
            {previous.completed} of {previous.due} habits
          </p>
        </div>
      </div>

      <p className="text-[10px] font-mono text-on-surface-variant/80">
        Same days last week · Monday start
      </p>
    </div>
  );
}
