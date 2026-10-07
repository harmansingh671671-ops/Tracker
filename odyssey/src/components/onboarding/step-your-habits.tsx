"use client";

/**
 * Step 3 -- the habits this user just created.
 *
 * **Only the habits added during the flow**, never "everything in the database".
 * A returning user who cleared the onboarding flag already has habits, and
 * listing those as "the ones you just added" would be a straight lie. The flow
 * therefore tracks the ids it created and renders exactly those.
 *
 * Removable, because the A1 spec asks for an "editable final preview" -- this is
 * the one moment the user can see the whole set at once and change their mind
 * before the app starts.
 */

import { Plus, Trash2 } from "lucide-react";
import { HabitIcon } from "@/components/habits/habit-icon";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export interface OnboardingHabit {
  id: string;
  name: string;
  icon: string;
  targetDays?: number[];
}

interface StepYourHabitsProps {
  habits: OnboardingHabit[];
  onRemove: (id: string) => void;
  onAddMore: () => void;
}

export function StepYourHabits({ habits, onRemove, onAddMore }: StepYourHabitsProps) {
  return (
    <section className="space-y-4">
      <div className="space-y-1.5">
        <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
          {habits.length === 1 ? "Your habit" : "Your habits"}
        </h1>
        <p className="text-xs text-on-surface-variant leading-relaxed">
          These are already saved to your account.
        </p>
      </div>

      {habits.length === 0 ? (
        // Honest empty state, and deliberately not a dead end. The user is
        // allowed to look around before committing to a routine, so Next stays
        // enabled and this says plainly that they can add habits later.
        <div className="p-6 rounded-2xl border border-outline/10 bg-surface-container-low space-y-3 text-center">
          <p className="text-sm font-semibold text-on-surface">No habits yet</p>
          <p className="text-xs leading-relaxed text-on-surface-variant">
            That&apos;s fine — you can add them whenever you like, and the Habits tab
            will walk you through it.
          </p>
          <button
            type="button"
            onClick={onAddMore}
            className="mt-1 py-2.5 px-5 rounded-full bg-surface-container text-on-surface text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer hover:bg-surface-container-high transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add one now</span>
          </button>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {habits.map((h) => {
            const days = h.targetDays && h.targetDays.length > 0 ? h.targetDays : [1, 2, 3, 4, 5, 6, 7];
            return (
              <li
                key={h.id}
                className="flex items-center gap-3 p-3 rounded-2xl bg-surface-container-low border border-outline/10"
              >
                <HabitIcon icon={h.icon} className="w-9 h-9 shrink-0" />

                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold text-on-surface truncate">{h.name}</h2>
                  <p className="text-[11px] font-mono text-on-surface-variant mt-0.5">
                    {days.length === 7
                      ? "Every day"
                      : days
                          .slice()
                          .sort((a, b) => a - b)
                          .map((d) => WEEKDAYS[d - 1])
                          .join(" · ")}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onRemove(h.id)}
                  aria-label={`Remove ${h.name}`}
                  className="w-9 h-9 shrink-0 flex items-center justify-center rounded-full text-on-surface-variant hover:text-error hover:bg-error/10 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {habits.length > 0 && (
        <button
          type="button"
          onClick={onAddMore}
          className="w-full py-2.5 rounded-2xl border border-dashed border-outline/25 text-xs font-semibold text-on-surface-variant hover:text-on-surface hover:border-outline/40 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          + Add another
        </button>
      )}
    </section>
  );
}