"use client";

import { ArrowLeft, Check, Plus, Sparkles } from "lucide-react";

/**
 * B1 — the full look-before-adding panel. One presentation, two mounts:
 * - the template library's detail view (preview of a curated template)
 * - the habits screen's import offer (preview of a habit that arrived by
 *   share link), which passes no back control and no template copy
 *
 * Presentational only: callers supply already-summarised lines (from
 * habit-form-summary) so the wording cannot drift from the live form preview.
 */

export interface TemplateDetailPreviewProps {
  icon: string;
  name: string;
  domain: string;
  scheduleLine: string;
  periodLine: string;
  goalLine?: string;
  description?: string;
  note?: string;
  onBack?: () => void;
  primaryLabel: string;
  primaryDone?: boolean;
  onPrimary: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Extra line under the schedule pair (import offer: the trust sentence). */
  footer?: string;
}

export function TemplateDetailPreview({
  icon,
  name,
  domain,
  scheduleLine,
  periodLine,
  goalLine,
  description,
  note,
  onBack,
  primaryLabel,
  primaryDone = false,
  onPrimary,
  secondaryLabel,
  onSecondary,
  footer,
}: TemplateDetailPreviewProps) {
  return (
    <div className="pt-1 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-200">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to the list</span>
        </button>
      )}

      <div className="p-4 rounded-2xl bg-surface-container-high/60 border border-outline/10 shadow-xs space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-surface-container-highest border border-outline/15 flex items-center justify-center text-2xl shrink-0 shadow-xs">
            <span>{icon}</span>
          </div>
          <div className="min-w-0 space-y-1">
            <h3 className="text-sm font-bold text-on-surface leading-snug">{name}</h3>
            <p className="text-[10px] font-mono text-on-surface-variant">
              <span className="text-primary font-semibold">{domain}</span>
            </p>
          </div>
        </div>

        {/* What a day on this habit looks like — the same lines the create
            form's live preview prints, so previews cannot drift apart. */}
        <div className="grid grid-cols-2 gap-2 text-[10.5px] font-mono">
          <div className="p-2 rounded-xl bg-surface-container-low border border-outline/10">
            <p className="text-on-surface-variant/70 mb-0.5">Days</p>
            <p className="text-on-surface font-bold">{scheduleLine}</p>
          </div>
          <div className="p-2 rounded-xl bg-surface-container-low border border-outline/10">
            <p className="text-on-surface-variant/70 mb-0.5">Time of day</p>
            <p className="text-on-surface font-bold">{periodLine}</p>
          </div>
        </div>

        {description && (
          <p className="text-[11px] text-on-surface-variant leading-relaxed">{description}</p>
        )}

        {goalLine && (
          <p className="text-[10.5px] font-mono text-on-surface-variant">{goalLine}</p>
        )}

        {note && (
          <div className="p-2 rounded-xl bg-surface-container-low border border-outline/10 flex items-start gap-1.5 text-[10px] font-mono text-on-surface-variant/80">
            <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
            <span className="leading-tight">
              <strong className="text-on-surface font-semibold">Science: </strong>
              {note}
            </span>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPrimary}
          disabled={primaryDone}
          className={`flex-1 px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:cursor-default active:scale-[0.98] ${
            primaryDone
              ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30"
              : "bg-primary hover:bg-primary/90 text-on-primary shadow-md shadow-primary/25"
          }`}
        >
          {primaryDone ? (
            <>
              <Check className="w-3.5 h-3.5 stroke-[3]" />
              <span>Added!</span>
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              <span>{primaryLabel}</span>
            </>
          )}
        </button>
        {secondaryLabel && onSecondary && (
          <button
            type="button"
            onClick={onSecondary}
            className="flex-1 px-3 py-2.5 rounded-xl bg-surface-container-high text-on-surface border border-outline/15 hover:border-primary/40 text-xs font-bold transition-all shadow-xs active:scale-[0.98] cursor-pointer"
          >
            {secondaryLabel}
          </button>
        )}
      </div>

      {footer && (
        <p className="text-[10px] font-mono text-on-surface-variant/80 text-center leading-relaxed">
          {footer}
        </p>
      )}
    </div>
  );
}
