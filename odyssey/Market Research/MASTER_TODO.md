# ODYSSEY — THE ULTIMATE MASTER PRODUCTION ROADMAP & FEATURE SPECIFICATION

> **⚠️ SUPERSEDED — THIS IS NOT THE SINGLE SOURCE OF TRUTH.**
> Despite the title, that role now belongs to **`main_plan.md`** at the repo root, which
> holds feature order, phase assignment and status. Read that first.
>
> This document remains useful as **detailed UI/UX specification and design-system
> rationale**. Where it conflicts with `main_plan.md`, `main_plan.md` wins.
> See `DEVELOPMENT_PLAN.md` §1 (Document Authority Map).
## The Single Source of Truth for Architecture, UI/UX Design System, Feature Specifications, and Production TODOs
> **Document Purpose:** This is the complete blueprint for Odyssey. It combines every user review, competitor insight, visual video analysis, behavioral psychology principle, gamification mechanism, and AI algorithm into an exhaustive, actionable production manual. No other document is required to build the app.

---

# SECTION 1: ODYSSEY UI/UX DESIGN SYSTEM & VISUAL SPECIFICATION

## 1.1 Aesthetic Philosophy: "Cyber-Zen & Gamified Elegance"
Odyssey bridges the gap between **high-end productivity tools (Amie, Akiflow, Structured)** and **immersive gamified worlds (Habitica, Forest, Regain)**. The visual design must evoke a feeling of calm focus, high responsiveness, and rewarding progression.

### Core Visual Principles
1. **Cinematic First Impressions:** Onboarding and first-open flows must use staggered card entrances, fluid spring physics, and animated vector illustrations (inspired by Akiflow, TickTick, and Forest).
2. **Gesture-Driven Velocity:** Every primary action supports frictionless tactile gestures — swipe-to-complete, swipe-to-snooze, tap-and-hold commitment rituals, and horizontal day swiping.
3. **Information Density with Breathability:** Large, scannable typography paired with generous padding, delicate border strokes, frosted glassmorphism, and colored status accents.
4. **Ambient State Feedback:** The UI dynamically shifts tone based on the time of day, active focus state, and habit completion percentage.

---

## 1.2 Design Tokens & Color Palettes

### Dark Mode (Primary Default)
- **Background Base:** `#090A0F` (Deep Void Blue/Black)
- **Surface Elevation 1 (Cards, Sheets):** `#121520` (Dark Navy with 1px border `#1E2337`)
- **Surface Elevation 2 (Modals, Popovers):** `#1A1F30` (Frosted Glass with 12px blur)
- **Accent Primary (Focus / Energy):** `#6366F1` (Electric Indigo / Violet)
- **Accent Secondary (XP / Rewards):** `#F59E0B` (Chrono Amber / Gold)
- **Accent Success (Completion):** `#10B981` (Emerald Glow)
- **Accent Danger (Health Damage / Streak Risk):** `#EF4444` (Crimson Pulse)
- **Accent Cyan (Habit Resonance):** `#06B6D4` (Cyan Aura)

### Light Mode (TickTick / Amie Inspired)
- **Background Base:** `#F8FAFC` (Clean Crisp Slate)
- **Surface Elevation 1:** `#FFFFFF` (Pure White Card with soft drop-shadow `rgba(0,0,0,0.04)`)
- **Surface Elevation 2:** `#F1F5F9` (Subtle Light Gray Container)
- **Border Subtle:** `#E2E8F0`
- **Text Primary:** `#0F172A`
- **Text Secondary:** `#64748B`

### Time-of-Day Ambient Color Accents
- **Morning (05:00 – 11:59):** Amber Horizon `#F59E0B` / Soft Gold gradient
- **Afternoon (12:00 – 16:59):** Solar Azure `#3B82F6` / Clean Cyan
- **Evening (17:00 – 20:59):** Twilight Purple `#8B5CF6` / Sunset Rose
- **Night (21:00 – 04:59):** Midnight Indigo `#4F46E5` / Deep Obsidian

---

## 1.3 Micro-Interactions & Animation Specifications

1. **Circular Multi-Color Date Completion Rings (HabitDriven/Motivated Inspiration):**
   - **Where:** In the horizontal date selector header.
   - **UI Spec:** Below each date number (e.g., "14 Wed"), a segmented circular ring or mini dot cluster appears. Each dot/segment is colored with the exact category color of the scheduled habit.
   - **Behavior:** As a habit is completed, its corresponding segment fills solid with a bright glow. Incomplete habits remain hollow outline rings. Users can instantly see which specific categories are pending without opening the day.

