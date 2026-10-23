"use client";

import { useState, useMemo } from "react";
import { type HabitCategory, type Habit, type HabitType } from "@/lib/db";
import { useHabitStore } from "@/lib/stores/habit-store";
import { useUserStore } from "@/lib/stores/user-store";
import { getHabitColor, getLocalTodayStr } from "@/lib/utils/habit-colors";
import { HabitGitHubHeatmap } from "@/components/habits/habit-github-heatmap";
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
} from "lucide-react";

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
}

const EMOJIS = [
  { emoji: "🧘", label: "Meditate" },
  { emoji: "💧", label: "Hydration" },
  { emoji: "🏋️", label: "Workout" },
  { emoji: "📖", label: "Reading" },
  { emoji: "💻", label: "Coding" },
  { emoji: "✍️", label: "Journaling" },
  { emoji: "🎸", label: "Music" },
  { emoji: "🏃", label: "Running" },
  { emoji: "☀️", label: "Morning" },
  { emoji: "🌙", label: "Sleep" },
  { emoji: "🚶", label: "Walking" },
  { emoji: "🍎", label: "Nutrition" },
  { emoji: "⚡", label: "Vitality" },
  { emoji: "🌿", label: "Nature" },
  { emoji: "🎯", label: "Focus" },
  { emoji: "☕", label: "Recharge" },
  { emoji: "🧠", label: "Study" },
  { emoji: "🔥", label: "Discipline" },
  { emoji: "🎨", label: "Art" },
  { emoji: "🧹", label: "Organize" },
];

