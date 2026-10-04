# ODYSSEY — MASTER FEATURE TODO

> **⚠️ FROZEN ARCHIVE — DO NOT USE AS A WORK LIST.**
>
> - **Order and status:** `main_plan.md` at the repo root. Read that first.
> - **Feature definitions:** `MASTER_TODO_REVISED.md` §5 (A–J catalogue) and §19 (production
>   matrix). Those already deduplicate everything in this file.
>
> Every feature below has a canonical ID in `MASTER_TODO_REVISED.md` and a phase in
> `main_plan.md`. Do not implement an item from here directly — find its canonical
> ID and work from that.
## All Non-AI Features · Sorted by Effort (Smallest → Largest)
## Check off what you want to build. Leave unchecked what you don't.

> **How to use:**
> - [ ] = Not yet decided
> - [x] = Approved to build
> - [-] = Rejected / Won't do
>
> AI features are in a separate file: `AI_TODO.md`

---

---

# TIER 1: MICRO (30 min – 2 hours each)
## Copy, labels, badges, tiny visual polish — no logic changes

- [ ] **M1** — "Your data lives on your device" trust badge in Settings/Profile
- [ ] **M2** — Empty state copy for Habits page when no habits exist
- [ ] **M3** — Empty state copy for Planner when nothing is scheduled
- [ ] **M4** — All-habits-done celebration message on today's schedule
- [ ] **M5** — Habit creation confirmation: "Your journey with [Habit] begins now."
- [ ] **M6** — First-app-open welcome message for new users
- [ ] **M7** — "Last done: Yesterday" / "3 days ago" label on each habit card
- [ ] **M8** — Daily capacity label: Light / Steady / Full / Heavy day (count-based)
- [ ] **M9** — "3/5 habits done today" fraction in day-schedule header
- [ ] **M10** — Completion fraction on wallpaper: "3/5" or "60%" always visible
- [ ] **M11** — Color coding by time period: morning=amber, afternoon=blue, evening=purple, night=indigo
- [ ] **M12** — "Up next in 45 min: Deep Work" preview line on day-schedule page
- [ ] **M13** — Warm microcopy throughout: streak labels, XP messages, empty states
- [ ] **M14** — Level-up message (unique per rank, not generic "Level Up!")
- [ ] **M15** — Achievement badge unlock messages (one unique message per badge)
- [ ] **M16** — Onboarding goal labels — names for each goal category
- [ ] **M17** — Processing/loading animation: Spinning dots or circular animation for AI processing states (HabitDriven style)

---

---

# TIER 2: SMALL (2–4 hours each)
## Single-field additions, small UI components, simple logic

### Habit Card Enhancements
- [ ] **S1** — Per-habit streak flame icon on each habit card (separate from global streak)
- [ ] **S2** — Habit priority tag: Critical / Focus / Optional — shown as accent color on card and wallpaper
- [ ] **S3** — Energy level tag per habit: High Energy ⚡ / Low Energy 🌙 / Passive — shown on card
- [ ] **S4** — Habit notes field: single-line personal reminder ("Remember: even 5 min counts")
- [ ] **S5** — Habit "Why" field in create/edit modal: "Why does this habit matter to you?"
- [ ] **S6** — Identity statement per habit: "I am someone who reads every day" — shown on habit detail
- [ ] **S7** — Habit cue field: "What triggers this habit?" (from Power of Habit)
- [ ] **S8** — Habit reward field: "What will you reward yourself with?" (closes the habit loop)
- [ ] **S9** — "2-Minute Version" field: user defines minimal version shown when streak is at risk

### Schedule Enhancements
- [ ] **S10** — Gentle overloaded day warning: soft text when 8+ habits are scheduled
- [ ] **S11** — Current time indicator line on day-schedule timeline ("you are here")
- [ ] **S12** — Buffer/breathing room indicator between back-to-back habits (visual gap)
- [ ] **S13** — Task/habit planned duration field — used to calculate overload warnings

### Stats & Feedback
- [ ] **S14** — Week-over-week stats card: "78% this week vs 62% last week — up 16% ↑"
- [ ] **S15** — Streak milestone toast at 7, 14, 30, 60, 100, 365 days with unique messages
- [ ] **S16** — Daily energy log: morning 30-sec check-in — rate energy 1–5 — tracked over time

