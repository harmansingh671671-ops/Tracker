# Odyssey — Integration Roadmap
## Every Feature That Can Be Added Without Complicating the App
### Micro to Major — All Sources Consolidated

> **Principle:** Every item here was filtered against one question:
> "Can this be added without adding a new navigation item, a new concept the user must learn,
> or restructuring the existing app?"
> Features that would genuinely complicate the experience are excluded.
> Micro-improvements are given equal weight to big features — small things compound.

---

## TIER 1 — MICRO IMPROVEMENTS (~1–4 hours each)
### Almost no new code — mostly copy, color, animation, or a single condition.

---

### M1 — Warm Microcopy Throughout the App
**What:** Replace generic system text with human, encouraging language.
- Empty Habits page: "No habits yet. Every great journey starts with a single step."
- Empty planner day: "Nothing scheduled — a blank canvas for today."
- All habits done: "Perfect day. You showed up for yourself."
- Streak label: "7 days strong" instead of "Streak: 7"
- XP gain: "+50 XP — keep the momentum going" instead of plain "+50 XP"
**Effort:** ~2h | **Impact:** HIGH | **Source:** Finch, Fabulous

---

### M2 — Non-Punitive Streak Break Screen
**What:** When streak resets to 0, instead of a plain "0":
- Warm message: "Streaks break. What matters is starting again."
- "Restart" button styled positively (not red/warning)
- Subtle animation — counter breathes back to life
- Show previous best: "Your best was 14 days — you'll beat it."
**Effort:** ~2h | **Impact:** HIGH | **Source:** Finch, Duolingo

---

### M3 — Habit Completion Micro-Animation
**What:** On marking a habit block complete in the planner:
- Brief confetti burst (3–5 particles, subtle)
- Checkmark bounces/scales in satisfyingly
- Tiny 1.5s message: "Done. One step closer."
**Effort:** ~3h | **Impact:** HIGH | **Source:** Duolingo, Habitica, Finch

---

### M4 — Today's Completion Fraction in Header
**What:** A tiny "3/5 done today" indicator on the day-schedule page header.
No new navigation — computed from existing schedule data.
**Effort:** ~1h | **Impact:** MEDIUM | **Source:** Standard in all top habit apps

---

### M5 — Streak Milestone Toast (In-App)
**What:** At 7, 14, 30, 60, 100, 365-day streaks:
- Brief full-screen moment: "30 days. You're not the same person you were a month ago."
- Sound + vibration via existing android-bridge
**Effort:** ~3h | **Impact:** HIGH | **Source:** Duolingo, Habitica

---

### M6 — Week-Over-Week Stats Card
**What:** One new card on Stats page: "This week: 78% vs last week 62% — up 16%"
Trend arrow: amber if declining (never red), green if improving.
Data already computed in `dayStatsByDate`.
**Effort:** ~2h | **Impact:** HIGH | **Source:** Habitify

---

### M7 — Privacy Trust Badge
**What:** One line in Profile/Settings: "Your data is stored locally. Nothing leaves your device."
Odyssey already does this — just needs to say so.
**Effort:** ~30min | **Impact:** MEDIUM | **Source:** Anytype's success

---

### M8 — Completion Fraction on Wallpaper
**What:** Small "3/5" or "60%" badge in corner of wallpaper habit card area.
Every phone unlock = passive progress check.
**Effort:** ~2h | **Impact:** HIGH | **Source:** Sectograph, Finch widgets

---

### M9 — Daily Capacity Label on Planner
**What:** One line at top of day-schedule:
- 1–2 habits: "Light day"
- 3–4 habits: "Steady day"
- 5–6 habits: "Full day"
- 7+ habits: "Heavy day — protect your energy"
**Effort:** ~1h | **Impact:** MEDIUM | **Source:** Sunsama

---

### M10 — Last Completed Timestamp on Habit Card
**What:** Each habit card shows: "Last done: Yesterday" / "Last done: 3 days ago" / "Last done: Today"
From existing completion logs.
**Effort:** ~1.5h | **Impact:** MEDIUM | **Source:** Habitify, Way of Life

