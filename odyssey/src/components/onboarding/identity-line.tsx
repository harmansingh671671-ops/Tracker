"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Pencil } from "lucide-react";
import { readPrimaryGoal } from "@/lib/utils/habit-template-order";
import {
  IDENTITY_LINE_SOFT_MAX,
  resolveIdentityLine,
  writeIdentityLine,
} from "@/lib/utils/identity-line";

/**
 * `A5` -- the identity line on the commitment step.
 *
 * Owner decision 2026-10-17: **derived from the goal, editable in one tap.** The
 * flow gets no new question; the line is already there to react to, and rewriting
 * it is optional.
 *
 * ## The `<input>` -> `<textarea>` rule
 *
 * The editor is a **`<textarea rows={1}>`**, not an `<input>`. An `<input>` cannot
 * wrap: a long line scrolls sideways and `truncate` merely clips it at whatever
 * width the row happens to be, so the user cannot see what they just typed. That is
 * the same defect as the `day-schedule` task field, which was fixed this way. It
 * auto-sizes from `scrollHeight`, with `height: auto` set FIRST — a textarea's
 * natural height is one row, so measuring without collapsing it first reports its
 * current height and a *shrinking* edit leaves the box too tall.
 *
 * ## Focus and select, and why they are in an effect
 *
 * Select-on-open lives in an effect keyed on `isEditing`, **never in a ref
 * callback**. React 19 re-invokes a ref callback with the node on every render, so
 * `el.select()` inside one re-selects the field after each keystroke and the next
 * character replaces everything typed so far. That bug shipped once already, in the
 * day-schedule title editor, and the symptom looked like a passing test.
 *
 * Focus is restored on the way out, gated on a ref flag so it happens for keyboard
 * users and never steals focus from wherever someone clicked.
 *
 * Committed value and draft are **separate states**: Escape must be able to
 * abandon an edit, and one state makes that impossible without re-reading storage
 * to discover what was committed — and would write a half-typed line on every
 * keystroke.
 */
interface IdentityLineProps {
  /** Hidden once the hold has begun — the line is the pre-commitment thought. */
  visible?: boolean;
}

export function IdentityLine({ visible = true }: IdentityLineProps) {
  const [line, setLine] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [isLong, setIsLong] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const restoreFocusRef = useRef(false);

  // Storage is read in an effect, never during render: there is no localStorage on
  // the server, so reading it inline would make the first client render disagree
  // with the server's (AGENTS.md rule 15). Empty until answered, and nothing is
  // read before then.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLine(resolveIdentityLine(readPrimaryGoal()));
  }, []);

  const beginEdit = useCallback(() => {
    setDraft(line);
    setIsEditing(true);
  }, [line]);

  /** Persist the draft. Also the blur handler, so tapping away saves. */
  const commit = useCallback(() => {
    const next = draft.trim();
    // Clearing the field reverts to the derived line rather than storing a blank
    // commitment -- `readIdentityLine` treats whitespace-only as never written.
    writeIdentityLine(next);
    setLine(next.length > 0 ? next : resolveIdentityLine(readPrimaryGoal()));
    restoreFocusRef.current = true;
    setIsEditing(false);
  }, [draft]);

  const cancel = useCallback(() => {
    restoreFocusRef.current = true;
    setIsEditing(false);
  }, []);

  useEffect(() => {
    if (isEditing) {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.select();
      }
      return;
    }
    if (restoreFocusRef.current) {
      restoreFocusRef.current = false;
      // Focus the row itself: the edit button is unmounted while editing.
      document.getElementById("odyssey-identity-line")?.focus();
    }
  }, [isEditing]);

  /** Auto-size to content. `height: auto` FIRST, then measure. */
  const autosize = useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  const onDraftChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setDraft(e.target.value);
      setIsLong(e.target.value.trim().length > IDENTITY_LINE_SOFT_MAX);
      autosize(e.target);
    },
    [autosize]
  );

  if (!visible) return null;

  if (isEditing) {
    return (
      <div className="flex justify-center px-2">
        <textarea
          ref={textareaRef}
          rows={1}
          value={draft}
          onChange={onDraftChange}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              e.preventDefault();
              cancel();
            }
          }}
          aria-label="Your identity line"
          maxLength={160}
          className="w-full max-w-sm resize-none bg-transparent text-center text-sm sm:text-base font-semibold text-on-surface leading-relaxed border-b border-primary/40 focus:border-primary focus:outline-none focus-visible:border-primary transition-colors py-1"
          style={{ overflow: "hidden" }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1.5 px-2">
      <motion.p
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className={`text-center font-semibold text-on-surface leading-relaxed ${
          isLong ? "text-xs" : "text-sm sm:text-base"
        }`}
      >
        {line}
      </motion.p>
      <button
        id="odyssey-identity-line"
        type="button"
        onClick={beginEdit}
        aria-label="Edit your identity line"
        className="inline-flex items-center gap-1 text-[10px] font-mono text-on-surface-variant/70 hover:text-on-surface transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded-sm"
      >
        <Pencil className="w-2.5 h-2.5" />
        <span>change</span>
      </button>
    </div>
  );
}