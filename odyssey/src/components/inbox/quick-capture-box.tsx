"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import {
  INBOX_HORIZONS,
  INBOX_HORIZON_LABELS,
  normalizeInboxTitle,
  type InboxHorizon,
} from "@/lib/utils/inbox";

/**
 * B14 — the one-line capture box. A thought goes in with a single tap; the
 * only decision it asks for is which bucket to park it in, and that has a
 * default. Everything else (plan it, dismiss it) happens later, on the row.
 */

interface QuickCaptureBoxProps {
  onSave: (title: string, horizon: InboxHorizon) => Promise<void>;
}

export function QuickCaptureBox({ onSave }: QuickCaptureBoxProps) {
  const [title, setTitle] = useState("");
  const [horizon, setHorizon] = useState<InboxHorizon>("today");
  const [saving, setSaving] = useState(false);

  const trimmed = normalizeInboxTitle(title);
  const canSave = trimmed.length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave(trimmed, horizon);
      setTitle("");
      // The default bucket is the honest resting state: a fresh capture is a
      // "today" thought until the user says otherwise.
      setHorizon("today");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-2xl bg-surface-container border border-outline/10 p-3 space-y-2.5">
      <div className="flex items-center gap-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void handleSave();
            }
          }}
          placeholder="Capture a thought…"
          aria-label="Capture a thought"
          maxLength={300}
          className="flex-1 min-w-0 bg-surface-container-low rounded-xl border border-outline/15 px-3.5 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary/50 transition-colors"
        />
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!canSave}
          aria-label="Save to inbox"
          className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center border transition-all active:scale-95 ${
            canSave
              ? "bg-primary text-on-primary border-primary/40 shadow-sm shadow-primary/30 cursor-pointer"
              : "bg-surface-container-high text-on-surface-variant/40 border-outline/10 cursor-not-allowed"
          }`}
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      <div className="flex items-center gap-1.5" role="group" aria-label="When is this for?">
        {INBOX_HORIZONS.map((h) => (
          <button
            key={h}
            type="button"
            onClick={() => setHorizon(h)}
            aria-pressed={horizon === h}
            className={`px-3 py-1 rounded-full text-[11px] font-mono font-semibold border transition-colors cursor-pointer ${
              horizon === h
                ? "bg-primary/15 border-primary/40 text-primary"
                : "bg-surface-container-low border-outline/10 text-on-surface-variant hover:text-on-surface"
            }`}
          >
            {INBOX_HORIZON_LABELS[h]}
          </button>
        ))}
      </div>
    </div>
  );
}
