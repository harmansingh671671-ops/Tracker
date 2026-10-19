import Dexie, { type Table } from 'dexie';

export interface Profile {
  id: string;
  username: string;
  displayName: string;
  age?: number;
  bio?: string;
  motto?: string;
  dateOfBirth: string;
  createdAt: string;
  
  // Gamification
  xp: number;
  level: number;
  diamonds: number;
  streak: number;
  highestStreak: number;
  militaryRank: string;
  integrityScore: number;
  lastReviewDate: string;
  lastPlanDate: string;
  streakFreezeActive: boolean;
  streakFreezeCount?: number;
  unlockedBadges: string[];
  equippedItems?: string[];
  
  // Customization
  equippedTheme: string;
  equippedMascot: string;
  equippedSound: string;
  
  notificationsEnabled: boolean;
}

/**
 * Canonical schedule categories.
 *
 * This union used to be declared inline as
 *   'sleep' | 'work' | 'habits' | 'buffer' | 'Work' | 'Study' | 'Health' | 'Sleep' | 'Leisure' | 'Admin'
 * which listed the same idea twice in two spellings ('work' AND 'Work',
 * 'health' AND 'Health', 'sleep' AND 'Sleep'). Any `category === 'work'` check
 * silently failed for rows saved as 'Work', and vice versa.
 *
 * Title Case is canonical -- it is what the habit taxonomy already used.
 * {@link normalizeCategory} maps existing lowercase data onto it.
 */
export const SCHEDULE_CATEGORIES = [
  "Work",
  "Study",
  "Health",
  "Sleep",
  "Leisure",
  "Admin",
  "Habits",
  "Buffer",
] as const;

export type ScheduleCategory = (typeof SCHEDULE_CATEGORIES)[number];

/**
 * Every value `ScheduleBlock.category` can actually hold. `BUG-12`.
 *
 * ## What was wrong
 *
 * The field was typed `ScheduleCategory | (string & {})`. A union with
 * `(string & {})` accepts **any** string, so it constrained nothing at all --
 * and it *read* like validation, which is worse than having no type, because
 * nothing prompted anyone to check. The reason it existed is that the declared
 * list and the pickers **share no spelling at all**:
 *
 * - **both pickers** (`day-schedule` `CATEGORY_OPTIONS`, `edit-hour-modal`
 *   `CATEGORIES`) write **5 lowercase ids**: `work`, `vitality`, `sync`,
 *   `renewal`, `sleep`
 * - **4 of the 8 declared values can never be written by any screen**, and 3
 *   of the 5 that can be written are undeclared
 *
 * So this list is **not** a claim about which vocabulary should win -- that is
 * an open product decision needing an ADR. It is the honest union of what the
 * write paths can produce, which is what a type is for.
 *
 * ## The three groups
 *
 * | group | why it is here |
 * |---|---|
 * | `""` | a block with no category; both screens treat empty as "Deep Work" for display (`allocation-bar`) |
 * | the **5 picker ids** | every category a user can actually choose, from either picker |
 * | `habits`, `buffer` | **legacy rows already in real databases.** Written by the now-deleted `journey-day-schedule` / `day-schedule-modal`, and by older builds. Rows stored `habits` fold to `vitality` and `buffer` to `renewal` for *display*, which is how a title edit once recategorised them (`BUG-12`) |
 *
 * `habits` and `buffer` are **not** offered by any current picker. They are
 * listed because deleting them from the type would be a lie about data already
 * on users' phones, and because narrowing the vocabulary to remove them is the
 * ADR, not this commit.
 *
 * ## IndexedDB is not type-checked
 *
 * A backup file is `bulkAdd`ed verbatim by `profile-settings-sheet`, so a row
 * can hold a value outside even this list -- the same caveat
 * `normalizeHabitCategory` documents for habits. **Every read path already
 * routes through a normaliser**, which is what makes the type safe to narrow:
 * `day-schedule`'s `normalizeCategory`, the planner's `getCategoryType`,
 * `allocation-bar`'s `allocationCategory`, and the wallpaper's `getCatDetails`
 * all accept a plain `string` and fold what they cannot place. Those keep
 * working unchanged.
 */
/**
 * The categories a picker can currently produce -- the five ids shared by
 * `day-schedule`'s `CATEGORY_OPTIONS` and `edit-hour-modal`'s `CATEGORIES`.
 *
 * These are the only values a **user** can choose, which is the same reasoning
 * `P0-T3` used to make the habit form's four domains canonical.
 */
export const SELECTABLE_SCHEDULE_CATEGORIES = [
  "work",
  "vitality",
  "sync",
  "renewal",
  "sleep",
] as const;

