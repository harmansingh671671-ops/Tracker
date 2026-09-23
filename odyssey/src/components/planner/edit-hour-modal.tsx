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
      setSelectedHabitId(existingBlock.tag || "");
    } else {
      const s = initialHour;
      const e = (initialHour + 1) % 24 === 0 ? 24 : initialHour + 1;
      setStartH(s);
      setEndH(e);
      // By default keep task title empty - no preloaded placeholder text
      setTitle("");
      setCategory(s < 6 || s >= 23 ? "sleep" : s in [6, 7] ? "vitality" : s in [12, 13] ? "renewal" : "work");
      setSelectedHabitId("");
    }
  }, [existingBlock, initialHour, isOpen]);

  if (!isOpen) return null;

  const startTimeStr = `${String(startH).padStart(2, "0")}:00`;
  const endTimeStr = `${String(endH).padStart(2, "0")}:00`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalTitle = title.trim() || CATEGORIES.find((c) => c.id === category)?.label || "Focus";
    onSave({
      id: existingBlock?.id,
      title: finalTitle,
      category,
      startTime: startTimeStr,
      endTime: endTimeStr,
      date: initialDate,
      status: (existingBlock?.status as any) || "planned",
      habitId: selectedHabitId || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-surface-container-lowest/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-surface-container rounded-t-[28px] sm:rounded-[28px] border border-outline/15 shadow-2xl p-4 sm:p-5 space-y-3.5 animate-in slide-in-from-bottom-6 duration-300">
        {/* Header with Drag Handle & Close */}
        <div className="flex flex-col items-center">
          <div className="w-10 h-1 rounded-full bg-outline/20 mb-2 sm:hidden" />
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold tracking-tight text-on-surface">Plan Time Slot</h2>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-surface-container-lowest text-secondary text-xs font-mono font-semibold border border-outline/10">
                <Clock className="w-3 h-3" />
                <span>{startTimeStr} → {endTimeStr}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Task Title Field - Empty by default */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono text-on-surface-variant font-medium tracking-wide">TASK TITLE</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What will you conquer this hour?"
              className="w-full bg-surface-container-lowest text-on-surface placeholder:text-outline-variant/60 rounded-xl py-2.5 px-3.5 border border-outline/15 focus:border-primary focus:ring-1 focus:ring-primary shadow-sm text-sm font-medium transition-all"
              autoFocus
            />
          </div>

          {/* Category Selector Pills */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-mono text-on-surface-variant font-medium tracking-wide">CATEGORY</label>
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                const IconComp = cat.Icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer ${
                      isSelected
                        ? `${cat.activeBg} shadow-sm`
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

          {/* Linked Habit Attachment (Optional) */}
          {habits && habits.length > 0 && (
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-on-surface-variant font-medium tracking-wide">LINKED HABIT (OPTIONAL)</label>
              <select
                value={selectedHabitId}
                onChange={(e) => setSelectedHabitId(e.target.value)}
                className="w-full bg-surface-container-lowest text-on-surface rounded-xl py-2 px-3 border border-outline/15 text-xs font-mono focus:border-primary focus:outline-none cursor-pointer"
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
          <div className="flex items-center justify-between gap-2.5 pt-1">
            {existingBlock && onDelete ? (
              <button
                type="button"
                onClick={() => {
                  if (existingBlock.id) onDelete(existingBlock.id);
                  onClose();
                }}
                className="py-2.5 px-3.5 rounded-xl text-error hover:bg-error-container/20 text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete</span>
              </button>
            ) : null}

            <button
              type="submit"
              className="flex-1 py-2.5 px-5 rounded-xl bg-primary text-on-primary font-bold text-sm shadow-md shadow-primary/25 hover:opacity-95 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Save</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