2. **Swipe-to-Complete Gesture with Inline Numeric Stepper (Productive/Streaks Inspiration):**
   - **Swipe Right:** Triggers emerald green slide-reveal with spring bounce. For binary habits: immediately marks done + plays celebratory confetti burst and haptic tick. For measurable habits (e.g., "Drink 2.5L Water" or "Read 20 pages"): reveals an interactive inline numeric stepper/slider to log exact quantity before confirming.
   - **Swipe Left:** Triggers amber slide-reveal with options: "Skip (Reason)", "Snooze (+1h)", "2-Min Version".

3. **Tap-and-Hold Commitment Ritual (Fabulous Inspiration):**
   - **Where:** Onboarding completion, New Habit Creation, and Morning Planning Ritual.
   - **UI Spec:** A glowing circular button labeled "Hold to Commit". As the user presses and holds, a radiant gradient ring charges clockwise over 1.5 seconds accompanied by escalating haptic vibrations, culminating in a haptic pop, screen flash, and particle bloom.

4. **Spinning Orbital Dots AI Processing Indicator (HabitDriven Inspiration):**
   - **UI Spec:** Instead of generic spinner or static text, 4-6 multi-colored luminous dots orbit in an elliptical trajectory with acceleration and trail decay while AI computes timetables, parses natural language, or generates weekly summaries.

5. **Radar Sweep Focus Activation (Regain Inspiration):**
   - **UI Spec:** When entering Focus Mode / Study Room, a concentric sonar radar wave pulses outward across the screen from the center timer icon, showing subtle grid lines and finding active focus peers.

6. **Rank-Up Portal Cinematic (Fabulous & Habitica Inspiration):**
   - **UI Spec:** When user levels up a rank tier (e.g., Apprentice → Voyager), a full-screen illustrated modal triggers where the user's custom avatar walks forward through an illuminated dimensional doorway into a newly unlocked environment.

7. **Confetti & Particle Celebration (Streaks & TickTick Inspiration):**
   - Multi-colored confetti burst with physics simulation (gravity, spin, flutter) when all daily habits or milestones are completed.

---

## 1.4 Detailed Screen Layouts & Structural Changes

### A. The Planner / Day Schedule Screen (Structured & TickTick Evolution)
- **Header:** Sticky top bar with current date, month dropdown, horizontal 7-day strip featuring **Color-Coded Habit Completion Rings**, and a mini fraction badge ("4/6 Done · 67%").
- **Swipe Gesture:** Full-screen horizontal swipe to seamlessly navigate to Yesterday (swipe right) or Tomorrow (swipe left).
- **Left-Rail Timeline (Structured-Style):**
  - Continuous vertical time axis on the left margin (05:00 to 23:00).
  - Habit/Task Category Icons are positioned on the far left rail and **stretch vertically** across the scheduled duration block (e.g., a 2-hour Deep Work block has an elongated category pill with glowing dotted connection lines).
  - Provides maximum horizontal width for the habit title, energy tags, why statement, and action controls.
- **Hero Dynamic Priority Slot (Habi-Style):**
  - The first pending/unlogged habit of the current hour automatically gets an elevated glowing border and "UP NEXT" badge.
- **Contextual Pomodoro / Focus Trigger:**
  - If the active time block is tagged as `Study`, `Work`, or `Deep Work`, an inline "Start Pomodoro" button appears with selectable visual timer layouts (Ring, Flip Clock, Minimal Zen, Lofi Ambient).
- **Floating Quick-Add Drawer (Structured & Sunsama Backlog):**
  - Floating Action Button (+) reveals a bottom quick-capture drawer. Users can quickly type task ideas into an **Unscheduled Backlog Inbox** and drag-assign them into empty schedule slots later.

### B. The Habits Management Screen (HabitBee & Productive Evolution)
- **View Mode Switcher Tab Bar:** Top pill toggle allowing instant switching between:
  1. **Card Grid View:** Vibrant 2-column cards showing icon, streak flame, priority pill, and weekly 7-day mini check dots.
  2. **Compact List View:** Minimal single-row list optimized for rapid scanning and swipe actions.
  3. **Heatmap Matrix View (HabitBee Style):** Full 5-month GitHub-style color intensity heatmaps for every single habit stacked in a scrollable list.
- **Break Bad Habits / Anti-Habit Section:**
  - Dedicated tab or toggle for "Quit / Detox" trackers (e.g., "No Social Media Before Noon", "No Junk Food", "Zero Alcohol"). Shows clean-day counters and temptation emergency buttons.

### C. The Live Wallpaper Engine Screen (Odyssey Proprietary Moat)
- **Live 24-Hour Spectrum Bar:** Visual rainbow spectrum showing the day's timeline.
- **Top 2 Active Blocks:** Hero display of current active block (`NOW`) and upcoming block (`NEXT`).
- **Dynamic 4-Habit Grid:** Shifts automatically across morning, afternoon, evening, and night.
- **Identity Statement Ambient Subtitle:** Displays the habit's "Why / Identity" statement directly on the home screen during active hours.
- **Wallpaper Decay State:** If user neglects habits for 3+ consecutive days, the wallpaper colors subtly desaturate into monochrome, regaining vibrancy as habits are checked off.