/**
 * Values that can be **read** from a real database but are no longer offered by
 * any picker. Written by the deleted journey grouping and by older builds, and
 * still `bulkAdd`ed from imported backup JSON.
 */
export const LEGACY_SCHEDULE_CATEGORIES = ["habits", "buffer"] as const;

export const STORED_SCHEDULE_CATEGORIES = [
  "",
  ...SELECTABLE_SCHEDULE_CATEGORIES,
  ...LEGACY_SCHEDULE_CATEGORIES,
] as const;

export type StoredScheduleCategory = (typeof STORED_SCHEDULE_CATEGORIES)[number];

/** True only for a value a picker can currently **offer**. */
export function isSelectableScheduleCategory(
  value: string
): value is (typeof SELECTABLE_SCHEDULE_CATEGORIES)[number] {
  // Deliberately against SELECTABLE, not STORED. The first version of this
  // checked STORED, which made `habits` and `buffer` -- storable but no longer
  // offered by any picker -- report as selectable. A test caught it; the type
  // predicate now matches its own name.
  return (SELECTABLE_SCHEDULE_CATEGORIES as readonly string[]).includes(value);
}

/** True for a legacy value: storable, but no picker offers it. */
export function isLegacyScheduleCategory(value: string): boolean {
  return (LEGACY_SCHEDULE_CATEGORIES as readonly string[]).includes(value);
}

/**
 * Canonical habit categories — P0-T3.
 *
 * These used to be Health / Mindfulness / Learning / Productivity / Social /
 * Growth, which **no screen ever offered**. The create and edit habit forms
 * present `DOMAINS` in `create-habit-modal.tsx` — Mindful Focus, Vitality &
 * Fitness, Renewal & Health, Craft & Skill — and the onboarding goal tags write
 * those same four. So every habit the app actually created carried a category
 * the schema did not declare.
 *
 * That mismatch is the entire reason `Habit.category` was typed
 * `HabitCategory | (string & {})`: a union that accepts any string defeats
 * itself, and it had been hiding a genuine disagreement between the schema and
 * the UI rather than papering over sloppiness.
 *
 * The form's four are canonical, because they are the only values a user can
 * actually pick. Everything written now goes through {@link normalizeCategory}.
 */
export const HABIT_CATEGORIES = [
  "Mindful Focus",
  "Vitality & Fitness",
  "Renewal & Health",
  "Craft & Skill",
] as const;

export type HabitCategory = (typeof HABIT_CATEGORIES)[number];

/**
 * Legacy habit categories -> canonical domain.
 *
 * **There is no live write path for any of these.** `create-habit-modal.tsx`
 * writes `tpl.domainLabel`, never `tpl.category`, and the habit store never
 * touches `category` — so the old six could only reach the database from a build
 * that predates the four-domain form, or not at all. This table is a safety
 * net for rows that already exist, not a conversion the app performs on
 * everyday use.
 *
 * 'Social' and 'Growth' have no honest fourth-domain equivalent; they are
 * mapped to the nearest rather than dropped, because dropping a user's label is
 * worse than approximating it. Recorded here rather than applied silently.
 */
export const LEGACY_HABIT_CATEGORY_MAP: Readonly<Record<string, HabitCategory>> = {
  health: "Vitality & Fitness",
  "vitality": "Vitality & Fitness",
  "vitality & fitness": "Vitality & Fitness",
  fitness: "Vitality & Fitness",
  workout: "Vitality & Fitness",
  wellness: "Vitality & Fitness",
  nutrition: "Vitality & Fitness",
  mindfulness: "Mindful Focus",
  "mindful focus": "Mindful Focus",
  meditation: "Mindful Focus",
  sleep: "Renewal & Health",
  "renewal & health": "Renewal & Health",
  renewal: "Renewal & Health",
  recovery: "Renewal & Health",
  recharge: "Renewal & Health",
  learning: "Craft & Skill",
  "craft & skill": "Craft & Skill",
  study: "Craft & Skill",
  reading: "Craft & Skill",
  // No equivalent; nearest is Mindful Focus. See the note above.
  social: "Mindful Focus",
  growth: "Craft & Skill",
  // "Routine" was displayed by three surfaces as a fallback for a habit with no
  // category, and is still in the retired vocabulary. Mapping it means a legacy
  // row labelled Routine resolves to a real domain instead of falling through
  // to the name hash and being coloured as though it belonged to none.
  routine: "Craft & Skill",
  productivity: "Mindful Focus",
  work: "Mindful Focus",
  focus: "Mindful Focus",
  general: "Craft & Skill",
};

