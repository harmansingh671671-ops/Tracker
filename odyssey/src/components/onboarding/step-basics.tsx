"use client";

/**
 * Step 4 -- the two things a new user cannot guess (`A2`).
 *
 * **Scope is deliberately tiny.** The researched `A2` asked for a scene each on
 * wallpaper, habits, schedule and rewards. That was cut on owner instruction to
 * "only what is required to use the app for basic tasks", which leaves exactly
 * two actions a first-time user cannot discover by looking:
 *
 *   1. **Plan your day** -- tap an empty hour and type what you are doing.
 *   2. **Mark it done** -- tap the habit each day.
 *
 * Everything else is excluded, and each exclusion has a reason rather than a
 * preference:
 *
 *   - **Habits are already taught by doing them.** Steps 2 and 3 create a real
 *     habit and review it, so a third explanation repeats two working screens.
 *   - **Rewards need no action.** XP and diamonds arrive on their own; a scene
 *     selling them would be describing something the user never operates.
 *   - **The wallpaper is off by default and costs battery** (`P8-E1`). Walking
 *     someone through an opt-in they have not opted into is the wrong first
 *     impression, and it is exactly what this step exists to avoid.
 *   - **Journey and stats** are reflection, not a basic task.
 *
 * One scene, not two. The research behind this app found people bounce off long
 * walkthroughs, and `A1` promises a usable plan quickly -- so the two actions
 * share a single screen rather than extending the flow by two steps.
 *
 * Motion is framer-motion with `useReducedMotion()`, and there is **no interval
 ***: the illustration plays once on mount. A looping decorative timer here would
 * be timer sprawl for a screen that is on for a few seconds.
 */

import { motion, useReducedMotion } from "framer-motion";
import { Check, Clock3, Hand, Target } from "lucide-react";
import { HabitIcon } from "@/components/habits/habit-icon";

/** Four hours is enough to read as "a column of a day" without becoming a list. */
const HOURS = ["09:00", "10:00", "11:00", "12:00"] as const;

/** The hour the block lands in. Index, not the string, so a rename cannot desync. */
const PLANNED_HOUR_INDEX = 1;

export interface BasicsHabit {
  name: string;
  icon: string;
}

interface BasicsCardProps {
  icon: React.ReactNode;
  title: string;
  caption: string;
  children: React.ReactNode;
}

function BasicsCard({ icon, title, caption, children }: BasicsCardProps) {
  return (
    <div className="rounded-2xl border border-outline/10 bg-surface-container-low overflow-hidden">
      <div className="flex items-start gap-2.5 px-4 pt-3.5 pb-2.5">
        <span className="mt-0.5 text-primary shrink-0">{icon}</span>
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-on-surface">{title}</h2>
          <p className="text-[11px] leading-relaxed text-on-surface-variant mt-0.5">
            {caption}
          </p>
        </div>
      </div>
      {children}
    </div>
  );
}

/**
 * An hour column with one block arriving.
 *
 * The block is not interactive: this is a picture of the gesture, and making it
 * tappable would imply tapping here does something. It appears in place rather
 * than sliding in from a finger, because a pointer that materialises mid-air is
 * harder to read than a block that simply lands.
 */
function PlanCard() {
  const reduced = useReducedMotion();

  return (
    <BasicsCard
      icon={<Clock3 className="w-4 h-4" />}
      title="Plan your day"
      caption="Tap any empty hour and type what you're doing."
    >
      <ul className="px-3 pb-3 space-y-1">
        {HOURS.map((hour, i) => {
          const planned = i === PLANNED_HOUR_INDEX;
          return (
            <li
              key={hour}
              className="flex items-center gap-2 h-9 px-2.5 rounded-lg bg-surface-container border border-outline/[0.06]"
            >
              <span className="text-[10px] font-mono tabular-nums text-on-surface-variant w-9 shrink-0">
                {hour}
              </span>
              {planned ? (
                <motion.span
                  initial={reduced ? false : { opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.32, delay: reduced ? 0 : 0.35, ease: "easeOut" }}
                  className="flex-1 h-6 rounded-md bg-primary px-2 flex items-center text-[10px] font-semibold text-on-primary truncate"
                >
                  Write the brief
                </motion.span>
              ) : (
                <span className="flex-1" />
              )}
            </li>
          );
        })}
      </ul>
    </BasicsCard>
  );
}

/**
 * One habit row going from unticked to ticked.
 *
 * **The habit shown is the one this user just created**, passed down from the
 * flow. An invented "Drink water" was the first version of this card, and it is
 * a confident display of a fact the user does not have -- the same failure mode
 * this repo keeps auditing for, committed in the very step meant to teach trust
 * in local data. Falling back to a neutral "Your habit" is honest when the user
 * skipped the habits step, which the flow explicitly allows.
 *
 * **No streak number is shown,** for the same reason: it would be a number about
 * a life the user has not started yet. The tick alone carries the meaning.
 */
function TickCard({ habit }: { habit?: BasicsHabit }) {
  const reduced = useReducedMotion();

  return (
    <BasicsCard
      icon={<Check className="w-4 h-4" />}
      title="Mark it done"
      caption="Tap your habit each day to tick it off."
    >
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2.5 h-11 px-2.5 rounded-lg bg-surface-container border border-outline/[0.06]">
          <span className="w-7 h-7 rounded-full bg-surface-container-high border border-outline/10 shrink-0 flex items-center justify-center">
            {habit ? (
              <HabitIcon
                icon={habit.icon}
                name={habit.name}
                className="w-4 h-4 text-primary"
                emojiClassName="text-sm leading-none select-none"
              />
            ) : (
              <Target className="w-4 h-4 text-on-surface-variant" />
            )}
          </span>
          <span className="flex-1 min-w-0 text-xs font-semibold text-on-surface truncate">
            {habit ? habit.name : "Your habit"}
          </span>
          <motion.span
            initial={reduced ? false : { scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              duration: 0.3,
              delay: reduced ? 0 : 0.75,
              ease: "backOut",
            }}
            className="w-6 h-6 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0"
          >
            <Check className="w-3.5 h-3.5" strokeWidth={3} />
          </motion.span>
        </div>
      </div>
    </BasicsCard>
  );
}

export function StepBasics({ habit }: { habit?: BasicsHabit }) {
  return (
    <section className="space-y-5">
      <div className="space-y-1.5">
        <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
          <Hand className="w-3.5 h-3.5" />
          Two things to know
        </span>
        <h1 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
          That&apos;s the whole loop
        </h1>
        <p className="text-xs text-on-surface-variant leading-relaxed">
          Plan an hour, tick the habit, come back tomorrow. Everything else in the
          app builds on those two.
        </p>
      </div>

      <div className="space-y-3 max-w-xl mx-auto">
        <PlanCard />
        <TickCard habit={habit} />
      </div>
    </section>
  );
}