### D. The Avatar World & Living Space Screen (Forest + Habitica Evolution)
- **Interactive Isometric / 2D Illustrated Room:**
  - The user's custom avatar lives inside an upgradeable room.
  - **Furniture & Upgrades:** Bookcase (fills with books as Reading habit grows), Study Desk, Workout Mat, Motivation Posters (upgradable with XP coins), Plant/Garden, Pet corner (hatchable eggs from shop), and Background Themes (Dorm Room, Mountain Cabin, Cyberpunk Loft, Seaside Villa).
  - **Avatar State Reflections:** When user is studying, avatar sits at desk studying; when resting, avatar sleeps; when streak is unbroken, room is clean and bathed in sunlight; when habits are neglected, room becomes dusty.
  - **Social Media Damage Visualizer:** When user exceeds allowed screen time or breaks lockdown, avatar shows visible injury/bandage states and health bar decreases.

---

# SECTION 2: PRODUCTION MASTER TODO LIST (CATEGORIZED & PRIORITIZED)

---

# PART 1: MICRO IMPLEMENTATIONS (30 min – 2 hours each)
## Tier 1: Copy, Labels, Micro-Badges, and Visual Polish

- [ ] **M1** — **Trust Badge:** Add "🔒 100% Local-First — Your data never leaves your device" badge in Settings and Profile.
- [ ] **M2** — **Habits Empty State:** Illustrative empty state for Habits page: "Your journey starts with a single step. Add your first keystone habit." + pulse CTA.
- [ ] **M3** — **Planner Empty State:** "Your day is a clean slate. Tap + or import a routine template to begin."
- [ ] **M4** — **All-Habits-Done Banner:** Celebratory card appearing on Day Schedule when daily score = 100%: "🌟 Perfect Day Achieved! +50 Bonus XP Claimed."
- [ ] **M5** — **Creation Confirmation Toast:** "Your journey with [Habit Name] begins now. First milestone: 3-day streak."
- [ ] **M6** — **First-Open Welcome Banner:** Warm greeting on first launch highlighting the 3 core pillars (Habits, Schedule, Wallpaper).
- [ ] **M7** — **Last Completed Label:** Subtitle on habit cards: "Last done: Today at 8:15 AM" / "Yesterday" / "3 days ago".
- [ ] **M8** — **Daily Capacity Indicator:** Badge on Planner header calculating workload: "Light Day (3 habits)" / "Balanced (5 habits)" / "Heavy Capacity (8+ habits)".
- [ ] **M9** — **Completion Fraction Header:** Sticky fraction display in schedule header: "3/5 Habits Done · 60%".
- [ ] **M10** — **Wallpaper Completion Gauge:** Render miniature completion percentage ("75%") and fraction ("3/4") directly on the live wallpaper preview.
- [ ] **M11** — **Time Period Color Accents:** Ambient color coding across cards: Morning (Amber `#F59E0B`), Afternoon (Blue `#3B82F6`), Evening (Purple `#8B5CF6`), Night (Indigo `#4F46E5`).
- [ ] **M12** — **Up Next Preview Line:** Dynamic ticker on Planner: "⏳ Up next in 35 min: Deep Work Session (2h)".
- [ ] **M13** — **Microcopy Polish:** Replace generic labels with inspiring copy across XP toasts, streak counters, and empty states.
- [ ] **M14** — **Unique Rank Level-Up Dialogs:** Custom lore messages for each of the 9 ranks (Beginner, Explorer, Voyager, Pathfinder, Vanguard, Ascendant, Master, Grandmaster, Legend).
- [ ] **M15** — **Achievement Unlock Micro-Narratives:** Unique flavor text for every badge unlock explaining the psychological significance of the milestone.
- [ ] **M16** — **Onboarding Goal Category Tags:** Crisp category labels during onboarding: "Academic Excellence", "Peak Health", "Deep Focus", "Mindfulness", "Digital Detox".
- [ ] **M17** — **AI Processing Orbital Loader:** Multi-color orbital dot animation (HabitDriven style) for all AI and background computation states.
- [ ] **M18** — **Tip Jar / Coffee Button:** "☕ Buy the Developer a Coffee" support tile in Settings (Forest inspired).

---

# PART 2: SMALL IMPLEMENTATIONS (2–4 hours each)
## Tier 2: Single-Field Additions, Gesture Handlers, and UI Components