/**
 * Maps a **schedule** category onto its canonical Title Case spelling.
 *
 * Case-insensitive, and preserves anything unrecognised rather than discarding
 * it -- a user's data must never be dropped because it did not match a list.
 *
 * Deliberately schedule-only. This used to fall through to the habit list as
 * well, which was wrong once habits moved to the four domains: 'sleep' and
 * 'health' exist in BOTH vocabularies, and the schedule list is checked first,
 * so a habit saved as "sleep" resolved to the schedule's "Sleep" and never
 * reached its domain. Habits use {@link normalizeHabitCategory}.
 */
export function normalizeCategory(value: string): string {
  const lower = String(value ?? "").trim().toLowerCase();
  if (!lower) return value;
  const match = SCHEDULE_CATEGORIES.find((c) => c.toLowerCase() === lower);
  return match ?? value;
}

/**
 * Maps a **habit** category onto one of the four canonical domains.
 *
 * Same contract as {@link normalizeCategory}: case-insensitive, idempotent, and
 * an unrecognised value is returned unchanged rather than discarded. A habit
 * written by an older build can hold anything, because IndexedDB is not
 * type-checked, and a user's own label is their data.
 */
export function normalizeHabitCategory(value: string): string {
  const raw = String(value ?? "");
  const lower = raw.trim().toLowerCase();
  if (!lower) return value;
  const canonical = HABIT_CATEGORIES.find((c) => c.toLowerCase() === lower);
  if (canonical) return canonical;
  return LEGACY_HABIT_CATEGORY_MAP[lower] ?? value;
}

/**
 * Normalises a habit priority onto the canonical three-level set. Unknown or
 * empty values yield `undefined` rather than a fabricated priority — the honest
 * answer is "none set", matching the `percent: null` convention.
 */
export function normalizeHabitPriority(value: unknown): 'critical' | 'focus' | 'optional' | undefined {
  const lower = String(value ?? "").trim().toLowerCase();
  if (lower === "critical" || lower === "focus" || lower === "optional") {
    return lower as 'critical' | 'focus' | 'optional';
  }
  return undefined;
}

export interface ScheduleBlock {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  title: string;
  description?: string;
  /**
   * `BUG-12`: was `ScheduleCategory | (string & {})`, which accepted any string
   * and therefore validated nothing while looking like it did. Now the honest
   * union of what the write paths can produce -- see `StoredScheduleCategory`.
   * The vocabulary decision (which set should win) is deliberately still open.
   */
  category: StoredScheduleCategory;
  tag?: string;
  energyLevel?: 'high' | 'medium' | 'low';
  status: 'pending' | 'completed' | 'missed' | 'pivoted';
  missReason?: string;
  completedAt?: string;
  isCommitted: boolean;
  createdAt: string;
}

/**
 * What kind of habit this is. A closed union on purpose - see ADR 0003.
 *
 * `simple` (or absent) means today's behaviour: a check. `counted` means there is a target
 * and a number gets logged against it. `avoid` is a quit/anti-habit: a day is "complete" when
 * you stayed clean, and a slip is a violation (red state). `timelimit` is NOT built yet.
 *
 * This is deliberately NOT `HabitType | (string & {})`. `BUG-12` exists because that
 * escape hatch accepted any string and therefore constrained nothing.
 */
export type HabitType = 'simple' | 'counted' | 'avoid';

export interface Habit {
  id: string;
  userId: string;
  name: string;
  icon: string;
  // P0-T3: was `HabitCategory | (string & {})`. The escape hatch accepted any
  // string, so the union constrained nothing -- and it existed only because the
  // schema listed six categories the form never offered. Now that the form's
  // four ARE the schema, a value outside them is a compile error rather than a
  // runtime surprise. Legacy rows still read fine: IndexedDB is not
  // type-checked, and `getHabitColor` falls back deterministically.
  category: HabitCategory;
  /**
   * Absent means `simple`. Optional so every existing habit keeps reading correctly
   * with no migration -- see ADR 0003.
   */
  type?: HabitType;
  /** What one step counts, e.g. 'pages', 'cups', 'reps'. `counted` only. */
  unit?: string;
  /** The number that makes a day complete. `counted` only. */
  targetValue?: number;
  period?: 'morning' | 'afternoon' | 'evening';
  priority?: 'critical' | 'focus' | 'optional';
  cue?: string; // e.g. "After I pour my morning coffee"
  reward?: string; // e.g. "5 minutes of music"
  color?: string; // optional override for habit color
  emergencyVersion?: string; // minimal fall-back, e.g. "Read 1 page"
  timeOfDay?: string; // e.g. "06:30 AM"
  frequency: 'daily' | 'weekly';
  targetDaysPerWeek?: number;
  targetDays?: number[]; // [1..7] where 1=Mon, 2=Tue, ..., 7=Sun
  currentStreak: number;
  longestStreak: number;
  totalCompletions: number;
  createdAt: string;
  archivedAt?: string;
}

