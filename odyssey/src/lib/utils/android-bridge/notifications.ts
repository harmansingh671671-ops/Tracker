import { callNativeBool } from "./core";

/**
 * Notifications — P0-T6.
 *
 * The XX:57 cadence reminder and its browser fallback. Split from the wallpaper
 * block above because the two concerns have opposite battery behaviour: the
 * cadence worker wakes the device, the wallpaper workers do not, and keeping
 * them adjacent made that distinction easy to lose.
 *
 * Nothing here schedules anything itself. The native side owns the AlarmManager;
 * this module only toggles and queries it.
 */

/**
 * Enables automatic XX:57 cadence notifications.
 */
export function enableCadenceNotifications(): boolean {
  return callNativeBool("enableCadenceNotifications");
}

/**
 * Disables automatic XX:57 cadence notifications.
 */
export function disableCadenceNotifications(): boolean {
  return callNativeBool("disableCadenceNotifications");
}

/**
 * Checks whether cadence notifications are enabled in native preferences.
 *
 * Defaults to `true` when there is no bridge: notifications-on is the intended
 * behaviour for the native app, so a missing bridge should not silently read
 * as "off" and suppress the schedule.
 */
export function isCadenceNotificationsEnabled(): boolean {
  return callNativeBool("isCadenceNotificationsEnabled", [], true);
}

/**
 * Instantly triggers a test cadence notification on native Android.
 */
export function triggerNativeTestNotification(): boolean {
  return callNativeBool("triggerTestNotification");
}

/**
 * The OS permission state for notifications, without asking for anything.
 *
 * `A7` needs this *before* it requests, so the education can come first. Folding
 * it into `sendTestNotificationToAndroid` would have meant asking and then
 * explaining afterwards, which is the thing the feature exists to prevent.
 */
export type NotificationPermissionState =
  | "granted"
  | "denied"
  | "default"
  | "unsupported";

export function getNotificationPermissionState(): NotificationPermissionState {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  const p = Notification.permission;
  return p === "granted" || p === "denied" ? p : "default";
}

/**
 * What actually happened when we tried to send a test notification.
 *
 * **This exists because the old boolean lied.** It returned `true` the moment
 * `requestPermission()` was *called* — before the user had answered anything — so
 * the caller toasted *"Sent XX:57 heads-up test alert"* for a notification that
 * might have been denied outright. That is the same class as the false "0/0"
 * readouts and the false "clean slate": a confident claim about something that has
 * not happened.
 */
export type TestNotificationOutcome =
  /** A notification was dispatched. */
  | "sent"
  /** We asked; the answer is whatever they choose. No claim is made. */
  | "needs-permission"
  /** Blocked at the OS level. Asking again will not help. */
  | "denied"
  /** Could not send and did not ask — no bridge and no Notification API. */
  | "unavailable";

/**
 * Sends a test cadence notification on native Android, or via the browser.
 *
 * **Async now, and the result is an outcome rather than a boolean.** Callers must
 * report only what actually happened.
 */
export async function sendTestNotificationToAndroid(
  timeStr = "09:42",
  taskTitle = "Deep Focus Sprint",
  category = "Focus"
): Promise<TestNotificationOutcome> {
  const nativeOk = triggerNativeTestNotification();
  if (nativeOk) return "sent";

  const state = getNotificationPermissionState();
  if (state === "unsupported") return "unavailable";
  if (state === "denied") return "denied";

  const fire = () =>
    new Notification(`Odyssey • XX:57 Heads-Up`, {
      body: `Upcoming at ${timeStr}: ${taskTitle} (${category})`,
      icon: "/logo.png",
    });

  if (state === "granted") {
    try {
      fire();
      return "sent";
    } catch {
      // Constructing a Notification can throw where the platform supports the API
      // but refuses the call. Reporting "sent" there would be a lie.
      return "unavailable";
    }
  }

  // "default" — not asked yet. Ask, and await the real answer.
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return "denied";
  try {
    fire();
    return "sent";
  } catch {
    return "unavailable";
  }
}