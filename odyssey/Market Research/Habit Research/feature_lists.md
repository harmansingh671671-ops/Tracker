# Odyssey — Feature Lists (Cleaned)
### AI-Powered Features vs. Standard Features
### Already-existing features REMOVED. This list contains ONLY what is not yet built.

---

## What Already Exists in the App (Removed from lists)

The following were identified during code audit and are NOT in either list below:

| Feature | Where It Lives |
|---|---|
| Streak system (user.streak, calculateRank) | gamification.ts, stats/page.tsx, profile/page.tsx |
| XP system (user.xp, level calculation) | journey/page.tsx, stats/page.tsx, shop/page.tsx |
| Rank / Level titles (Beginner → Legend) | gamification.ts — 9-tier rank system |
| Level progress bar | stats/page.tsx, journey/page.tsx |
| Monthly heatmap calendar (day completion grid, long-press popup) | stats/page.tsx — fully built with month navigation |
| Per-habit heatmap (monthly completion grid per habit) | habit-heatmap.tsx component |
| Shop with virtual currency (diamonds) | shop/page.tsx — buyItem, addDiamonds |
| Streak Freeze Shield (purchasable in shop) | shop/page.tsx — streakFreezeCount field |
| XP Boost item (purchasable in shop) | shop/page.tsx — 2x XP Chrono Boost |
| Daily chest reward | shop/page.tsx — chest claimed once per day |
| Reward celebration modal | reward-celebration-modal.tsx |
| Evening reminder modal (fires after 8 PM, previews tomorrow's plan) | evening-reminder-modal.tsx |
| Notification toggle (cadence notifications on/off) | profile-settings-sheet.tsx via android-bridge |
| Wallpaper engine (live wallpaper + hourly worker) | wallpaper-generator.ts + Kotlin services |
| 24-hour spectrum bar on wallpaper | wallpaper-generator.ts |
| Top 2 hours shown on wallpaper (NOW + NEXT) | wallpaper-generator.ts (just completed) |
| Dynamic 4-habit display by time of day | wallpaper-generator.ts (just completed) |
| Journey page (day-by-day timeline with XP/rank) | journey/page.tsx |
| Stats page (rank card, XP bar, total planned hours, heatmap) | stats/page.tsx |
| Day Schedule planner | day-schedule, planner pages |
| Habit creation and editing (with period, timeOfDay, frequency) | habits/page.tsx, create-habit-modal, edit-habit-modal |

---

---

## PART A: AI-Powered Features (NOT yet built)

These require an ML model, LLM, or intelligent inference. Sorted by feasibility.

---

### A1 — Natural Language Habit Creation
**What:** User types "Meditate 20 mins every morning at 7am" — app auto-parses habit name, duration, period, and frequency. No form fields needed.
**AI Required:** NLP / intent extraction (lightweight regex + LLM hybrid, or on-device model)
**Start Rule-Based?** Partially — a regex parser can handle common patterns without a full LLM
**Effort:** Medium
**Inspired by:** Todoist, TickTick, Reclaim.ai

---

### A2 — Time-of-Day Performance Analysis with Suggestions
**What:** Surfaces patterns like "Your morning habits complete at 91% but evening habits complete at 42%. Consider moving [Habit X] earlier."
**AI Required:** Statistical pattern analysis over completion logs (can start as rule-based thresholds)
**Start Rule-Based?** YES — v1 can be pure threshold logic, upgraded to ML later
**Effort:** Low-Medium
**Inspired by:** Habitify, Structured Energy Monitor

---

### A3 — Overcommitment / Capacity Warning
**What:** When the user schedules habits, compares against their personal completion average and warns: "Based on your history, you average ~4 habits/day. You've scheduled 9 today."
**AI Required:** Personalised baseline from historical completion data
**Start Rule-Based?** YES — use fixed threshold (e.g., >6 habits = warning) until enough history exists
**Effort:** Low-Medium
**Inspired by:** Sunsama daily capacity cap

---

### A4 — Best Day / Worst Day Pattern Detection
**What:** Detects recurring weak spots: "You skip habits 3x more on Fridays — this pattern has repeated for 6 weeks."
**AI Required:** Time-series frequency analysis over completion logs
**Start Rule-Based?** YES — group by day-of-week, count misses, flag outliers
**Effort:** Low-Medium
**Inspired by:** Way of Life

---

### A5 — Smart Habit Scheduling (Optimal Time Suggestion)
**What:** When a user creates a new habit, suggests the best time slot: "You complete high-energy tasks 87% of the time before 10 AM — want to place this there?"
**AI Required:** Correlation model between habit type/energy-tag and time-of-day completion rates
**Start Rule-Based?** Partially — can start as a simple "most completions happen in this period" lookup
**Effort:** High
**Inspired by:** Reclaim.ai, Motion

---

### A6 — Energy-Aware Habit Sequencing Suggestion
**What:** After user tags habits as High/Low/Passive energy, cross-references with their completion patterns and suggests reordering: "You tagged Workout as High Energy but scheduled it at 9 PM — your completion rate at that hour is 28%."
**AI Required:** Correlation between energy tags and per-hour completion history
**Start Rule-Based?** YES — rule: "if High Energy habit is after 7 PM and user's 7PM+ completion rate < 50%, suggest moving"
**Effort:** Medium
**Inspired by:** Structured Energy Monitor

---

### A7 — Weekly AI Summary (Review & Forward Plan)
**What:** On Sunday evening, generates a personalised weekly review: "Last week: 72% completion. Strongest: Morning. Weakest: Evening. Suggested focus this week: [X]"
**AI Required:** LLM for narrative generation OR rule-based template substitution (start with templates)
**Start Rule-Based?** YES — template with variable substitution ships immediately
**Effort:** Low (template) → High (full LLM narrative)
**Inspired by:** Sunsama weekly review

---

### A8 — Onboarding Goal-to-Habit AI Suggestions
**What:** During first-run, ask "What's your main goal?" and use AI to suggest a personalised bundle of habits — not just a static lookup but one that adapts based on stated goals + context.
**AI Required:** Goal-to-habit mapping (can be static lookup table initially, then evolve to LLM)
**Start Rule-Based?** YES — v1 is a curated lookup table per goal category
**Effort:** Low-Medium
**Inspired by:** Fabulous Journeys, Finch

---

### A9 — Streak Recovery Path Generation
**What:** When a streak breaks, instead of a plain reset, generate a personalised 3-day recovery plan: "You broke your 14-day Meditation streak. Here's a lighter schedule for the next 3 days to rebuild momentum."
**AI Required:** LLM or rule engine for recovery schedule suggestion
**Start Rule-Based?** Partially — can show a fixed recovery template with personalised streak number
**Effort:** Medium
**Unique:** No competitor does this well currently

---

### A10 — Wallpaper Theme Auto-Suggestion
**What:** Based on current hour, active habit context, or user's energy mood input, auto-suggest a wallpaper theme/color variant: "Deep Work hour detected — switch to Focus Dark theme?"
**AI Required:** Context classifier (rule-based is sufficient to start)
**Start Rule-Based?** YES — map hours + habit types to themes with simple conditional logic
**Effort:** Low
**Unique:** Only Odyssey has a wallpaper engine to build this on

---

### AI Feature Summary

| # | Feature | Effort | Start Rule-Based? |
|---|---|---|---|
| A1 | Natural Language Habit Creation | Medium | Partially |
| A2 | Time-of-Day Performance Analysis | Low-Med | YES |
| A3 | Overcommitment Warning | Low-Med | YES |
| A4 | Best Day / Worst Day Detection | Low-Med | YES |
| A5 | Smart Habit Scheduling | High | Partially |
| A6 | Energy-Aware Sequencing Suggestion | Medium | YES |
| A7 | Weekly AI Summary | Low → High | YES (template first) |
| A8 | Onboarding Habit Suggestions | Low-Med | YES (lookup table) |
| A9 | Streak Recovery Path | Medium | Partially |
| A10 | Wallpaper Theme Auto-Suggestion | Low | YES |

**Total AI Features: 10**
**Can ship as rule-based v1: 8 out of 10**

---

---

## PART B: Standard Features (NOT yet built, No AI Required)

Fully buildable with existing architecture. No ML, no LLM.

---

### B1 — 52-Week GitHub-Style Heatmap (Full Year View)
**What:** A full year's habit completion shown as a 52-column grid (like GitHub contributions) on the Stats page — each cell colored by that day's overall completion rate.
**Note:** The app has a monthly heatmap. This is the annual one — a completely different scale and insight.
**Fits existing:** YES — Stats page, uses same dayStatsByDate data already computed
**Effort:** Low

---

### B2 — Per-Habit Individual Streak Counter
**What:** Each habit card in the Habits page shows its own current streak (not the global user streak) — how many consecutive scheduled days the user completed that specific habit.
**Note:** The app tracks global user streak. Per-habit streaks are not tracked.
**Fits existing:** YES — new field in habit history store
**Effort:** Low-Medium

---

### B3 — Streak Milestone Celebration Notifications
**What:** At 7, 30, 100, 365-day global streak milestones, trigger a special in-app animation + celebration moment: "30 days straight. You're building something real."
**Note:** The shop has streak freeze but no milestone celebration events. These are different.
**Fits existing:** YES — hook into existing streak increment logic
**Effort:** Low

---

### B4 — Non-Punitive Streak Break Recovery UI
**What:** When a streak breaks, show warm, encouraging copy and a clear "Start fresh" CTA instead of a harsh red reset. No shame, no warning color — just gentle acknowledgment.
**Note:** App currently shows a streak counter but has no specific "streak broke" UX state.
**Fits existing:** YES — pure UX copy + color change in stats/profile
**Effort:** Very Low

---

### B5 — Morning Check-In Notification (8 AM daily)
**What:** At a user-configured time (default 8 AM), a push notification: "Good morning. You have [X] habits today. Your first starts at [time]. Ready?"
**Note:** App has an evening reminder modal (at 8 PM for tomorrow's preview). Morning notification does not exist.
**Fits existing:** YES — extends existing notification system in android-bridge.ts
**Effort:** Low

---

### B6 — Pre-Habit 5-Minute Nudge Notification
**What:** 5 minutes before a habit's scheduled hour starts, send: "Your [Habit Name] hour starts in 5 minutes. Get ready."
**Fits existing:** YES — extends existing notification system
**Effort:** Low

---

### B7 — "Don't Break the Streak" End-of-Day Nudge
**What:** If after 8 PM and a habit with an active streak (5+ days) hasn't been completed, send: "You still have time to keep your [Habit] streak alive — [X] days and counting."
**Note:** Evening modal exists but is about tomorrow's plan. This targets today's incomplete streak.
**Fits existing:** YES — new conditional check on evening notification pass
**Effort:** Low

---

### B8 — Completion Instant Positive Feedback (In-App)
**What:** When a habit block is marked complete, show a brief in-app animation (confetti burst, animated checkmark, or pulse effect) + a short warm message.
**Fits existing:** YES — hook into completion event in planner/day-schedule
**Effort:** Low

---

### B9 — Week-Over-Week Completion Comparison
**What:** On the Stats page, show: "This week: 78% vs last week: 62% — you're up 16%!" with a trend arrow.
**Note:** Stats page shows total planned hours and rank. No week-over-week percentage comparison exists.
**Fits existing:** YES — Stats page, uses existing completion data
**Effort:** Low

---

### B10 — Habit Template Library
**What:** A browsable library of pre-built habit packs grouped by life goal: "Morning Clarity," "Fitness Foundation," "Deep Work," "Sleep Optimization," "Digital Detox." User taps a pack → habits are auto-added.
**Fits existing:** YES — new page/modal + static template seed data
**Effort:** Medium

---

### B11 — Goal-Based First-Run Onboarding
**What:** On first launch, ask "What's your main goal right now?" → suggest 3-4 relevant pre-configured habits to get the user started in under 60 seconds.
**Fits existing:** YES — new first-run flow using existing habit creation logic
**Effort:** Medium

---

### B12 — Achievement Badge Wall
**What:** A dedicated section in Profile showing unlocked badges. Examples: "Early Riser" (morning habit before 7 AM, 10x), "Iron Will" (30-day streak), "Perfect Week" (100% for 7 days), "Night Owl" (evening habit after 10 PM, 10x).
**Note:** App has ranks (gamification.ts) but no badge/achievement system with specific unlock conditions.
**Fits existing:** YES — Profile page, new badge engine
**Effort:** Medium

---

### B13 — Home Screen Widget
**What:** A compact Android Glance widget: current habit name + today's X/Y completion count + streak number. Tap opens the check-off screen directly.
**Fits existing:** NEW — requires Android Glance widget API (Kotlin). Complements the wallpaper to own the full ambient display layer.
**Effort:** Medium-High

---

### B14 — Notification Shade Persistent Progress Card
**What:** A persistent Android notification in the shade showing "4/7 habits complete today" with a progress bar. Auto-updates as habits are checked off.
**Fits existing:** YES — Android foreground notification or WorkManager
**Effort:** Medium

---

### B15 — Duration-Weighted Spectrum Bar
**What:** On the wallpaper, a 2-hour habit block occupies twice the visual width of a 1-hour block on the 24-hour spectrum bar, making time feel proportional.
**Note:** Current spectrum bar treats all hours equally.
**Fits existing:** YES — wallpaper-generator.ts canvas rendering change
**Effort:** Medium

---

### B16 — Energy Tagging for Habits (High / Low / Passive)
**What:** Each habit can be tagged with an energy level. This tag appears on the wallpaper card and habit list, and feeds into sequencing suggestions.
**Fits existing:** YES — new field in habit model + small UI picker in create/edit modal
**Effort:** Low

---

### B17 — Daily Capacity Indicator
**What:** On the Planner page, a visual indicator ("Light day / Moderate / Heavy") based on total habits scheduled and their durations for that day.
**Fits existing:** YES — Planner page, simple calculation
**Effort:** Low

---

### B18 — Habit Coins → User-Defined Reward Shop
**What:** Users define their own real-world rewards in the shop (e.g., "Movie Night = 200 coins") and redeem earned coins against them.
**Note:** Shop currently has fixed items (streak freeze, XP boost, chest). User-defined rewards do not exist.
**Fits existing:** YES — extends existing shop page and reward model
**Effort:** Medium

---

### B19 — Focus Session Mode (In-App)
**What:** Tapping a habit's card enters a minimal full-screen view with a countdown timer for that habit's allocated hour, a "Mark Complete" button, and nothing else.
**Fits existing:** YES — new fullscreen route/modal + timer logic
**Effort:** Medium

---

### B20 — Seasonal / Themed Habit Packs
**What:** Time-limited content drops — "New Year Reset," "Summer Momentum," "Exam Season Focus" — as named habit template bundles with a thematic wallpaper variant.
**Fits existing:** YES — extends Template Library (B10) with date-gating + wallpaper theme tie-in
**Effort:** Low (once B10 exists)

---

### B21 — Routine Bundling
**What:** Users group habits into named routines ("Morning Ritual" = Meditate + Journal + Exercise). The routine can be launched as a timed sequence in Focus Mode — one habit flows into the next.
**Fits existing:** PARTIAL — new data model (routine entity linking habits) + sequential timer flow
**Effort:** High

---

### Standard Feature Summary

| # | Feature | Effort | Priority |
|---|---|---|---|
| B1 | 52-Week Annual Heatmap | Low | NOW |
| B2 | Per-Habit Individual Streak | Low-Med | NOW |
| B3 | Streak Milestone Celebrations | Low | NOW |
| B4 | Non-Punitive Break Recovery UI | Very Low | NOW |
| B5 | Morning Check-In Notification | Low | NOW |
| B6 | Pre-Habit 5-Min Nudge | Low | NOW |
| B7 | Don't Break Streak Nudge | Low | NOW |
| B8 | Completion Instant Feedback | Low | NOW |
| B9 | Week-Over-Week Comparison | Low | NOW |
| B10 | Habit Template Library | Medium | NEXT |
| B11 | Goal-Based Onboarding | Medium | NEXT |
| B12 | Achievement Badge Wall | Medium | NEXT |
| B13 | Home Screen Widget | Med-High | NEXT |
| B14 | Notification Shade Progress Card | Medium | NEXT |
| B15 | Duration-Weighted Spectrum Bar | Medium | NEXT |
| B16 | Energy Tagging | Low | NEXT |
| B17 | Daily Capacity Indicator | Low | NEXT |
| B18 | User-Defined Reward Shop | Medium | LATER |
| B19 | Focus Session Mode | Medium | LATER |
| B20 | Seasonal Habit Packs | Low | LATER |
| B21 | Routine Bundling | High | FUTURE |

**Total Standard Features: 21**
**Fitting existing architecture without new infrastructure: 20 / 21**
**Requires new native component: 1 (B13 — Home Screen Widget, Glance API)**

---

## Totals

| Category | Count |
|---|---|
| AI Features (not yet built) | 10 |
| Standard Features (not yet built) | 21 |
| Grand Total New Features | 31 |
| Features ready to ship as rule-based v1 | 8 AI + 18 Standard = 26 |

---

Document updated: September 2026