### Wallpaper
- [ ] **S17** — Keystone habit designation: user marks one habit — shown first on wallpaper, rewarded more
- [ ] **S18** — Daily Highlight: user pins ONE habit as today's non-negotiable — prominent on wallpaper
- [ ] **S19** — Today's Frog: user marks hardest habit — app nudges to complete before 10 AM + bonus XP

### New Interaction & Setup (From Research)
- [ ] **S20** — Color-coded date rings: Below each date, show colored circles for remaining/completed habits
- [ ] **S21** — Swipe gestures: Swipe right to mark done, left to skip, custom number input
- [ ] **S22** — Commitment ritual: Tap-and-hold animated circle to "commit" during setup
- [ ] **S23** — Break bad habits tracking: Track habits to stop, not just start

---

---

# TIER 3: HALF-DAY (4–8 hours each)
## New components, new modals, light backend logic

### Notifications
- [ ] **HD1** — Morning check-in push notification at configurable time: "Good morning. X habits today."
- [ ] **HD2** — "Don't break the streak" evening nudge: fires at 8 PM if any 5+ streak habit is incomplete
- [ ] **HD3** — Pre-habit 5-minute nudge: push notification 5 min before each scheduled habit hour
- [ ] **HD4** — Never miss twice notification: if missed yesterday + active streak → special high-priority nudge
- [ ] **HD5** — Sunday evening weekly summary push notification: completion %, best/worst habit

### Schedule Features
- [ ] **HD6** — "Today at a Glance" summary card: date, done/total, streak, first uncompleted + Start button
- [ ] **HD7** — Quick reschedule on miss: if habit missed → "Reschedule?" CTA with next available slot
- [ ] **HD8** — Guided morning planning ritual: modal walks user through review yesterday → confirm today → start
- [ ] **HD9** — Evening shutdown / reflection prompt: review completed → process incomplete → rate day 1–5
- [ ] **HD10** — Schedule sharing as image: one-tap share today's schedule as a visual card

### Habit Management
- [ ] **HD11** — Habit completion micro-animation: confetti burst + checkmark bounce + "Done!"
- [ ] **HD12** — Habit completion sound: optional toggleable chime on completion
- [ ] **HD13** — Auto-archive prompt: if habit not done in 14+ days → "Pause or remove?"
- [ ] **HD14** — Habit pause / vacation mode: pause individual habits 1–30 days without streak penalty
- [ ] **HD15** — Flexible habit type + auto-rollover: no fixed hour, rolls to next slot if missed
- [ ] **HD16** — Quick capture inbox: floating "+" → single-line input → saved to Inbox → promote to habit
- [ ] **HD17** — Context tagging: @morning, @gym, @home, @anywhere — filter habits by context
- [ ] **HD18** — "Protect the asset" recovery category: special category for sleep/rest/walk habits
- [ ] **HD19** — Habit stacking: link habits in sequence ("After [A] → do [B]") — shown as chain
- [ ] **HD20** — Temptation bundling: pair a habit with an enjoyable activity — notes field variant

### Stats
- [ ] **HD21** — 52-week annual heatmap on Stats page (GitHub-style, year-at-a-glance)
- [ ] **HD22** — Weekly goals box: 3 text fields (this week / month / year) in Stats or Profile
- [ ] **HD23** — Deep Work Hours counter: habits tagged "Deep Work" → separate weekly depth score
- [ ] **HD24** — Time-of-day performance card: "Morning: 91% · Afternoon: 67% · Evening: 43%"
- [ ] **HD25** — Best day / worst day analysis: "Strongest: Wednesday · Toughest: Sunday"

### Views, Pricing & Extras (From Research)
- [ ] **HD26** — View mode switcher: Toggle between Grid / List / Heatmap views for habits
- [ ] **HD27** — Profession-based personalization: Ask profession during onboarding, personalize pricing/features
- [ ] **HD28** — Modular pricing system: Buy individual features OR discounted bundle
- [ ] **HD29** — Inbox/backlog quick-add: Quick-add ideas to a backlog, later assign to schedule
- [ ] **HD30** — Breathing exercises + ambient sounds: Mini-feature for focus sessions

---

---

