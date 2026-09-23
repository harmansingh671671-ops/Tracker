"use client";

import { useState } from "react";
import { type Habit } from "@/lib/db";
import { X, Check, Sparkles, Flame } from "lucide-react";

interface CreateHabitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (habitData: {
    name: string;
    icon: string;
    category: string;
    frequency: number;
    targetDays: number[];
    timeOfDay?: "morning" | "afternoon" | "evening" | "anytime";
  }) => void;
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

const DOMAINS = [
  { id: "Mindful Focus", label: "Mindful Focus", color: "text-secondary border-secondary/30", bg: "bg-secondary-container text-on-secondary-container" },
  { id: "Vitality & Fitness", label: "Vitality & Fitness", color: "text-primary border-primary/30", bg: "bg-primary text-on-primary" },
  { id: "Renewal & Health", label: "Renewal & Health", color: "text-tertiary border-tertiary/30", bg: "bg-tertiary-container text-on-tertiary-container" },
  { id: "Craft & Skill", label: "Craft & Skill", color: "text-slate-300 border-slate-500/30", bg: "bg-surface-container-high text-on-surface" },
];

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CreateHabitModal({ isOpen, onClose, onSave }: CreateHabitModalProps) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("🧘");
  const [domain, setDomain] = useState("Vitality & Fitness");
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon..Fri by default
  const [timeOfDay, setTimeOfDay] = useState<"morning" | "afternoon" | "evening" | "anytime">("morning");

  if (!isOpen) return null;

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
    const finalName = name.trim() || "Daily Routine";
    onSave({
      name: finalName,
      icon,
      category: domain,
      frequency: selectedDays.length,
      targetDays: selectedDays,
      timeOfDay,
    });
    setName("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-surface-container-lowest/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-surface-container rounded-t-[32px] sm:rounded-[32px] border border-outline/15 shadow-2xl p-5 space-y-5 animate-in slide-in-from-bottom-6 duration-300">
        {/* Drag Handle */}
        <div className="flex flex-col items-center">
          <div className="w-12 h-1.5 rounded-full bg-outline/20 mb-3" />
          <div className="w-full flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-on-surface">New Habit</h2>
              <p className="text-xs text-on-surface-variant">Design a mindful daily routine</p>
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Habit Name Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-on-surface-variant font-medium">HABIT NAME</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Morning Cold Hydration & Mobility"
              className="w-full bg-surface-container-lowest text-on-surface placeholder:text-outline-variant rounded-2xl py-3.5 px-4 border border-outline/15 focus:border-primary focus:ring-1 focus:ring-primary shadow-sm text-sm font-semibold transition-all"
              autoFocus
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
                  onClick={() => setTimeOfDay(slot.id as any)}
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
            className="w-full py-4 px-6 rounded-2xl bg-primary text-on-primary font-bold text-sm shadow-lg shadow-primary/25 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4" />
            <span>Create Habit</span>
          </button>
        </form>
      </div>
    </div>
  );
}