### Habit Card & Form Enhancements
- [ ] **S1** — **Per-Habit Streak Flames:** Individual flame icon and number on each habit card distinct from global profile streak.
- [ ] **S2** — **Habit Priority Tags:** `Critical 🔴` / `Focus 🟡` / `Optional 🟢` tags rendered as colored border accents and wallpaper highlights.
- [ ] **S3** — **Energy Level Indicators:** `⚡ High Energy` / `🌙 Low Energy` / `☕ Passive` badges on cards and create/edit modal.
- [ ] **S4** — **Habit Cue/Trigger Field:** Input field: "What triggers this habit?" (e.g., "After I pour my morning coffee").
- [ ] **S5** — **Habit Reward Field:** Input field: "What is your immediate reward?" (e.g., "5 minutes of music").
- [ ] **S6** — **Identity Statement Field:** Input field: "Who does this make you?" (e.g., "I am an athlete who never skips training") — displayed on habit detail sheet and wallpaper.
- [ ] **S7** — **Habit "Why" Purpose Statement:** Single-line reminder displayed during active habit hours.
- [ ] **S8** — **2-Minute Emergency Version:** User defines minimal fall-back version (e.g., "Read 1 page" instead of "Read 30 mins") shown when streak is endangered.
- [ ] **S9** — **Break Bad Habits / Quit Mode:** Toggle habit type to "Anti-Habit / Quit" with red accent styling and clean-days tracker.

### Interactive UI & Gestures
- [ ] **S10** — **Color-Coded Date Completion Rings:** Multi-color segmented rings below each date in horizontal calendar strip (HabitDriven/Motivated style).
- [ ] **S11** — **Swipe-Right to Complete Gesture:** Tactile right-swipe on habit card with green spring feedback and haptic tick.
- [ ] **S12** — **Swipe-Left for Action Drawer:** Tactile left-swipe revealing "Snooze 1h", "2-Min Version", or "Skip with Reason".
- [ ] **S13** — **Inline Numeric Stepper on Swipe:** For measurable habits, swiping right smoothly exposes `[-] [ Count ] [+]` stepper directly in card.
- [ ] **S14** — **Tap-and-Hold Commitment Ritual:** Circular hold-to-commit button with radial progress fill for onboarding and habit creation (Fabulous style).
- [ ] **S15** — **Horizontal Day-Swipe Navigation:** Swipe left/right across day planner to change dates effortlessly (Sunsama style).

### Schedule & Wallpaper Enhancements
- [ ] **S16** — **Current Time Indicator Line:** Glowing red/indigo horizontal marker on day timeline showing "NOW (14:25)".
- [ ] **S17** — **Buffer Gap Visualizer:** Subtle dashed spacing between consecutive habits indicating rest/transition periods.
- [ ] **S18** — **Planned Duration Field:** Automatic duration calculator warning if total planned hours exceed waking hours.
- [ ] **S19** — **Keystone Habit Pinning:** User designates 1 keystone habit that takes top priority on wallpaper and awards 1.5x XP.
- [ ] **S20** — **Today's Highlight (Make Time):** Pinned non-negotiable daily goal displayed prominently on lock screen wallpaper.
- [ ] **S21** — **"Eat That Frog" Morning Bonus:** Marking hardest habit as Frog gives 2x XP bonus if completed before 10:00 AM.
- [ ] **S22** **Hero Unlogged Habit Position:** Incomplete habits automatically take precedence in wallpaper and schedule top card (Habi style).

### Feedback & Stats
- [ ] **S23** — **Week-over-Week Delta Card:** "📈 84% completion this week vs 68% last week (+16% improvement)".
- [ ] **S24** — **Streak Milestone Popups:** Custom celebration dialogs at 3, 7, 14, 21, 30, 60, 100, and 365 days.
- [ ] **S25** — **Daily Morning Energy Check-In:** 5-second 1-to-5 star/emoji energy prompt upon first app open.

---

# PART 3: MEDIUM IMPLEMENTATIONS (4–8 hours each)
## Tier 3: Modals, View Switchers, Notification Engines, and Pricing Systems

### Habit Views & Navigation
- [ ] **HD1** — **Tri-Mode Habit View Switcher:** Smooth tab toggle between **Grid Cards**, **Compact List**, and **GitHub Heatmap Matrix** (HabitBee style).
- [ ] **HD2** — **Left-Rail Timeline Layout:** Structured-style timeline with category icons pinned left and vertically stretched across block duration.
- [ ] **HD3** — **Unscheduled Backlog / Inbox Drawer:** Floating drawer to capture raw ideas/tasks and drag them onto schedule slots (Structured & Sunsama style).
- [ ] **HD4** — **Light Theme & Dark Theme Engine:** Full theme customizer with high-contrast light mode and OLED dark mode.
- [ ] **HD5** — **Custom Color Palette Picker:** Allow users to customize primary accent and category colors (TickTick style).