const DOMAINS: { id: HabitCategory; label: string; color: string; bg: string }[] = [
  { id: "Mindful Focus", label: "Mindful Focus", color: "text-secondary border-secondary/30", bg: "bg-secondary-container text-on-secondary-container" },
  { id: "Vitality & Fitness", label: "Vitality & Fitness", color: "text-primary border-primary/30", bg: "bg-primary text-on-primary" },
  { id: "Renewal & Health", label: "Renewal & Health", color: "text-tertiary border-tertiary/30", bg: "bg-tertiary-container text-on-tertiary-container" },
  { id: "Craft & Skill", label: "Craft & Skill", color: "text-slate-300 border-slate-500/30", bg: "bg-surface-container-high text-on-surface" },
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

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
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

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

  const handleDeleteClick = () => {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
    } else {
      onDelete(habit.id);
      onClose();
    }
  };

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

        {/* S19 — keystone designation. Above the tabs, so it is reachable from
            the default History tab, not buried in Edit Details. There is
            deliberately no "clear": choosing another habit moves the pin, so it
            cannot be left empty by accident. Hidden when the surface does not
            offer the action. */}
        {onSetKeystone && (
          <div className="rounded-2xl border border-outline/10 bg-surface-container-low px-4 py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-on-surface">Keystone habit</p>
              <p className="text-[11px] font-mono text-on-surface-variant">
                The one habit that holds the rest up
              </p>
            </div>
            {isKeystone ? (
              <span className="px-3 py-1.5 rounded-full bg-primary/15 border border-primary/40 text-primary text-[11px] font-mono font-bold shrink-0">
                Keystone
              </span>
            ) : (
              <button
                type="button"
                onClick={() => onSetKeystone(habit.id)}
                className="px-3 py-1.5 rounded-full bg-primary text-on-primary text-[11px] font-bold shrink-0 cursor-pointer active:scale-95 transition-transform"
              >
                Make keystone
              </button>
            )}
          </div>
        )}

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
              <label className="text-xs font-mono text-on-surface-variant font-medium">HABIT NAME</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                 placeholder={type === "avoid" ? "e.g. Quit Doom Scrolling" : "e.g. Morning Cold Hydration & Mobility"}
                className="w-full bg-surface-container-lowest text-on-surface placeholder:text-outline-variant rounded-2xl py-3.5 px-4 border border-outline/15 focus:border-primary focus:ring-1 focus:ring-primary shadow-sm text-sm font-semibold transition-all"
              />
            </div>

            {/* Emoji & Icon Grid */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-on-surface-variant font-medium">SELECT AN ICON</label>
              <div className="grid grid-cols-5 gap-2 p-2 bg-surface-container-low rounded-2xl border border-outline/10">
                {EMOJIS.map((item) => (
                  <button
                    key={item.emoji}
                    type="button"
                    onClick={() => setIcon(item.emoji)}
                    className={`h-12 flex items-center justify-center rounded-xl text-xl transition-all active:scale-90 ${
                      icon === item.emoji
                        ? "bg-primary/20 border border-primary/50 shadow-md scale-105"
                        : "bg-surface-container hover:bg-surface-bright"
                    }`}
                    title={item.label}
                  >
                    <span>{item.emoji}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Domain Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-on-surface-variant font-medium">LIFE DOMAIN</label>
              <div className="grid grid-cols-2 gap-2">
                {DOMAINS.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setDomain(d.id)}
                    className={`py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 ${
                      domain === d.id
                        ? `${d.bg} shadow-md`
                        : "bg-surface-container hover:bg-surface-bright text-on-surface border border-outline/10"
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-current" />
                    <span className="truncate">{d.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Frequency & Target Weekdays */}
            <div className="p-3.5 rounded-2xl bg-surface-container-low border border-outline/10 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-on-surface">Target Schedule</span>
                <span className="font-mono text-primary font-bold">{selectedDays.length} days / week</span>
              </div>

              {/* Presets */}
              <div className="flex gap-1.5 p-1 bg-surface-container rounded-xl">
                <button
                  type="button"
                  onClick={() => applyPreset("everyday")}
                  className={`flex-1 py-1 text-center rounded-lg text-xs font-medium transition-colors ${
                    selectedDays.length === 7 ? "bg-surface-container-high text-primary font-bold" : "text-on-surface-variant"
                  }`}
                >
                  Everyday
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("weekdays")}
                  className={`flex-1 py-1 text-center rounded-lg text-xs font-medium transition-colors ${
                    selectedDays.length === 5 && !selectedDays.includes(6) ? "bg-surface-container-high text-primary font-bold" : "text-on-surface-variant"
                  }`}
                >
                  Weekdays
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("3x")}
                  className={`flex-1 py-1 text-center rounded-lg text-xs font-medium transition-colors ${
                    selectedDays.length === 3 ? "bg-surface-container-high text-primary font-bold" : "text-on-surface-variant"
                  }`}
                >
                  3x Week
                </button>
              </div>

              {/* Weekday Chips */}
              <div className="flex justify-between items-center pt-1">
                {WEEKDAYS.map((dName, idx) => {
                  const dayNum = idx + 1;
                  const isSelected = selectedDays.includes(dayNum);
                  return (
                    <button
                      key={dName}
                      type="button"
                      onClick={() => toggleDay(dayNum)}
                      className={`w-9 h-9 rounded-full text-xs font-mono font-bold flex items-center justify-center transition-transform active:scale-90 ${
                        isSelected
                          ? "bg-primary text-on-primary shadow-sm shadow-primary/30"
                          : "bg-surface-container text-on-surface-variant hover:bg-surface-container-high"
                      }`}
                    >
                      {dName[0]}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Anchor */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-on-surface-variant font-medium">TIME ANCHOR</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "morning", label: "Morning", sub: "06:00 - 12:00" },
                  { id: "afternoon", label: "Afternoon", sub: "12:00 - 18:00" },
                  { id: "evening", label: "Evening", sub: "18:00 - 23:00" },
                  { id: "anytime", label: "Anytime", sub: "Flexible flow" },
                ].map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    onClick={() => setTimeOfDay(slot.id as "morning" | "afternoon" | "evening" | "anytime")}
                    className={`p-3 rounded-xl text-left flex flex-col gap-0.5 transition-all ${
                      timeOfDay === slot.id
                        ? "bg-primary/15 border border-primary/40 shadow-sm"
                        : "bg-surface-container text-on-surface-variant border border-outline/10 opacity-70"
                    }`}
                  >
                    <span className={`text-xs font-semibold ${timeOfDay === slot.id ? "text-primary" : "text-on-surface"}`}>
                      {slot.label}
                    </span>
                    <span className="text-[10px] font-mono">{slot.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced settings moved below */}

            {/* Emergency version */}
            {type !== "avoid" && (
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-on-surface-variant font-medium">HABIT TYPE</label>
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
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-on-surface-variant font-medium">UNIT</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="pages, cups, reps..."
                    className="w-full rounded-xl bg-surface-container border border-outline/10 px-3 py-2 text-sm text-on-surface"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-on-surface-variant font-medium">DAILY TARGET</label>
                  <input
                    type="number"
                    min="1"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                    placeholder="20"
                    className="w-full rounded-xl bg-surface-container border border-outline/10 px-3 py-2 text-sm text-on-surface"
                  />
                </div>

                {/* Emergency version - only for counted habits; the floor a day
                    must reach to still count as done (see compliance.ts). */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-on-surface-variant font-medium">EMERGENCY MINIMUM</label>
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

            {/* Advanced settings */}
            <div className="rounded-2xl border border-outline/10 bg-surface-container-low overflow-hidden">
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-on-surface cursor-pointer"
              >
                <span>Advanced settings</span>
                <span className="text-on-surface-variant text-xs">{showAdvanced ? "Hide" : "Show"}</span>
              </button>
              {showAdvanced && (
                <div className="px-4 pb-4 space-y-3">
                  {/* Priority */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-on-surface-variant font-medium">PRIORITY</label>
                    <div className="flex gap-2">
                      {[
                        { id: "critical", label: "Critical", emoji: "🔴" },
                        { id: "focus", label: "Focus", emoji: "🟡" },
                        { id: "optional", label: "Optional", emoji: "🟢" },
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPriority(p.id as "critical" | "focus" | "optional")}
                          className={`flex-1 p-2 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                            priority === p.id
                              ? "bg-primary/15 border-primary/40 text-primary"
                              : "bg-surface-container border-outline/10 text-on-surface-variant opacity-70"
                          }`}
                        >
                          <span className="mr-1">{p.emoji}</span>
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cue / trigger */}
                  {type !== "avoid" && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-on-surface-variant font-medium">CUE / TRIGGER</label>
                    <input
                      type="text"
                      value={cue}
                      onChange={(e) => setCue(e.target.value)}
                      placeholder="After I pour my morning coffee"
                      className="w-full rounded-xl bg-surface-container border border-outline/10 px-3 py-2 text-sm text-on-surface"
                    />
                  </div>
                  )}

                  {/* Reward */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-on-surface-variant font-medium">REWARD</label>
                    <input
                      type="text"
                      value={reward}
                      onChange={(e) => setReward(e.target.value)}
                      placeholder="5 minutes of music"
                      className="w-full rounded-xl bg-surface-container border border-outline/10 px-3 py-2 text-sm text-on-surface"
                    />
                  </div>

                  {/* Color */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono text-on-surface-variant font-medium">COLOR</label>
                    <div className="flex flex-wrap gap-2">
                      {["#10B981", "#2563EB", "#8B5CF6", "#F59E0B", "#06B6D4", "#EC4899", "#9333EA", "#EF4444", "#84CC16", "#F97316"].map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setColor(color === c ? "" : c)}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${color === c ? "border-on-surface scale-110" : "border-transparent"}`}
                          style={{ backgroundColor: c }}
                          title={c}
                        />
                      ))}
                      <button
                        type="button"
                        onClick={() => setColor("")}
                        className={`px-3 py-1 rounded-full text-xs border ${color === "" ? "bg-primary/15 border-primary/40 text-primary" : "bg-surface-container border-outline/10 text-on-surface-variant"}`}
                      >
                        Auto
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

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
                    <span>Tap Again to Confirm Delete</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Habit</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