# TIER 4: FULL-DAY (1–2 days each)
## New pages, complex logic, significant design work

### Gamification & Rewards
- [ ] **FD1** — Achievement badge system: 7-Day Warrior, Iron Will (30d), Early Riser, Night Owl, Perfect Week, Laser Focus (21d), Legend (365d)
- [ ] **FD2** — Non-punitive streak break screen: warm message + "Restart" CTA + show previous best streak
- [ ] **FD3** — Chapter-based progress: 30-day "seasons" instead of infinite streaks — fresh start each chapter
- [ ] **FD4** — Frog completion reward: special XP bonus + unique animation when Frog habit is done first
- [ ] **FD5** — Dynamic difficulty scaling: after 14d at 100% → suggest leveling up ("Try 15 min instead of 10?")
- [ ] **FD6** — 5 AM Club badge: achievement for completing morning habits before 6 AM for 7 consecutive days

### Schedule & Planning
- [ ] **FD7** — Focus session mode: tap habit → fullscreen countdown timer + habit name + Why + "Mark Complete"
- [ ] **FD8** — "Ideal week" template: user designs ideal weekly structure → Stats shows actual vs ideal
- [ ] **FD9** — Workload threshold warning: if planned hours > daily limit → guided deferral before day starts
- [ ] **FD10** — Availability windows: user defines "I'm available 6 AM–10 PM" → habits only in this range
- [ ] **FD11** — "Defend this time" habit hardening: flexible habits start soft → harden as window closes

### Unique Odyssey Features
- [ ] **FD12** — Habit Resonance visual: card evolves with age — new (plain) → growing (glow) → established (gold) → deep (diamond)
- [ ] **FD13** — Anti-habit tracking: track things you're quitting (no alcohol, no social media) with clean-day streaks
- [ ] **FD14** — "Parallel Self" mirror: weekly — "If you hadn't missed: [simulated stats]. Gap: [X] habits"
- [ ] **FD15** — "Habit Weather" daily forecast: "⛅ 65% chance of full completion based on history"
- [ ] **FD16** — Compound Effect visualizer: "If you do [Habit] daily for 1 year = [X] hours = [skill level]"
- [ ] **FD17** — Minimum Viable Habit emergency mode: one-tap → all habits reduce to 2-min versions (⚡ marker)
- [ ] **FD18** — Essentialism Audit: monthly prompt → show each habit's completion rate → Commit / Pause / Archive
- [ ] **FD19** — Habit Debt system: missed flexible habits create "debt hours" → pay back → "Debt Free" animation
- [ ] **FD20** — Life Week counter: dots showing weeks lived / remaining (based on age) — perspective tool
- [ ] **FD21** — Decision Fatigue Reduction Mode: when overwhelmed → collapse schedule → show ONE habit at a time

### Wallpaper-Exclusive Features
- [ ] **FD22** — Wallpaper as behavioral cue: wallpaper state changes per habit (prep → active → done)
- [ ] **FD23** — Identity statement on wallpaper: during a habit's hour → wallpaper shows identity text
- [ ] **FD24** — Wallpaper Decay Mode: 3+ missed days → colors desaturate → recovers as habits are completed
- [ ] **FD25** — Wallpaper "Schedule State": sunrise palette → vibrant midday → calm sunset as day progresses
- [ ] **FD26** — Energy Gradient schedule background: bright where you're strong, muted where you struggle
- [ ] **FD27** — Ghost Schedule: translucent ideal schedule behind actual — shows drift from plan

---

---

# TIER 5: MULTI-DAY (3–7 days each)
## Major features, full sprint work

