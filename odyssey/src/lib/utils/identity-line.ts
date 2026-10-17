/**
 * The line shown on the commitment step (`A5`).
 *
 * ## Change it here
 *
 * Edit `IDENTITY_QUOTE` and `IDENTITY_ATTRIBUTION` below and the screen follows.
 * That is deliberately the ONLY way to change it: the owner asked for the quote
 * to be settable in code and for the edit affordance to be removed, which also
 * retires the whole inline editor (textarea, auto-sizing, focus/select handling,
 * Enter/Escape/blur, and its persistence).
 *
 * There is a version of this that offered the user an edit control and derived a
 * different line per goal. It shipped, and it was more machinery than this moment
 * earns: the app was storing a sentence it had written itself and then had to be
 * careful never to claim the user had written it. One constant cannot be wrong
 * about who said something.
 *
 * **Attribution is part of the display, not decoration.** It is stored beside the
 * text rather than hardcoded into it so the two cannot drift apart, and so
 * repointing the quote does not leave a stale name underneath it. Set
 * `IDENTITY_ATTRIBUTION` to an empty string if the quote is unattributed.
 */

/** The quote. Edit freely. */
export const IDENTITY_QUOTE =
  "We must all suffer one of two things: the pain of discipline or the pain of regret.";

/** Who said it. Edit freely; `""` renders no attribution at all. */
export const IDENTITY_ATTRIBUTION = "Jim Rohn";