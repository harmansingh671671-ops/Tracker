"use client";

import { useState, useMemo } from "react";
import { type HabitCategory, type Habit, type HabitType } from "@/lib/db";
import { useHabitStore } from "@/lib/stores/habit-store";
import { useUserStore } from "@/lib/stores/user-store";
import { getHabitColor, getLocalTodayStr } from "@/lib/utils/habit-colors";
import { HabitGitHubHeatmap } from "@/components/habits/habit-github-heatmap";
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
import {
  X,
  Check,
  Trash2,
  AlertTriangle,
  History,
  Sliders,
  Flame,
  Sparkles,
  CheckCircle2,
  PauseCircle,
  Play,
} from "lucide-react";
import { PauseLengthPicker } from "./pause-length-picker";

interface EditHabitModalProps {
  habit: Habit | null;
  isOpen: boolean;
  initialTab?: "history" | "edit";
  selectedDate?: string;
  todayStr?: string;
  onSelectDate?: (dateStr: string) => void;
  onClose: () => void;
  onSave: (
    habitId: string,
    updates: {
      name: string;
      icon: string;
      category: HabitCategory;
      frequency: "daily" | "weekly";
      targetDaysPerWeek: number;
      targetDays?: number[];
      period?: "morning" | "afternoon" | "evening";
      priority?: "critical" | "focus" | "optional";
      cue?: string;
      reward?: string;
      emergencyVersion?: string;
       type?: HabitType;
       unit?: string;
       targetValue?: number;
       color?: string;
     }
  ) => void;
  onDelete: (habitId: string) => void;
  /** S19 — this habit is the user's one keystone habit. */
  isKeystone?: boolean;
  /** Omitted where designation is not offered; the row hides itself then. */
  onSetKeystone?: (habitId: string) => void;
  /** The CURRENT keystone's name, so a replacement can ask first. */
  keystoneHabitName?: string;
  /** B13 — pause this habit for `days` whole days (dated window, ADR 0006). */
  onPause?: (days: number) => void;
  /** B13 — end the active pause now (the window is clamped, not erased). */
  onResume?: () => void;
  /** B13 — whole days left, or null when the habit is not paused. */
  pausedDaysLeft?: number | null;
}

// B2: the option lists moved to `habit-form-options.ts` — both forms import
// the same EMOJIS/DOMAINS/WEEKDAYS so they cannot drift again.