- [ ] **XL1** — Goal-based first-run onboarding: "What's your focus?" → suggest habits → under 60 sec to first habit
- [ ] **XL2** — Habit template library modal: Morning Clarity, Deep Work, Sleep, Fitness, Digital Detox — tap → preview → add
- [ ] **XL3** — Home screen widget (Android Glance API): current/next habit, X/Y done, streak, tap to open
- [ ] **XL4** — Notification shade persistent card: "3/7 habits · 🔥 12-day streak" with progress bar
- [ ] **XL5** — XP-unlockable wallpaper themes: Midnight Blue (Lv3), Forest Green (Lv5), Sunset Amber (Lv8), Neon (Lv12), Diamond (Lv20)
- [ ] **XL6** — User-defined reward shop: users add their own rewards with custom coin prices
- [ ] **XL7** — Weekly habit report: one-screen Sunday digest — stats, streaks, best/worst, CTA
- [ ] **XL8** — Per-habit full streak tracking page: current streak + best ever + completion graph
- [ ] **XL9** — Monthly Chapter Covers: auto-generated wallpaper art from month's data → saved to gallery
- [ ] **XL10** — Schedule Replay animation: 10-sec day recap showing habits completing in sequence (shareable)
- [ ] **XL11** — Life Week dots wallpaper theme: each dot = one week, filled = lived, current = glowing
- [ ] **XL12** — Cue-to-action latency tracking: time from first unlock in habit hour → completion = "reaction time"
- [ ] **XL13** — Avatar house/world system: Upgradeable living space (bookshelf, posters, pool, pet) for avatar
- [ ] **XL14** — Social media blocker with stakes: Complete tasks to unlock apps, or avatar takes damage per minute
- [ ] **XL15** — Live focus leaderboard: Show who's focusing right now with live streaks and presence bar

---

---

# TIER 6: SOCIAL / COMMUNITY (Large effort — requires backend)

- [ ] **SC1** — Public user profile page (avatar, name, streak, XP, badge summary)
- [ ] **SC2** — Follow / unfollow system with privacy tiers (public, friends-only, private)
- [ ] **SC3** — Public heatmap view of followed user's habit completion
- [ ] **SC4** — Activity feed of recent completions from people you follow
- [ ] **SC5** — Share a habit via public link — others can import it
- [ ] **SC6** — Community challenges (30-day reading, step count) with group leaderboard
- [ ] **SC7** — Comments / reactions on habit completion posts
- [ ] **SC8** — Per-habit privacy controls — hide specific habits from public profile
- [ ] **SC9** — Milestone notifications for followed users (streak, badge unlock)
- [ ] **SC10** — Discover page — top users, trending habits, community stats

---

---

# TIER 7: HABIT TEMPLATE BUNDLES (Content only — no code, just data)

- [ ] **TB1** — "Morning Warrior": Sunlight + Hydrate + Meditation + Journal + Exercise + Reading
- [ ] **TB2** — "Miracle Morning SAVERS": Silence + Affirmations + Visualization + Exercise + Reading + Scribing
- [ ] **TB3** — "Deep Work Foundation": No-phone 30 min + Eat the Frog + 90-min deep work + Pomodoro + Shutdown ritual
- [ ] **TB4** — "Sleep Optimization": Consistent wake + Sunlight + No caffeine after 2 PM + No screens before bed + Wind-down
- [ ] **TB5** — "Mind & Body Balance": Movement + Meditation + Gratitude + Reading + Reflection + Nature walk
- [ ] **TB6** — "Digital Detox": No phone 30 min + No social before noon + Batch email + No screens 9 PM + Weekly phone-free
- [ ] **TB7** — "Anti-Habits / Quit Tracker": No alcohol + No social before noon + No screens in bed + No news AM + No multitask
- [ ] **TB8** — "Fitness Foundation": Workout + Post-meal walk + Stretch + Hydration
- [ ] **TB9** — "20/20/20 Victory Hour": 20 min move + 20 min reflect + 20 min learn
- [ ] **TB10** — "5 AM Club": Wake 5 AM + Cold shower + Exercise + Journal + Reading

---

---

# SUMMARY

| Tier | Items | Effort per item | Total Effort |
|------|-------|-----------------|--------------|
| Micro | 16 | 30 min – 2 hours | ~16 hours |
| Small | 19 | 2–4 hours | ~50 hours |
| Half-Day | 25 | 4–8 hours | ~150 hours |
| Full-Day | 27 | 1–2 days | ~40 days |
| Multi-Day | 12 | 3–7 days | ~50 days |
| Social | 10 | Requires backend | Sprint+ |
| Templates | 10 | Content only | ~5 hours |
| **TOTAL** | **119 features** | | |

> AI features are in **AI_TODO.md** (15 items)

---

*Last updated: September 2026*
*Sources: Habit Research/, Schedule Research/, books_brainstorm_and_habits.md*