### Notifications & Reminders
- [ ] **HD6** — **Multi-Trigger Habit Notifications:** Configurable reminders: Exact time, 5 min before, 15 min before, or on block end.
- [ ] **HD7** — **Morning Blueprint Push:** Daily 07:00 AM notification: "Good morning! 5 habits planned today. First up: Morning Meditation at 07:30."
- [ ] **HD8** — **Evening Streak Defense Alert:** 20:00 PM nudge if 5+ day streak habit remains uncompleted: "🔥 Don't break your 14-day streak! 2 habits left."
- [ ] **HD9** — **"Never Miss Twice" High-Priority Alert:** If habit was missed yesterday, triggers special motivational alert today.
- [ ] **HD10** — **Sunday Weekly Digest Notification:** Weekly stats recap push with total hours logged and top performing habit.

### Rituals & Focus Modes
- [ ] **HD11** — **Guided Morning Planning Flow:** 60-second morning modal: Review yesterday → Confirm today's slots → Select Frog → Commit.
- [ ] **HD12** — **Evening Shutdown & Reflection Modal:** Review completed tasks → Reallocate missed habits to backlog → Log gratitude/score.
- [ ] **HD13** — **Contextual Pomodoro Engine:** Embedded Pomodoro timer that activates during Study/Deep Work hours with multiple clock faces (TickTick style).
- [ ] **HD14** — **Focus Audio Soundscapes:** Integrated ambient sound player (Rain, Forest, Lofi Beats, White Noise, Cafe) for study sessions (Forest style).
- [ ] **HD15** — **Breathing Pacer Widget:** Guided 4-7-8 and Box Breathing circle animation with gentle haptic rhythms for pre-study grounding.

### Habit Mechanics & Stacking
- [ ] **HD16** — **Habit Stacking Chains:** Link habits in direct sequence ("After [Morning Coffee] ➔ [Read 10 Pages]") with visual chain links.
- [ ] **HD17** — **Flexible Auto-Rollover:** Flexible habits automatically slide to next available free time slot if missed.
- [ ] **HD18** — **Habit Vacation / Freeze Mode:** Pause individual habits for 1–30 days without resetting streak counters.
- [ ] **HD19** — **Auto-Archive Inactive Habits:** Prompt to pause or archive habits abandoned for 14+ consecutive days.
- [ ] **HD20** — **Temptation Bundling Tag:** Pair an effortful habit with an enjoyable perk (e.g., "Only listen to favorite podcast while running").

### Analytics & Reporting
- [ ] **HD21** — **52-Week Annual Heatmap:** Year-at-a-glance GitHub-style density grid on Stats page.
- [ ] **HD22** — **Deep Work / Study Hour Accumulator:** Dedicated counter tracking cumulative deep focus hours per week/month.
- [ ] **HD23** — **Time-of-Day Performance Graph:** Visual bar breakdown showing completion % across Morning, Afternoon, Evening, and Night.
- [ ] **HD24** — **Best Day vs Worst Day Analysis:** Day-of-week breakdown identifying user's most productive and most vulnerable days.

### Monetization & Personalization
- [ ] **HD25** — **Profession-Tailored Onboarding & Paywall:** Ask user profession (Student / JEE-NEET Aspirant / Tech / Pro) and customize paywall copy, discount codes (e.g., `STUDENTFOCUS40`), and preset routines (Akiflow style).
- [ ] **HD26** — **Modular Feature Pricing System:** All-inclusive discounted subscription vs individual micro-passes for specific modules (e.g., Wallpaper Engine only, Focus Blocker only, RPG World only).
- [ ] **HD27** — **7-Day Free Trial Auto-Conversion Hook:** Post-onboarding personalized plan generation followed by seamless 7-day trial offering.
- [ ] **HD28** — **Shareable Timetable Image Exporter:** One-tap export of daily schedule formatted as a sleek mobile wallpaper or story graphic.

---

# PART 4: FULL-DAY COMPLEX IMPLEMENTATIONS (1–2 days each)
## Tier 4: Major Subsystems, Gamification Engines, and Behavioral Modes

### Gamification & Avatar Progression
- [ ] **FD1** — **Comprehensive Achievement Badge System:** 24 unlockable badges across Streaks, Deep Work, Early Rising, Consistency, and Comebacks with unique icons and XP payouts.
- [ ] **FD2** — **Non-Punitive Streak Recovery Screen:** Encouraging restart flow showing previous best streak, lessons learned, and 3-day ramp-up plan.
- [ ] **FD3** — **Monthly Seasons & Chapter Passes:** 30-day themed progression chapters (e.g., "Chapter 1: The Foundation") with exclusive wallpaper and cosmetic rewards.
- [ ] **FD4** — **Rank-Up Cinematic Structure Entry:** Animated illustration of user avatar entering new architectural realms upon achieving higher rank tiers (Fabulous style).
- [ ] **FD5** — **Dynamic Habit SIP Auto-Scaling (Systematic Improvement Plan):** After 14 days of 100% completion, prompt user to systematically scale habit parameters (+10% duration/reps) like an automated investment plan.

