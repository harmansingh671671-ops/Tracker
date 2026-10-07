"use client";

/**
 * Shared chrome for the first-run flow: brand, theme toggle, step indicator and
 * the Next / Back pair.
 *
 * The Back control is *hidden* on the first step rather than rendered disabled.
 * A permanently dead button reads as a broken app, and there is nothing to go
 * back to. Same reasoning for Next on the last step, which does not render at
 * all -- on `protocol` the hold is the only way forward.
 */

import { ArrowLeft, ArrowRight, Compass } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { isFirstStep, isLastStep, stepNumber, totalSteps } from "@/lib/utils/onboarding-flow";
import type { OnboardingStep } from "@/lib/utils/onboarding-flow";

interface OnboardingShellProps {
  step: OnboardingStep;
  onNext: () => void;
  onBack: () => void;
  /** False while something is still loading -- Next must not be tappable yet. */
  canGoNext: boolean;
  /** Next is hidden entirely on the final step; the hold takes over. */
  showNext?: boolean;
  /**
   * Label for Next. Steps that already carry their own primary action pass
   * something honest about what Next actually does -- "Skip for now" rather than
   * a neutral "Next" sitting beside "Add your first habit", which reads as two
   * equal options when one of them quietly skips the step's whole purpose.
   */
  nextLabel?: string;
  children: React.ReactNode;
}

export function OnboardingShell({
  step,
  onNext,
  onBack,
  canGoNext,
  showNext = true,
  nextLabel = "Next",
  children,
}: OnboardingShellProps) {
  const n = stepNumber(step);
  const total = totalSteps();

  return (
    <div className="min-h-screen bg-transparent text-on-surface overflow-x-hidden relative selection:bg-primary/30 selection:text-primary">
      {/* Ambient background. `pointer-events-none` because these are decoration
          and must never intercept a hold or a tap. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed top-1/3 -right-40 w-96 h-96 bg-sky-500/10 rounded-full blur-[140px]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed -bottom-40 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[140px]"
      />

      <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-2xl border-b border-outline/[0.08] px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/40 flex items-center justify-center text-primary">
              <Compass className="w-4 h-4" />
            </div>
            <span className="text-base font-bold tracking-tight text-on-surface font-mono">
              ODYSSEY
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-on-surface-variant tabular-nums">
              {n}/{total}
            </span>
            <ThemeToggle />
          </div>
        </div>

        {/* Step dots. Decorative: the "n/total" readout above already carries the
            position in text, so these are hidden from assistive tech rather than
            read out twice. */}
        <div
          aria-hidden="true"
          className="max-w-3xl mx-auto mt-2.5 flex items-center gap-1.5"
        >
          {Array.from({ length: total }, (_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all duration-300 ${
                i + 1 === n
                  ? "w-6 bg-primary"
                  : i + 1 < n
                    ? "w-3 bg-primary/45"
                    : "w-3 bg-outline/25"
              }`}
            />
          ))}
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-6 pb-10 sm:pt-10 relative z-10">
        {children}

        <nav
          aria-label="Onboarding steps"
          className="flex items-center justify-between gap-3 pt-8"
        >
          {!isFirstStep(step) && (
            <button
              type="button"
              onClick={onBack}
              className="py-3 px-5 rounded-2xl bg-surface-container/90 hover:bg-surface-container-high text-on-surface border border-outline/12 text-sm font-semibold transition-all active:scale-[0.98] flex items-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          )}

          <div className="flex-1" />

          {showNext && !isLastStep(step) && (
            <button
              type="button"
              onClick={onNext}
              disabled={!canGoNext}
              className="py-3 px-6 rounded-2xl bg-primary hover:bg-primary/95 text-on-primary font-bold text-sm shadow-[0_0_24px_rgba(108,0,255,0.28)] active:scale-[0.98] transition-all flex items-center gap-2 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-45 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <span>{nextLabel}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </nav>
      </main>
    </div>
  );
}