"use client";

import { useCallback, useEffect, useState } from "react";
import { Inbox as InboxIcon } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { db, type InboxItem } from "@/lib/db";
import { useUserStore } from "@/lib/stores/user-store";
import { useScheduleStore } from "@/lib/stores/schedule-store";
import { syncCurrentScheduleToNative } from "@/lib/utils/android-bridge";
import type { InboxHorizon } from "@/lib/utils/inbox";
import { QuickCaptureBox } from "./quick-capture-box";
import { InboxList } from "./inbox-list";
import { InboxPlanModal } from "./inbox-plan-modal";

/**
 * B14 — the quick-capture inbox, mounted on the Journey page (owner choice).
 * Owns the item list end to end: capture, triage buckets, and the two exits
 * (plan into a day, or dismiss). Renders nothing until the user identity is
 * known, so the section never flashes empty on a fresh load.
 */

export function InboxSection() {
  const { user } = useUserStore();
  const { addBlock } = useScheduleStore();
  const userId = user?.id;

  const [items, setItems] = useState<InboxItem[]>([]);
  const [planningItem, setPlanningItem] = useState<InboxItem | null>(null);
  const [planningId, setPlanningId] = useState<string | null>(null);

  const fetchItems = useCallback(async (uid: string) => {
    const rows = await db.inboxItems.where("userId").equals(uid).toArray();
    rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    setItems(rows);
  }, []);

  useEffect(() => {
    if (!userId) return;
    // Promise form, not the awaited helper: the effect must not synchronously
    // drive state (react-hooks/set-state-in-effect); the helper stays for the
    // mutation paths, which are event handlers.
    db.inboxItems
      .where("userId")
      .equals(userId)
      .toArray()
      .then((rows) => {
        rows.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        setItems(rows);
      });
  }, [userId]);

  const handleSave = useCallback(
    async (title: string, horizon: InboxHorizon) => {
      if (!userId) return;
      const item: InboxItem = {
        id: uuidv4(),
        userId,
        title,
        timeHorizon: horizon,
        createdAt: new Date().toISOString(),
      };
      await db.inboxItems.add(item);
      await fetchItems(userId);
    },
    [userId, fetchItems]
  );

  const handleDismiss = useCallback(
    async (item: InboxItem) => {
      await db.inboxItems.delete(item.id);
      if (userId) await fetchItems(userId);
    },
    [userId, fetchItems]
  );

  const handleConfirmPlan = useCallback(
    async (item: InboxItem, dateStr: string, startHour: number) => {
      if (!userId) return;
      const start = `${String(startHour).padStart(2, "0")}:00`;
      const end = `${String(Math.min(startHour + 1, 24)).padStart(2, "0")}:00`;
      await addBlock({
        userId,
        date: dateStr,
        startTime: start,
        endTime: end,
        title: item.title,
        // No category is chosen at capture time; the schedule screens infer
        // one for display by hour, exactly as for planner-typed blocks.
        category: "",
        status: "pending",
        isCommitted: true,
      });
      await db.inboxItems.delete(item.id);
      // The XX:57 reminder and wallpaper read the native payload; a block
      // added from outside the schedule screens must reach them too.
      void syncCurrentScheduleToNative(dateStr);
      if (userId) await fetchItems(userId);
      setPlanningItem(null);
      setPlanningId(null);
    },
    [userId, addBlock, fetchItems]
  );

  if (!userId) return null;

  return (
    <div className="rounded-3xl bg-surface-container p-4 border border-outline/10 shadow-lg space-y-3">
      <div className="flex items-center gap-2">
        <InboxIcon className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-on-surface">Capture</h3>
        {items.length > 0 && (
          <span className="ml-auto text-[10px] font-mono text-on-surface-variant/70">
            {items.length} {items.length === 1 ? "thought" : "thoughts"}
          </span>
        )}
      </div>

      <QuickCaptureBox onSave={handleSave} />

      <InboxList
        items={items}
        planningId={planningId}
        onPlan={(item) => {
          setPlanningId(item.id);
          setPlanningItem(item);
        }}
        onDismiss={handleDismiss}
      />

      {planningItem && (
        <InboxPlanModal
          item={planningItem}
          onClose={() => {
            setPlanningItem(null);
            setPlanningId(null);
          }}
          onConfirm={handleConfirmPlan}
        />
      )}
    </div>
  );
}