### Unique Behavioral Psychology Systems
- [ ] **FD6** — **Habit Resonance Card Visuals:** Habit cards visually evolve as habits age: New (Plain Matte) ➔ Consistent (Subtle Glow) ➔ Established (Gold Trim) ➔ Permanent Mastery (Diamond Hologram).
- [ ] **FD7** — **Parallel Self Mirror:** Sunday projection: "If you had hit 100% this week, you would have logged +6.5 hours of Deep Work and reached Rank Level 8."
- [ ] **FD8** — **Habit Weather Daily Forecast:** Morning predictive indicator: "⛅ 78% completion probability today based on your Wednesday trends."
- [ ] **FD9** — **Compound Effect Visualizer:** Interactive calculator: "Doing [Habit] for 30 min/day = 182.5 hours/year = Equivalent to 4.5 college courses."
- [ ] **FD10** — **Emergency Minimum Viable Habit (MVH) Switch:** One-tap emergency toggle that collapses all today's habits to their 2-minute versions during sickness or travel.
- [ ] **FD11** — **Monthly Essentialism Audit:** End-of-month review highlighting habits with <40% completion and guiding user to Commit, Modify, or Archive.
- [ ] **FD12** — **Habit Debt Clearing System:** Missed flexible habits accumulate into a manageable "Debt Hours" pool that can be cleared during weekend catch-up sessions.
- [ ] **FD13** — **Memento Mori / Life Weeks Dot Grid:** Visual perspective grid showing total weeks lived vs remaining based on life expectancy.
- [ ] **FD14** — **Decision Fatigue Triage Mode:** When user is overwhelmed, collapses schedule into a single full-screen card showing ONLY the current active task.

### Wallpaper-Exclusive Behavioral Engines
- [ ] **FD15** — **Wallpaper Dynamic State Transitions:** Wallpaper visual state shifts in real-time (Pre-Habit Warning ➔ Active Habit Glow ➔ Completed Dim).
- [ ] **FD16** — **Live Identity Statement Rendering:** Active habit's identity statement rendered in clean typography on lock screen during its scheduled hour.
- [ ] **FD17** — **Wallpaper Neglect Decay Mode:** Colors desaturate over 3 days of inactivity, regaining lush saturation as habits are logged.
- [ ] **FD18** — **Circadian Sky Gradient Background:** Wallpaper background color shifts smoothly through sunrise, zenith midday, golden hour, and midnight indigo.
- [ ] **FD19** — **Ghost Schedule Overlay:** Faint translucent blueprint of the ideal planned schedule displayed behind actual logged progress to visualize drift.

---

# PART 5: MULTI-DAY SPRINT FEATURES (3–7 days each)
## Tier 5: The Flagship Odyssey Moats (Avatar House, Focus Blocker, Social Presence)

### 1. The Avatar Living Space & World System (Forest + Habitica Fusion)
- [ ] **XL1** — **Interactive Living Room Engine:** Isometric/2D customizable room where the user's avatar resides.
- [ ] **XL2** — **Dynamic Furniture Sync:**
  - *Bookshelf:* Automatically populates with books as Reading habits are completed.
  - *Study Desk:* Avatar sits and studies when Focus Mode is running.
  - *Poster Wall:* User unlocks and equips motivational quote posters using earned diamonds.
  - *Garden / Plant Corner:* Virtual plants grow lush with streaks, withering if neglected.
  - *Pet Corner:* Eggs purchased from shop hatch into animated companion pets after 7-day streak streaks.
- [ ] **XL3** — **Room Themes & Environments:** Unlockable backgrounds (Cyberpunk Apartment, Zen Dojo, Mountain Chalet, Campus Dorm, Oceanic Sanctuary).
- [ ] **XL4** — **Avatar Nudge Engine:** Avatar in the room displays dialogue bubbles encouraging the user to maintain routines.

### 2. Social Media Lockdown & Avatar Damage Stakes
- [ ] **XL5** — **App & Website Blocker Integration:** Android Accessibility / UsageStats service blocking distracting apps (Instagram, YouTube Shorts, Reels, Games).
- [ ] **XL6** — **Task-Unlock Gate:** To open blocked apps, user must complete their pending scheduled habit or study block.
- [ ] **XL7** — **Avatar Health Damage Penalty:** If user chooses to bypass lockdown or exceeds allotted emergency minutes:
  - Avatar takes **1 HP damage per minute of doomscrolling**.
  - Visual damage states (bandages, sad animations).
  - If avatar HP reaches 0: user loses custom room decorations or incurs XP penalty.

