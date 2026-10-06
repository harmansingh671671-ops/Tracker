"use client";

import React, { useState, useMemo } from "react";
import {
  Search,
  Sparkles,
  Plus,
  Check,
  ArrowRight,
} from "lucide-react";

export interface HabitTemplate {
  id: string;
  name: string;
  icon: string;
  category: "Health" | "Mindfulness" | "Learning" | "Productivity" | "Social" | "growth" | "work";
  domainLabel: string;
  period: "morning" | "afternoon" | "evening" | "anytime";
  targetDaysPerWeek: number;
  targetDays: number[];
  description: string;
  scienceNote: string;
  packId: "morning" | "deep_work" | "sleep" | "vitality" | "mindfulness" | "detox";
  packTitle: string;
}

export const HABIT_TEMPLATES: HabitTemplate[] = [
  // 1. Morning Architect Pack
  {
    id: "tpl-morning-sunlight",
    name: "Morning Sunlight & Hydration",
    icon: "☀️",
    category: "Health",
    domainLabel: "Vitality & Fitness",
    period: "morning",
    targetDaysPerWeek: 7,
    targetDays: [1, 2, 3, 4, 5, 6, 7],
    description: "500ml water + 10 mins outdoor light within 30m of waking",
    scienceNote: "Triggers early cortisol pulse and sets circadian melatonin timer.",
    packId: "morning",
    packTitle: "🌅 Morning Architect",
  },
  {
    id: "tpl-morning-mobility",
    name: "10-Min Joint Mobility Flow",
    icon: "🧘",
    category: "Health",
    domainLabel: "Vitality & Fitness",
    period: "morning",
    targetDaysPerWeek: 5,
    targetDays: [1, 2, 3, 4, 5],
    description: "Gentle spinal waves, hip openers, and deep diaphragmatic breathing",
    scienceNote: "Stimulates synovial fluid and increases thoracic mobility.",
    packId: "morning",
    packTitle: "🌅 Morning Architect",
  },
  {
    id: "tpl-morning-frog",
    name: "Eat The Frog (Daily Highlight)",
    icon: "🎯",
    category: "Productivity",
    domainLabel: "Mindful Focus",
    period: "morning",
    targetDaysPerWeek: 5,
    targetDays: [1, 2, 3, 4, 5],
    description: "Tackle your highest-friction strategic task before checking messages",
    scienceNote: "Leverages peak willpower before ego depletion sets in.",
    packId: "morning",
    packTitle: "🌅 Morning Architect",
  },

  // 2. Deep Focus & Cognitive Power
  {
    id: "tpl-deep-sprint",
    name: "90-Min Deep Work Sprint",
    icon: "💻",
    category: "Productivity",
    domainLabel: "Mindful Focus",
    period: "morning",
    targetDaysPerWeek: 5,
    targetDays: [1, 2, 3, 4, 5],
    description: "Single-task cognitive immersion with phone locked in another room",
    scienceNote: "Aligns with ultradian cognitive cycles for maximum neuroplastic output.",
    packId: "deep_work",
    packTitle: "⚡ Deep Work & Focus",
  },
  {
    id: "tpl-shutdown-ritual",
    name: "Workday Shutdown Protocol",
    icon: "🔒",
    category: "Productivity",
    domainLabel: "Mindful Focus",
    period: "evening",
    targetDaysPerWeek: 5,
    targetDays: [1, 2, 3, 4, 5],
    description: "Review open tabs, clear inbox to triage, lock tomorrow's 3 anchors",
    scienceNote: "Eliminates the Zeigarnik effect so your brain can fully decompress.",
    packId: "deep_work",
    packTitle: "⚡ Deep Work & Focus",
  },
  {
    id: "tpl-read-philosophy",
    name: "Read 20 Pages Non-Fiction",
    icon: "📖",
    category: "Learning",
    domainLabel: "Craft & Skill",
    period: "afternoon",
    targetDaysPerWeek: 6,
    targetDays: [1, 2, 3, 4, 5, 6],
    description: "Active reading with pen in hand; extract 1 actionable lesson",
    scienceNote: "Compound knowledge accumulation creates asymmetric leverage over time.",
    packId: "deep_work",
    packTitle: "⚡ Deep Work & Focus",
  },

  // 3. Sleep & Circadian Architecture
  {
    id: "tpl-zero-blue-light",
    name: "Zero Blue Light after 21:30",
    icon: "🌙",
    category: "Mindfulness",
    domainLabel: "Renewal & Health",
    period: "evening",
    targetDaysPerWeek: 7,
    targetDays: [1, 2, 3, 4, 5, 6, 7],
    description: "Turn off overhead lights; use amber lamps and put screens to sleep",
    scienceNote: "Prevents melanopsin suppression and allows natural melatonin surge.",
    packId: "sleep",
    packTitle: "🌙 Sleep Architecture",
  },
  {
    id: "tpl-caffeine-cutoff",
    name: "Caffeine Curfew at 14:00",
    icon: "☕",
    category: "Health",
    domainLabel: "Renewal & Health",
    period: "afternoon",
    targetDaysPerWeek: 7,
    targetDays: [1, 2, 3, 4, 5, 6, 7],
    description: "Switch to water, herbal infusions, or decaf after 2:00 PM",
    scienceNote: "Caffeine has a 6-8 hour half life that disrupts restorative slow-wave sleep.",
    packId: "sleep",
    packTitle: "🌙 Sleep Architecture",
  },
  {
    id: "tpl-wind-down-notes",
    name: "Brain Dump & Evening Gratitude",
    icon: "✍️",
    category: "Mindfulness",
    domainLabel: "Renewal & Health",
    period: "evening",
    targetDaysPerWeek: 7,
    targetDays: [1, 2, 3, 4, 5, 6, 7],
    description: "Write 3 things that went well and offload any racing thoughts onto paper",
    scienceNote: "Down-regulates sympathetic nervous system and activates parasympathetic rest.",
    packId: "sleep",
    packTitle: "🌙 Sleep Architecture",
  },

  // 4. Physical Vitality & Strength
  {
    id: "tpl-hydration-3l",
    name: "Drink 3 Liters Clean Water",
    icon: "💧",
    category: "Health",
    domainLabel: "Vitality & Fitness",
    period: "anytime",
    targetDaysPerWeek: 7,
    targetDays: [1, 2, 3, 4, 5, 6, 7],
    description: "Consistent hydration spaced evenly throughout waking hours",
    scienceNote: "Even 2% dehydration impairs executive function and working memory.",
    packId: "vitality",
    packTitle: "🏋️ Physical Vitality",
  },
  {
    id: "tpl-zone2-cardio",
    name: "30-Min Zone 2 Movement",
    icon: "🏃",
    category: "Health",
    domainLabel: "Vitality & Fitness",
    period: "morning",
    targetDaysPerWeek: 4,
    targetDays: [1, 3, 5, 6],
    description: "Brisk incline walk, easy jog, or cycling at conversational heart rate",
    scienceNote: "Builds mitochondrial density and optimizes metabolic clearance.",
    packId: "vitality",
    packTitle: "🏋️ Physical Vitality",
  },
  {
    id: "tpl-daily-steps",
    name: "10,000 Daily Steps",
    icon: "🚶",
    category: "Health",
    domainLabel: "Vitality & Fitness",
    period: "anytime",
    targetDaysPerWeek: 7,
    targetDays: [1, 2, 3, 4, 5, 6, 7],
    description: "Take phone calls walking outside; pacing breaks between deep work sessions",
    scienceNote: "Non-exercise activity thermogenesis (NEAT) prevents metabolic stagnation.",
    packId: "vitality",
    packTitle: "🏋️ Physical Vitality",
  },

  // 5. Digital Detox & Mindfulness
  {
    id: "tpl-social-blocker",
    name: "Zero Social Feeds Before 12:00",
    icon: "⚡",
    category: "Mindfulness",
    domainLabel: "Mindful Focus",
    period: "morning",
    targetDaysPerWeek: 6,
    targetDays: [1, 2, 3, 4, 5, 6],
    description: "No Instagram, Twitter/X, TikTok, or algorithmic feeds before noon",
    scienceNote: "Protects dopamine baseline from high-variance random-reward hijacking.",
    packId: "detox",
    packTitle: "🛡️ Digital Detox & Balance",
  },
  {
    id: "tpl-nature-walk",
    name: "20-Min Screen-Free Nature Walk",
    icon: "🌿",
    category: "Mindfulness",
    domainLabel: "Renewal & Health",
    period: "afternoon",
    targetDaysPerWeek: 5,
    targetDays: [1, 2, 3, 4, 5],
    description: "Leave phone behind or in pocket on Do Not Disturb; look at the horizon",
    scienceNote: "Soft fascination and optic flow dramatically reset mental fatigue.",
    packId: "detox",
    packTitle: "🛡️ Digital Detox & Balance",
  },
];