export interface HabitLog {
  id: string;
  habitId: string;
  userId: string;
  date: string; // YYYY-MM-DD
  /**
   * For a `simple` habit this IS the answer. For a `counted` habit it is a cache for
   * display only -- the authority is `value` against the habit's `targetValue`, via
   * `isHabitComplete` in `lib/utils/habit-completion.ts`. A counted habit can be
   * `completed: true` with `value: 0`, and that day is NOT complete.
   */
  completed: boolean;
  /** What was actually logged, for a `counted` habit. Absent means zero. */
  value?: number;
  notes?: string;
  loggedAt: string;
}

export interface WeeklyReport {
  id: string;
  userId: string;
  weekStart: string; // YYYY-MM-DD
  weekEnd: string; // YYYY-MM-DD
  totalScheduledHours: number;
  totalCompletedHours: number;
  completionRate: number;
  topCategory: string;
  mostProductiveHour: number;
  streakAtWeekEnd: number;
  diamondsEarned: number;
  xpEarned: number;
  categoryBreakdown: Record<string, number>;
  createdAt: string;
}

export interface InboxItem {
  id: string;
  userId: string;
  title: string;
  timeHorizon: 'today' | 'this_week' | 'someday';
  estimatedMinutes?: number;
  priority?: 'urgent' | 'high' | 'normal' | 'low';
  category?: string;
  createdAt: string;
}

/**
 * One settled day of habit rewards (M4 / ADR 0002).
 *
 * This table is the record of what has been paid out. It replaces the
 * `odyssey_claimed_habit_rewards_${userId}` localStorage list, which ADR 0001
 * section 4 flagged as defect 7.1: browser storage is not a system of record, so
 * clearing site data or switching device offered to pay the same days again.
 *
 * `id` is `${userId}:${date}` rather than a uuid. That makes the primary key
 * itself the idempotency guard -- a second settlement of the same day fails the
 * `add` outright instead of needing a read-then-write race to lose (defect 7.2).
 */
export interface RewardSettlement {
  /** `${userId}:${date}` -- see above. Deterministic, and the uniqueness guard. */
  id: string;
  userId: string;
  /** The calendar day whose rewards this settles. `YYYY-MM-DD`. */
  date: string;
  completedCount: number;
  xp: number;
  diamonds: number;
  /** The perfect-day component of `xp`, kept separate so a card can label it. */
  perfectBonusXp: number;
  settledAt: string;
}

class OdysseyDB extends Dexie {
  profiles!: Table<Profile>;
  scheduleBlocks!: Table<ScheduleBlock>;
  habits!: Table<Habit>;
  habitLogs!: Table<HabitLog>;
  weeklyReports!: Table<WeeklyReport>;
  inboxItems!: Table<InboxItem>;
  rewardSettlements!: Table<RewardSettlement>;

  constructor() {
    super('OdysseyDB');
    
    this.version(1).stores({
      profiles: 'id, username',
      scheduleBlocks: 'id, userId, date, [userId+date]',
      habits: 'id, userId, category, archivedAt',
      habitLogs: 'id, habitId, userId, date, [habitId+date], [userId+date]',
      weeklyReports: 'id, userId, weekStart, [userId+weekStart]',
      inboxItems: 'id, userId, timeHorizon, createdAt'
    });

    // Additive migration: a new table only. No existing table is modified, no
    // field is removed or retyped, so `up()` has nothing to do -- Dexie creates
    // the object store and leaves every existing row untouched. Declared
    // separately from version 1 so an older install upgrades in place rather
    // than being reset.
    this.version(2).stores({
      rewardSettlements: 'id, userId, date, [userId+date]'
    });

    // P0-T3: rewrite habit categories onto the four canonical domains.
    //
    // Stores declaration is UNCHANGED -- the `category` index already exists and
    // no field is added, removed or retyped. Only row *values* change, so this
    // is deliberately a separate `.upgrade()` on version 2 rather than a new
    // version: bumping the schema version to do a data-only migration would
    // make an upgrade look like a schema change.
    //
    // In practice there is nothing to rewrite -- no live write path ever
    // produced a legacy value (see LEGACY_HABIT_CATEGORY_MAP) -- so this is a
    // safety net for rows written by a build that predates the four-domain
    // form. It is cheap, idempotent, and preserves anything unrecognised.
    this.version(2).upgrade(async (tx) => {
      await tx.table('habits').toCollection().modify((habit: Record<string, unknown>) => {
        const next = normalizeHabitCategory(String(habit.category ?? ''));
        if (next !== habit.category) habit.category = next;
      });
    });
  }
}

export const db = new OdysseyDB();
