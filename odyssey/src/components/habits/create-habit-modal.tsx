"use client";

import { useState } from "react";
import { type HabitCategory, type HabitType } from "@/lib/db";
import { HabitTemplateLibrary, type HabitTemplate } from "@/components/habits/habit-template-library";
import { UnitPicker } from "@/components/habits/unit-picker";
import { IconGridPicker } from "@/components/habits/icon-grid-picker";
import { DomainPicker } from "@/components/habits/domain-picker";
import { SchedulePicker } from "@/components/habits/schedule-picker";
import { TimeAnchorPicker } from "@/components/habits/time-anchor-picker";
import { FormSection, FormLabel } from "@/components/habits/form-section";
import { HabitFormPreview } from "@/components/habits/habit-form-preview";
import { PriorityPicker, ColorPicker } from "@/components/habits/priority-color-picker";
import {
  scheduleSummary,
  periodSummary,
  goalSummary,
  prioritySummary,
} from "@/lib/utils/habit-form-summary";
import { DOMAINS } from "@/components/habits/habit-form-options";
import { X, Check, Sparkles, ArrowLeft } from "lucide-react";

interface CreateHabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (habitData: {
    name: string;
    icon: string;
    category: HabitCategory;
    frequency: number;
    targetDays: number[];
    timeOfDay?: "morning" | "afternoon" | "evening" | "anytime";
    priority?: "critical" | "focus" | "optional";
    cue?: string;
    reward?: string;
    emergencyVersion?: string;
    type?: HabitType;
    unit?: string;
    targetValue?: number;
    color?: string;
  }) => void;
  existingHabitNames?: string[];
  /**
   * M16 -- pre-fills the form when a goal tag is tapped during onboarding.
   * Additive and optional: with no `defaults` the modal behaves exactly as it
   * did before, which is every existing call site.
   *
   * Supplying `defaults` also opens the **custom** view rather than the template
   * browser. That is not cosmetic: the name, icon and domain fields only exist in
   * the custom view, so a pre-filled form hidden behind a template grid is a tag
   * that appears to do nothing.
   */
  defaults?: {
    name?: string;
    icon?: string;
    /** Must be one of `DOMAINS`. An unknown value is ignored, not injected. */
    category?: HabitCategory;
  };
}

// B2: the option lists moved to `habit-form-options.ts` — both forms import
// the same EMOJIS/DOMAINS/WEEKDAYS so they cannot drift again.