### 3. Live Focus Rooms & Multiplayer Presence (Regain Inspired)
- [ ] **XL8** — **Live Social Focus Counter:** "🔥 142 students focusing right now" displayed in real-time with pulsing avatar rings.
- [ ] **XL9** — **Radar Sweep Initialization:** Sonar wave animation when entering study rooms searching for live peers.
- [ ] **XL10** — **Live Focus Leaderboard:** Real-time leaderboard showcasing top focus hours and unbroken streaks for today.
- [ ] **XL11** — **Study Room Audio Sync:** Synchronized ambient study audio and group Pomodoro timers for study squads.

### 4. Native Android Integrations & Onboarding
- [ ] **XL12** — **Android Glance Home Screen Widgets:** Interactive home screen widget showing next 3 habits, fraction done, streak flame, and quick-check button.
- [ ] **XL13** — **Persistent Notification Shade HUD:** Compact persistent notification card: "3/6 Habits Done · 🔥 12-Day Streak · Up Next: Deep Work 15:00".
- [ ] **XL14** — **Cinematic Onboarding Experience:** Interactive walkthrough with animated permission explanation cards (Regain style), goal discovery, and personalized routine setup in under 60 seconds.
- [ ] **XL15** — **Daily Schedule Replay Video Generator:** 10-second animated recap of the day's timeline completing sequentially, ready for WhatsApp/Instagram sharing.

---

# PART 6: SOCIAL & COMMUNITY EXPANSION (Backend Required)
- [ ] **SC1** — **Public User Profile:** Sharable profile showing avatar, title rank, current streak, trophy shelf, and monthly completion heatmap.
- [ ] **SC2** — **Friend System & Following:** Connect with study buddies and friends with granular privacy controls.
- [ ] **SC3** — **Social Habit Comments & High-Fives:** Leave encouraging comments and reactions on friends' logged completions (HabitShare style).
- [ ] **SC4** — **One-Tap Routine Sharing Links:** Generate public web links for routine templates allowing friends to import your full schedule.
- [ ] **SC5** — **Community Challenge Squads:** Strava-style group challenges (e.g., "75-Day Hard", "JEE 10-Hour Deep Work Club", "30-Day Morning Club") with group leaderboards.
- [ ] **SC6** — **Squad Habit Heatmap:** Shared grid showing daily consistency across the entire study group.
- [ ] **SC7** — **Marketplace for Item & Skin Trading:** User-to-user trading of rare cosmetic avatar accessories and room items.
- [ ] **SC8** — **Real-World Impact Rewards:** Convert virtual coins/achievements into real-world tree planting or charity contributions (Forest style).

---

# PART 7: AI INTELLIGENCE & INFERENCE ROADMAP

## Tier A: Rule-Based Scheduling & Pattern Logic (Zero API Cost, 100% Local)
- [ ] **AI-1** — **Period Completion Probability at Creation:** When user selects a time slot, displays historical success rate: "Morning: 88% completion · Evening: 41%".
- [ ] **AI-2** — **Overcommitment Warning Engine:** Triggers soft warning if scheduled workload exceeds 14-day rolling average by >50%.
- [ ] **AI-3** — **Persistent Weak Day Detection:** Identifies recurring drop-offs: "Sundays average 35% completion. Consider scheduling a recovery routine."
- [ ] **AI-4** — **Energy-Slot Conflict Alert:** Warns if a High Energy habit is scheduled during a historically low-energy hour.
- [ ] **AI-5** — **Schedule Collision Resolver:** Flags overlapping habits and automatically suggests adjacent free slots.
- [ ] **AI-6** — **Optimal Time Learner:** After 30 days of logs, calculates exact hour of highest completion probability per habit.
- [ ] **AI-7** — **Automated Weekly Progress Narrative:** Template-based weekly summary highlighting top wins and key areas for improvement.
- [ ] **AI-8** — **Dynamic Streak Recovery Path:** Generates 3-day step-down restart plan when a major streak breaks.
- [ ] **AI-9** — **Smart Auto-Reschedule on Miss:** If habit is missed at scheduled hour, prompts with one-tap reschedule to next free block.
- [ ] **AI-10** — **Weekly Routine Optimizer:** Sunday evening automated suggestions to rebalance unevenly loaded days.
- [ ] **AI-11** — **Monthly Habit Pruning Recommendations:** Recommends archiving habits that consistently fail to pass 30% completion.