---

### M11 — Per-Habit Streak on Each Habit Card
**What:** Small flame + streak number on each habit card for THAT specific habit.
Currently only global user streak exists. Per-habit computed from historyLogs.
**Effort:** ~3h | **Impact:** HIGH | **Source:** Streaks (Apple), Duolingo

---

### M12 — Subtle Color Coding by Period
**What:** Habits get a subtle border-left accent by their period:
- Morning: warm amber | Afternoon: cool blue | Evening: deep purple | Night: dark indigo
Not a redesign — just a thin left border.
**Effort:** ~1h | **Impact:** LOW-MEDIUM | **Source:** Structured, Routinery

---

### M13 — "Up Next" Preview Line
**What:** On day-schedule page: "Up next in 45 min: Deep Work"
Computed from schedule + current time.
**Effort:** ~1.5h | **Impact:** MEDIUM | **Source:** Routinery

---

### M14 — Gentle Overloaded Day Warning
**What:** When 8th+ habit added to a day, soft inline text:
"That's 8 habits today. Quality over quantity — consider which matters most."
No blocking dialog. Just text.
**Effort:** ~1h | **Impact:** MEDIUM | **Source:** Sunsama

---

### M15 — Auto-Archive Inactive Habits Prompt
**What:** If a habit has not been completed in 14+ days, a gentle prompt appears:
"[Habit] hasn't been done in 2 weeks. Pause or remove it?"
Actions: Pause (grays out, keeps it) or Archive.
**Effort:** ~2h | **Impact:** MEDIUM | **Source:** Habitica, Habitify

---

---

## TIER 2 — SMALL FEATURES (half-day to 1 day each)
### Self-contained, don't change existing flows.

---

### S1 — Morning Check-In Notification
**What:** Push notification at user-set time (default 8 AM):
"Good morning. Today: [X] habits. First up: [Habit] at [time]. Ready?"
Toggle in Settings. Extends existing notification system.
**Effort:** ~4h | **Impact:** HIGH | **Source:** Sunsama, Microsoft To Do

---

### S2 — "Don't Break the Streak" Evening Nudge
**What:** At 8 PM, if any habit with 5+ streak days hasn't been done today:
"[Habit] streak is at [N] days — still time to keep it going tonight."
Different from the existing evening modal (which is about tomorrow).
**Effort:** ~3h | **Impact:** HIGH | **Source:** Duolingo

---

### S3 — Pre-Habit 5-Minute Nudge
**What:** 5 min before a habit's scheduled hour:
"Your [Habit] hour starts in 5 minutes. Time to prepare."
Per-habit toggle.
**Effort:** ~4h | **Impact:** HIGH | **Source:** Routinery, TickTick

---

### S4 — Habit Priority Tag (Critical / Focus / Optional)
**What:** Small 3-option selector in create/edit modal.
- Critical: accent border on wallpaper card
- Focus: normal
- Optional: slightly dimmed
UI only for now — no new logic required.
**Effort:** ~3h | **Impact:** MEDIUM | **Source:** Amplenote (simplified)

---

### S5 — Energy Level Tag (High / Low / Passive)
**What:** 3-option energy tag per habit in create/edit modal.
- High Energy: lightning bolt indicator on card + wallpaper
- Low Energy: moon indicator
- Passive: no indicator
Feeds AI7 later. Useful for self-awareness immediately.
**Effort:** ~3h | **Impact:** MEDIUM now, HIGH later | **Source:** Structured

---

### S6 — Weekly Goals Box
**What:** Collapsible card on Stats or Profile page:
"This week I want to..." / "This month I want to..." / "This year I want to..."
Free text. Optional. Local only.
Wallpaper bonus: if filled in, weekly goal shows as subtitle: "Working toward: Run a 5K"
**Effort:** ~4h | **Impact:** HIGH | **Source:** TimeStripe Horizons

---

