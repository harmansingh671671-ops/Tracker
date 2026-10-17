"use client";

/**
 * The XX:57 Heads-Up Alert card, plus `A7`'s permission education.
 *
 * **Extracted from `profile-settings-sheet.tsx`**, which was already 419 lines
 * before `A7` and would have been grown further by this feature. The block is a
 * clean seam: one concern, its own state, its own storage key, and the only place
 * in the app that asks for a permission.
 */

import { useState } from "react";
import { Bell } from "lucide-react";
import { has, readString, writeString } from "@/lib/utils/logger";
import {
  getNotificationPermissionState,
  sendTestNotificationToAndroid,
} from "@/lib/utils/android-bridge";
import { PermissionEducation } from "@/components/common/permission-education";

const STORAGE_KEY = "odyssey_hourly_alerts";

interface HeadsUpAlertsCardProps {
  /** Re-read the stored preference each time the sheet opens. */
  isOpen: boolean;
  onToast: (message: string) => void;
}

export function HeadsUpAlertsCard({ isOpen, onToast }: HeadsUpAlertsCardProps) {
  // A7 -- deliberately NOT a "don't ask again" flag. Whether to explain the
  // permission is the user's call every single time.
  const [isEducationOpen, setIsEducationOpen] = useState(false);

  /**
 * ⚠️ Three things were wrong here, all found by reading rather than by a gate.
 *
 * 1. `readString` returns `fallback` (`""`) when a key is unset — **never null** —
 *    so the original `if (saved !== null)` was always true, and an unset key
 *    evaluated `"" === "true"` → **false**. The switch could display "off" for
 *    alerts the native scheduler still fired. The guard is now `has()`.
 * 2. The read was in an effect, which trips `react-hooks/set-state-in-effect`.
 * 3. **Moving this card out of the sheet broke the render-phase trick.** The
 *    `prevIsOpen` pattern only works in a component that stays mounted across
 *    the close/open transition — but this card lives inside the sheet's JSX, so
 *    it MOUNTS when the sheet opens, and `prevIsOpen` was initialised to `true`,
 *    making the transition undetectable. The read never fired and an explicit
 *    stored `"false"` was silently ignored. Caught by re-running the browser check
 *    after the extraction; the first assertion passed only because the default
 *    happens to be `true`.
 *
 * A **lazy `useState` initialiser** is the correct shape now: the card mounts at
 * open, so reading once on mount is exactly the right moment, and there is no
 * effect and no transition to miss.
 */
const [enabled, setEnabled] = useState<boolean>(() => {
  // Server-safe: this component only renders inside the open sheet, but the guard
  // costs nothing and `useState` initialisers must not touch storage blindly.
  if (typeof window === "undefined") return true;
  return has(STORAGE_KEY) ? readString(STORAGE_KEY) === "true" : true;
});

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    writeString(STORAGE_KEY, String(checked));
    onToast(checked ? "Hourly XX:57 Heads-Up Alerts enabled." : "Hourly alerts paused.");
  };

  /**
   * `A7` -- explain BEFORE asking.
   *
   * The original called `sendTestNotificationToAndroid` and then toasted "Sent
   * XX:57 heads-up test alert" unconditionally, including when the call had only
   * *requested* permission and had not been told the answer. The app claimed a
   * notification existed at the exact moment it knew least.
   */
  const handleTest = async () => {
    const state = getNotificationPermissionState();

    if (state === "denied") {
      onToast(
        "Notifications are blocked for Odyssey. Enable them in your phone's settings to use Heads-Up Alerts."
      );
      return;
    }
    if (state === "default") {
      setIsEducationOpen(true);
      return;
    }

    const outcome = await sendTestNotificationToAndroid("NOW", "Deep Monotasking Sprint", "Focus");
    onToast(
      outcome === "sent"
        ? "Sent XX:57 heads-up test alert."
        : "Could not send a notification on this device."
    );
  };

  const handleProceed = async () => {
    setIsEducationOpen(false);
    const outcome = await sendTestNotificationToAndroid("NOW", "Deep Monotasking Sprint", "Focus");
    if (outcome === "sent") onToast("Sent XX:57 heads-up test alert.");
    else if (outcome === "denied")
      onToast("Notifications not allowed. You can change this any time in your phone's settings.");
    else onToast("Could not send a notification on this device.");
  };

  return (
    <div className="rounded-2xl bg-surface-container-low p-4 border border-outline/10 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-on-surface">XX:57 Hourly Heads-Up Alert</h4>
            <p className="text-xs text-on-surface-variant">
              Pings 3 minutes before the next hour task starts
            </p>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => handleToggle(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-surface-container-highest peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-5 peer-checked:after:border-surface-container peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-on-primary-container after:rounded-full after:h-5 after:w-5 after:transition-all" />
        </label>
      </div>

      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container text-on-surface-variant text-xs w-full">
        <span>🛡️</span>
        <span className="truncate">Auto-silenced during Sleep hours (23:00 - 06:00)</span>
      </div>

      <button
        onClick={() => void handleTest()}
        className="w-full py-2 px-3 rounded-xl bg-surface-container hover:bg-surface-bright text-xs font-mono font-medium text-tertiary transition-colors flex items-center justify-center gap-2"
      >
        <span>⚡ Send Test XX:57 Notification</span>
      </button>

      {isEducationOpen && (
        <PermissionEducation
          onProceed={() => void handleProceed()}
          onDismiss={() => setIsEducationOpen(false)}
        />
      )}
    </div>
  );
}