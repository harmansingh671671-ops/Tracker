/**
 * Odyssey cross-cutting utilities: logging + typed storage.
 *
 * Part 1 -- logging. 77 `catch` blocks in this codebase were empty, so failures
 * were invisible, including ones that only occur on a real device where a bridge
 * call or storage write fails. See inefficiencies.md 10.2.
 *
 * Part 2 -- typed `localStorage`. 85 direct call sites each re-implemented the
 * same try/catch and each invented its own key string. A typo in a key silently
 * reads `null`, which is indistinguishable from "never set". See 10.3.
 *
 * Everything here is total: it never throws. Logging must not be able to replace
 * a silent failure with a louder one, and storage must not crash a screen.
 */

const PREFIX = "[odyssey]";

function stringify(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

/**
 * Records a handled-but-important failure.
 *
 * `scope` identifies the subsystem ("android-bridge", "storage", ...) so logcat
 * output is attributable without opening the source.
 */
export function logWarn(scope: string, message: string, error?: unknown): void {
  try {
    if (typeof console === "undefined" || typeof console.warn !== "function") return;
    console.warn(error === undefined ? `${PREFIX} ${scope}: ${message}` : `${PREFIX} ${scope}: ${message} -- ${stringify(error)}`);
  } catch {
    // Logging must never throw. If the console itself is broken there is
    // nothing useful left to do, and this is the one catch in this file that
    // is allowed to stay empty.
  }
}

/** Records an unexpected failure that the app could not recover from. */
export function logError(scope: string, message: string, error?: unknown): void {
  try {
    if (typeof console === "undefined" || typeof console.error !== "function") return;
    console.error(error === undefined ? `${PREFIX} ${scope}: ${message}` : `${PREFIX} ${scope}: ${message} -- ${stringify(error)}`);
  } catch {
    // See logWarn.
  }
}

function storage(): Storage | null {
  try {
    if (typeof window === "undefined" || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    // Accessing localStorage itself throws in some privacy modes.
    return null;
  }
}

/** Reads a string, or returns `fallback` when unset, unreadable, or not a string. */
export function readString(key: string, fallback = ""): string {
  const s = storage();
  if (!s) return fallback;
  try {
    const v = s.getItem(key);
    return typeof v === "string" ? v : fallback;
  } catch (e) {
    logWarn("storage", `could not read "${key}"`, e);
    return fallback;
  }
}

/** Reads and JSON-parses a value. Returns `fallback` on any failure, including bad JSON. */
export function readJson<T>(key: string, fallback: T): T {
  const raw = readString(key, "");
  if (raw === "") return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch (e) {
    // Corrupt stored value -- worth knowing, but not worth crashing over.
    logWarn("storage", `could not parse "${key}"`, e);
    return fallback;
  }
}

/** Reads a boolean. Accepts only the literal "true" string; anything else is `fallback`. */
export function readBool(key: string, fallback = false): boolean {
  const raw = readString(key, "");
  if (raw === "true") return true;
  if (raw === "false") return false;
  return fallback;
}

/** Reads a finite number, or `fallback` when unset or not numeric. */
export function readNumber(key: string, fallback = 0): number {
  const raw = readString(key, "");
  if (raw === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

/** Writes a value. Returns false if storage is unavailable rather than throwing. */
export function writeString(key: string, value: string): boolean {
  const s = storage();
  if (!s) return false;
  try {
    s.setItem(key, value);
    return true;
  } catch (e) {
    // Quota exceeded, or private mode.
    logWarn("storage", `could not write "${key}"`, e);
    return false;
  }
}

/** Writes a JSON value. Returns false on failure. */
export function writeJson(key: string, value: unknown): boolean {
  try {
    return writeString(key, JSON.stringify(value));
  } catch (e) {
    logWarn("storage", `could not serialise "${key}"`, e);
    return false;
  }
}

/** Removes a key. Returns false on failure. */
export function remove(key: string): boolean {
  const s = storage();
  if (!s) return false;
  try {
    s.removeItem(key);
    return true;
  } catch (e) {
    logWarn("storage", `could not remove "${key}"`, e);
    return false;
  }
}

/** True when the key exists. Never throws. */
export function has(key: string): boolean {
  const s = storage();
  if (!s) return false;
  try {
    return s.getItem(key) !== null;
  } catch {
    return false;
  }
}