export function CreateHabitModal({ isOpen, onClose, onSave, existingHabitNames = [], defaults }: CreateHabitModalProps) {
  const [view, setView] = useState<"browse" | "custom">(defaults ? "custom" : "browse");
  const [isExpanded, setIsExpanded] = useState(false);
  const [name, setName] = useState(defaults?.name ?? "");
  const [icon, setIcon] = useState(defaults?.icon ?? "🧘");
  // M16 -- a `defaults.category` the picker does not offer would select nothing,
  // so it is checked against DOMAINS rather than trusted. An unknown value falls
  // back to the existing default rather than leaving the form in no state.
  const [domain, setDomain] = useState<HabitCategory>(
    defaults?.category && DOMAINS.some((d) => d.id === defaults.category)
      ? defaults.category
      : "Vitality & Fitness"
  );
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon..Fri by default
  const [timeOfDay, setTimeOfDay] = useState<"morning" | "afternoon" | "evening" | "anytime">("morning");
  const [priority, setPriority] = useState<"critical" | "focus" | "optional">("focus");
  const [cue, setCue] = useState("");
  const [reward, setReward] = useState("");
  const [emergencyVersion, setEmergencyVersion] = useState("");
  const [type, setType] = useState<HabitType>("simple");
  const [unit, setUnit] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [color, setColor] = useState("");
  // B2 — the single generic "Advanced" drawer became named groups. Defaults
  // keep the form calm: nothing optional is open until asked for.
  const [openMotivation, setOpenMotivation] = useState(false);
  const [openLook, setOpenLook] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setIsExpanded(false);
    setView("browse");
    // Reset to whatever the caller asked for, not to "". `defaults` is read once
    // on mount (the parent remounts this component via `key` when the suggestion
    // changes), so clearing here is what stops a dismissed tag from lingering.
    setName(defaults?.name ?? "");
    setIcon(defaults?.icon ?? "🧘");
    setType("simple");
    onClose();
  };

  const toggleDay = (idx: number) => {
    if (selectedDays.includes(idx)) {
      if (selectedDays.length > 1) {
        setSelectedDays(selectedDays.filter((d) => d !== idx));
      }
    } else {
      setSelectedDays([...selectedDays, idx].sort());
    }
  };

  const applyPreset = (preset: "everyday" | "weekdays" | "3x") => {
    if (preset === "everyday") setSelectedDays([1, 2, 3, 4, 5, 6, 7]);
    else if (preset === "weekdays") setSelectedDays([1, 2, 3, 4, 5]);
    else setSelectedDays([1, 3, 5]);
  };

  const handleSelectTemplate = (tpl: HabitTemplate) => {
    setName(tpl.name);
    setIcon(tpl.icon);
    setDomain(tpl.domainLabel);
    setSelectedDays(tpl.targetDays);
    setTimeOfDay(tpl.period);
    setView("custom");
  };

  const handleQuickAddTemplate = async (tpl: HabitTemplate) => {
    onSave({
      name: tpl.name,
      icon: tpl.icon,
      category: tpl.domainLabel,
      frequency: tpl.targetDays.length,
      targetDays: tpl.targetDays,
      timeOfDay: tpl.period,
      priority,
      cue: cue.trim() || undefined,
      reward: reward.trim() || undefined,
      emergencyVersion: emergencyVersion.trim() || undefined,
      type: type === "simple" ? undefined : type,
      unit: type === "counted" ? unit.trim() || undefined : undefined,
      targetValue: type === "counted" ? (targetValue ? parseInt(targetValue, 10) : undefined) : undefined,
      color: color.trim() || undefined,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || "Daily Routine";
    onSave({
      name: finalName,
      icon,
      category: domain,
      frequency: selectedDays.length,
      targetDays: selectedDays,
      timeOfDay,
      priority,
      cue: cue.trim() || undefined,
      reward: reward.trim() || undefined,
      emergencyVersion: emergencyVersion.trim() || undefined,
      type: type === "simple" ? undefined : type,
      unit: type === "counted" ? unit.trim() || undefined : undefined,
      targetValue: type === "counted" ? (targetValue ? parseInt(targetValue, 10) : undefined) : undefined,
      color: color.trim() || undefined,
    });
    handleClose();
  };

  return (
    <div
      onClick={handleClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-surface-container-lowest/85 animate-in fade-in duration-200 cursor-pointer"
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className={`w-full max-w-lg flex flex-col bg-surface-container rounded-t-[32px] sm:rounded-[32px] border border-outline/15 shadow-2xl p-4 sm:p-5 pt-2 sm:pt-3 space-y-2.5 animate-in slide-in-from-bottom-6 duration-300 cursor-default transition-all duration-300 ease-out overflow-hidden ${
          view === "custom" || isExpanded
            ? "h-[94vh] max-h-[94vh]"
            : "h-[83.33vh] max-h-[83.33vh]"
        }`}
      >
        {/* Compact Drag Handle Bar */}
        <div
          onClick={() => {
            if (!isExpanded) setIsExpanded(true);
            else handleClose();
          }}
          className="flex flex-col items-center pt-0.5 pb-1 cursor-pointer group"
          title={isExpanded ? "Click to close" : "Click to expand to full screen"}
        >
          <div className="w-10 h-1 rounded-full bg-outline/25 group-hover:bg-outline/50 transition-colors" />
        </div>

        {/* Modal Header Bar */}
        <div className="flex items-center justify-between pb-0.5 shrink-0">
          {view === "custom" ? (
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setView("browse")}
                className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
                title="Back to Templates"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-on-surface">
                {type === "avoid" ? "Quit a Habit" : "Customize Habit"}
              </h2>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-on-surface">Add Habit</h2>
            </div>
          )}

          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {view === "browse" ? (
          <div className="flex-1 overflow-hidden flex flex-col min-h-0">
            <HabitTemplateLibrary
              onSelectTemplate={handleSelectTemplate}
              onQuickAdd={handleQuickAddTemplate}
              onCreateCustom={() => {
                setName("");
                setIcon("🧘");
                setDomain("Vitality & Fitness");
                setSelectedDays([1, 2, 3, 4, 5]);
                setTimeOfDay("morning");
                setType("simple");
                setView("custom");
              }}
              onCreateQuit={() => {
                setName("");
                setIcon("🚫");
                setDomain("Vitality & Fitness");
                setSelectedDays([1, 2, 3, 4, 5, 6, 7]);
                setTimeOfDay("anytime");
                setType("avoid");
                setView("custom");
              }}
              isExpanded={isExpanded}
              onExpand={() => setIsExpanded(true)}
              onCollapse={() => setIsExpanded(false)}
              existingHabitNames={existingHabitNames}
            />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 pt-1 pr-1">
            {/* Habit Name Input */}
            <div className="space-y-1.5">
              <FormLabel>Habit name</FormLabel>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                 placeholder={type === "avoid" ? "e.g. Quit Doom Scrolling" : "e.g. Read 20 pages"}
                className="w-full bg-surface-container-lowest text-on-surface placeholder:text-outline-variant rounded-2xl py-3.5 px-4 border border-outline/15 focus:border-primary focus:ring-1 focus:ring-primary shadow-sm text-sm font-semibold transition-all"
                autoFocus
              />
            </div>

            <IconGridPicker value={icon} onChange={setIcon} />

            <DomainPicker value={domain} onChange={setDomain} />

            {/* Frequency & Target Weekdays */}
            <SchedulePicker
              selectedDays={selectedDays}
              onToggleDay={toggleDay}
              onApplyPreset={applyPreset}
            />

            <TimeAnchorPicker value={timeOfDay} onChange={setTimeOfDay} />

            {/* Habit Type */}
            {type !== "avoid" && (
            <div className="space-y-1.5">
              <FormLabel>Habit type</FormLabel>
              <div className="flex gap-2">
                {[
                  { id: "simple", label: "Simple", desc: "Tap to complete" },
                  { id: "counted", label: "Counted", desc: "Log a number toward a target" },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setType(t.id as HabitType)}
                    className={`flex-1 p-3 rounded-xl text-left flex flex-col gap-0.5 transition-all cursor-pointer border ${
                      type === t.id
                        ? "bg-primary/15 border-primary/40 text-primary"
                        : "bg-surface-container border-outline/10 text-on-surface-variant opacity-70"
                    }`}
                  >
                    <span className="text-xs font-semibold">{t.label}</span>
                    <span className="text-[10px] font-mono text-on-surface-variant">{t.desc}</span>
                  </button>
                ))}
              </div>
            </div>
            )}

            {type === "counted" && (
              <>
                {/* Counted habits pick a preset unit (Time opens the timer,
                    the others a counter) or Custom's two-column amount +
                    unit pair -- the same picker as the edit sheet, so the
                    two pages cannot drift apart. */}
                <UnitPicker
                  unit={unit}
                  targetValue={targetValue}
                  onUnitChange={setUnit}
                  onTargetChange={setTargetValue}
                />

                <div className="space-y-1.5">
                  <FormLabel>Emergency minimum</FormLabel>
                  <input
                    type="number"
                    min="1"
                    inputMode="numeric"
                    value={emergencyVersion}
                    onChange={(e) => setEmergencyVersion(e.target.value)}
                    placeholder="1"
                    className="w-full rounded-xl bg-surface-container border border-outline/10 px-3 py-2 text-sm text-on-surface"
                  />
                  <p className="text-[10px] text-on-surface-variant/70">
                    Do at least this many and the day still counts.
                  </p>
                </div>
              </>
            )}

            {/* Motivation — optional, folded. Cue does not exist for a quit
                habit (there is nothing to trigger). */}
            <FormSection
              title="Motivation"
              hint={cue || reward ? (cue ? `Triggered · rewarded` : "Reward set") : "Trigger & reward, optional"}
              open={openMotivation}
              onToggle={() => setOpenMotivation((v) => !v)}
            >
              {type !== "avoid" && (
                <div className="space-y-1.5">
                  <FormLabel>Your trigger</FormLabel>
                  <input
                    type="text"
                    value={cue}
                    onChange={(e) => setCue(e.target.value)}
                    placeholder="After I pour my morning coffee"
                    className="w-full rounded-xl bg-surface-container border border-outline/10 px-3 py-2 text-sm text-on-surface"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <FormLabel>Your reward</FormLabel>
                <input
                  type="text"
                  value={reward}
                  onChange={(e) => setReward(e.target.value)}
                  placeholder="5 minutes of music"
                  className="w-full rounded-xl bg-surface-container border border-outline/10 px-3 py-2 text-sm text-on-surface"
                />
              </div>
            </FormSection>

            {/* Priority & colour — optional, folded. */}
            <FormSection
              title="Look & priority"
              hint={color ? "Colour set" : priority !== "focus" ? `${prioritySummary(priority)} priority` : undefined}
              open={openLook}
              onToggle={() => setOpenLook((v) => !v)}
            >
              <PriorityPicker value={priority} onChange={setPriority} />
              <ColorPicker value={color} onChange={setColor} />
            </FormSection>

            {/* Live preview — the row you are about to get, as you type it. */}
            <HabitFormPreview
              icon={icon}
              name={name}
              domain={domain}
              color={color}
              scheduleLine={scheduleSummary(selectedDays)}
              periodLine={periodSummary(timeOfDay)}
              goalLine={goalSummary({ type, unit, targetValue })}
              priority={prioritySummary(priority)}
              type={type}
            />

            {/* Gamification Reward Hint */}
            <div className="p-3 rounded-xl bg-surface-container-low border border-outline/10 flex items-center justify-between text-xs font-mono">
              <span className="text-on-surface-variant flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                Habit Creation Yield:
              </span>
              <span className="text-primary font-bold">+30 XP • +5 💎</span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className={`w-full py-4 px-6 rounded-2xl font-bold text-sm shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer ${
                type === "avoid"
                  ? "bg-error text-on-error shadow-error/25 hover:opacity-95"
                  : "bg-primary text-on-primary shadow-primary/25 hover:opacity-95"
              }`}
            >
              <Check className="w-4 h-4" />
              <span>{type === "avoid" ? "Save & Start Quitting" : "Save & Start Habit"}</span>
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
