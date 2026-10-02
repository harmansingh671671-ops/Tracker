"use client";

import React, { useState, useEffect, useCallback } from "react";
import { db, type InboxItem } from "@/lib/db";
import { useUserStore } from "@/lib/stores/user-store";
import {
  Inbox,
  Plus,
  Clock,
  Calendar,
  Sparkles,
  Trash2,
  CheckCircle2,
  ArrowRight,
  Flame,
  X,
  Layers,
  ChevronRight,
  Tag,
  AlertCircle,
} from "lucide-react";

interface InboxDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onScheduleItem: (item: InboxItem) => void;
  selectedDate: string;
}

const TIME_HORIZONS = [
  { id: "today", label: "Today", color: "text-primary border-primary/30 bg-primary/10" },
  { id: "this_week", label: "This Week", color: "text-sky-400 border-sky-500/30 bg-sky-500/10" },
  { id: "someday", label: "Someday / Backlog", color: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
] as const;

const DURATIONS = [15, 30, 45, 60, 90, 120];

export function InboxDrawer({
  isOpen,
  onClose,
  onScheduleItem,
  selectedDate,
}: InboxDrawerProps) {
  const { user } = useUserStore();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [title, setTitle] = useState("");
  const [timeHorizon, setTimeHorizon] = useState<"today" | "this_week" | "someday">("today");
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(30);
  const [priority, setPriority] = useState<"urgent" | "high" | "normal" | "low">("normal");
  const [activeTab, setActiveTab] = useState<"today" | "this_week" | "someday">("today");
  const [isAdding, setIsAdding] = useState(false);

  const loadItems = useCallback(async () => {
    try {
      const all = await db.inboxItems.toArray();
      setItems(all.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || "")));
    } catch (err) {
      console.error("Failed to load inbox items:", err);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadItems();
    }
  }, [isOpen, loadItems]);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const newItem: InboxItem = {
      id: crypto.randomUUID(),
      userId: user?.id || "default",
      title: title.trim(),
      timeHorizon,
      estimatedMinutes,
      priority,
      createdAt: new Date().toISOString(),
    };

    await db.inboxItems.add(newItem);
    setTitle("");
    setIsAdding(false);
    await loadItems();
  };

  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await db.inboxItems.delete(id);
    await loadItems();
  };

  if (!isOpen) return null;

  const filteredItems = items.filter((i) => i.timeHorizon === activeTab);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Frosted Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      />

      {/* Drawer Card */}
      <div className="relative w-full max-w-lg bg-surface-container-low/95 border border-outline/[0.12] rounded-t-[32px] sm:rounded-3xl p-5 sm:p-6 shadow-2xl backdrop-blur-2xl space-y-4 max-h-[85vh] flex flex-col z-10 animate-in slide-in-from-bottom-6 duration-250">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-outline/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
              <Inbox className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-on-surface">Unstructured Inbox</h3>
              <p className="text-[11px] font-mono text-on-surface-variant">
                Dump tasks freely • Schedule onto timeline when ready
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-container-high hover:bg-surface-container-highest flex items-center justify-center text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Add Form */}
        <form onSubmit={handleAddItem} className="space-y-3 p-3 rounded-2xl bg-surface-container border border-outline/[0.08]">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's on your mind? (e.g. Call accountant, Review PR)"
              className="flex-1 bg-surface-container-low px-3.5 py-2.5 rounded-xl border border-outline/[0.12] text-xs font-medium text-on-surface placeholder:text-on-surface-variant/40 focus:outline-none focus:border-primary transition-colors"
              autoFocus
            />
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-40 text-on-primary text-xs font-mono font-bold transition-all active:scale-95 cursor-pointer shrink-0 flex items-center gap-1 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Capture</span>
            </button>
          </div>

          {/* Horizon & Duration Pickers */}
          <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
            {/* Time Horizon Selector */}
            <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-xl border border-outline/[0.08]">
              {TIME_HORIZONS.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setTimeHorizon(h.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold transition-all cursor-pointer ${
                    timeHorizon === h.id
                      ? "bg-primary text-on-primary font-bold shadow-xs"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {h.label}
                </button>
              ))}
            </div>

            {/* Estimated Duration */}
            <div className="flex items-center gap-1 bg-surface-container-low px-2 py-1 rounded-xl border border-outline/[0.08]">
              <Clock className="w-3 h-3 text-on-surface-variant" />
              <select
                value={estimatedMinutes}
                onChange={(e) => setEstimatedMinutes(Number(e.target.value))}
                className="bg-transparent text-[11px] font-mono font-bold text-on-surface focus:outline-none cursor-pointer"
              >
                {DURATIONS.map((m) => (
                  <option key={m} value={m} className="bg-surface-container text-on-surface">
                    {m < 60 ? `${m}m` : `${m / 60}h`}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </form>

        {/* Time Horizon Filter Tabs */}
        <div className="flex items-center gap-1 bg-surface-container-high/60 p-1 rounded-2xl border border-outline/[0.08]">
          {TIME_HORIZONS.map((h) => {
            const count = items.filter((i) => i.timeHorizon === h.id).length;
            const isActive = activeTab === h.id;
            return (
              <button
                key={h.id}
                type="button"
                onClick={() => setActiveTab(h.id)}
                className={`flex-1 py-1.5 px-2 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  isActive
                    ? "bg-surface-container-lowest text-primary shadow-xs border border-primary/20"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span>{h.label}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-surface-container font-mono">
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Items List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px] max-h-[340px]">
          {filteredItems.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <div className="w-10 h-10 rounded-2xl bg-surface-container mx-auto flex items-center justify-center text-on-surface-variant/40">
                <Inbox className="w-5 h-5" />
              </div>
              <p className="text-xs font-mono text-on-surface-variant/60">
                No items in {TIME_HORIZONS.find((h) => h.id === activeTab)?.label}
              </p>
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                className="group p-3 rounded-2xl bg-surface-container hover:bg-surface-container-high border border-outline/[0.08] flex items-center justify-between gap-3 transition-all"
              >
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-on-surface truncate">{item.title}</h4>
                  <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-on-surface-variant">
                    <span className="flex items-center gap-1 text-primary">
                      <Clock className="w-3 h-3" />
                      <span>{item.estimatedMinutes ? `${item.estimatedMinutes}m` : "30m"}</span>
                    </span>
                    <span>•</span>
                    <span className="text-on-surface-variant/70">
                      Added {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      onScheduleItem(item);
                      onClose();
                    }}
                    className="py-1.5 px-3 rounded-xl bg-primary hover:bg-primary/90 text-on-primary text-xs font-mono font-bold flex items-center gap-1 transition-all active:scale-95 shadow-xs cursor-pointer"
                    title="Place onto Today's schedule"
                  >
                    <span>Schedule</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteItem(item.id, e)}
                    className="w-7 h-7 rounded-xl text-on-surface-variant/40 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition-colors cursor-pointer"
                    title="Delete item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
