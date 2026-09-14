"use client";

import { useEffect, useState, useMemo } from "react";
import { useUserStore } from "@/lib/stores/user-store";
import { useScheduleStore } from "@/lib/stores/schedule-store";
import { type ScheduleBlock } from "@/lib/db";

export default function PlannerPage() {
  const { user, fetchUser, addXp } = useUserStore();
  const { blocks, fetchBlocksForDate, updateBlock, addBlock, autoFillSleep } = useScheduleStore();
  
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [autoFillLocked, setAutoFillLocked] = useState<boolean>(false);
  const [liveCompleted, setLiveCompleted] = useState<boolean>(false);
  const [liveProgress, setLiveProgress] = useState<number>(70);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  
  // New Block Form State
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState<'sleep' | 'work' | 'habits' | 'buffer'>('work');
  const [newStartTime, setNewStartTime] = useState("10:00");
  const [newEndTime, setNewEndTime] = useState("11:00");

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const formattedDate = useMemo(() => {
    const d = new Date();
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    }) + " • Balanced Flow";
  }, []);

  useEffect(() => {
    fetchUser().then((u) => {
      if (u) {
        fetchBlocksForDate(u.id, today);
      }
    });
  }, [fetchUser, fetchBlocksForDate, today]);

  // Compute category hours strictly from DB blocks (starts from 0)
  const { sleepHours, workHours, habitHours, bufferHours, totalHours } = useMemo(() => {
    let sleep = 0, work = 0, habit = 0, buffer = 0;
    
    blocks.forEach((b) => {
      const start = parseInt(b.startTime.split(':')[0], 10);
      const end = parseInt(b.endTime.split(':')[0], 10);
      const diff = end > start ? end - start : (start === 23 && end === 0 ? 1 : 1);
      
      const cat = b.category.toLowerCase();
      if (cat.includes('sleep')) sleep += diff;
      else if (cat.includes('work') || cat.includes('study')) work += diff;
      else if (cat.includes('habit') || cat.includes('health')) habit += diff;
      else buffer += diff;
    });

    const total = Math.min(24, sleep + work + habit + buffer);
    return {
      sleepHours: sleep,
      workHours: work,
      habitHours: habit,
      bufferHours: buffer,
      totalHours: total,
    };
  }, [blocks]);

  const percentage = Math.round((totalHours / 24) * 100);

  // Determine current active hour for Live block
  const currentHour = typeof window !== 'undefined' ? new Date().getHours() : 9;
  const liveBlock = useMemo(() => {
    return blocks.find((b) => {
      const start = parseInt(b.startTime.split(':')[0], 10);
      const end = parseInt(b.endTime.split(':')[0], 10);
      return currentHour >= start && currentHour < end && b.status !== 'completed';
    }) || null;
  }, [blocks, currentHour]);

  const filteredBlocks = useMemo(() => {
    if (activeFilter === "all") return blocks;
    return blocks.filter((b) => {
      const cat = b.category.toLowerCase();
      if (activeFilter === "sleep") return cat.includes("sleep");
      if (activeFilter === "work") return cat.includes("work") || cat.includes("study");
      if (activeFilter === "habits") return cat.includes("habit") || cat.includes("health");
      if (activeFilter === "buffer") return cat.includes("buffer") || cat.includes("leisure") || cat.includes("admin");
      return true;
    });
  }, [blocks, activeFilter]);

  const handleAutoFillSleep = async () => {
    if (!user) return;
    await autoFillSleep(user.id, today);
    setAutoFillLocked(true);
    setTimeout(() => setAutoFillLocked(false), 2500);
  };

  const handleCompleteLive = async (blockId: string) => {
    await updateBlock(blockId, { status: 'completed' });
    setLiveCompleted(true);
    addXp(50);
  };

  const handleExtendLive = () => {
    setLiveProgress((prev) => Math.min(100, prev + 15));
  };

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newTitle.trim()) return;

    await addBlock({
      userId: user.id,
      date: today,
      startTime: newStartTime,
      endTime: newEndTime,
      title: newTitle.trim(),
      description: newDesc.trim() || undefined,
      category: newCategory,
      tag: newCategory === 'work' ? 'Sprint' : newCategory === 'habits' ? 'Vitality' : 'Planned',
      status: 'pending',
      isCommitted: true,
    });

    setNewTitle("");
    setNewDesc("");
    setIsAddModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-surface">
      <div className="flex flex-col w-full px-margin pb-24 gap-space-md select-none">
        {/* Day Planner Header Block */}
        <div className="flex items-end justify-between pt-space-xs">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 text-primary">
              <span className="material-symbols-outlined text-[17px]">sync_alt</span>
              <span className="font-label-sm text-label-sm uppercase tracking-wider font-semibold">
                Today's Cadence
              </span>
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight mt-0.5">
              24-Hour Planner
            </h1>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              {formattedDate}
            </span>
          </div>

          {/* Auto-Fill Sleep Action */}
          <button
            onClick={handleAutoFillSleep}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-surface-container-high text-secondary hover:bg-surface-bright active:scale-95 transition-all shadow-sm"
          >
            {autoFillLocked ? (
              <>
                <span className="material-symbols-outlined text-[18px] text-primary">done_all</span>
                <span className="font-label-md text-label-md text-primary font-semibold">
                  Circadian Locked
                </span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">bedtime</span>
                <span className="font-label-md text-label-md font-semibold">Auto-fill Sleep</span>
              </>
            )}
          </button>
        </div>

        {/* Planned Hours Gauge & Category Matrix */}
        <div className="flex flex-col p-4 rounded-xl bg-surface-container-low shadow-sm gap-3 border border-outline/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className="material-symbols-outlined text-primary text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                auto_awesome
              </span>
              <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                Planned Hours
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-headline-sm text-headline-sm text-primary font-bold">
                {totalHours}
              </span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                / 24 hrs ({percentage}%)
              </span>
            </div>
          </div>

          {/* Multi-segmented Progress Track */}
          <div className="w-full h-2.5 rounded-full bg-surface-container-highest overflow-hidden flex gap-0.5 p-0.5">
            <div
              className="h-full bg-secondary rounded-full transition-all duration-500"
              style={{ width: `${(sleepHours / 24) * 100}%` }}
              title={`Sleep: ${sleepHours}h`}
            />
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${(workHours / 24) * 100}%` }}
              title={`Deep Work: ${workHours}h`}
            />
            <div
              className="h-full bg-tertiary-container rounded-full transition-all duration-500"
              style={{ width: `${(habitHours / 24) * 100}%` }}
              title={`Rituals: ${habitHours}h`}
            />
            <div
              className="h-full bg-surface-variant rounded-full transition-all duration-500"
              style={{ width: `${(bufferHours / 24) * 100}%` }}
              title={`Buffer: ${bufferHours}h`}
            />
          </div>

          {/* Metric Pill Matrix */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-container">
              <span className="w-2.5 h-2.5 rounded-full bg-secondary" />
              <span className="font-body-sm text-body-sm text-on-surface flex-1">Sleep</span>
              <span className="font-label-md text-label-md text-on-surface-variant font-semibold">
                {sleepHours.toFixed(1)}h
              </span>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-container">
              <span className="w-2.5 h-2.5 rounded-full bg-primary" />
              <span className="font-body-sm text-body-sm text-on-surface flex-1">Deep Work</span>
              <span className="font-label-md text-label-md text-on-surface-variant font-semibold">
                {workHours.toFixed(1)}h
              </span>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-container">
              <span className="w-2.5 h-2.5 rounded-full bg-tertiary-container" />
              <span className="font-body-sm text-body-sm text-on-surface flex-1">
                Habits &amp; Health
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant font-semibold">
                {habitHours.toFixed(1)}h
              </span>
            </div>
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-container">
              <span className="w-2.5 h-2.5 rounded-full bg-surface-variant" />
              <span className="font-body-sm text-body-sm text-on-surface flex-1">
                Buffer &amp; Rest
              </span>
              <span className="font-label-md text-label-md text-on-surface-variant font-semibold">
                {bufferHours.toFixed(1)}h
              </span>
            </div>
          </div>
        </div>

        {/* Filter Stream Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => setActiveFilter("all")}
            className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md font-semibold shrink-0 transition-transform active:scale-95 shadow-sm ${
              activeFilter === "all"
                ? "bg-primary text-on-primary"
                : "bg-surface-container-high text-on-surface-variant hover:bg-surface-bright"
            }`}
          >
            All 24 Hours
          </button>
          <button
            onClick={() => setActiveFilter("sleep")}
            className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md font-medium shrink-0 transition-all ${
              activeFilter === "sleep"
                ? "bg-secondary text-on-secondary font-semibold"
                : "bg-surface-container-high text-secondary hover:bg-surface-bright"
            }`}
          >
            Sleep ({sleepHours.toFixed(0)}h)
          </button>
          <button
            onClick={() => setActiveFilter("work")}
            className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md font-medium shrink-0 transition-all ${
              activeFilter === "work"
                ? "bg-primary text-on-primary font-semibold"
                : "bg-surface-container-high text-primary hover:bg-surface-bright"
            }`}
          >
            Deep Work ({workHours.toFixed(0)}h)
          </button>
          <button
            onClick={() => setActiveFilter("habits")}
            className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md font-medium shrink-0 transition-all ${
              activeFilter === "habits"
                ? "bg-tertiary-container text-on-tertiary font-semibold"
                : "bg-surface-container-high text-tertiary hover:bg-surface-bright"
            }`}
          >
            Habits &amp; Vitality
          </button>
          <button
            onClick={() => setActiveFilter("buffer")}
            className={`px-3.5 py-1.5 rounded-full font-label-md text-label-md font-medium shrink-0 transition-all ${
              activeFilter === "buffer"
                ? "bg-surface-variant text-on-surface font-semibold"
                : "bg-surface-container-high text-on-surface-variant hover:bg-surface-bright"
            }`}
          >
            Buffer &amp; Social
          </button>
        </div>

        {/* Continuous Timeline Section */}
        <div className="flex flex-col gap-space-sm relative">
          {filteredBlocks.length === 0 ? (
            <div className="p-8 rounded-2xl bg-surface-container-low border border-dashed border-outline/20 text-center flex flex-col items-center justify-center gap-3 my-2">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[24px]">schedule</span>
              </div>
              <div className="space-y-1">
                <h4 className="font-headline-sm text-[16px] font-bold text-on-surface">
                  Your 24-Hour Slate is Clean
                </h4>
                <p className="font-body-sm text-[13px] text-on-surface-variant max-w-xs mx-auto">
                  0 of 24 hours currently planned. Tap &ldquo;Auto-fill Sleep&rdquo; above to lock circadian recovery, or add your first hourly block below.
                </p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleAutoFillSleep}
                  className="px-4 py-2 rounded-xl bg-secondary-container text-on-secondary-container text-xs font-bold shadow-sm flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <span className="material-symbols-outlined text-[16px]">bedtime</span>
                  <span>Auto-fill Sleep (8h)</span>
                </button>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-primary text-on-primary text-xs font-bold shadow-sm flex items-center gap-1.5 active:scale-95 transition-transform"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>Add First Block</span>
                </button>
              </div>
            </div>
          ) : (
            filteredBlocks.map((block) => {
              const isLive = liveBlock?.id === block.id;
              const cat = block.category.toLowerCase();
              const isSleep = cat.includes("sleep");
              const isHabit = cat.includes("habit") || cat.includes("health");
              const isWork = cat.includes("work") || cat.includes("study");

            if (isLive) {
              return (
                <div
                  key={block.id}
                  className="timeline-block relative p-4 rounded-xl bg-surface-container-high transition-all duration-300 overflow-hidden shadow-lg border border-primary/40"
                >
                  <div className="absolute -right-8 -top-8 w-32 h-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2.5 w-2.5 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                      </span>
                      <span className="font-label-sm text-label-sm uppercase tracking-wider text-primary font-bold">
                        Live Now
                      </span>
                      <span className="font-label-md text-label-md text-on-surface-variant font-mono">
                        {block.startTime} – {block.endTime}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full bg-primary-container/20 text-primary font-label-sm text-label-sm font-semibold">
                      Deep Work
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 mb-2.5">
                    <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                      {block.title}
                    </h3>
                    {block.description && (
                      <p className="font-body-sm text-body-sm text-on-surface-variant">
                        {block.description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-1 mb-3">
                    <div className="flex justify-between font-label-sm text-label-sm">
                      <span className="text-on-surface font-medium">Session Elapsed</span>
                      <span className="text-primary font-mono font-semibold">
                        {Math.round((liveProgress / 100) * 60)}m / 60m ({liveProgress}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-surface-container-lowest overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${liveProgress}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCompleteLive(block.id)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg font-label-md text-label-md font-bold active:scale-95 transition-all ${
                        liveCompleted
                          ? "bg-surface-bright text-primary"
                          : "bg-primary text-on-primary"
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {liveCompleted ? "workspace_premium" : "check_circle"}
                      </span>
                      <span>{liveCompleted ? "Sprint Saved (+50 XP)" : "Complete Block"}</span>
                    </button>
                    <button
                      onClick={handleExtendLive}
                      className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-surface-container text-on-surface hover:bg-surface-bright active:scale-95 transition-all font-label-md text-label-md font-semibold"
                    >
                      <span className="material-symbols-outlined text-[16px]">more_time</span>
                      <span>+15m</span>
                    </button>
                  </div>
                </div>
              );
            }

            // Normal timeline block
            let badgeBg = "bg-surface-variant text-on-surface-variant";
            let badgeText = "Buffer Slot";
            let iconName = "spa";
            let iconColor = "text-secondary";

            if (isSleep) {
              badgeBg = "bg-secondary-container/30 text-secondary";
              badgeText = "Sleep & Rest";
              iconName = block.startTime.startsWith("06") ? "verified" : "bedtime";
              iconColor = block.startTime.startsWith("06") ? "text-primary" : "text-secondary";
            } else if (isHabit) {
              badgeBg = "bg-tertiary-container/20 text-tertiary";
              badgeText = block.tag?.includes("streak") ? "Habit Ritual" : "Vitality";
              iconName = block.title.includes("Strength")
                ? "fitness_center"
                : block.title.includes("Reading")
                ? "auto_stories"
                : "wb_sunny";
              iconColor = "text-tertiary";
            } else if (isWork) {
              badgeBg = "bg-primary/10 text-primary";
              badgeText = block.title.includes("Sync") || block.title.includes("Review") ? "Collaboration" : "Deep Work";
              iconName = block.title.includes("Sync")
                ? "groups"
                : block.title.includes("Review")
                ? "rate_review"
                : "psychology";
              iconColor = "text-primary";
            }

            return (
              <div
                key={block.id}
                className="timeline-block p-3 rounded-xl bg-surface-container-low border border-outline/10 hover:border-primary/30 transition-all duration-300"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-label-md text-label-md text-on-surface-variant font-mono">
                      {block.startTime} – {block.endTime}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-label-sm text-label-sm font-semibold ${badgeBg}`}
                    >
                      {badgeText}
                    </span>
                  </div>
                  <span className={`material-symbols-outlined text-[18px] ${iconColor}`}>
                    {iconName}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-body-md text-body-md text-on-surface font-medium">
                      {block.title}
                    </span>
                    {block.description && (
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        {block.description}
                      </span>
                    )}
                  </div>
                  {block.tag && (
                    <span className="font-label-sm text-label-sm text-primary font-mono shrink-0 ml-2">
                      {block.tag}
                    </span>
                  )}
                </div>
              </div>
            );
          }))}
        </div>

        {/* Floating Add Hourly Block Button */}
        <div className="fixed bottom-24 left-0 right-0 px-margin flex justify-center z-40 pointer-events-none">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="pointer-events-auto flex items-center gap-2 px-5 py-3 rounded-full bg-primary text-on-primary shadow-xl shadow-primary/20 active:scale-95 transition-all hover:bg-primary-fixed"
          >
            <span className="material-symbols-outlined text-[20px] font-bold">add</span>
            <span className="font-label-lg text-label-lg font-bold tracking-tight">
              Add Hourly Block
            </span>
          </button>
        </div>
      </div>

      {/* Add Block Modal */}
      {isAddModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-surface-container p-6 shadow-2xl border border-outline/20 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="font-headline-sm text-headline-sm text-on-surface font-bold">
                Add Hourly Block
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 rounded-full bg-surface-bright flex items-center justify-center text-on-surface-variant hover:text-on-surface"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBlock} className="space-y-3">
              <div>
                <label className="font-label-sm text-[11px] text-on-surface-variant uppercase font-semibold block mb-1">
                  Block Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deep Work Sprint or Gym"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline/20 text-on-surface text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="font-label-sm text-[11px] text-on-surface-variant uppercase font-semibold block mb-1">
                  Description / Focus Tag
                </label>
                <input
                  type="text"
                  placeholder="e.g. PR review, 20m cardio, etc."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline/20 text-on-surface text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-label-sm text-[11px] text-on-surface-variant uppercase font-semibold block mb-1">
                    Start Time
                  </label>
                  <input
                    type="time"
                    value={newStartTime}
                    onChange={(e) => setNewStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline/20 text-on-surface text-sm focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-[11px] text-on-surface-variant uppercase font-semibold block mb-1">
                    End Time
                  </label>
                  <input
                    type="time"
                    value={newEndTime}
                    onChange={(e) => setNewEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline/20 text-on-surface text-sm focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="font-label-sm text-[11px] text-on-surface-variant uppercase font-semibold block mb-1">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low border border-outline/20 text-on-surface text-sm focus:outline-none focus:border-primary"
                >
                  <option value="work">Deep Work / Focus</option>
                  <option value="habits">Habits &amp; Vitality</option>
                  <option value="buffer">Buffer &amp; Social</option>
                  <option value="sleep">Sleep &amp; Rest</option>
                </select>
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-primary text-on-primary font-label-lg font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all mt-2"
              >
                Schedule Block
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