## Tier B: Statistical ML & Correlation Discovery (Local Math)
- [ ] **AI-12** — **Habit Catalyst Correlation Detector:** Identifies habits that boost others: "On days you complete Morning Meditation, Deep Work completion increases by 34%."
- [ ] **AI-13** — **Energy-Performance Correlation:** Correlates daily 1-5 energy logs with habit completion to identify optimal productivity conditions.
- [ ] **AI-14** — **Predictive Day Completion Forecast:** Calculates morning probability score (e.g., "⛅ 76% Likely") based on day of week, streak momentum, and planned load.
- [ ] **AI-15** — **Habit Time Drift Detector:** Detects when actual completion time systematically drifts from scheduled time (e.g., scheduled at 18:00, completed at 19:30) and prompts schedule update.
- [ ] **AI-16** — **Burnout Early Warning System:** Detects 20%+ velocity drop over 14 days and prescribes a 3-day de-load routine.

## Tier C: Natural Language & LLM Coaching (Hybrid / Cloud)
- [ ] **AI-17** — **Natural Language Habit Creation:** Type "Gym workout for 1 hour every Mon Wed Fri at 6 PM" ➔ auto-populates full habit schema.
- [ ] **AI-18** — **Natural Language Schedule Command:** Type "Add 2 hours mock test tomorrow afternoon" ➔ slots block into timetable.
- [ ] **AI-19** — **Conversational AI Onboarding Profiler:** Interactive AI chat during onboarding assessing goals, obstacles, and student schedule to build starter routine (Amie style).
- [ ] **AI-20** — **AI Habit & Routine Architect:** Generates custom multi-week habit progression blueprints based on user career/exam target (e.g., "JEE Advanced 6-Month Study Blueprint").
- [ ] **AI-21** — **Personalized AI Weekly Coach Narrative:** Deep weekly synthesis evaluating mental stamina, focus depth, and giving personalized strategic advice.

---

# PART 8: MASTER HABIT TEMPLATE BUNDLES (Pre-Configured Routines)
- [ ] **TB1** — **JEE / NEET Aspirant Exam Protocol:** Wake 05:30 + Formula Revision + 3h Problem Practice + Flashcards + Mock Test Analysis + No Phone 21:00.
- [ ] **TB2** — **Deep Work & Software Engineering:** No Phone 30m + Eat The Frog (Hardest Bug/Feature) + 90m Flow State + Code Review + Shutdown Ritual.
- [ ] **TB3** — **Morning Warrior Routine:** Sunlight Exposure + 500ml Hydration + 10m Meditation + 20m Workout + Cold Shower + Journaling.
- [ ] **TB4** — **Miracle Morning S.A.V.E.R.S.:** Silence (5m) + Affirmations (5m) + Visualization (5m) + Exercise (20m) + Reading (20m) + Scribing (10m).
- [ ] **TB5** — **Sleep & Circadian Optimization:** Consistent Wake Time + Morning Sunlight + No Caffeine After 14:00 + Screen Dimming 20:00 + Magnesium/Wind-Down.
- [ ] **TB6** — **Digital Detox & Dopamine Reset:** No Social Before 12:00 + Batch Notifications 2x/day + Gray Screen Mode + Phone in Other Room at 21:00.
- [ ] **TB7** — **Student Anti-Procrastination Kit:** 5-Minute Rule + Pomodoro 25/5 + Clear Desk + Subject Rotation + Evening Retrospective.
- [ ] **TB8** **Physical Peak Conditioning:** 10k Steps + Mobility Stretch + Resistance Training + 3L Water + Protein Tracking.
- [ ] **TB9** — **Mental Clarity & Mindfulness:** 10m Box Breathing + Daily Gratitude (3 items) + Nature Walk + Evening Brain Dump + Reading.
- [ ] **TB10** — **5 AM Club Victory Hour (20/20/20):** 20m Intense Exercise + 20m Reflection/Meditation + 20m Skill Acquisition/Reading.

---

# SECTION 3: PRODUCTION EFFORT & EXECUTION DASHBOARD

| Implementation Tier | Total Features | Effort Per Item | Target Implementation Time |
|---|---|---|---|
| **Tier 1: Micro Polish** | 18 Features | 30m – 2h | ~18 Hours |
| **Tier 2: Small Enhancements** | 25 Features | 2h – 4h | ~65 Hours |
| **Tier 3: Half-Day Features** | 28 Features | 4h – 8h | ~160 Hours |
| **Tier 4: Full-Day Subsystems** | 19 Features | 1 – 2 Days | ~28 Days |
| **Tier 5: Flagship Moats** | 15 Features | 3 – 7 Days | ~60 Days |
| **Social / Community** | 8 Features | Backend Sprint | ~20 Days |
| **AI Subsystems (A, B, C)** | 21 Features | 2h – 3 Days | ~25 Days |
| **Template Bundles** | 10 Bundles | Content / Data | ~6 Hours |
| **TOTAL ODYSSEY ROADMAP** | **144 Detailed Features** | — | **Comprehensive Full-Scale Release** |

---

*Document Status: ACTIVE PRODUCTION BLUEPRINT*
*Compiled from direct competitor reviews, video frame analyses, and psychological habit design research.*
