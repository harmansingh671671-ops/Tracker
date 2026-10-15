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
 * Sends a test notification to Android or browser.
 */
export function sendTestNotificationToAndroid(
  timeStr = "09:42",
  taskTitle = "Deep Focus Sprint",
  category = "Focus"
): boolean {
  const nativeOk = triggerNativeTestNotification();
  if (nativeOk) return true;

  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "granted") {
      new Notification(`Odyssey • XX:57 Heads-Up`, {
        body: `Upcoming at ${timeStr}: ${taskTitle} (${category})`,
        icon: "/logo.png",
      });
      return true;
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((perm) => {
        if (perm === "granted") {
          new Notification(`Odyssey • XX:57 Heads-Up`, {
            body: `Upcoming at ${timeStr}: ${taskTitle} (${category})`,
            icon: "/logo.png",
          });
        }
      });
      return true;
    }
  }
  return false;
}