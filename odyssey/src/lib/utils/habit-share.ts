import type { HabitType } from "@/lib/db";

/**
 * B1 (owner scope 2026-10-28) — habit-share links.
 *
 * The app is local-first: no accounts, no server, no network at all. So the
 * only way to move a habit between two people (or two of one person's devices)
 * is to put the habit itself inside the link. The link is self-contained —
 * anyone opening it in this app sees a preview card and can add it, no
 * connection needed.
 *
 * Trust boundary (rule 26): `decodeShareLink` parses attacker-controlled bytes.
 * It validates every field, caps lengths, and returns `null` instead of
 * throwing, so a corrupt or hostile link can only ever fail flat — it can
 * never shape the UI or write to the database on its own.

 * Shared by design: name, icon, category, weekday schedule, time of day,
 * type/unit/target, emergency minimum (functional — changes what counts).
 * Deliberately NOT shared: cue/reward (personal ritual text), priority and
 * colour (visual, imported habits take the form's defaults).
 */

export type ShareHabitInput = {
  name: string;
  icon?: string;
  category?: string;
  targetDays?: number[];
  timeOfDay?: "morning" | "afternoon" | "evening" | "anytime";
  type?: HabitType;

  unit?: string;
  targetValue?: number;
  emergencyVersion?: number;
};

export type SharedHabitData = {
  name: string;
  icon?: string;
  category?: string;
  targetDays: number[];
  timeOfDay: "morning" | "afternoon" | "evening" | "anytime";
  type: HabitType;
  unit?: string;
  targetValue?: number;
  emergencyVersion?: number;
};

const NAME_MAX = 60;
const ICON_MAX = 8;
const CATEGORY_MAX = 40;
const UNIT_MAX = 20;
const MAX_TARGET = 1_000_000;

const PERIODS = ["morning", "afternoon", "evening", "anytime"] as const;

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(token: string): Uint8Array | null {
  try {
    let s = token.replace(/-/g, "+").replace(/_/g, "/");
    if (s.length % 4 === 2) s += "==";
    else if (s.length % 4 === 3) s += "=";
    const bin = atob(s.replace(/[^A-Za-z0-9+/=]/g, ""));
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

/** Human-readable cap: the name is claimed, so it wins up front. */
function cleanText(raw: unknown, max: number): string | undefined {
  if (typeof raw !== "string") return undefined;
  const t = raw.replace(/\s+/g, " ").trim().slice(0, max);
  return t.length > 0 ? t : undefined;
}

function cleanDays(raw: unknown): number[] {
  if (!Array.isArray(raw)) return [1, 2, 3, 4, 5];
  const set = new Set<number>();
  for (const d of raw) {
    const n = typeof d === "number" ? Math.floor(d) : NaN;
    if (n >= 1 && n <= 7) set.add(n);
  }
  const days = [...set].sort((a, b) => a - b);
  // A shared habit never imports into an empty week — weekdays is the form's
  // own default, so the receiver sees exactly what a fresh habit would.
  return days.length > 0 ? days : [1, 2, 3, 4, 5];
}

function cleanInt(raw: unknown): number | undefined {
  const n = typeof raw === "number" ? Math.floor(raw) : NaN;
  return Number.isFinite(n) && n >= 1 && n <= MAX_TARGET ? n : undefined;
}

/**
 * Encodes `data` into a link that lands on the habits screen. Without an
 * origin (module purity in tests / SSR) the link is returned relative.
 */
export function encodeShareLink(data: ShareHabitInput, origin?: string): string {
  const payload = { v: 1, ...data };
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const token = toBase64Url(bytes);
  const base = `/habits?import=${token}`;
  return origin ? `${origin}${base}` : base;
}

/**
 * Extracts the habit from a full share URL, a bare `?import=` fragment, or the
 * base64url token itself. Returns `null` for anything unreadable — never
 * throws, never invents a habit.
 */
export function decodeShareLink(raw: string): SharedHabitData | null {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (!text) return null;

  let token = text;
  if (text.includes("import=")) {
    try {
      token = new URL(text).searchParams.get("import") ?? "";
    } catch {
      token = text.split("import=")[1] ?? "";
    }
  } else if (/^https?:\/\//i.test(text)) {
    try {
      token = new URL(text).searchParams.get("import") ?? "";
    } catch {
      token = "";
    }
  }
  if (!token) return null;

  const bytes = fromBase64Url(token);
  if (!bytes) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const obj = parsed as Record<string, unknown>;

  const name = cleanText(obj.name, NAME_MAX);
  if (!name) return null;

  // Only the app's three habit types exist; anything else degrades to a
  // simple tap habit rather than refusing to import a friend's habit. A
  // shared quit habit must stay a quit habit — importing it as a simple
  // "tap to complete" habit would quietly change its meaning.
  const type: HabitType =
    obj.type === "counted" ? "counted" : obj.type === "avoid" ? "avoid" : "simple";

  const period =
    typeof obj.timeOfDay === "string" && (PERIODS as readonly string[]).includes(obj.timeOfDay)
      ? obj.timeOfDay
      : "anytime";

  return {
    name,
    icon: cleanText(obj.icon, ICON_MAX),
    category: cleanText(obj.category, CATEGORY_MAX),
    targetDays: cleanDays(obj.targetDays),
    timeOfDay: period as SharedHabitData["timeOfDay"],
    type,
    unit: type === "counted" ? cleanText(obj.unit, UNIT_MAX) : undefined,
    targetValue: type === "counted" ? cleanInt(obj.targetValue) : undefined,
    emergencyVersion: type === "counted" ? cleanInt(obj.emergencyVersion) : undefined,
  };
}