### S7 — 52-Week Annual Heatmap on Stats Page
**What:** Below existing monthly heatmap: a compact 52-week x 7-day GitHub-style grid.
Fully completed day = full color. Partial = mid. Empty = faint dot.
Uses `dayStatsByDate` already in stats/page.tsx — zero new data needed.
**Effort:** ~4h | **Impact:** HIGH | **Source:** Habitify, Way of Life

---

### S8 — Weekly Summary Push Notification (Sunday Evening)
**What:** Every Sunday: "This week: 78% — up from 62% last week. Best: [Habit]."
If declining: "52% this week vs 68% last week. Tomorrow is a new start."
**Effort:** ~3h | **Impact:** HIGH | **Source:** Sunsama, Habitify

---

### S9 — Habit Notes Field (One Line)
**What:** Optional single-line text on each habit: personal reminder the user writes.
"Remember: even 5 minutes counts." Visible inside habit detail, not on main card.
**Effort:** ~2h | **Impact:** MEDIUM | **Source:** Habitica, Fabulous

---

### S10 — Habit "Why" Field
**What:** Optional "why" field in create/edit modal:
"Why does this habit matter to you?" Stored, shown when user opens the habit.
Separate from notes — this is the motivational anchor.
**Effort:** ~2h | **Impact:** HIGH | **Source:** Fabulous, BJ Fogg habit science

---

### S11 — Flexible Habit Type + Auto-Rollover
**What:** New habit type at creation: Fixed (specific hour) or Flexible (any time today).
Flexible habits show in a "Flexible today" section at bottom of day-schedule.
If missed by midnight, they appear tomorrow with "(from yesterday)" tag.
**Effort:** ~5h | **Impact:** HIGH | **Source:** Twos auto-rollover

---

### S12 — Quick Habit Idea Capture (Inbox)
**What:** Floating "+" on Habits page opens a single-line quick input.
Typed idea saved to "Inbox" at top of Habits page.
From Inbox: "Promote to habit" (opens create modal pre-filled) or "Dismiss".
**Effort:** ~4h | **Impact:** MEDIUM-HIGH | **Source:** Twos, Amplenote Jot Mode

---

### S13 — Habit Completion Sound (Optional, Toggleable)
**What:** On habit completion, a satisfying chime/click sound.
Toggle in Settings. Android AudioManager or bundled audio.
**Effort:** ~2h | **Impact:** MEDIUM | **Source:** Forest, Habitica, Finch

---

### S14 — "Today at a Glance" Summary Card
**What:** Card at top of day-schedule:
- Date + Journey Day number
- Habits done / total today
- Current streak
- First uncompleted habit + "Start" button
All data exists — this is a UI composition.
**Effort:** ~3h | **Impact:** HIGH | **Source:** Microsoft To Do "My Day"

---

### S15 — Habit Pause / Vacation Mode
**What:** Each habit can be individually paused for 1–30 days.
Paused habits: don't appear on wallpaper, don't affect completion %, streak doesn't break.
"I'm traveling this week — pause gym for 7 days."
**Effort:** ~4h | **Impact:** HIGH | **Source:** Habitica, Habitify

---

---

## TIER 3 — MEDIUM FEATURES (1–3 days each)

---

### MD1 — Achievement Badge System
**What:** "Badges" section in Profile page. Auto-unlock based on behavior:
- "7-Day Warrior" — 7-day streak
- "Iron Will" — 30-day streak
- "Early Riser" — morning habit before 7 AM, 10x
- "Night Owl" — evening habit after 10 PM, 10x
- "Perfect Week" — 100% completion for 7 days
- "Laser Focus" — same habit 21 days in a row
- "Legend" — 365-day streak
Revealed with brief animation on Profile open.
**Effort:** ~1.5d | **Impact:** HIGH | **Source:** Duolingo, Habitica

---

### MD2 — Focus Session Mode
**What:** Tap an active habit block → fullscreen minimal overlay:
- Large countdown timer for the hour
- Habit name + "why" (from S10) at top
- Single "Mark Complete" button
- No nav bar, no distractions
No new navigation — overlay over existing day-schedule.
**Effort:** ~1d | **Impact:** HIGH | **Source:** Sunsama, Routinery

