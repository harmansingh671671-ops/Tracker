"use client";

import type { InboxItem } from "@/lib/db";
import { INBOX_HORIZONS, INBOX_HORIZON_LABELS, type InboxHorizon } from "@/lib/utils/inbox";
import { InboxItemRow } from "./inbox-item-row";

/**
 * B14 — the captured list, grouped into the three buckets in triage order.
 * Buckets with nothing in them are omitted rather than rendered as empty
 * headers, so an early capture reads as one row, not a form.
 */

interface InboxListProps {
  items: InboxItem[];
  onPlan: (item: InboxItem) => void;
  onDismiss: (item: InboxItem) => void;
  planningId: string | null;
}

export function InboxList({ items, onPlan, onDismiss, planningId }: InboxListProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      {INBOX_HORIZONS.map((horizon) => {
        const bucket = items.filter((i) => (i.timeHorizon as InboxHorizon) === horizon);
        if (bucket.length === 0) return null;
        return (
          <div key={horizon} className="space-y-1.5">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-on-surface-variant/60 px-1">
              {INBOX_HORIZON_LABELS[horizon]}
            </span>
            <div className="space-y-1.5">
              {bucket.map((item) => (
                <InboxItemRow
                  key={item.id}
                  item={item}
                  onPlan={onPlan}
                  onDismiss={onDismiss}
                  planning={planningId === item.id}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
