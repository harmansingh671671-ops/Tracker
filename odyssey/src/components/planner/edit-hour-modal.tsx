"use client";

import { useState, useEffect } from "react";
import { type ScheduleBlock } from "@/lib/db";
import { useHabitStore } from "@/lib/stores/habit-store";
import { resolveHabitIconString } from "@/components/habits/habit-icon";
import {
  X,
  Check,
  Trash2,
  Clock,
  Brain,
  Heart,
  MessageSquare,
  Coffee,
  Moon,
  Sparkles,
} from "lucide-react";

interface EditHourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (blockData: {
    id?: string;
    title: string;
    category: string;
    startTime: string;
    endTime: string;
    date: string;
    status?: "planned" | "completed" | "skipped";
    habitId?: string;
  }) => void;
  onDelete?: (id: string) => void;
  initialHour?: number;
  initialDate: string;
  existingBlock?: ScheduleBlock | null;
}

const CATEGORIES = [
  { id: "work", label: "Deep Focus", Icon: Brain, activeBg: "bg-primary text-on-primary", pillColor: "text-primary border-primary/30" },
  { id: "vitality", label: "Vitality", Icon: Heart, activeBg: "bg-emerald-500 text-white", pillColor: "text-emerald-400 border-emerald-500/30" },
  { id: "sync", label: "Sync & Connect", Icon: MessageSquare, activeBg: "bg-sky-500 text-white", pillColor: "text-sky-400 border-sky-500/30" },
  { id: "renewal", label: "Renewal", Icon: Coffee, activeBg: "bg-amber-500 text-on-primary", pillColor: "text-amber-400 border-amber-500/30" },
  { id: "sleep", label: "Obsidian Rest", Icon: Moon, activeBg: "bg-indigo-500 text-white", pillColor: "text-indigo-400 border-indigo-500/30" },
];