---

### MD3 — Goal-Based First-Run Onboarding
**What:** First launch only:
1. "What's your main focus?" — Health / Focus / Balance / Sleep / Custom
2. 3–4 pre-configured habit suggestions shown
3. User toggles which to add → "Start my journey"
4. Habits created with sensible defaults
Under 60 seconds from install to first habit.
**Effort:** ~1.5d | **Impact:** VERY HIGH | **Source:** Finch, Fabulous

---

### MD4 — Habit Template Library
**What:** "Browse Templates" option in Habits page (modal, not new tab):
- "Morning Clarity" (Meditate, Journal, Plan the Day, Cold Shower)
- "Fitness Foundation" (Workout, Walk 10k steps, Stretch)
- "Deep Work" (No-phone morning, Focus block, Reading)
- "Sleep Optimization" (No screens 1h before bed, Gratitude, Wind down)
- "Digital Detox" (No social media before noon, Screen review)
Tap pack → preview habits → "Add all" or cherry-pick.
**Effort:** ~1.5d | **Impact:** HIGH | **Source:** Fabulous, Routinery

---

### MD5 — Notification Shade Persistent Progress Card
**What:** Persistent Android notification (collapsible):
"Odyssey · 3/7 habits done today · 12-day streak"
Progress bar. Auto-updates as habits complete.
**Effort:** ~1d | **Impact:** HIGH | **Source:** Android system pattern

---

### MD6 — Home Screen Widget
**What:** Android Glance API widget (2x2 and 4x1):
- Current/next habit name
- Today's X/Y completion
- Streak number
- Tap → today's day schedule
New Kotlin component required.
**Effort:** ~2d | **Impact:** VERY HIGH | **Source:** Sectograph, Finch, Streaks

---

### MD7 — Per-Habit Full Streak Tracking
**What:** Each habit tracks its own consecutive completion streak independently.
Computed from historyLogs per habitId.
Shows: "Current: 12 days · Best ever: 22 days"
**Effort:** ~1d | **Impact:** HIGH | **Source:** Streaks (Apple), Duolingo

---

### MD8 — Smart Scheduling Suggestion at Habit Creation (Rule-Based)
**What:** When user picks a period during habit creation:
"You complete 89% of morning habits. Great choice."
OR: "Evening habits complete at 42% for you. Morning might work better."
Pure stats from existing habitStore. No ML.
**Effort:** ~4h | **Impact:** HIGH | **Source:** Reclaim.ai (simplified)

---

---

## TIER 4 — LARGER FEATURES (3–7 days each)

---

### L1 — XP-Unlockable Wallpaper Themes
**What:** New wallpaper color themes unlock at level milestones:
- Lv 3: Midnight Blue | Lv 5: Forest Green | Lv 8: Sunset Amber
- Lv 12: Neon Minimal | Lv 20: Diamond (animated shimmer)
Unlock toast: "New wallpaper theme unlocked — Midnight Blue"
**Effort:** ~3d | **Impact:** HIGH | **Source:** Habitica, LifeUp

---

### L2 — User-Defined Reward Shop Items
**What:** Users add their own rewards to the existing shop:
"Movie Night = 200 coins" / "New Book = 500 coins"
Mark as redeemed. Existing shop items remain unchanged.
New section: "My Rewards" added below current shop.
**Effort:** ~2d | **Impact:** HIGH | **Source:** LifeUp

---

### L3 — Weekly Habit Report (Sunday Evening)
**What:** One-screen weekly report (notification + in-app view):
- % completion this week vs last week
- Best habit this week
- Habit that needs attention
- Current streak
- Warm closing line + "Ready for next week?" CTA
**Effort:** ~2d | **Impact:** HIGH | **Source:** Sunsama

---

