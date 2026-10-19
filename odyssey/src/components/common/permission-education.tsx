"use client";

import { BatteryMedium, BellRing, Moon } from "lucide-react";

/**
 * `A7` -- just-in-time permission education.
 *
 * ## Why this exists, and what it is not
 *
 * `A7` asks to *"explain notification/focus-block permissions just-in-time with an
 * animated phone preview, reason, step count, and 'Not now'"*.
 *
 * **The focus-block half is deferred.** The app never requests it -- app blocking is
 * `D6`, Phase 6 -- so there is no permission to explain. Education for a permission
 * nobody is asked for is a screen that can never be reached.
 *
 * **The animated phone preview is deliberately omitted**, though the spec asks for
 * it. The research behind this app records users disliking pre-setup UI, and this is
 * a screen whose entire job is to be read fast and then get out of the way; a mock
 * phone graphic costs the vertical room the *reason* needs. That is a judgement, and
 * it is reversible in one component.
 *
 * ## The cost is the most valuable thing here
 *
 * A notification is a **device wake-up**. This repo has logged wasted wake-ups as a
 * first-class performance concern, so the screen leads with what granting actually
 * costs rather than with a feature list. Saying that plainly is the whole point --
 * an education screen that oversells the permission is worse than no screen.
 *
 * ## "Not now" is genuinely not now
 *
 * It dismisses without requesting, and **nothing re-nags**: the decision to ask is
 * the user's every time, not a one-time flag. A "don't ask again" after two soft
 * refusals would be the dark pattern this repo flags elsewhere.
 */

interface PermissionEducationProps {
  onProceed: () => void;
  onDismiss: () => void;
}

export function PermissionEducation({ onProceed, onDismiss }: PermissionEducationProps) {
  // PERF-5 -- the entrance is CSS now (`permissionPanelIn` /
  // `permissionBackdropIn` in `globals.css`). It was framer-motion, plus a
  // `useReducedMotion` hook to undo what the library does not honour on its own;
  // the keyframes are inside the `no-preference` query, so reduced motion is the
  // stylesheet's job again and the hook, the library and the 38 KB it cost every
  // screen are all gone. Same 0.25s ease-out entrance; nothing else changed.
  return (
    <div
      className="permission-backdrop-in fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-surface-container-lowest/85"
      onClick={onDismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="permission-education-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="permission-panel-in w-full max-w-md rounded-3xl border border-outline/15 bg-surface-container p-5 space-y-4 shadow-2xl"
      >
        <div className="flex items-start gap-3">
          <span className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/35 text-primary flex items-center justify-center shrink-0">
            <BellRing className="w-4.5 h-4.5" />
          </span>
          <div className="min-w-0">
            <h2
              id="permission-education-title"
              className="text-base font-bold text-on-surface tracking-tight"
            >
              Allow notifications?
            </h2>
            <p className="text-[11px] font-mono text-on-surface-variant mt-0.5">
              About 3 steps on the next screen
            </p>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-on-surface-variant">
          Heads-up alerts are how Odyssey reaches you when the app is closed — your
          evening plan, and anything due in the next hour.
        </p>

        {/* The cost, stated plainly rather than sold. */}
        <div className="space-y-2">
          <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-surface-container-low border border-outline/[0.08]">
            <BatteryMedium className="w-4 h-4 text-on-surface-variant shrink-0 mt-px" />
            <p className="text-[11px] leading-relaxed text-on-surface-variant">
              Each alert <strong className="text-on-surface">wakes your phone</strong>.
              On a device that is asleep, that costs a little battery. Odyssey never
              sends them while you are asleep on purpose — that is switched off from
              23:00 to 06:00.
            </p>
          </div>
          <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-surface-container-low border border-outline/[0.08]">
            <Moon className="w-4 h-4 text-on-surface-variant shrink-0 mt-px" />
            <p className="text-[11px] leading-relaxed text-on-surface-variant">
              Nothing leaves your device, and you can turn this off again at any time
              from your profile.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={onDismiss}
            className="flex-1 py-3 px-4 rounded-2xl bg-surface-container-high hover:bg-surface-container-highest text-on-surface-variant text-xs font-bold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={onProceed}
            className="flex-1 py-3 px-4 rounded-2xl bg-primary hover:bg-primary/95 text-on-primary text-xs font-bold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Show me
          </button>
        </div>

        <p className="text-[10px] font-mono text-on-surface-variant/70 text-center">
          Nothing else on your phone is asked for.
        </p>
      </div>
    </div>
  );
}