export function EditHourModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialHour = 9,
  initialDate,
  existingBlock,
}: EditHourModalProps) {
  const { habits } = useHabitStore();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("work");
  const [startH, setStartH] = useState(initialHour);
  const [endH, setEndH] = useState((initialHour + 1) % 24 === 0 ? 24 : initialHour + 1);
  const [status, setStatus] = useState<"planned" | "completed" | "skipped">("planned");
  const [selectedHabitId, setSelectedHabitId] = useState<string>("");

  useEffect(() => {
    if (existingBlock) {
      setTitle(existingBlock.title || "");
      setCategory(existingBlock.category || "work");
      const s = parseInt(existingBlock.startTime.split(":")[0], 10) || initialHour;
      let e = parseInt(existingBlock.endTime.split(":")[0], 10) || (s + 1);
      if (existingBlock.endTime === "24:00" || (e === 0 && s > 0)) e = 24;
      setStartH(s);
      setEndH(e);
      setStatus(existingBlock.status as any || "planned");
      setSelectedHabitId(existingBlock.tag || "");
    } else {
      const s = initialHour;
      const e = (initialHour + 1) % 24 === 0 ? 24 : initialHour + 1;
      setStartH(s);
      setEndH(e);
      setTitle(
        s < 6 || s >= 23
          ? "Obsidian Rest & Slumber"
          : s in [6, 7]
          ? "Morning Priming & Vitality"
          : s in [12, 13]
          ? "Mindful Recovery & Lunch"
          : s in [17, 18]
          ? "Active Sync & Movement"
          : ""
      );
      setCategory(s < 6 || s >= 23 ? "sleep" : s in [6, 7] ? "vitality" : s in [12, 13] ? "renewal" : "work");
      setStatus("planned");
      setSelectedHabitId("");
    }
  }, [existingBlock, initialHour, isOpen]);

  if (!isOpen) return null;

  const startTimeStr = `${String(startH).padStart(2, "0")}:00`;
  const endTimeStr = `${String(endH).padStart(2, "0")}:00`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim() || (category === "sleep" ? "Circadian Slumber" : "Focus Hour");
    onSave({
      id: existingBlock?.id,
      title: finalTitle,
      category,
      startTime: startTimeStr,
      endTime: endTimeStr,
      date: initialDate,
      status,
      habitId: selectedHabitId || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-surface-container-lowest/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto bg-surface-container rounded-t-[32px] sm:rounded-[32px] border border-outline/15 shadow-2xl p-5 space-y-5 animate-in slide-in-from-bottom-6 duration-300">
        {/* Drag Handle */}
        <div className="flex flex-col items-center">
          <div className="w-12 h-1.5 rounded-full bg-outline/20 mb-3" />
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-bold tracking-tight text-on-surface">Plan Time Slot</h2>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-lowest text-secondary text-xs font-mono font-semibold border border-outline/10">
                <Clock className="w-3.5 h-3.5" />
                <span>{startTimeStr} → {endTimeStr}</span>
              </div>
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
          {/* Task Title Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-on-surface-variant font-medium">TASK TITLE</label>
            <div className="relative flex items-center">
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What will you conquer this hour?"
                className="w-full bg-surface-container-lowest text-on-surface placeholder:text-outline-variant rounded-2xl py-3.5 pl-4 pr-4 border border-outline/15 focus:border-primary focus:ring-1 focus:ring-primary shadow-sm text-sm font-medium transition-all"
                autoFocus
              />
            </div>
          </div>

          {/* Category Selector Pills */}
          <div className="space-y-2">
            <label className="text-xs font-mono text-on-surface-variant font-medium">CATEGORY</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                const IconComp = cat.Icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`px-3.5 py-2 rounded-full text-xs font-semibold flex items-center gap-2 transition-all active:scale-95 ${
                      isSelected
                        ? `${cat.activeBg} shadow-md`
                        : "bg-surface-container-high hover:bg-surface-bright text-on-surface border border-outline/10"
                    }`}
                  >
                    <IconComp className="w-3.5 h-3.5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status Toggle Bar */}
          <div className="space-y-1.5">
            <label className="text-xs font-mono text-on-surface-variant font-medium">STATUS</label>
            <div className="grid grid-cols-3 gap-2 p-1 bg-surface-container-lowest rounded-2xl border border-outline/10">
              <button
                type="button"
                onClick={() => setStatus("planned")}
                className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all ${
                  status === "planned"
                    ? "bg-surface-container text-on-surface shadow-sm font-bold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Upcoming
              </button>
              <button
                type="button"
                onClick={() => setStatus("completed")}
                className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all ${
                  status === "completed"
                    ? "bg-emerald-500/20 text-emerald-300 font-bold shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Completed ✓
              </button>
              <button
                type="button"
                onClick={() => setStatus("skipped")}
                className={`py-2 px-2 rounded-xl text-xs font-semibold transition-all ${
                  status === "skipped"
                    ? "bg-red-500/20 text-red-300 font-bold shadow-sm"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Missed
              </button>
            </div>
          </div>

          {/* Linked Habit Attachment (Optional) */}
          {habits && habits.length > 0 && (
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-on-surface-variant font-medium">LINKED HABIT (OPTIONAL)</label>
              <select
                value={selectedHabitId}
                onChange={(e) => setSelectedHabitId(e.target.value)}
                className="w-full bg-surface-container-lowest text-on-surface rounded-2xl py-3 px-3.5 border border-outline/15 text-xs font-mono focus:border-primary focus:outline-none"
              >
                <option value="">None (Independent Task)</option>
                {habits.map((h) => {
                  const iconValue = resolveHabitIconString(h.icon, h.name).value;
                  return (
                    <option key={h.id} value={h.id}>
                      {iconValue} {h.name} ({h.category || "Habit"})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* Footer Actions: Delete & Save */}
          <div className="flex items-center justify-between gap-3 pt-3">
            {existingBlock && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (existingBlock.id) onDelete(existingBlock.id);
                  onClose();
                }}
                className="py-3 px-4 rounded-2xl text-error hover:bg-error-container/20 text-xs font-bold transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            ) : (
              <div />
            )}

            <button
              type="submit"
              className="flex-1 py-3.5 px-6 rounded-2xl bg-primary text-on-primary font-bold text-sm shadow-lg shadow-primary/25 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              <span>Save Hour Block</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
