"use client";

/**
 * Step 2 -- the welcome content, and the add-habit moment.
 *
 * This is where the M6 welcome card moved to. It is no longer a dismissible
 * banner on a tab -- inside a guided flow a "dismiss" control makes no sense,
 * and a card that "disappears once you add a habit" was describing itself in
 * terms of a screen it no longer lives on. What survived is the part that was
 * worth keeping: the three pillars and the local-data trust message.
 *
 * The habit it creates is a REAL habit. `onCreate` writes through the habit
 * store, so anything added here is already on the Habits tab when the flow ends.
 */

import { CalendarClock, ListChecks, Plus, Smartphone } from "lucide-react";
import { LocalDataTrustBadge } from "@/components/common/local-data-trust-badge";
import { GOAL_TAGS, type GoalTag } from "@/lib/utils/goal-tags";

const PILLARS = [
  {
    Icon: ListChecks,
    title: "Habits",
    body: "Tick off what you meant to do. Streaks build themselves.",
  },
  {
    Icon: CalendarClock,
    title: "Schedule",
    body: "Shape the day on a 24-hour rail. Tap any hour to plan it.",
  },
  {
    Icon: Smartphone,
    title: "Wallpaper",
    body: "Put today's plan on your lock screen, if you want it there.",
  },
] as const;

interface StepWelcomeHabitsProps {
  /**
   * Opens the shared create-habit modal. M16 passes the tapped tag's suggestion;
   * `A3` also needs the tag **id**, which is what gets persisted so the starter
   * library can be ordered for this user later. Passing the whole tag rather
   * than adding a second positional argument keeps the two impossible to swap.
   */
  onOpenCreate: (tag?: GoalTag) => void;
  /** How many habits they have added so far, for the live count. */
  addedCount: number;
}

export function StepWelcomeHabits({ onOpenCreate, addedCount }: StepWelcomeHabitsProps) {
  return (
    <section className="space-y-5">
      <div className="space-y-1.5">
        <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
          Three things worth knowing
        </h1>
        <p className="text-xs text-on-surface-variant leading-relaxed">
          Start with one habit. Everything else can wait.
        </p>
      </div>

      <ul className="space-y-2.5">
        {PILLARS.map(({ Icon, title, body }) => (
          <li
            key={title}
            className="flex items-start gap-3 p-3 rounded-2xl bg-surface-container-low border border-outline/10"
          >
            <span
              aria-hidden="true"
              className="mt-px flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-container text-primary"
            >
              <Icon className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-on-surface">{title}</h2>
              <p className="text-xs leading-snug text-on-surface-variant">{body}</p>
            </div>
          </li>
        ))}
      </ul>

      <LocalDataTrustBadge variant="inline" />

      <div className="p-4 rounded-2xl bg-primary-container/50 border border-primary/25 space-y-3">
        <div className="space-y-1">
          <h2 className="text-sm font-bold text-on-surface">Add your first habit</h2>
          <p className="text-xs leading-relaxed text-on-surface-variant">
            Pick what you are aiming at, or start from scratch — it goes straight into
            your app and will be waiting on the Habits tab when you get there.
          </p>
        </div>

        {/* M16 -- the five goal category tags from MASTER_TODO_REVISED L988,
            verbatim. Each one is a real button that opens the add-habit form
            pre-filled, because a chip that only says a word back at the user is
            decoration, not a control. The category is highlighted rather than
            coloured so the choice is legible without relying on colour (5.3 #3),
            and the blurb carries the meaning of each option rather than leaving
            five labels to be interpreted. */}
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Goal categories">
          {GOAL_TAGS.map((tag) => (
            <button
              key={tag.id}
              type="button"
              title={tag.blurb}
              onClick={() => onOpenCreate(tag)}
              className="px-2.5 py-1.5 rounded-full text-[11px] font-semibold font-mono bg-surface-container-high border border-outline/15 text-on-surface hover:border-primary/50 hover:bg-primary-container/40 active:scale-[0.98] transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span aria-hidden="true" className="mr-1">
                {tag.suggestion.icon}
              </span>
              {tag.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onOpenCreate()}
          className="w-full py-3 px-5 rounded-full bg-primary text-on-primary text-sm font-bold transition-opacity hover:opacity-90 active:opacity-80 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>{addedCount > 0 ? "Add another habit" : "Add your first habit"}</span>
        </button>

        {addedCount > 0 && (
          <p className="text-[11px] font-medium text-primary text-center" role="status">
            {addedCount === 1 ? "1 habit added" : `${addedCount} habits added`}
          </p>
        )}
      </div>
    </section>
  );
}