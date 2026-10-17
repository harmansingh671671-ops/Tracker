"use client";

import { motion } from "framer-motion";
import {
  IDENTITY_ATTRIBUTION,
  IDENTITY_QUOTE,
} from "@/lib/utils/identity-line";

/**
 * The quote on the commitment step (`A5`).
 *
 * **Deliberately not editable in the UI.** The owner asked for the quote to be
 * changed in code and for the edit affordance to go, so there is no button here —
 * which retired the inline editor that stood in this file yesterday (textarea,
 * auto-sizing, focus/select-on-open, Escape/blur, and its persistence), along with
 * the storage key and its tests. The cost of that version was real: the app was
 * storing a sentence it had written itself and then guarding against ever
 * claiming the user had written it.
 *
 * Both constants come from `lib/utils/identity-line.ts`, so there is exactly one
 * place to change the quote.
 *
 * The line is NOT lifted above the commitment spread. Doing that would need the
 * text to change colour as the circle passes it, and `on-primary` on the page
 * background is a contrast risk on one of the two themes.
 */
export function IdentityLine() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="flex flex-col items-center gap-1.5 px-2"
    >
      <p className="text-center text-sm sm:text-base font-semibold text-on-surface leading-relaxed">
        {IDENTITY_QUOTE}
      </p>
      {IDENTITY_ATTRIBUTION && (
        <p className="text-center text-[10px] font-mono text-on-surface-variant/70">
          — {IDENTITY_ATTRIBUTION}
        </p>
      )}
    </motion.div>
  );
}