const PACKS = [
  { id: "all", label: "All Templates" },
  { id: "morning", label: "🌅 Morning" },
  { id: "deep_work", label: "⚡ Deep Work" },
  { id: "vitality", label: "🏋️ Vitality" },
  { id: "sleep", label: "🌙 Sleep" },
  { id: "detox", label: "🛡️ Detox" },
];

interface HabitTemplateLibraryProps {
  onSelectTemplate: (template: HabitTemplate) => void;
  onQuickAdd: (template: HabitTemplate) => Promise<void>;
  onCreateCustom: () => void;
  isExpanded?: boolean;
  onExpand?: () => void;
  onCollapse?: () => void;
  existingHabitNames?: string[];
}

export function HabitTemplateLibrary({
  onSelectTemplate,
  onQuickAdd,
  onCreateCustom,
  isExpanded = false,
  onExpand,
  onCollapse,
  existingHabitNames = [],
}: HabitTemplateLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPack, setSelectedPack] = useState<string>("all");
  const [addedIds, setAddedIds] = useState<Record<string, boolean>>({});
  const [exitingIds, setExitingIds] = useState<Record<string, boolean>>({});
  const [permanentlyRemovedIds, setPermanentlyRemovedIds] = useState<Record<string, boolean>>({});
  const [scrollTop, setScrollTop] = useState(0);

  // Sync permanently removed ids if an existing habit was deleted by user so it reappears
  const syncKey = `${existingHabitNames.map((n) => n.trim().toLowerCase()).sort().join(",")}||${Object.keys(exitingIds).sort().join(",")}`;
  const [prevSyncKey, setPrevSyncKey] = useState<string | null>(null);
  if (prevSyncKey !== syncKey) {
    setPrevSyncKey(syncKey);
    setPermanentlyRemovedIds((prev) => {
      const existingNorm = new Set(existingHabitNames.map((n) => n.trim().toLowerCase()));
      const updated = { ...prev };
      let changed = false;
      for (const tpl of HABIT_TEMPLATES) {
        if (updated[tpl.id] && !existingNorm.has(tpl.name.trim().toLowerCase())) {
          if (!exitingIds[tpl.id]) {
            delete updated[tpl.id];
            changed = true;
          }
        }
      }
      return changed ? updated : prev;
    });
  }

  // 1. Filter out habits the user has already added OR that have finished exiting
  const unaddedTemplates = useMemo(() => {
    const existingNorm = new Set(
      existingHabitNames.map((name) => name.trim().toLowerCase())
    );
    return HABIT_TEMPLATES.filter(
      (tpl) => !existingNorm.has(tpl.name.trim().toLowerCase()) && !permanentlyRemovedIds[tpl.id]
    );
  }, [existingHabitNames, permanentlyRemovedIds]);

  // 2. Filter unadded habits by search query and category pack
  const filteredTemplates = useMemo(() => {
    return unaddedTemplates.filter((tpl) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tpl.name.toLowerCase().includes(q) ||
        tpl.scienceNote.toLowerCase().includes(q) ||
        tpl.domainLabel.toLowerCase().includes(q) ||
        tpl.packTitle.toLowerCase().includes(q);

      const matchesPack = selectedPack === "all" || tpl.packId === selectedPack;

      return matchesSearch && matchesPack;
    });
  }, [unaddedTemplates, searchQuery, selectedPack]);

  const handleAddClick = (tpl: HabitTemplate, e: React.MouseEvent) => {
    e.stopPropagation();
    if (addedIds[tpl.id] || exitingIds[tpl.id] || permanentlyRemovedIds[tpl.id]) return;

    // 1. Show immediate Added feedback with checkmark
    setAddedIds((prev) => ({ ...prev, [tpl.id]: true }));

    // 2. Start smooth collapse animation so templates below slide up smoothly
    setTimeout(() => {
      setExitingIds((prev) => ({ ...prev, [tpl.id]: true }));
    }, 150);

    // 3. Permanently mark as removed in local state before committing to store, preventing flash
    setTimeout(async () => {
      setPermanentlyRemovedIds((prev) => ({ ...prev, [tpl.id]: true }));
      await onQuickAdd(tpl);
    }, 450);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const currentTop = e.currentTarget.scrollTop;
    setScrollTop(currentTop);

    // If not yet expanded to top of screen and user scrolls down, expand the half screen first!
    if (!isExpanded && currentTop > 0 && onExpand) {
      onExpand();
    }
  };

  // Only calculate fade-out and '+' icon fade-in once the sheet is expanded to the top of screen
  const customBarOpacity = isExpanded
    ? Math.max(0, Math.min(1, 1 - scrollTop / 35))
    : 1;

  const plusIconOpacity = isExpanded
    ? Math.max(0, Math.min(1, (scrollTop - 15) / 30))
    : 0;

  const isScrolled = isExpanded && scrollTop > 15;

  return (
    <div
      onScroll={handleScroll}
      className="relative select-none flex-1 overflow-y-auto pr-1 -mr-1 min-h-0"
    >
      {/* 1. Full Horizontal Bar for Custom Add */}
      <div
        className="pb-2.5 transition-opacity duration-200"
        style={{
          opacity: customBarOpacity,
          pointerEvents: customBarOpacity > 0.2 ? "auto" : "none",
        }}
      >
        <button
          type="button"
          onClick={onCreateCustom}
          className="w-full py-2.5 px-4 rounded-2xl bg-gradient-to-r from-primary/15 via-primary/10 to-surface-container-high border border-primary/25 hover:border-primary/50 text-left flex items-center justify-between group transition-all duration-200 shadow-xs active:scale-[0.99] cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary text-on-primary flex items-center justify-center shadow-sm shadow-primary/30 group-hover:scale-105 transition-transform">
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xs sm:text-sm font-bold text-on-surface group-hover:text-primary transition-colors">
                Create Custom Habit
              </span>
            </div>
          </div>
          <div className="flex items-center text-primary">
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </button>
      </div>

      {/* 2. Sticky Header: Full-width Search Bar + Dynamically Expanding '+' Button + Category Chips */}
      <div
        className={`sticky top-0 z-20 bg-surface-container/95 backdrop-blur-md pt-0.5 pb-2 space-y-2 transition-all duration-300 ${
          isScrolled
            ? "border-b border-outline/15 shadow-sm shadow-black/10"
            : "border-b border-transparent"
        }`}
      >
        {/* Search Bar Row: 100% full width initially, smoothly contracts when '+' fades in */}
        <div className="flex items-center w-full">
          <div className="relative flex-1 min-w-0 transition-all duration-300">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/50" />
            <input
              type="text"
              value={searchQuery}
              onFocus={() => {
                if (!isExpanded && onExpand) onExpand();
              }}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates (e.g. hydration, deep work, sleep)..."
              className="w-full pl-10 pr-12 py-2.5 rounded-2xl bg-surface-container-high/80 text-xs font-medium text-on-surface placeholder:text-on-surface-variant/40 border border-outline/15 focus:outline-none focus:border-primary transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-mono font-bold text-on-surface-variant/60 hover:text-on-surface cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* '+' Button: 0 width when at top, smoothly expands width to 40px and fades in on scroll */}
          <div
            className="overflow-hidden transition-all duration-300 ease-out flex items-center justify-end"
            style={{
              width: `${plusIconOpacity * 40}px`,
              marginLeft: `${plusIconOpacity * 8}px`,
              opacity: plusIconOpacity,
            }}
          >
            <button
              type="button"
              onClick={onCreateCustom}
              style={{
                transform: `scale(${0.75 + 0.25 * plusIconOpacity})`,
                pointerEvents: plusIconOpacity > 0.3 ? "auto" : "none",
              }}
              className="w-10 h-10 rounded-2xl bg-primary text-on-primary hover:bg-primary/90 flex items-center justify-center shadow-md shadow-primary/25 cursor-pointer shrink-0 transition-transform duration-150 active:scale-95"
              title="Create Custom Habit"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>

        {/* Horizontal Goal Pack Filter Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
          {PACKS.map((p) => {
            const countInPack = unaddedTemplates.filter(
              (t) => p.id === "all" || t.packId === p.id
            ).length;

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPack(p.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedPack === p.id
                    ? "bg-primary text-on-primary font-bold shadow-xs"
                    : "bg-surface-container-high text-on-surface-variant hover:text-on-surface border border-outline/10"
                }`}
              >
                <span>{p.label}</span>
                {countInPack > 0 && (
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                      selectedPack === p.id
                        ? "bg-on-primary/20 text-on-primary"
                        : "bg-surface-container-highest text-on-surface-variant"
                    }`}
                  >
                    {countInPack}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Templates List: Passes under the sticky filter list with smooth upward reflow on add */}
      <div className="space-y-2.5 pt-2 pb-1 min-h-[280px]">
        {unaddedTemplates.length === 0 ? (
          <div className="min-h-[260px] flex flex-col items-center justify-center text-center p-6 space-y-2.5 bg-surface-container-low/50 rounded-2xl border border-outline/10">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl">
              ✨
            </div>
            <h4 className="text-sm font-bold text-on-surface">All Templates Added!</h4>
            <p className="text-xs font-mono text-on-surface-variant max-w-xs leading-relaxed">
              You&apos;ve added all available templates to your active routines. Tap the &quot;+&quot; button above to design custom ones.
            </p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="min-h-[260px] flex flex-col items-center justify-center text-center p-6 space-y-2 bg-surface-container-low/50 rounded-2xl border border-outline/10">
            <span className="text-3xl">🔍</span>
            <h4 className="text-xs font-bold text-on-surface">No matching templates found</h4>
            <p className="text-[11px] font-mono text-on-surface-variant">
              No results for &quot;{searchQuery}&quot; in this category.
            </p>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="mt-2 px-3 py-1.5 rounded-xl bg-surface-container-high hover:bg-surface-bright text-xs font-mono text-primary font-semibold border border-outline/15 transition-all cursor-pointer"
              >
                Reset Search
              </button>
            )}
          </div>
        ) : (
          filteredTemplates.map((tpl) => {
            const isJustAdded = addedIds[tpl.id];
            const isExiting = exitingIds[tpl.id];

            return (
              <div
                key={tpl.id}
                onClick={() => !isExiting && onSelectTemplate(tpl)}
                style={{
                  maxHeight: isExiting ? "0px" : "240px",
                  opacity: isExiting ? 0 : 1,
                  transform: isExiting
                    ? "scale(0.95) translateY(-8px)"
                    : "scale(1) translateY(0px)",
                  marginTop: isExiting ? "0px" : undefined,
                  marginBottom: isExiting ? "0px" : undefined,
                  paddingTop: isExiting ? "0px" : undefined,
                  paddingBottom: isExiting ? "0px" : undefined,
                  borderWidth: isExiting ? "0px" : undefined,
                  pointerEvents: isExiting ? "none" : "auto",
                }}
                className="group p-3.5 rounded-2xl bg-surface-container-high/60 hover:bg-surface-container-high border border-outline/10 hover:border-primary/40 transition-all duration-400 ease-[cubic-bezier(0.4,0,0.2,1)] cursor-pointer space-y-2 shadow-xs overflow-hidden"
              >
                {/* Header Row */}
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center text-xl shrink-0 transition-all duration-300 shadow-xs ${
                        isJustAdded
                          ? "bg-emerald-500/20 border-emerald-500/50 scale-110"
                          : "bg-surface-container-highest border-outline/15 group-hover:scale-105"
                      }`}
                    >
                      <span>{tpl.icon}</span>
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-bold text-on-surface truncate group-hover:text-primary transition-colors">
                        {tpl.name}
                      </h4>
                      <div className="flex items-center gap-2 text-[10px] font-mono text-on-surface-variant mt-0.5">
                        <span className="text-primary font-semibold">{tpl.domainLabel}</span>
                        <span>•</span>
                        <span className="capitalize">{tpl.period}</span>
                        <span>•</span>
                        <span>{tpl.targetDaysPerWeek}d/wk</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => handleAddClick(tpl, e)}
                      disabled={isJustAdded || isExiting}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition-all duration-200 active:scale-95 cursor-pointer ${
                        isJustAdded
                          ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30 scale-105"
                          : "bg-primary hover:bg-primary/90 text-on-primary shadow-xs"
                      }`}
                      title="Add directly to your daily habits"
                    >
                      {isJustAdded ? (
                        <>
                          <Check className="w-3.5 h-3.5 stroke-[3] animate-in zoom-in-50 duration-150" />
                          <span>Added!</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Science Note */}
                <div className="p-2 rounded-xl bg-surface-container-low border border-outline/10 flex items-start gap-1.5 text-[10px] font-mono text-on-surface-variant/80">
                  <Sparkles className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                  <span className="leading-tight">
                    <strong className="text-on-surface font-semibold">Science: </strong>
                    {tpl.scienceNote}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
