"use client";

import { useState } from "react";
import { CalendarPlus, X } from "lucide-react";
import { INBOX_HORIZON_LABELS, type InboxHorizon } from "@/lib/utils/inbox";
import type { InboxItem } from "@/lib/db";

/**
 * B14 — one captured thought. Two exits, per the owner's scope: plan it into
 * a day (the block picker opens) or dismiss it. The two-tap confirm on the
 * dismiss follows the repo's destructive-action pattern (B13's delete).
 */

interface InboxItemRowProps {
  item: InboxItem;
  /** Only offered for today/this-week rows — "Someday" is not a day yet. */
  onPlan: (item: InboxItem) => void;
  onDismiss: (item: InboxItem) => void;
  /** True while this row's plan modal is confirming (row shows as in-flight). */
  planning: boolean;
}

export function InboxItemRow({ item, onPlan, onDismiss, planning }: InboxItemRowProps) {
  const horizon = (item.timeHorizon as InboxHorizon) ?? "someday";
  const plannable = horizon !== "someday";

  return (
    <div
      className={`flex items-center gap-2 rounded-xl bg-surface-container-low border border-outline/10 px-3 py-2.5 transition-opacity ${
        planning ? "opacity-50" : ""
      }`}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm text-on-surface leading-snug break-words">{item.title}</p>
        <span className="text-[10px] font-mono text-on-surface-variant/70">
          {INBOX_HORIZON_LABELS[horizon]}
        </span>
      </div>

      {plannable && (
        <button
          type="button"
          onClick={() => onPlan(item)}
          disabled={planning}
          aria-label={`Plan "${item.title}"`}
          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-primary/15 border border-primary/30 text-primary text-[11px] font-mono font-semibold hover:bg-primary/25 transition-colors active:scale-95 cursor-pointer disabled:cursor-not-allowed"
        >
          <CalendarPlus className="w-3.5 h-3.5" />
          <span>Plan</span>
        </button>
      )}

      <DismissButton item={item} onDismiss={onDismiss} disabled={planning} />
    </div>
  );
}

function DismissButton({
  item,
  onDismiss,
  disabled,
}: {
  item: InboxItem;
  onDismiss: (item: InboxItem) => void;
  disabled: boolean;
}) {
  const [armed, setArmed] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        if (!armed) {
          setArmed(true);
          return;
        }
        setArmed(false);
        onDismiss(item);
      }}
      onBlur={() => setArmed(false)}
      disabled={disabled}
      aria-label={armed ? `Really dismiss "${item.title}"` : `Dismiss "${item.title}"`}
      className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center border transition-colors active:scale-95 ${
        armed
          ? "bg-error/20 border-error/40 text-error cursor-pointer"
          : "bg-transparent border-outline/10 text-on-surface-variant/60 hover:text-on-surface cursor-pointer"
      } disabled:opacity-40 disabled:cursor-not-allowed`}
    >
      <X className="w-4 h-4" />
    </button>
  );
}
