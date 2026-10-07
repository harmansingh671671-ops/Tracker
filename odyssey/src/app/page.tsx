"use client";

/**
 * The first-run flow (A1 / XL14).
 *
 * This replaces a 710-line single-page marketing pitch with a five-step flow.
 * Three things changed beyond structure, and all three matter:
 *
 *   1. **One way in.** The old page had a "Launch App" header button, an
 *      "Explore Habit Studio" hero button and five footer links, and every one
 *      of them called `enterApp()` -- which marked onboarding complete. Four
 *      buttons could skip the entire introduction. Those are gone; the only way
 *      to reach the app is to finish the flow.
 *
 *   2. **Habits created here are real.** Step 2 uses the same
 *      `CreateHabitModal` the Habits tab uses and writes through the same store
 *      action, so nothing has to be copied or synced afterwards -- the habits are
 *      already on the Habits tab when the flow ends.
 *
 *   3. **The profile must exist before a habit can save.** `addHabit` needs a
 *      `userId`, so the flow awaits `getOrCreateUser()` on mount. Without it the
 *      first habit silently fails to write, and the user reaches a "your habits"
 *      step that is empty for no visible reason.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Compass } from "lucide-react";
import { OnboardingShell } from "@/components/onboarding/onboarding-shell";
import { StepIntro } from "@/components/onboarding/step-intro";
import { StepCircadian } from "@/components/onboarding/step-circadian";
import { StepWelcomeHabits } from "@/components/onboarding/step-welcome-habits";
import { StepYourHabits, type OnboardingHabit } from "@/components/onboarding/step-your-habits";
import { StepProtocol } from "@/components/onboarding/step-protocol";
import { CreateHabitModal } from "@/components/habits/create-habit-modal";
import { hasCompletedOnboarding, markOnboardingComplete } from "@/lib/utils/onboarding";
import {
  FIRST_STEP,
  canAdvance,
  isFirstStep,
  nextStep,
  prevStep,
  type OnboardingStep,
} from "@/lib/utils/onboarding-flow";
import { useHabitStore } from "@/lib/stores/habit-store";
import { useUserStore } from "@/lib/stores/user-store";
import { getOrCreateUser } from "@/lib/user";
import { XP_CREATION_DIAMONDS, XP_CREATION_XP } from "@/lib/utils/reward-rules";

export default function OnboardingPage() {
  const router = useRouter();

  // First-run gate. The flag is read in an effect, never during render, so the
  // server pass and the first client render agree. `isChecking` starts true and
  // holds a plain splash until the browser has answered.
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (hasCompletedOnboarding()) {
      router.replace("/planner");
      return;
    }
    // One extra render, once, on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsChecking(false);
  }, [router]);

  const [step, setStep] = useState<OnboardingStep>(FIRST_STEP);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  /**
   * Habits created *in this flow*. Deliberately not "all habits in the store":
   * a returning user who cleared the onboarding flag already has habits, and
   * presenting those as the ones they just added would be a lie. Ids are
   * captured as they are created, so step 3 can only ever show these.
   */
  const [created, setCreated] = useState<OnboardingHabit[]>([]);

  /** The profile. Null until resolved -- the create button stays disabled. */
  const [profileId, setProfileId] = useState<string | null>(null);

  const addHabit = useHabitStore((s) => s.addHabit);
  const deleteHabit = useHabitStore((s) => s.deleteHabit);
  const addXp = useUserStore((s) => s.addXp);
  const addDiamonds = useUserStore((s) => s.addDiamonds);
  const fetchUser = useUserStore((s) => s.fetchUser);

  useEffect(() => {
    let cancelled = false;
    getOrCreateUser()
      .then((u) => {
        if (!cancelled) setProfileId(u.id);
      })
      .catch(() => {
        // Leave it null: the create button stays disabled and the flow remains
        // usable. A failure here must not strand the user on a blank screen.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleBegin = useCallback(() => setStep("circadian"), []);

  const handleNext = useCallback(() => {
    const n = nextStep(step);
    if (n) setStep(n);
  }, [step]);

  const handleBack = useCallback(() => {
    const p = prevStep(step);
    // Never before the first step. The shell hides Back there, and this is the
    // guard that keeps a stale event from doing it anyway.
    if (p && !isFirstStep(step)) setStep(p);
  }, [step]);

  const handleCommit = useCallback(() => {
    markOnboardingComplete();
    router.replace("/planner");
  }, [router]);

  const handleCreateHabit = useCallback(
    async (data: {
      name: string;
      icon: string;
      category: string;
      frequency: number;
      targetDays: number[];
      timeOfDay?: "morning" | "afternoon" | "evening" | "anytime";
    }) => {
      // Guarded rather than trusted: `addHabit` needs a userId, and calling it
      // with null would fail silently -- which reads as "the app ate my habit".
      if (!profileId) return;

      const habit = await addHabit({
        userId: profileId,
        name: data.name,
        icon: data.icon,
        category: data.category,
        frequency: "daily",
        targetDaysPerWeek: data.targetDays.length,
        targetDays: data.targetDays,
        period: data.timeOfDay === "anytime" ? undefined : data.timeOfDay,
        archivedAt: undefined,
      });

      setCreated((prev) => [
        ...prev,
        { id: habit.id, name: habit.name, icon: habit.icon, targetDays: data.targetDays },
      ]);

      // Same creation reward the Habits tab grants, so the two entry points
      // cannot disagree about what creating a habit is worth.
      await addXp(XP_CREATION_XP);
      await addDiamonds(XP_CREATION_DIAMONDS);
      await fetchUser();
    },
    [profileId, addHabit, addXp, addDiamonds, fetchUser]
  );

  const handleRemoveHabit = useCallback(
    async (id: string) => {
      await deleteHabit(id);
      setCreated((prev) => prev.filter((h) => h.id !== id));
    },
    [deleteHabit]
  );

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 text-on-surface">
        <div className="w-12 h-12 rounded-2xl bg-primary/15 border border-primary/40 flex items-center justify-center text-primary">
          <Compass className="w-6 h-6 animate-spin-slow" />
        </div>
        <span className="text-sm font-mono font-bold tracking-tight">ODYSSEY</span>
      </div>
    );
  }

  return (
    <>
      <OnboardingShell
        step={step}
        onNext={handleNext}
        onBack={handleBack}
        canGoNext={canAdvance(step)}
        // Two controls that do the same thing is the duplicate-control mistake
        // (M3's two (+) marks): `intro` has its own "Begin Your Odyssey" CTA, and
        // `protocol` exits only via the hold. Neither gets a shell Next button.
        showNext={step !== "protocol" && step !== "intro"}
        // The welcome step already has "Add your first habit" as its action.
        // A neutral "Next" beside it reads as an equal alternative when it
        // actually skips the whole point of the step, so it says so.
        nextLabel={
          step === "welcome" ? (created.length > 0 ? "Continue" : "Skip for now") : "Next"
        }
      >
        {step === "intro" && <StepIntro onBegin={handleBegin} addedCount={created.length} />}

        {step === "circadian" && <StepCircadian />}

        {step === "welcome" && (
          <StepWelcomeHabits
            onOpenCreate={() => setIsCreateOpen(true)}
            addedCount={created.length}
          />
        )}

        {step === "habits" && (
          <StepYourHabits
            habits={created}
            onRemove={handleRemoveHabit}
            onAddMore={() => setIsCreateOpen(true)}
          />
        )}

        {step === "protocol" && <StepProtocol onCommit={handleCommit} />}
      </OnboardingShell>

      <CreateHabitModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSave={handleCreateHabit}
        existingHabitNames={created.map((h) => h.name)}
      />
    </>
  );
}