### L4 — Time-of-Day Performance Card on Stats
**What:** New card on Stats page showing completion rates by period as a bar chart:
"Morning: 91% · Afternoon: 67% · Evening: 43%"
Below: "Your morning is your strongest window — protect it."
Computed from existing data grouped by habit period.
**Effort:** ~1.5d | **Impact:** HIGH | **Source:** Habitify

---

### L5 — Best Day / Worst Day Analysis Card
**What:** Stats page card: "Strongest: Wednesday (88%) · Toughest: Sunday (41%)"
If consistent weak day detected: "You often struggle on Sundays.
Want to lighten that day's schedule?"
**Effort:** ~1d | **Impact:** HIGH | **Source:** Way of Life

---

---

## TIER 5 — AI FEATURES (all can ship rule-based v1 first)

---

### AI1 — Natural Language Habit Entry
**What:** "Add habit" field accepts: "Meditate 20 mins every morning"
→ auto-fills name, duration, period. Regex v1 handles common patterns.
Falls back to regular form for edge cases.
**Effort:** Medium | **Source:** Todoist, TickTick

---

### AI2 — Scheduling Insight at Habit Creation
**What:** When creating a habit + selecting a period, show user's own stats inline:
"You complete 88% of morning habits / 41% of evening habits."
Pure statistics display. No ML required.
**Effort:** Low | **Source:** Habitify, Structured

---

### AI3 — Overcommitment Warning
**What:** If today's habit count exceeds user's 14-day average by 50%+:
"You've scheduled [N] habits — more than your usual. Quality over quantity."
Rule-based threshold — no ML.
**Effort:** Low | **Source:** Sunsama

---

### AI4 — Weekly Summary (Template-Based)
**What:** Every Sunday, generate a filled template:
"This week: [X]% — [better/worse] than [Y]% last week.
Strongest: [Habit A]. Needs attention: [Habit B]."
Pure template substitution. No LLM for v1.
**Effort:** Low | **Source:** Sunsama, Akiflow

---

### AI5 — Persistent Weak Day Alert
**What:** After 4+ weeks, if any day-of-week consistently has <50% completion:
"You've missed habits on Sunday 6 weeks in a row. Consider a lighter Sunday schedule."
Rule-based grouping by day-of-week.
**Effort:** Low | **Source:** Way of Life

---

### AI6 — Streak Recovery Path (Template)
**What:** When a streak breaks, beyond warm copy (M2), show a 3-day restart plan:
"Day 1: Just show up for 5 minutes.
Day 2: Half the usual duration.
Day 3: Full habit. You've done it before."
Template v1. LLM v2. Odyssey can own this — no competitor does it well.
**Effort:** Low-Medium | **Source:** Original — gap in market

---

### AI7 — Energy-Aware Warning (requires S5 first)
**What:** If user tags a habit as High Energy but schedules it in their weakest period:
"High energy habit in the evening — you complete evenings at [X]%.
Consider moving this to morning."
Rule-based: energy tag + period completion rate.
**Effort:** Low | **Source:** Structured Energy Monitor

---

---

## MASTER PRIORITY TABLE (All 49 Features)

