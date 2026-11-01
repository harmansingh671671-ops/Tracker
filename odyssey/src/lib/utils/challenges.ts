import type { Habit, HabitCategory } from "@/lib/db";

/**
 * B7 — challenges.
 *
 * A challenge is a named commitment: one of the existing habit packs, a stated
 * goal, and a length in days. Joining one creates habits; it never edits or
 * removes a habit the user already has, and when the length is up nothing is
 * written to their data at all. Both rules exist because a challenge is the one
 * flow in the app that writes several habits from a single tap.
 */

export interface Challenge {
  id: string;
  /** Which habit pack supplies the habits. Must be a real `packId`. */
  packId: string;
  title: string;
  goal: string;
  durationDays: number;
}

/**
 * Deliberately built from packs that already exist, so a challenge adds nothing
 * to the habit catalogue and cannot drift from it.
 */
export const CHALLENGES: Challenge[] = [
  {
    id: "morning-21",
    packId: "morning",
    title: "21-Day Morning Architect",
    goal: "Own your first hour, every day, for three weeks",
    durationDays: 21,
  },
  {
    id: "deep-work-14",
    packId: "deep_work",
    title: "14-Day Deep Work",
    goal: "Two focused hours a day, for two weeks",
    durationDays: 14,
  },
  {
    id: "sleep-21",
    packId: "sleep",
    title: "21-Day Sleep Reset",
    goal: "Wind down and wake at the same time for three weeks",
    durationDays: 21,
  },
  {
    id: "move-30",
    packId: "vitality",
    title: "30-Day Move Daily",
    goal: "Move your body every day for a month",
    durationDays: 30,
  },
  {
    id: "calm-14",
    packId: "mindfulness",
    title: "14-Day Calm Mind",
    goal: "One short practice a day, for two weeks",
    durationDays: 14,
  },
  {
    id: "detox-7",
    packId: "detox",
    title: "7-Day Digital Detox",
    goal: "One week of cleaner screen habits",
    durationDays: 7,
  },
];

/** Names are user-typed, so compare them the way a person would. */
const normalize = (name: string) => name.trim().toLowerCase();

export interface ChallengeStartPlan<T> {
  toAdd: T[];
  /** Already in the user's list — reported, never overwritten. */
  skipped: T[];
}

/**
 * Splits a challenge's habits into the ones to create and the ones the user
 * already has. A challenge must never duplicate a habit, and must never touch
 * an existing one: the plan only ever describes additions.
 */
export function planChallengeStart<T extends { name: string }>(
  templates: T[],
  existingHabitNames: string[]
): ChallengeStartPlan<T> {
  const existing = new Set(existingHabitNames.map(normalize));
  const toAdd: T[] = [];
  const skipped: T[] = [];

  for (const template of templates) {
    if (existing.has(normalize(template.name))) skipped.push(template);
    else toAdd.push(template);
  }

  return { toAdd, skipped };
}

export interface ChallengeStatus {
  joined: boolean;
  /** 1 on the start date; null when not joined. */
  dayNumber: number | null;
  durationDays: number;
  /** True once the length is behind us. Nothing is written when this flips. */
  finished: boolean;
  startedAt: string | null;
}

type ChallengeHabit = Pick<
  Habit,
  "challengeId" | "challengeStartedAt" | "challengeDurationDays"
>;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Whole days between two local `YYYY-MM-DD` strings, immune to DST shifts. */
function daysBetween(from: string, to: string): number {
  const parse = (dateStr: string) => {
    const [y, m, d] = dateStr.split("-").map(Number);
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((parse(to) - parse(from)) / DAY_MS);
}

/**
 * How far into a challenge the user is. Read-only: it derives everything from
 * the habits that carry the challenge id, so there is no challenge record to
 * keep in sync and no timer running while the app is closed.
 */
export function getChallengeStatus(
  challenge: Challenge,
  habits: ChallengeHabit[],
  todayStr: string
): ChallengeStatus {
  const starts = habits
    .filter((h) => h.challengeId === challenge.id && !!h.challengeStartedAt)
    .map((h) => h.challengeStartedAt as string)
    .sort();

  if (starts.length === 0) {
    return {
      joined: false,
      dayNumber: null,
      durationDays: challenge.durationDays,
      finished: false,
      startedAt: null,
    };
  }

  // One challenge has one start date. If rows ever disagree, the earliest wins
  // so progress cannot appear to move backwards.
  const startedAt = starts[0];
  const dayNumber = Math.max(1, daysBetween(startedAt, todayStr) + 1);

  return {
    joined: true,
    dayNumber,
    durationDays: challenge.durationDays,
    finished: dayNumber > challenge.durationDays,
    startedAt,
  };
}

/** The minimum a habit template must expose to be started from a challenge. */
export interface ChallengeTemplateLike {
  name: string;
  icon: string;
  domainLabel: HabitCategory;
  targetDays: number[];
  period: "morning" | "afternoon" | "evening" | "anytime";
  /** Which pack it belongs to — a challenge draws its habits from one pack. */
  packId: string;
}

/** Exactly what the create path needs, with the challenge stamp attached. */
export interface ChallengeHabitInput {
  name: string;
  icon: string;
  category: HabitCategory;
  targetDays: number[];
  timeOfDay: "morning" | "afternoon" | "evening" | "anytime";
  challengeId: string;
  challengeStartedAt: string;
  challengeDurationDays: number;
}

/**
 * Turns the templates a challenge will add into creation inputs. Kept pure and
 * separate from the component so the stamp — the part that makes "Day 6 of 21"
 * work — is covered by a test rather than by reading JSX.
 */
export function toChallengeInputs(
  challenge: Challenge,
  templates: ChallengeTemplateLike[],
  startedAt: string
): ChallengeHabitInput[] {
  return templates.map((t) => ({
    name: t.name,
    icon: t.icon,
    category: t.domainLabel,
    targetDays: t.targetDays,
    timeOfDay: t.period,
    challengeId: challenge.id,
    challengeStartedAt: startedAt,
    challengeDurationDays: challenge.durationDays,
  }));
}
