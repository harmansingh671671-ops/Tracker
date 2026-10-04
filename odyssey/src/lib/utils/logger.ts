/**
 * Minimal logging helpers.
 *
 * Why this exists: 77 `catch` blocks in this codebase were empty, so failures
 * were completely invisible -- including ones that only occur on a real device,
 * where a bridge call or storage write fails. See inefficiencies.md 10.2.
 *
 * These are deliberately tiny and always safe to call: they must never throw,
 * or they would replace a silent failure with a louder one.
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