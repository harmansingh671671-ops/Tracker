/**
 * M16 -- onboarding goal category tags.
 *
 * `MASTER_TODO_REVISED.md` L988 (and the note at L902) ask for crisp category
 * labels during onboarding: **Academic Excellence, Peak Health, Deep Focus,
 * Mindfulness, Digital Detox**.
 *
 * ## Two lists in the source, and which one won
 *
 * `A1` (L199) describes the first-run goal question differently — *"Focus,
 * Health, Sleep, Balance, Digital Detox, Custom"* — six options, two of which
 * (`Sleep`, `Balance`, `Custom`) do not appear in the M16 list at all. The two
 * lists disagree. **M16's five labels are implemented verbatim** because M16 is
 * the feature that names them and its list is the specific one; the `A1` wording
 * is recorded here rather than silently blended in, because quietly unioning two
 * conflicting lists is how a spec stops meaning anything.
 *
 * ## A tag that changes nothing is just a label
 *
 * Each tag carries a **suggested habit** — a name, an icon and a category — so
 * tapping a tag opens the add-habit form already filled in. A row of chips that
 * only says five things back to the user is exactly the "generic label" problem
 * this sequence of features has been removing.
 *
 * The category on each suggestion is one of the **four** domains
 * `CreateHabitModal` actually offers — `Mindful Focus`, `Vitality & Fitness`,
 * `Renewal & Health`, `Craft & Skill` — because pre-filling a string the form has
 * no option for would show a chip that does nothing when tapped. Two tags share
 * `Mindful Focus` (`Deep Focus` and `Mindfulness`) because four domains cannot
 * cover five tags distinctly; that collision is a fact of the picker, not a
 * mistake in the mapping, and a test asserts every category is a real domain.
 */

export type GoalTagId = "academic" | "health" | "focus" | "mindfulness" | "detox";

export interface GoalTag {
  id: GoalTagId;
  /** The label, verbatim from the spec. */
  label: string;
  /** One line on what picking this is for. */
  blurb: string;
  /** Pre-fills the add-habit form. */
  suggestion: {
    name: string;
    icon: string;
    /** One of `CreateHabitModal`'s four DOMAINS. */
    category: string;
  };
}

export const GOAL_TAGS: GoalTag[] = [
  {
    id: "academic",
    label: "Academic Excellence",
    blurb: "Study, revise and keep the streak of showing up.",
    suggestion: { name: "Study for 25 minutes", icon: "📚", category: "Craft & Skill" },
  },
  {
    id: "health",
    label: "Peak Health",
    blurb: "Training, food and sleep — the unglamorous basics.",
    suggestion: { name: "Workout", icon: "🏋️", category: "Vitality & Fitness" },
  },
  {
    id: "focus",
    label: "Deep Focus",
    blurb: "One block of real, uninterrupted work at a time.",
    suggestion: { name: "Focus session", icon: "🎯", category: "Mindful Focus" },
  },
  {
    id: "mindfulness",
    label: "Mindfulness",
    blurb: "Stillness, breathing and noticing the day as it is.",
    suggestion: { name: "Meditate", icon: "🧘", category: "Mindful Focus" },
  },
  {
    id: "detox",
    label: "Digital Detox",
    blurb: "Fewer screens, on purpose rather than by accident.",
    suggestion: { name: "Phone-free first hour", icon: "📵", category: "Renewal & Health" },
  },
];

const BY_ID = new Map(GOAL_TAGS.map((t) => [t.id, t]));

/** The tag for an id, or `null` for an unknown one. */
export function getGoalTag(id: string | null | undefined): GoalTag | null {
  if (!id) return null;
  return BY_ID.get(String(id).trim().toLowerCase() as GoalTagId) ?? null;
}

/** Tolerant lookup by the displayed label, so persisted text can be resolved. */
export function getGoalTagByLabel(label: string | null | undefined): GoalTag | null {
  if (!label) return null;
  const wanted = String(label).trim().toLowerCase();
  return GOAL_TAGS.find((t) => t.label.toLowerCase() === wanted) ?? null;
}