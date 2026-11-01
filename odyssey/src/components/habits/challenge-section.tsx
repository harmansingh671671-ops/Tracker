"use client";

import { useState } from "react";
import { Flag, ChevronRight, Check, X } from "lucide-react";
import type { Habit } from "@/lib/db";
import {
  CHALLENGES,
  getChallengeStatus,
  planChallengeStart,
  toChallengeInputs,
  type Challenge,
  type ChallengeHabitInput,
  type ChallengeTemplateLike,
} from "@/lib/utils/challenges";

/**
 * B7 — the Challenges section inside the habit library.
 *
 * Two rules shape this UI, both from the spec and both visible to the user:
 * tapping a challenge shows what it commits you to *before* anything is
 * created, and habits you already have are listed as skipped rather than
 * silently duplicated. Nothing here writes to the database itself — it hands a
 * plan to `onStart`, so the create path stays in one place.
 */

interface ChallengeSectionProps {
  templates: ChallengeTemplateLike[];
  habits: Habit[];
  existingHabitNames: string[];
  todayStr: string;
  onStart: (inputs: ChallengeHabitInput[]) => Promise<void>;
}

function ChallengeCard({
  challenge,
  statusLabel,
  joined,
  onOpen,
}: {
  challenge: Challenge;
  statusLabel: string;
  joined: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`${challenge.title} — ${statusLabel}`}
      className="shrink-0 w-[220px] text-left p-3 rounded-2xl bg-surface-container-low border border-outline/10 hover:border-primary/40 transition-colors active:scale-[0.99] cursor-pointer"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-mono font-bold text-primary">
          {challenge.durationDays} days
        </span>
        <span
          className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full border ${
            joined
              ? "text-primary border-primary/30 bg-primary/10"
              : "text-on-surface-variant border-outline/20"
          }`}
        >
          {statusLabel}
        </span>
      </div>
      <p className="mt-1.5 text-xs font-bold text-on-surface leading-tight">
        {challenge.title}
      </p>
      <p className="mt-1 text-[11px] text-on-surface-variant leading-snug line-clamp-2">
        {challenge.goal}
      </p>
    </button>
  );
}

export function ChallengeSection({
  templates,
  habits,
  existingHabitNames,
  todayStr,
  onStart,
}: ChallengeSectionProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const open = openId ? CHALLENGES.find((c) => c.id === openId) ?? null : null;
  const openTemplates = open ? templates.filter((t) => open.templateIds.includes(t.id)) : [];
  const plan = open ? planChallengeStart(openTemplates, existingHabitNames) : null;

  const handleStart = async () => {
    if (!open || !plan || plan.toAdd.length === 0) return;
    setStarting(true);
    try {
      await onStart(toChallengeInputs(open, plan.toAdd, todayStr));
      setOpenId(null);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="pb-2.5 space-y-2">
      <div className="flex items-center gap-1.5 px-1">
        <Flag className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-xs font-bold text-on-surface">Challenges</span>
        <span className="text-[10px] font-mono text-on-surface-variant">
          commit to a pack for a set number of days
        </span>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {CHALLENGES.map((challenge) => {
          const status = getChallengeStatus(challenge, habits, todayStr);
          const statusLabel = !status.joined
            ? "Not started"
            : status.finished
              ? "Finished"
              : `Day ${status.dayNumber} of ${status.durationDays}`;
          return (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              statusLabel={statusLabel}
              joined={status.joined}
              onOpen={() => setOpenId(challenge.id)}
            />
          );
        })}
      </div>

      {open && plan && (
        <div className="p-3.5 rounded-2xl bg-surface-container-high border border-primary/25 space-y-2.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-bold text-on-surface">{open.title}</p>
              <p className="text-[11px] text-on-surface-variant mt-0.5">{open.goal}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpenId(null)}
              aria-label="Close challenge preview"
              className="w-7 h-7 shrink-0 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-mono font-bold text-on-surface-variant">
              What you are committing to
            </p>
            <ul className="space-y-0.5">
              {plan.toAdd.map((t) => (
                <li key={t.name} className="flex items-center gap-1.5 text-[11px] text-on-surface">
                  <Check className="w-3 h-3 text-primary shrink-0" />
                  <span className="truncate">{t.name}</span>
                </li>
              ))}
              {plan.skipped.map((t) => (
                <li
                  key={t.name}
                  className="flex items-center gap-1.5 text-[11px] text-on-surface-variant"
                >
                  <Check className="w-3 h-3 opacity-40 shrink-0" />
                  <span className="truncate line-through">{t.name}</span>
                  <span className="text-[10px] font-mono shrink-0">already yours</span>
                </li>
              ))}
            </ul>
          </div>

          <p className="text-[11px] font-mono text-on-surface-variant">
            {open.durationDays} days, starting today. No schedule changes — this only adds habits.
          </p>

          {plan.toAdd.length === 0 ? (
            <p className="text-[11px] font-semibold text-on-surface-variant">
              You already have every habit in this challenge.
            </p>
          ) : (
            <button
              type="button"
              onClick={handleStart}
              disabled={starting}
              className="w-full py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-60 cursor-pointer"
            >
              {starting ? "Starting…" : `Start challenge · ${plan.toAdd.length} habits`}
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