| ID | Feature | Tier | Effort | Impact |
|---|---|---|---|---|
| M2 | Non-Punitive Streak Break Screen | Micro | 2h | HIGH |
| M3 | Habit Completion Micro-Animation | Micro | 3h | HIGH |
| M1 | Warm Microcopy Throughout | Micro | 2h | HIGH |
| M5 | Streak Milestone Toast | Micro | 3h | HIGH |
| M6 | Week-Over-Week Stats Card | Micro | 2h | HIGH |
| M11 | Habit Streak on Each Card | Micro | 3h | HIGH |
| M4 | Today's Completion % in Header | Micro | 1h | MEDIUM |
| M8 | Completion Fraction on Wallpaper | Micro | 2h | HIGH |
| M7 | Privacy Trust Badge | Micro | 30min | MEDIUM |
| M9 | Daily Capacity Label | Micro | 1h | MEDIUM |
| M13 | "Up Next" Preview Line | Micro | 1.5h | MEDIUM |
| M14 | Gentle Overloaded Day Warning | Micro | 1h | MEDIUM |
| M15 | Auto-Archive Inactive Habits | Micro | 2h | MEDIUM |
| M10 | Last Completed Timestamp | Micro | 1.5h | MEDIUM |
| M12 | Color Coding by Period | Micro | 1h | LOW |
| S1 | Morning Check-In Notification | Small | 4h | HIGH |
| S2 | Don't Break Streak Nudge | Small | 3h | HIGH |
| S3 | Pre-Habit 5-Min Nudge | Small | 4h | HIGH |
| S7 | 52-Week Annual Heatmap | Small | 4h | HIGH |
| S14 | "Today at a Glance" Summary Card | Small | 3h | HIGH |
| S10 | Habit "Why" Field | Small | 2h | HIGH |
| S15 | Habit Pause / Vacation Mode | Small | 4h | HIGH |
| S11 | Flexible Habit + Auto-Rollover | Small | 5h | HIGH |
| S6 | Weekly Goals Box | Small | 4h | HIGH |
| S4 | Habit Priority Tag | Small | 3h | MEDIUM |
| S5 | Energy Level Tag | Small | 3h | MEDIUM |
| S8 | Weekly Summary Notification | Small | 3h | HIGH |
| S9 | Habit Notes Field | Small | 2h | MEDIUM |
| S12 | Quick Capture Inbox | Small | 4h | MEDIUM |
| S13 | Completion Sound | Small | 2h | MEDIUM |
| AI2 | Scheduling Insight at Creation | AI | Low | HIGH |
| AI3 | Overcommitment Warning | AI | Low | MEDIUM |
| AI4 | Weekly Summary (Template) | AI | Low | HIGH |
| AI5 | Persistent Weak Day Alert | AI | Low | HIGH |
| AI6 | Streak Recovery Path | AI | Low-Med | HIGH |
| MD3 | Goal-Based Onboarding | Medium | 1.5d | VERY HIGH |
| MD4 | Habit Template Library | Medium | 1.5d | HIGH |
| MD1 | Achievement Badge System | Medium | 1.5d | HIGH |
| MD2 | Focus Session Mode | Medium | 1d | HIGH |
| MD7 | Per-Habit Full Streak Tracking | Medium | 1d | HIGH |
| MD8 | Smart Scheduling Suggestion | Medium | 4h | HIGH |
| L4 | Time-of-Day Performance Card | Large | 1.5d | HIGH |
| L5 | Best/Worst Day Analysis Card | Large | 1d | HIGH |
| L3 | Weekly Habit Report | Large | 2d | HIGH |
| MD5 | Notification Shade Card | Medium | 1d | HIGH |
| L1 | XP-Unlockable Wallpaper Themes | Large | 3d | HIGH |
| L2 | User-Defined Reward Shop | Large | 2d | HIGH |
| MD6 | Home Screen Widget | Medium | 2d | VERY HIGH |
| AI1 | Natural Language Habit Entry | AI | Medium | HIGH |
| AI7 | Energy-Aware Habit Warning | AI | Low | MEDIUM |

---

## Summary

| Tier | Features | Estimated Time |
|---|---|---|
| Micro (M1-M15) | 15 | ~25 hours |
| Small (S1-S15) | 15 | ~50 hours |
| AI (AI1-AI7) | 7 | ~20 hours |
| Medium (MD1-MD8) | 8 | ~10 days |
| Large (L1-L5) | 5 | ~12 days |
| **Grand Total** | **50** | **~37 dev days** |

**Key insight: The first 15 features (Micro tier) take ~25 hours combined and deliver a
massive emotional quality uplift with zero added complexity to the existing app.**

---
Document: September 2026
Sources: Competitor analysis, ShuOmi YouTube video, Habitify, Way of Life, Duolingo, Finch,
Fabulous, Routinery, Habitica, LifeUp, Sunsama, Structured, TimeStripe, Twos, Amplenote