export function EditHabitModal({
  habit,
  isOpen,
  initialTab = "history",
  selectedDate,
  todayStr: propTodayStr,
  onSelectDate,
  onClose,
  onSave,
  onDelete,
  isKeystone = false,
  onSetKeystone,
  keystoneHabitName,
  onPause,
  onResume,
  pausedDaysLeft = null,
}: EditHabitModalProps) {
  const { user } = useUserStore();
  const { historyLogs, toggleHabitLog, daysDoneByHabit } = useHabitStore();

  const [activeTab, setActiveTab] = useState<"history" | "edit">(initialTab);

  // Form states for Edit Tab
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🧘");
  const [domain, setDomain] = useState<HabitCategory>("Vitality & Fitness");
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [timeOfDay, setTimeOfDay] = useState<"morning" | "afternoon" | "evening" | "anytime">("morning");
  const [priority, setPriority] = useState<"critical" | "focus" | "optional">("focus");
  const [cue, setCue] = useState("");
  const [reward, setReward] = useState("");
  const [emergencyVersion, setEmergencyVersion] = useState("");
  const [type, setType] = useState<HabitType>("simple");
  const [unit, setUnit] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [color, setColor] = useState("");
  const [confirmKeystone, setConfirmKeystone] = useState(false);
  // B2 — the single generic "Advanced" drawer became named groups, including a
  // dedicated keystone group. Defaults keep the form calm: nothing optional is
  // open until asked for.
  const [openMotivation, setOpenMotivation] = useState(false);
  const [openLook, setOpenLook] = useState(false);
  const [openKeystone, setOpenKeystone] = useState(false);

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  // B13 — the sheet's pause picker is folded by default.
  const [showPausePicker, setShowPausePicker] = useState(false);

  const today = propTodayStr || getLocalTodayStr();
  const [selectedHistoryDate, setSelectedHistoryDate] = useState<string>(selectedDate || today);

  const habitColor = useMemo(() => (habit ? getHabitColor(habit) : "#6C00FF"), [habit]);

  // The sentinel must start EMPTY rather than at `habit`. This modal is mounted
  // fresh on every open with a non-null habit, so `useState(habit)` would begin
  // equal to the prop and the block below would never run on that first render --
  // the form would open on its defaults (blank fields, `simple` type, no unit or
  // target) and saving would write those defaults over the stored habit. `635182a`
  // turned the `useEffect` that used to run this on mount into a render-phase
  // guard and lost the on-mount run. `useEffect` ran on mount; a guard seeded from
  // the prop cannot. Do not "simplify" this back to `useState(habit)`.
  const [prevHabit, setPrevHabit] = useState<Habit | null>(null);
  if (prevHabit !== habit) {
    setPrevHabit(habit);
    if (habit) {
      setActiveTab(initialTab);
      setName(habit.name || "");
      setIcon(habit.icon || "🧘");
      setDomain(habit.category || "Vitality & Fitness");
      if (habit.targetDays && habit.targetDays.length > 0) {
        setSelectedDays(habit.targetDays);
      } else {
        const target = habit.targetDaysPerWeek || 7;
        if (target === 7) setSelectedDays([1, 2, 3, 4, 5, 6, 7]);
        else if (target === 5) setSelectedDays([1, 2, 3, 4, 5]);
        else if (target === 3) setSelectedDays([1, 3, 5]);
        else setSelectedDays(Array.from({ length: target }, (_, i) => i + 1));
      }

      if (habit.period) {
        setTimeOfDay(habit.period);
      }
      if (habit.priority) {
        setPriority(habit.priority);
      } else {
        setTimeOfDay("anytime");
      }
      setCue(habit.cue ?? "");
      setReward(habit.reward ?? "");
      setEmergencyVersion(habit.emergencyVersion ?? "");
      setType(habit.type ?? "simple");
      setUnit(habit.unit ?? "");
      setTargetValue(habit.targetValue ? String(habit.targetValue) : "");
      setColor(habit.color ?? "");

      setIsConfirmingDelete(false);
      setShowPausePicker(false);
      setSelectedHistoryDate(selectedDate || today);
    }
  }

  // All completed dates for this habit
  const completedLogDates = useMemo(() => {
    if (!habit) return [];
    const habitLogs = historyLogs[habit.id] || {};
    return Object.entries(habitLogs)
      .filter(([_, completed]) => completed)
      .map(([date]) => date)
      .sort((a, b) => b.localeCompare(a));
  }, [habit, historyLogs]);

  if (!isOpen || !habit) return null;

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || habit.name;
    onSave(habit.id, {
      name: finalName,
      icon,
      category: domain,
      frequency: "daily",
      targetDaysPerWeek: selectedDays.length,
      targetDays: selectedDays,
      period: timeOfDay === "anytime" ? undefined : timeOfDay,
      priority,
      cue: cue.trim() || undefined,
      reward: reward.trim() || undefined,
      emergencyVersion: emergencyVersion.trim() || undefined,
       type: type === "simple" ? undefined : type,
       unit: type === "counted" ? unit.trim() || undefined : undefined,
       targetValue: type === "counted" ? (targetValue ? parseInt(targetValue, 10) : undefined) : undefined,
       color: color.trim() || undefined,
     });
    onClose();
  };

  // B13 — the destructive-looking button is the SOFT path: letting go keeps the
  // habit and its whole history in the database, restorable from the archive.
  const handleDeleteClick = () => {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
    } else {
      onDelete(habit.id);
      onClose();
    }
  };

  const isPausedHere = pausedDaysLeft !== null && pausedDaysLeft > 0;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-surface-container-lowest/85 animate-in fade-in duration-200 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-surface-container rounded-t-[32px] sm:rounded-[32px] border border-outline/15 shadow-2xl p-5 space-y-4 animate-in slide-in-from-bottom-6 duration-300 cursor-default"
      >
        {/* Header Bar */}
        <div className="flex flex-col items-center">
          <div
            onClick={onClose}
            className="w-12 h-1.5 rounded-full bg-outline/20 hover:bg-outline/50 transition-colors mb-3 cursor-pointer"
            title="Click to dismiss"
          />
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="text-2xl">{habit.icon}</span>
              <div>
                <h2 className="text-lg font-bold tracking-tight text-on-surface truncate max-w-[220px]">
                  {habit.name}
                </h2>
                <p className="text-[11px] text-on-surface-variant font-mono" style={{ color: habitColor }}>
                  {habit.category || "Daily Habit"}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2-Segmented Tab Switcher */}
        <div className="grid grid-cols-2 p-1 bg-surface-container-low rounded-2xl border border-outline/10">
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "history"
                ? "bg-primary text-on-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Habit History</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("edit")}
            className={`py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === "edit"
                ? "bg-primary text-on-primary shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Edit Details</span>
          </button>
        </div>

        {/* TAB 1: HISTORY VIEW */}
        {activeTab === "history" && (
          <div className="space-y-4 animate-in fade-in duration-200">
            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-2xl bg-surface-container-low border border-outline/10 flex flex-col items-center justify-center text-center">
                <span className="text-amber-400 font-bold font-mono text-base flex items-center gap-1">
                  <Flame className="w-4 h-4" />
                  {daysDoneByHabit[habit.id] ?? 0}d
                </span>
                <span className="text-[10px] font-mono text-on-surface-variant uppercase mt-0.5">
                  Days Done
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-surface-container-low border border-outline/10 flex flex-col items-center justify-center text-center">
                <span className="font-bold font-mono text-base flex items-center gap-1" style={{ color: habitColor }}>
                  <Sparkles className="w-4 h-4" />
                  {habit.totalCompletions || 0}
                </span>
                <span className="text-[10px] font-mono text-on-surface-variant uppercase mt-0.5">
                  Completed
                </span>
              </div>
            </div>

            {/* 52-Week GitHub Continuous Heatmap */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-surface-container-low border border-outline/10 space-y-3">
              <HabitGitHubHeatmap
                habitId={habit.id}
                name={habit.name}
                targetDays={habit.targetDays}
                targetDaysPerWeek={habit.targetDaysPerWeek}
                category={habit.category}
                type={habit.type}
                targetValue={habit.targetValue}
                selectedDate={selectedHistoryDate}
                todayStr={today}
                showStats={true}
                onSelectDate={(dateStr) => {
                  setSelectedHistoryDate(dateStr);
                  if (onSelectDate) onSelectDate(dateStr);
                }}
              />
            </div>

            {/* Recent Completed Log List */}
            <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline/10 space-y-2.5">
              <span className="text-xs font-bold text-on-surface block">
                Completion Log ({completedLogDates.length} total)
              </span>

              {completedLogDates.length === 0 ? (
                <p className="text-xs text-on-surface-variant font-mono py-2">
                  No completions recorded yet. Complete today to bank your first day.
                </p>
              ) : (
                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                  {completedLogDates.slice(0, 15).map((dateStr) => {
                    const [y, m, d] = dateStr.split("-").map(Number);
                    const dObj = new Date(y, m - 1, d);
                    const formatted = dObj.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    });
                    const isToday = dateStr === today;
                    return (
                      <div
                        key={dateStr}
                        className="flex items-center justify-between p-2 rounded-xl bg-surface-container text-xs font-mono border border-outline/5"
                      >
                        <span className="flex items-center gap-1.5 text-on-surface">
                          <CheckCircle2 className="w-3.5 h-3.5" style={{ color: habitColor }} />
                          <span>{formatted}</span>
                          {isToday && (
                            <span
                              className="px-1.5 py-0.2 text-[9px] font-bold rounded-full"
                              style={{
                                backgroundColor: `${habitColor}25`,
                                color: habitColor,
                              }}
                            >
                              TODAY
                            </span>
                          )}
                        </span>
                        <span className="text-[10px] font-bold" style={{ color: habitColor }}>
                          +15 XP • +1 💎
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: EDIT HABIT VIEW */}
        {activeTab === "edit" && (
          <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-200">
            {/* Habit Name Input */}
            <div className="space-y-1.5">
              <FormLabel>Habit name</FormLabel>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                 placeholder={type === "avoid" ? "e.g. Quit Doom Scrolling" : "e.g. Read 20 pages"}
                className="w-full bg-surface-container-lowest text-on-surface placeholder:text-outline-variant rounded-2xl py-3.5 px-4 border border-outline/15 focus:border-primary focus:ring-1 focus:ring-primary shadow-sm text-sm font-semibold transition-all"
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

            {/* Advanced settings moved below */}

            {/* Emergency version */}
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
                {/* Same preset picker the create form uses (2026-10-25):
                    preset chips, or Custom's amount-left / unit-right pair.
                    This is what keeps the two pages consistent. */}
                <UnitPicker
                  unit={unit}
                  targetValue={targetValue}
                  onUnitChange={setUnit}
                  onTargetChange={setTargetValue}
                />

                {/* Emergency version - only for counted habits; the floor a day
                    must reach to still count as done (see compliance.ts). */}
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

            {/* Keystone designation (S19, now its own folded group). Owner
                decision 2026-10-23 stands: replacing an existing keystone asks
                first, and deliberately there is no "clear" — choosing another
                habit moves the pin, so it cannot be left empty by accident. */}
            {onSetKeystone && (
              <FormSection
                title="Keystone habit"
                hint={isKeystone ? "This is your keystone" : "The one habit that holds the rest up"}
                open={openKeystone}
                onToggle={() => setOpenKeystone((v) => !v)}
              >
                {isKeystone ? (
                  <p className="text-xs text-on-surface-variant">
                    <span className="px-3 py-1.5 rounded-full bg-primary/15 border border-primary/40 text-primary text-[11px] font-mono font-bold inline-block">
                      Keystone
                    </span>{" "}
                    Choosing another habit as keystone below moves the pin.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      keystoneHabitName ? setConfirmKeystone(true) : onSetKeystone(habit.id)
                    }
                    className="px-4 py-2 rounded-full bg-primary text-on-primary text-xs font-bold cursor-pointer active:scale-95 transition-transform"
                  >
                    Make keystone
                  </button>
                )}

                {confirmKeystone && !isKeystone && keystoneHabitName && (
                  <div
                    role="alert"
                    className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-2.5 space-y-2"
                  >
                    <p className="text-xs text-on-surface">
                      <span className="font-bold">{keystoneHabitName}</span> is your
                      keystone. Replace it with
                      <span className="font-bold"> {habit.name}</span>?
                    </p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onSetKeystone(habit.id);
                          setConfirmKeystone(false);
                        }}
                        className="flex-1 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold cursor-pointer active:scale-[0.98] transition-transform"
                      >
                        Replace keystone
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmKeystone(false)}
                        className="flex-1 py-2 rounded-lg bg-surface-container border border-outline/15 text-on-surface text-xs font-bold cursor-pointer"
                      >
                        Keep current
                      </button>
                    </div>
                  </div>
                )}
              </FormSection>
            )}

            {/* Motivation — optional, folded. */}
            <FormSection
              title="Motivation"
              hint={cue || reward ? (cue ? "Triggered · rewarded" : "Reward set") : "Trigger & reward, optional"}
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

            {/* Live preview — the row you are about to save, as edited. */}
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

            {/* B13 — pause controls. A pause is a dated window: nothing runs
                while the app is closed, the habit simply carries no
                expectations until the window is over. */}
            {(onPause || onResume) && (
              <div className="space-y-2">
                {isPausedHere ? (
                  <div className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-surface-container-low border border-outline/10">
                    <span className="flex items-center gap-1.5 text-xs font-bold text-on-surface-variant">
                      <PauseCircle className="w-4 h-4" />
                      On pause · {pausedDaysLeft} {pausedDaysLeft === 1 ? "day" : "days"} left
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onResume?.();
                        setShowPausePicker(false);
                      }}
                      className="h-8 px-3 rounded-lg bg-surface-container-high text-primary text-[11px] font-mono font-bold border border-outline/15 hover:bg-primary/10 active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Play className="w-3 h-3" />
                      Resume
                    </button>
                  </div>
                ) : onPause && (
                  <button
                    type="button"
                    onClick={() => setShowPausePicker((v) => !v)}
                    className="w-full py-3 px-4 rounded-2xl text-xs font-bold bg-surface-container-high/60 text-on-surface-variant hover:text-on-surface border border-outline/15 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <PauseCircle className="w-4 h-4" />
                    <span>Take a break (pause)</span>
                  </button>
                )}
                {onPause && showPausePicker && !isPausedHere && (
                  <PauseLengthPicker
                    onConfirm={(days) => {
                      onPause(days);
                      setShowPausePicker(false);
                    }}
                    onCancel={() => setShowPausePicker(false)}
                  />
                )}
              </div>
            )}

            {/* Action Buttons: Save and Delete */}
            <div className="pt-2 space-y-2">
              <button
                type="submit"
                className="w-full py-4 px-6 rounded-2xl bg-primary text-on-primary font-bold text-sm shadow-lg shadow-primary/25 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Save Changes</span>
              </button>

              <button
                type="button"
                onClick={handleDeleteClick}
                className={`w-full py-3 px-4 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isConfirmingDelete
                    ? "bg-error text-on-error border border-error shadow-md animate-pulse"
                    : "bg-surface-container-high/60 text-error/80 hover:text-error hover:bg-error/10 border border-error/20"
                }`}
              >
                {isConfirmingDelete ? (
                  <>
                    <AlertTriangle className="w-4 h-4" />
                    <span>Tap again to let go</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Let go of this habit</span>
                  </>
                )}
              </button>
              <p className="text-[10px] font-mono text-on-surface-variant/80 text-center">
                You can bring it back later from your profile. Its history is kept.
              </p>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
