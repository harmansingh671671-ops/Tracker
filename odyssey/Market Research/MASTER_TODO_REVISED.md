# Odyssey Product Research and Production Guide

> **⚠️ THIS IS NOT THE WORK LIST.** Feature **order** and **status** live in
> **`main_plan.md`** at the repo root — read that first. This document is the
> **evidence base**: full specifications, rationale, competitor analysis and habit
> science. It is the source that `main_plan.md` cites by section and line.
>
> This document also defines three of its own phase schemes (§8 Phase 0–5 and §19
> Phase 1–5), which **do not match each other** and **do not match `main_plan.md`'s
> 7 phases.** Those phase numbers are non-binding. Where they conflict, `main_plan.md`
> wins. Known disagreements are logged in `main_plan.md` §10.
>
> Checkboxes here are `- [ ]` by design and are **not** a progress tracker —
> Phase 1 shipped without ticking any. Never update status here.

**Purpose:** A consolidated guide to the market research, personal competitor reviews, screenshots, recorded walkthrough notes, habit-science brainstorms, and proposed feature backlogs in this folder.

**Scope:** This guide now covers every research document and non-video asset, including MASTER_TODO.md after the user's follow-up request. Repeated ideas are merged into one feature specification; related but distinct behaviors are kept separate.

> **Roadmap status:** The checklist files use unchecked boxes to mean “not yet decided.” This guide records the complete proposed direction and a recommended production sequence; it does not silently convert every idea into an approved commitment. “Existing” below refers to the September 2026 code-audit note in Habit Research/feature_lists.md and should be verified against current code before implementation.

---

## 1. Product definition

Odyssey is a mobile-first habit, schedule, focus, and personal-progress app built around a live Android wallpaper. It combines:

- A practical day planner that makes the next action and the shape of the day easy to understand.
- Habit formation and tracking with routines, measurable goals, flexible habits, recovery, and useful feedback.
- Gamified progression with XP, ranks, a shop, an avatar, and optional social accountability.
- Focus tools that help a person begin and stay with a study or work session.
- An ambient display layer: the phone wallpaper surfaces the user's plan and progress whenever they unlock their phone.

The strongest market position identified in the research is the combination of schedule + habits + focus + RPG progression + live wallpaper. Competitors tend to cover only one or two of these. The wallpaper is the clearest distinction: make it useful before the user opens Odyssey, while the app remains the place to plan, edit, and review.

**Product promise:** Help me see what matters now, make starting easy, and recover kindly when the day does not go to plan.

### Product and UI principles

1. **Glanceability first:** communicate current habit, next habit, and progress quickly.
2. **One simple default, depth on demand:** keep everyday check-off simple; reveal notes, analytics, advanced settings, social features, and AI explanations when requested.
3. **Warm and respectful:** encourage action without shaming missed days. Make strict accountability opt-in.
4. **Make progress tangible:** use clear completion states, satisfying small animations, meaningful level-ups, and visible history.
5. **Mobile-first:** make layouts readable on narrow phones; avoid cramped grids and cropped labels.
6. **User control:** AI recommends and explains; people accept, edit, or dismiss changes. Do not silently alter schedules.
7. **Explain local-first privacy:** the research says core data is currently local/offline. Communicate this clearly. Social and cloud sync need a deliberate account model.
8. **Stay focused:** do not become a project/wiki suite. Keep Odyssey centered on habits, schedule, focus, and lightweight capture.

---

## 2. Existing product baseline from the research

Habit Research/feature_lists.md reports the following as already implemented during its code audit. Preserve, polish, or extend these rather than rebuilding them:

- Global streak, XP, rank calculation, nine rank tiers, and progress bars.
- Monthly completion heatmap with month navigation and long-press day detail; individual monthly habit heatmaps.
- Shop using diamonds, purchasable streak-freeze shields and XP boosts, a once-daily chest, and a reward-celebration modal.
- Evening reminder modal after 8 PM that previews tomorrow's plan; notification toggle.
- Live wallpaper engine with an hourly worker, 24-hour spectrum bar, top two hours labelled NOW and NEXT, and a time-aware display of up to four habits.
- Journey timeline, Stats page, day schedule/planner pages, and habit create/edit flows with period, time-of-day, and frequency.

Important distinctions: the shop's purchasable streak-freeze is not the same as awarding a shield every seven consistent days; the current monthly heatmap is not the proposed 52-week annual view; the global streak is not individual per-habit streak history; and the current wallpaper engine is not the full proposed set of habit-state, schedule-state, decay, and chapter-cover treatments.

This is a September 2026 research snapshot, not a fresh audit of the application source.

---

## 3. Personal competitor review synthesis

### 3.1 What the user repeatedly likes

- **First-run quality:** polished landing pages, quick setup, short animations, clear demonstrations, and friendly copy. This is the most repeated preference.
- **Progress with meaning:** avatar/pet customization, health and XP, level thresholds, skills, unlocks, challenges, and evolving environments.
- **Fast interactions:** swipe/slide completion, tap-and-hold commitment, number input for measurable habits, horizontal day changes, and one-tap actions.
- **At-a-glance completion:** habit-colored date rings beneath dates were marked “very imp.” The visual should quickly tell the user which habits remain.
- **Choice of data layout:** HabitBee's list/grid/heatmap switcher was appreciated, even though its narrow-screen presentation was criticized.
- **Honest monetization:** show clear paid benefits; let the user understand what a subscription adds before asking them to pay.

### 3.2 Common dislikes to prevent

- Clutter, excessive inventory, confusing navigation, too many modules, and steep learning curves.
- Long questionnaires or reading-heavy onboarding.
- Mobile login barriers, desktop-only setup, unnecessary codes, or forced trials/paywalls before the user can try core features.
- Paywalls that describe capabilities more impressive than the actual feature.
- Poorly grouped create/edit forms and narrow-screen overflow.
- Shame-based failure states. Avatar damage interests the user, but other research favors non-punitive recovery. Keep punitive mechanics optional, explained, and recoverable.

### 3.3 App-by-app conclusions

| App | Liked or useful reference | Odyssey adaptation | Avoid |
|---|---|---|---|
| **TickTick** | Closest overall reference; crisp onboarding animation; task categorization and schedule layouts; context-specific Pomodoro; colored habits; countdown styles; theme control; shareable templates. | Teach one feature per short scene; make timer layouts and themes selectable; offer useful task/schedule layouts. | Post-setup UI felt confusing and steep to learn. Keep the default interface simple. |
| **Habitica** | Avatar/pet accessories, health/XP damage, rising level thresholds, unlocks, skills, seasonal items, egg hatching/selling, item rewards, challenges. | Connect rewards to actual effort and make progression clear. | Cluttered inventory, too many item types, difficult navigation, steep learning curve, easy reward exploit, weak real-world benefit. |
| **Forest** | Strong landing animation; tree grows or withers with focus; real trees are planted; breathing and pleasant sounds; usable without starting a trial. | Tie avatar/world change to real follow-through; make free use meaningful. | Don't let one focus mechanic define the whole app. |
| **Akiflow** | Clean, informative landing/onboarding and polished first-open animation; profession-aware value framing. Screenshot includes personalized headline, student coupon, yearly/monthly choices, discount, trial, cancel-anytime reassurance, book benefit, and strong CTA. | Use clear value hierarchy and relevant examples; make plan terms easy to compare. | Reviewer found no mobile login and no free path without trial/payment. |
| **Regain** | Opening animation, radar focus animation, mascot, polished login/permission explanation, live focusers and focus streak/time. | Radar or pulse on focus start; permission preview with a small animated phone; optional social presence. | Feature scope was considered limited. |
| **Fabulous** | Illustrated interest/journey cards; build good or stop bad habits; motivational line and press-and-hold commitment circle; avatar progression scenes. | Select illustrations, an optional short commitment, and milestone scenes. | Too many questions, disliked walkthrough, and disliked post-setup UI. |
| **HabitDriven / Motivated** | Best first landing page, a time-setting dial, moving-dot loading state, and especially colored date rings that fill when habits complete. Explicitly marked “very imp.” | Use stable habit colors on cards, date markers, timeline, and wallpaper; add clear completion fill states and a short processing animation. | Limited features, unclear paid value, weak edit/add flow. Exact app attribution is uncertain; notes say the tested product was “Motivated: Habit Tracker.” |
| **Productive** | Element-by-element setup, quick start, reassuring “Rome wasn't built in a day” message, swipe completion, custom numeric input, first-day card, templates, challenge-linked schedule items. | Support binary and measurable habits; celebrate the first completion; preview schedule additions from a challenge. | No template search; editing UI felt basic; disliked procrastination questions. |
| **HabitBee** | Structured onboarding; three habit views; saved screenshots show cards and detailed analytics. | Let users switch between Grid/List/Heatmap and review detailed habit data. | Narrow-screen fit, data clarity, missing day navigation, and shallow AI chat were criticized. |
| **Structured** | Readable timeline, time labels at left, icon rail and dotted connectors, completion controls; colored inbox items can be assigned to schedule; reminder timing; AI templates. | Put category icon on a stable left rail, visually span occupied time, and promote colored inbox items into time blocks. | Task entry felt unstructured; free-tier and subscription value were unclear. |
| **Sunsama** | Backlog items can carry time and priority; swipe changes day. | Simple backlog plus horizontal date navigation. | Mobile sign-up required desktop in the recorded flow; navigation and login were disliked. |
| **Streaks** | Strong completion celebration and sliding gesture; good name. | Fast, reversible completion gesture plus quick celebration. | Considered feature-light and basic in UI. |
| **HabitShare** | Comments and sharing habits with friends. | Optional habit sharing, comments, reactions, and community accountability. | UI/landing page and basic features were disliked. |
| **Habi** | After one habit is logged, unlogged habits take the main position. | Keep incomplete habits prominent on wallpaper and daily view. | Basic/limited feature set. |
| **Lifestack** | Landing page UI, AI chat, clear paid-plan benefits. | Explain premium benefits in concrete terms and polish the landing page. | Reviewer could not use the app without paying. |
| **Habitify** | Quick setup and time-of-day groups. | Keep setup brief; retain morning/afternoon/evening grouping. | Setup required too much reading; post-setup UI was disliked. |
| **Morgen** | Calendar connection/sync and team coordination. | Calendar and team support are possible future extensions. | Mobile sign-up was poor, login codes unnecessary, and reviewer could not add an item. |
| **Amie** | Landing page, theme/font, walkthrough, AI chat showing capabilities, chat-style personality assessment; Gmail birthday discovery as possible paid feature. | AI should explain its abilities and create real schedule objects; useful assessment can personalize a plan. | Login difficulty, slow/repetitive chat, failure to create calendar events, assessment error. MP4 file is empty. |
| **FlowSavvy** | Budget personal scheduler context. | Keep personal scheduling uncomplicated. | UI was called basic. |
| **SkedPal** | AI can create tasks/events; duration picker noted positively in video analysis. | Keep a clear duration picker and consider natural-language creation. | Reviewer could not find features; navigation and UI felt clunky/poorly optimized. |
| **Motion** | No hands-on review because the user could not log in. | Auto-scheduling and rescheduling are covered in secondary research. | No personal UI or quality verdict. |
| **Reclaim.ai** | No hands-on review because the app/site was not found. | Flexible-to-defended scheduling appears in secondary research. | No personal UI evidence. |
| **HabitHarmony** | No notes or recording; app was not found. | Mood/habit correlations remain unvalidated. | Do not infer a product preference. |

---

## 4. Video and screenshot UI findings

The user particularly asked to emphasize the app UIs praised in App_Reviews.md.

### 4.1 HabitDriven date rings — highest priority UI reference

The inspected screenshot shows a dark “Today” page, seven-day horizontal date strip, small colored rings under dates, a rounded selected-day background, and large rounded habit rows. Rows use large colored category icons, readable titles, a habit type/value, and a right-aligned action.

The image demonstrates four distinct habit types:
- “Quit Drinking”: avoid/stop task with an X state.
- “No More Fast Food”: avoid habit with a red violation state.
- “Drink Less Coffee”: measurable amount such as 1/2 cups with a plus action.
- “Limit Gaming”: time used against a limit, with a play action.

**Odyssey UI specification:** place the date strip above the habit list. Use one small marker per habit (or a compact aggregate when many habits exist). Keep each habit's color stable across date marker, card, schedule and wallpaper. An incomplete habit is an outline; a completed habit fills in its own color. Give avoid-habit violations a distinct explicit state, not a missing dot. Tapping a date updates the list. Keep this legible on a narrow phone; when there are too many rings, show a count and reveal detail on tap. This answers “what remains today?” at a glance.

### 4.2 Akiflow pricing screen

The saved screenshot uses a near-black plan card over a charcoal-to-purple gradient. A large personalized headline promises a concrete weekly benefit. A coupon is visible before plan choice. Yearly and monthly rows compare price and billing; the selected yearly plan uses purple outline/fill, a check icon, savings badge and crossed-out previous price. A promo badge, cancellation reassurance, seven-day trial, full-width lavender CTA and “not charged today” reassurance complete the hierarchy. A small floating illustration and explanatory copy sit to the right.

**Odyssey UI specification:** borrow hierarchy, not pressure. State one concrete benefit; compare plans with billing terms adjacent to price; show trial/cancellation/charge timing; make free or close path obvious. Profession can select relevant examples, but should not secretly determine price or hide terms.

### 4.3 HabitBee views and analytics

The screenshots show yellow/teal branding, bee mascot, date strip, streak capsule, upgrade CTA, three view-mode controls, and floating add button.

- **Grid:** compact cards with habit name, mascot, flame/streak, completion button, weekday labels, and dot history.
- **List:** full-width cards with name and weekly square/check row.
- **Heatmap:** larger cards with month labels and multi-month pixel grid.
- **Habit detail:** progress ring, yearly pixel history, records/streak, month-navigable completion chart, goal-hit-rate donut, day-of-week bars, current-week strip, consistency chart, Edit and Archive.

**Odyssey UI specification:** view switcher in the Habits header, fixed easy-to-reach add action, date navigation in analytics, and density fit for narrow screens. Keep the overview uncluttered; place rich graphs on a detail page. Do not crop month/day labels.

### 4.4 Fabulous illustrated onboarding and avatar scenes

The existing written video analysis describes illustrated interest/journey choices, optional personal questions, a motivational line, press-and-hold circle, and avatar animation entering a structure after progress/rank-up. The reviewer liked art and scenes but disliked question quantity, walkthrough style, and the later UI.

**Odyssey UI specification:** a short selection of illustrated goal cards, skip path, only essential questions, optional hold-to-commit, and rank-up scenes reserved for meaningful milestones.

### 4.5 TickTick onboarding and tools

The recording notes praise crisp minimal animated instruction, task categorization, multiple schedule layouts, context-specific Pomodoro, colored habits, theme control, countdown styles, and shareable templates. One example is a countdown card for an event 36 days away. Post-setup complexity was disliked.

**Odyssey UI specification:** explain one concept per short scene; reveal advanced features when used; let users choose light/dark theme, habit color, and a small number of timer/countdown styles; avoid a multi-module maze.

### 4.6 Regain focus and permissions

The video summary describes a green mascot, northern-lights-like focus background, radar animation, live presence text (“51 focusing”), streaks/live focus hours, and a numbered permission flow with an animated mini phone explaining each permission.

**Odyssey UI specification:** short radar/ripple on session start; presence only in an optional social focus mode; request permissions only when needed and explain each with a visual preview and skip path.

### 4.7 Productive measured interactions

The walkthrough notes include entry animation, encouraging gradual-progress copy, swipe completion, custom numeric value, first-day completion card, templates, and schedules created after joining a challenge.

**Odyssey UI specification:** match check-off to habit type; give measured habits a visible increment/input control; celebrate the first win; preview challenge schedule additions before adding.

### 4.8 Structured timeline

The recorded screen is summarized as dark charcoal with coral/pink accent, time labels at left, category icons connected down a rail, and title/details with completion state to the right. Inbox tasks can be colored and assigned to the day.

**Odyssey UI specification:** stable left rail, time labels, duration-aware blocks, readable task space, and inbox promotion to schedule.

### 4.9 Other recording notes

- **Lifestack:** purple-gradient landing, phone mockup, energy-scheduling framing, AI chat, explicit paid value; user could not use app without paying.
- **Streaks:** green-on-black, confetti completion; clip is only a few seconds, so it supports the animation observation only.
- **Habitify:** time-of-day groups; quick setup but too much reading and disliked post-setup UI.
- **Sunsama:** backlog/archive, day changes; written video analysis reports a desktop-signup wait on mobile.
- **FlowSavvy:** dark calendar-like screen and setup; reviewer called it basic.
- **SkedPal:** light UI, cluttered navigation; duration picker noted positively.
- **Amie:** its MP4 is zero bytes; use written review only.

---

## 5. Canonical product feature catalogue

This catalogue deduplicates TODO.md, AI_TODO.md, both habit/schedule feature lists, integration_roadmap.md, books_brainstorm_and_habits.md, Review_Analysis.md, and App_Reviews.md. It preserves all distinct proposed capabilities while giving each one a single main description.

### A. First-run, onboarding, account

**A1. Short goal-based first run:** Ask the user's first focus using illustrated options such as Focus, Health, Sleep, Balance, Digital Detox, Custom. Suggest 3–4 editable habits and reach a usable plan in under 60 seconds. One question per page, step indicator, skip, editable final preview; no mandatory procrastination survey.

**A2. Animated walkthrough:** Explain wallpaper, habits, schedule, and rewards through crisp, short scenes, one concept at a time. Make optional features contextual instead of dumping all navigation into onboarding.

**A3. Optional interests/profession:** Use interest or role to tailor examples, starter packs, or benefit ordering. Ask only if it changes the experience; explain why and allow skip. Do not use profession to obscure or discriminate on price.

**A4. Optional AI assessment/coach:** Chat asks a few goal questions, summarizes preferences, recommends habits, and can create real editable schedule items. UI has short chat bubbles, visible capability list, editable cards, “Add to my plan,” and a concise processing animation. Actual ability must match the promise.

**A5. Commitment moment:** Show a motivational line/identity and optional press-and-hold animated circle. Short, skippable and celebratory.

**A6. Loading/processing animation:** Colored spinning dots, ring, or radar/mascot instead of blank processing screens. Show what is happening and allow cancel if slow.

**A7. Permission education:** Explain notification/focus-block permissions just-in-time with an animated phone preview, reason, step count, and “Not now”. No permission bundle at first launch.

**A8. Welcome, empty states and trust:** Friendly first-open text, goal labels, empty Habits and Planner instructions, and a plain-language local-data/offline trust message.

### B. Habit setup and interaction

**B1. Searchable template library:** Curated goal packs with search, category filters, preview of frequency/duration/time, add-all or cherry-pick, and edit-before-add. Habit-share links can import a preview. Avoid a library without search.

**B2. Clean create/edit form:** Core fields first: name, icon/color, type, schedule/frequency, duration, reminder. Expandable details for priority, energy, note, Why, identity, cue, routine, reward, 2-minute version, contexts, goal link, keystone, and stacking. Live preview, save/cancel, readable labels.

**B3. Habit types:** Binary complete, measurable target (counts/cups/pages/reps), avoid/stop with clean-day/violation, and time-limit usage. Match controls to type: check, plus/minus/number field, clean/violation, timer/usage. Provide undo.

**B4. Swipe/slide and feedback:** Deliberate swipe to complete/undo, visible button alternative, tap/long-press for details. Quick check bounce, subtle confetti/pulse, warm message, optional sound; reduce motion and do not block the next action.

**B5. Stable habit colors and date rings:** Per-habit color repeats on card, date strip, schedule, and wallpaper. Under each date, render one colored ring/dot per habit; outline means remaining, filled means complete. Aggregate when many habits exist. Tapping date changes the selected list.

**B6. Grid/List/Heatmap views:** User-selectable modes, saved preference, same core actions available in all views. Grid is compact, List has readable titles and weekly checks, Heatmap shows long history.

**B7. Challenge-linked habits:** Joining a challenge previews its goal, duration, and any schedule changes. User confirms before habits are added.

**B8. Habit motivation fields:** One-line note, deeper Why, identity statement, cue, routine/next action, reward, and two-minute version. Keep the fields distinct under one expandable “Make it easier” section.

**B9. Priority, energy, context:** Critical/Focus/Optional priority; High/Low/Passive energy; @morning/@gym/@home/@computer/@anywhere context. Show small text/icon badges (not color alone), filter/sort, feed later recommendations.

**B10. Keystone, Daily Highlight, Frog:** Keystone is a long-term anchor habit shown first and modestly rewarded. Daily Highlight is today's one non-negotiable and appears prominently on wallpaper. Frog is today's hardest/highest-impact habit, encouraged early with a bonus if done first. Keep Highlight/Frog to one each per day; reminders are configurable.

**B11. Habit stacking and temptation bundles:** Link “After A, do B” and pair a needed habit with an enjoyable activity. Show order and allow launching as a routine.

**B12. Flexible habits, rollover, hardening:** Fixed-time vs any-time-today. Unfinished flexible habits may roll to tomorrow with “from yesterday”; initially movable, then become more prominent as their window closes. Offer next free slot and accept/edit/dismiss.

**B13. Pause/archive/inactive review:** Pause a habit 1–30 days, preserve history, prevent pause-period streak break, hide it from daily progress. After 14 inactive days, ask whether to pause, archive/remove, or keep.

**B14. Quick-capture inbox/backlog:** One-line capture for thought/task/habit idea without required schedule fields. Inbox row later promotes to habit, schedules with optional priority/time, or dismisses. Support backlog tasks with time and priority.

**B15. Completion labels:** Creation confirmation using habit name; card shows “Last done: today/yesterday/3 days ago” and that habit's own streak.

### C. Schedule and planner

**C1. Single-day visual timeline:** Today default, other dates via strip/swipe. Current-time line; time labels left; icon rail spanning category/duration; task name/completion right; subtle period colors (morning amber, afternoon blue, evening purple, night indigo).

**C2. Duration and drag/reschedule:** Planned duration sizes blocks proportionally; drag to reorder/move; clear confirmation and undo; readable duration picker; overlap detection.

**C3. Today at a Glance:** Date/journey day, done/total, streak, capacity label, first incomplete/next habit, and Start action at schedule top.

**C4. Up Next and daily fraction:** “Now” or “Up next in 45 min” line; done/total in header and wallpaper.

**C5. Capacity and buffer:** Load from habit count, duration, available time and personal history. Soft warnings around research heuristics (8+ habits or 6+ hours) or personal threshold. Show Light/Steady/Full/Heavy. Visual buffers between back-to-back blocks; optional 5-minute break after three continuous blocks. Warnings never block saving.

**C6. Availability, conflicts, ideal week:** Define available windows by day; suggest alternatives for overlap/outside window. Optional ideal weekly structure compared with actual schedule/completion.

**C7. Calendar sync:** Later, read-only calendar overlay then optional sync; clearly state direction, permissions, conflicts, and account requirement. Team sync is later.

**C8. Morning planning and shutdown:** Optional morning flow reviews yesterday, today's schedule, load and priority, then confirms. Evening flow reviews done/incomplete, moves or releases flexible tasks, rates day 1–5, reflects on Highlight, previews tomorrow. Calm start/close animation.

**C9. Reschedule/share:** On a miss, offer next free slot today/tomorrow for approval. One-tap schedule image share with preview and visibility control.

**C10. Desktop shortcuts:** If web/desktop supported, keys for new, complete, previous/next day, toggle; additive and not a source of mobile complexity.

### D. Focus and digital wellbeing

**D1. Full-screen Focus Session:** Tap active habit for a distraction-free view with name, Why, countdown, progress, and Mark Complete. Pause/resume/finish/exit are clear.

**D2. Timer choices:** Stopwatch, countdown, several Pomodoro layouts. Ask if Pomodoro is wanted for study/work categories and surface only in that mode.

**D3. Subject/category analytics:** Tag sessions (Physics, Learning, Deep Work, Creative); show weekly category time and Deep Work hours/target.

**D4. Focus rooms/presence:** Optional rooms with friends/global users; show current presence, live session time and consented streak/hour summaries. Alias, opt-out and friends-only settings.

**D5. Focus Guard, sound, breathing:** Optional mid-session nudge, lofi/rain/white-noise/silence, breathing exercises. Independent controls.

**D6. App/site blocking and Study Mode:** Select distractions; block Reels/Shorts; allow listed educational YouTube channels while blocking home/recommendations/Shorts. Explain permissions and limits; Strict Mode is opt-in with clear exit.

**D7. Social app unlock with avatar consequences:** Original idea: require task completion before selected social apps; unauthorized opening causes one damage per minute, and avatar death loses customization/accessories. This conflicts with the non-shame principle. Keep the idea visible for design, but recommended version is optional challenge mode, visible damage meter, advance warning, recovery/shield, no destruction of paid/user-owned items, and a clear disable path. Consequences must be explained before activation.

**D8. Focus start animation:** Brief radar/ripple, session state in wallpaper where feasible, and just-in-time permission education.

### E. Stats and reflection

**E1. Monthly and annual heatmaps:** Preserve monthly grid; add 52-week/year overview colored by completion percentage, date navigation, and selected-day details.

**E2. Per-habit history/streak:** Current streak, best streak, graph and milestone history separate from global streak.

**E3. Milestones:** Celebrate 7/14/30/60/100/365 days with unique copy and brief toast; avoid repetitive interruption.

**E4. Weekly comparison/report:** Compare this week and last week, completion trend, strongest habit, needs-attention habit, streak, one suggested action, warm closing. In-app or configurable Sunday notification.

**E5. Time/day performance:** Completion rates by period and weekday; strongest/toughest labels with optional move/lighten action.

**E6. Energy log:** Optional 1–5 morning check-in; correlate with completion over time; avoid medical claims.

**E7. Deep Work and time allocation:** Hours/target, time across health/learning/focus categories, actual vs ideal week.

**E8. Goals/habit linking:** Short goals for week/month/year (and potentially long-term horizons); optionally link habits and show contribution. Weekly goal can be a wallpaper subtitle. No nested pages/wiki.

**E9. Identity/compound effect:** Show identity next to history; project total habit time over a year using transparent assumptions; do not guarantee skills or outcomes.

**E10. Parallel Self:** Weekly actual-versus-perfect-week comparison with missed habits/hours as neutral reflection and one small next step.

**E11. Habit Weather forecast:** Estimate likelihood from weekday, habit load, energy and recent momentum. Show reasons and uncertainty; never rank or shame.

**E12. Schedule Replay and cue latency:** Optional 10-second end-of-day playback of completed/skipped blocks. Track time from scheduled cue/first unlock to action only with transparent consent/settings; later experiment due to privacy and complexity.

**E13. Monthly Essentialism audit:** Completion per habit; Commit/Pause/Archive choices; no automatic removal.

### F. Gamification and avatar

**F1. Existing progression:** Keep current XP/ranks and increasing thresholds. Unique rank messages and meaningful unlocks; illustrated avatar scenes only at notable rank-ups.

**F2. Achievement badge wall:** Profile badges with visible conditions: 7-day Warrior, Iron Will/30-day, Early Riser, Night Owl, Perfect Week, Laser Focus/21 days, Legend/365, 5 AM Club, first day and others. Show earned date and animate a new badge once.

**F3. Completion celebration:** Brief confetti/check bounce, warm copy, optional sound, first-day card, bonus Frog-first state; reduced-motion toggle.

**F4. Chapters and seasonal items:** Optional 30-day arcs with lifetime history preserved; themed item/packs for New Year, summer, exam season; small, organized inventory.

**F5. Avatar/pet/skills:** Accessories, pet, skills, XP/level unlocks, eggs that hatch or may be sold. Keep inventory grouped and explain whether each item is cosmetic or useful.

**F6. Avatar house/world:** Original differentiator: avatar's home changes with real follow-through. Potential bookshelf/books, posters, clean clothes/room, food, pet interaction, room/background, garden/ground/pool. Show a small set of visible upgrades, before/after preview, unlock condition and linked habit; no sprawling inventory.

**F7. User-defined real-world reward shop:** User defines a reward and coin cost (movie night/book), then marks redeemed. Separate virtual cosmetics from real-life rewards.

**F8. Streak shield and recovery:** Preserve purchasable shield; separately consider earning a grace shield after consistency. On break, warm restart with previous best and three-day lighter plan.

**F9. Marketplace:** Later buy/sell user-made items/pets/skills. Requires backend, moderation, price/economy controls, and anti-exploit rules.

**F10. Cash out virtual currency:** Original speculative idea; not an approved product feature. Needs sustainable funding, fraud controls, payment handling and separate legal/financial review; do not promise it.

**F11. Developer coffee support:** Optional about/settings action; never interrupt daily flow or disguise it as a reward.

### G. Wallpaper and ambient layer

**G1. Schedule wallpaper:** Miniature day plan with current hour and done/upcoming blocks. Extend the existing spectrum rather than rebuild it.

**G2. Current/next/incomplete priority:** Keep active and next item prominent; incomplete habits take priority over completed ones; daily fraction remains visible.

**G3. Habit-state cue:** Optional Prep → Active → Done appearance: pre-window cue, vivid during window, warm glow after completion. Understandable and not alarming.

**G4. Identity line:** Optional habit identity statement displayed during its time window.

**G5. Schedule palette/energy gradient:** Sunrise-to-midday-to-sunset state; later, personal high-completion hours brighter and difficult hours muted; explain and allow off.

**G6. Decay/recharge:** After several misses, optional subtle desaturation and recovery cue; completion restores vibrancy. Supportive, adjustable, off by default until validated.

**G7. Ghost schedule:** Optional faint ideal schedule behind actual schedule, planner-first because wallpaper may be too dense.

**G8. Themes/countdown:** Light/dark and curated theme control; countdown card styles; XP unlocks; preview before applying.

**G9. Life Week theme:** Optional estimated weeks-lived/remaining dots from user-provided age, current week highlighted; approximate and dismissible.

**G10. Chapter covers:** Monthly card/wallpaper with chapter number, top habit, best streak and completion-based palette; save/share.

**G11. Shareable replay/template:** Preview and choose included data before exporting a schedule image or replay.

**G12. Duration-weighted spectrum/live countdown:** Longer blocks use more width in 24-hour bar; live time remaining where appropriate; keep NOW/NEXT.

**G13. Wallpaper-exclusive cues:** Identity text, habit states, color states and selected template are user-controlled and readable without excessive text.

### H. Social and community

Social needs accounts, backend storage, privacy, moderation and clear boundaries with local-first data. Keep optional and late.

**H1. Profiles/privacy:** Avatar, name, chosen streak/XP/badges; public/friends-only/private; individual habit visibility.

**H2. Share habits/templates:** Public or friend link with preview/import; user chooses whether updates propagate.

**H3. Activity/comments/reactions/nudges:** Completion feed with comments/high-fives; supportive, rate-limited nudges with mute; only explicitly shared habits appear.

**H4. Community challenges:** Shared duration/goal/progress, optional leaderboard and schedule preview. Communities around common interests; noncompetitive route.

**H5. Focus presence/leaderboard:** Current focusers, session time, streak/hour stats; aliases, opt-in, friends-only.

**H6. Discover/milestones:** Trending templates/habits, community stats and milestone feed; notification controls.

**H7. Team/calendar sharing:** Later Morgen-inspired collaboration, never exposing private habits by default.

### I. AI and scheduling intelligence

Build in order: local deterministic rules/templates; statistical patterns; LLM last. Require sufficient history, explain evidence, and let users dismiss/correct.

**I1. Slot insight:** At creation show personal completion rates by time period.

**I2. Overcommitment warning:** Compare day's habit count/duration with chosen capacity or 14-day average; one proposal is 50% above normal. Suggest lightening; never block.

**I3. Weak-day detection:** After four or more weeks, detect repeated low weekday and suggest a lighter schedule.

**I4. Energy-aware suggestion:** Compare High/Low/Passive tags and optional energy logs to history; suggest moving a demanding task when samples support it.

**I5. Conflict detection:** Catch overlaps and suggest available times.

**I6. Best-time learner:** After about 30 days, compare actual completion by time per habit and ask whether to move.

**I7. Weekly summary:** Start with template substitution; later one short personalized narrative with one actionable suggestion.

**I8. Streak recovery:** Three-day plan: minimum version, half duration, normal. Template first, LLM later.

**I9. Difficulty scaling:** After sustained success (source suggestion: 14 days at 100%), propose a small target increase; never auto-change.

**I10. Auto-reschedule on miss:** Offer next slot today or tomorrow, editable/declinable.

**I11. Weekly optimizer:** Suggest a schedule swap based on load/history; explain and require acceptance.

**I12. Habit correlation:** “On days you meditate, Deep Work completion is higher.” Describe correlation, not causation.

**I13. Energy/completion correlation:** Compare optional energy logs and completion, private and nonmedical.

**I14. Predictive forecast/Habit Weather:** Probability estimate from weekday, load, energy, momentum; explain uncertainty.

**I15. Habit gravity:** Compare planned and actual completion times; after a repeated pattern, offer to move the scheduled time.

**I16. Burnout early warning:** If completion drops materially across consecutive weeks (example threshold 20% over two weeks), gently suggest reducing/pausing; never diagnose.

**I17. Natural-language habit/schedule entry:** Parse “Meditate 20 min every morning at 7” or “Deep work two hours tomorrow morning” into an editable review card. Rules/regex first, LLM for ambiguity; user confirms save.

**I18. Conversational coach:** Goal chat produces habits that can actually be added/edited in-app; capability claims must be true.

**I19. Personality assessment:** Optional chat preferences for tone and plan; avoid unvalidated psychological labels.

**I20. Monthly audit trigger:** Show completion by habit and Commit/Pause/Archive decision; rules first.

**I21. Wallpaper theme suggestion:** Suggest by time, active habit, or optional energy input; never change silently.

**I22. LLM weekly narrative:** Later premium extension grounded in visible data, concise and nonrepetitive.

### J. Monetization

**J1. Useful free plan:** Core schedule, habit tracking, progress, and wallpaper work without forced trial.

**J2. Clear paid value:** Feature, problem solved, example, billing period, trial, cancellation and charge date all visible. Let user sample the feature where practical.

**J3. Modular plans:** Consider standalone feature modules plus lower-priced full bundle; show real totals/savings; do not make essentials artificially expensive.

**J4. Personalize examples, not hidden terms:** Profession/goal can reorder examples. Visible pricing remains consistent and understandable.

**J5. Trial timing:** Deliver useful AI assessment/timetable before offering a trial. Trial is not the only access route.

**J6. Separate shop economies:** Clearly label earned cosmetics, paid cosmetics, virtual items, and self-defined real-world rewards. Prevent accidental rewards and unbounded inventory.

---

## 6. Habit-science guidance and content library

Treat the books as design hypotheses, not medical promises.

- **Atomic Habits:** cue → craving → response → reward; identity; make cues obvious and actions easy/satisfying; two-minute starter; never miss twice.
- **Deep Work:** protect high-value focused time, respect finite depth budget, end with a shutdown.
- **Getting Things Done:** capture open loops, clarify next action, process inbox, weekly review, use contexts.
- **Miracle Morning:** optional SAVERS (silence, affirmations, visualization, exercise, reading, scribing).
- **Essentialism:** fewer commitments, recovery is productive, choose one daily essential, monthly review.
- **Power of Habit:** explicit cue/routine/reward, keystone habits, demanding habits earlier where appropriate.
- **Make Time:** one Highlight, protect focus, support energy, reflect at day's end.
- **Four Thousand Weeks:** accept finite time and intentional trade-offs; life-week view is optional, never a performance score.
- **Eat That Frog:** identify the hardest/highest-impact task and encourage an early start.
- **5 AM Club:** optional Victory Hour/20-20-20 template, not a universal prescription.

### Curated templates

1. **Morning Warrior:** sunlight, hydration, meditation, journaling/gratitude, exercise, reading.
2. **Miracle Morning SAVERS:** silence/meditation, affirmations, visualization, movement, reading, journaling.
3. **Deep Work Foundation:** no phone first 30 minutes, Eat the Frog, 90-minute deep-work block, Pomodoro, shutdown ritual.
4. **Sleep Optimization:** consistent wake time, sunlight, no caffeine after 2 PM, no screens before bed, wind-down reading/stretching, consistent sleep time.
5. **Mind & Body Balance:** movement, meditation, gratitude, reading, evening reflection, weekly nature walk.
6. **Digital Detox:** no phone first 30 minutes, no social before noon, batch email, no screens after 9 PM, weekly phone-free block.
7. **Anti-Habits/Quit Tracker:** no alcohol, no social before noon, no screens in bed, no news first thing, no multitasking during deep work.
8. **Fitness Foundation:** workout, post-meal walk, stretch, hydration.
9. **20/20/20 Victory Hour:** 20 minutes move, 20 minutes reflect, 20 minutes learn.
10. **5 AM Club:** wake at 5, cold shower, exercise, journal, reading.

Templates are editable examples, not mandatory prescriptions. The research also lists morning ideas (sunlight, water, no phone, journal, gratitude, top-three planning, cold exposure, movement, meditation, breathwork, delayed caffeine, affirmations, reading, mobility); daytime ideas (deep work, hardest task, post-meal walk, Pomodoro, single-tasking, social limits, hydration, afternoon reset); evening ideas (shutdown, reflection, gratitude, reading, screen-free wind-down, tomorrow review, connection, stretch, consistent sleep); weekly ideas (review, nature walk, digital detox, social connection, creative activity, heat exposure, physical challenge); and mental/foundational ideas (thought dump, identity reminder, one hard thing, boredom practice, learn a concept, kindness, consistent sleep, exercise, meal timing, less alcohol, nature).

---

## 7. Secondary market research synthesis

### Schedule-app groups

- AI auto-schedulers: Motion, Reclaim.ai, FlowSavvy, SkedPal.
- Guided manual planners: Sunsama, Morgen.
- Power-user command centers: Akiflow.
- Design-first calendar/task apps: Amie, Structured.

### Product lessons from the written competitor reports

- **Structured:** vertical visual timeline, recurring tasks, drag/drop, calendar/reminder sync; strong visual clarity, no gamification.
- **Sunsama:** morning/shutdown rituals, workload warnings, backlog, timeboxing, integrations; calm but costly and desktop-oriented.
- **Motion:** automatic scheduling and reshuffling; powerful but dense, expensive, work-focused.
- **Reclaim:** flexible-to-defended habits, calendar focus blocks, buffers and time analytics; calendar-dependent, not a full habit tracker.
- **Morgen:** multi-calendar, ideal-week Frames, user-approved AI and team integrations.
- **Amie:** refined interactions and design; comparatively light on habit analytics/gamification.
- **Akiflow:** universal inbox and manual time-blocking; powerful but dense/desktop-first.
- **FlowSavvy:** affordable personal scheduling and availability windows; simpler but basic.
- **SkedPal:** rule-based priority/time maps; configurable but difficult to navigate.
- **Carly AI:** enterprise agent direction, not personally reviewed by the user.

### Supplemental habit/focus references

The market analysis covers Habitica, LifeUp, Structured, Finch, Fabulous, Routinery, Sectograph, and Regain:
- LifeUp: customizable skills/categories, non-punitive gamification, real-life reward shop, offline/privacy.
- Finch: pet-centered positive reinforcement, warm copy, time-of-day modules, mood, breathing and widget.
- Routinery: timer-guided sequences, pause/skip/adjust, voice transitions and widgets.
- Sectograph: circular duration-weighted day, calendar sync, widget-as-product.
- Regain: focus timers, app blocking, educational YouTube mode, multiplayer rooms, leaderboards, subject stats, ambient sound.
- Duolingo: milestones, shields and friendly social ranking; Way of Life: weak-day analysis/history.
- TimeStripe, Twos, Amplenote, Anytype and Heptabase: adopt only short goal horizons, auto-rollover, quick capture, local-first trust and light priority. Do not copy canvases, wikis, rich note systems, databases, backlinks or project kanban.

The competitor report includes market-size, retention and gamification/widget-uplift estimates. These numbers were not independently verified here; treat as source claims, not forecasts or product requirements.

---

## 8. Recommended production sequence

This is a recommendation; the source checklists remain undecided.

### Phase 0 — Verify and polish what exists
Confirm wallpaper, spectrum, NOW/NEXT, four-habit display, monthly stats, XP/ranks, shop, reminders, planner, and edit flows. Fix navigation and narrow-screen issues. Make habit color, period, current/next and completion consistent across card, date strip, planner and wallpaper.

### Phase 1 — Make daily use obvious
Short onboarding; empty/welcome/trust copy; color-coded date rings; swipe plus visible completion control; measurable input; first-win card; small animation; Today at a Glance; daily fraction; current-time line; Up Next; capacity warning; last-done and per-habit streak; weekly comparison; annual heatmap; milestone/recovery; searchable templates; clean create/edit; loading state and sound/motion controls.

### Phase 2 — Routines, capture and recovery
Inbox, flexible habits/rollover, pause/vacation, reminders, morning planning, evening shutdown, focus timer/Pomodoro, priority/energy tags, duration/buffers, availability, quick reschedule, user-defined rewards and badges.

### Phase 3 — Ambient and avatar depth
Wallpaper countdown/duration weighting/state treatment/themes; avatar house/world; seasonal customization and chapters; optional blocker challenge with explained, recoverable consequences; focus presence and challenges only after privacy/backend design.

### Phase 4 — Trustworthy intelligence
Rules first: period insights, weak days, capacity, conflict, best time, recovery templates. Statistics next: energy and habit correlations, drift, burnout warning and forecast. Natural-language parsing and conversational AI only after generated actions are actually supported; preview before save. Weekly optimizer and LLM narrative last.

### Phase 5 — Larger platform/business work
Calendar sync, teams, community templates, marketplace, Wear OS and any real-money cash-out proposal only after account, privacy, moderation, platform, economy, and financial feasibility are decided.

---

## 9. Open product trade-offs

1. **Fast setup vs personalization:** fast default path plus optional deep personalization. Never force a long questionnaire.
2. **Avatar damage vs kindness:** keep damage strictness opt-in; no permanent loss of paid/user-owned items.
3. **Feature depth vs simplicity:** simple daily home; progressive disclosure; avoid adding navigation for features used rarely.
4. **Local-first vs social:** social needs an explicit optional account/sync transition and per-habit privacy.
5. **AI promise vs actual action:** chat must create/edit real items if it claims to; otherwise sell it as advice.
6. **Competition vs privacy:** leaderboards, streak sharing and focus presence are opt-in.
7. **Cash-out:** exploratory only, not an approved feature; needs sustainable funding and fraud/payment review.
8. **Evidence and health claims:** book ideas are hypotheses; validate durations and claims before presenting as science.

---

## 10. Source coverage and limitations

### Included source files

- Root: AI_TODO.md, App_Reviews.md, Review_Analysis.md, TODO.md, MASTER_TODO.md.
- Habit Research: books_brainstorm_and_habits.md, competitor_analysis.md, feature_lists.md, integration_roadmap.md, video_analysis_shuomi.md.
- Schedule Research: competitor_analysis.md and feature_lists.md.
- Apps Videos: 15 MP4 files and six still images in the Aime, Akiflow, Fabulous, FlowSavvy, HabitBee, HabitDriven, Habitify, Lifestack, Productive, Regain, SkedPal, Streaks, Structured, Sunsama, and TickTick folders.

MASTER_TODO.md was compared directly against this guide in the latest audit; its unique design tokens, interactions, screen details, world-system mechanics, AI items, and template variants are appended in Sections 15–16.

### Video and evidence limit

The current browser rejected local MP4 playback because local-file URLs are blocked. No alternate playback or extraction route was attempted. Therefore, recording-specific descriptions here come from the existing written Review_Analysis.md/App_Reviews.md, not independent replay in this session. The six still images were inspected directly. Aime's video is zero bytes and has no usable video evidence.

App_Reviews.md lists 23 consumer apps; Review_Analysis.md says 20 have substantive notes. Motion, Reclaim.ai and HabitHarmony are not directly reviewed. HabitDriven's precise product identity is uncertain. Supplemental competitor reports cover additional apps that were researched in writing, not all personally tested.

### Backlog count discrepancies

The source inventories disagree:
- TODO.md IDs contain M1–M17 (17), S1–S23 (23), HD1–HD30 (30), FD1–FD27 (27), XL1–XL15 (15), SC1–SC10 (10), TB1–TB10 (10): 132 entries, while its summary says 119.
- AI_TODO.md runs AI-1 through AI-23 although its summary says 22; another note says 15.
- MASTER_TODO.md lists 144 roadmap entries across its implementation tiers and sections; it is a separate, overlapping blueprint with more specific UI and reward parameters than the other backlogs.
- Integration_roadmap.md describes its list as 49/50 features.
- Habit Research/feature_lists.md says 36 items (10 AI + 26 standard after additions).

These lists overlap. Use this guide's canonical entries and recalculate estimates before sprint planning.

---

## 11. Production check

Before adding a feature, confirm:

1. It helps the user decide, start, finish, recover, or understand progress.
2. Its main action is reachable without confusing navigation.
3. It remains clear on a narrow phone and, where relevant, the wallpaper.
4. The user understands and controls its reminders, AI, privacy, and gamification behavior.

If not, simplify it or keep it out of the default experience.

---

## 12. Additional distinct feature specifications

These are standalone proposals from the detailed backlogs and book brainstorm. They complement the canonical catalogue above and should remain individually visible during prioritization.

### Notification system

The existing app has a notification toggle and an evening reminder modal. The following are proposed extensions, each independently configurable:

- **Morning check-in:** At a user-selected time (research default: 8 AM), show today's habit count and first scheduled habit with a one-tap “Review today” action.
- **Pre-habit preparation:** Five minutes before a habit, notify “Your [Habit] hour starts in 5 minutes.” Per-habit toggle and quiet-hours support.
- **Mid-hour check-in:** Optional single reminder partway into a scheduled hour if still incomplete; suppress it during an active focus session.
- **End-of-day streak nudge:** Around 8 PM, if a habit with a meaningful active streak is incomplete, show a gentle reminder. This is separate from the existing evening modal that previews tomorrow.
- **Never miss twice:** If a habit was missed yesterday, send one special, higher-visibility but encouraging reminder around its usual time today.
- **Sunday review:** Weekly completion, comparison, best habit, needs-attention habit, and a next-week prompt. Prefer one in-app report or one push, not both by default.
- **Evening digest:** Optional 9–10 PM recap with done/total, streak and tomorrow's first habit; this may link to the shutdown reflection.
- **Completion response:** In-app positive feedback immediately; a notification is only useful if the action completes externally or the user explicitly enabled it.

Give each reminder a clear purpose, quiet-hour settings, frequency controls, and a way to preview or disable it. Avoid stacking multiple nudges about the same incomplete habit.

### Home-screen and notification-shade surfaces

- **Android home-screen widget:** Offer compact 2x2 and wide 4x1 layouts. Show current/next habit, today's X/Y completion and streak; tapping opens the relevant check-off/schedule screen. Keep text readable at widget sizes and refresh state after completion.
- **Persistent progress notification:** Optional collapsible notification showing Odyssey, today's X/Y, streak, and progress bar. Update it as habits change and let the user dismiss or disable it.
- **Wear OS companion:** Later display current/next habit, streak, and one-tap completion from the wrist. Treat it as a separate platform project, not an assumption of the mobile core.

These extend the wallpaper as ambient display; they should share the same completion data and visual language rather than create independent progress states.

### Emergency mode and progressive habit scaling

**Minimum Viable Habit mode:** One action reduces selected habits to user-defined starter versions, such as a full workout becoming a few jumping jacks or 20 minutes of meditation becoming three breaths. Mark it with a lightning symbol and label it as a scaled/partial completion. The user chooses whether partial completion protects a streak. Provide a restore button for normal targets. This differs from merely showing a two-minute fallback after a streak is at risk: it is a one-tap low-capacity-day mode.

**Gradual progress prompt:** After a habit is consistently completed, offer a small increase in duration/target at a user-chosen cadence (source examples include after 14 days at full completion or monthly/quarterly/yearly increments). Explain the change and ask first; do not automatically raise a goal.

### Habit Resonance visual

An optional card treatment evolves with a habit's age and consistency: new/plain, growing/subtle glow, established/gold edge, deeply established/diamond shimmer. Use both tenure and completion consistency so an old but inactive habit does not look “mastered.” Make this cosmetic, restrained and accessible; reveal the meaning in the habit detail, not as a new score the user must manage.

### Time debt and habit debt

These are two related but distinct speculative concepts:

- **Schedule time-debt marker:** A skipped duration-based block can show the time not completed (for example, 45 minutes across two missed blocks) in that day's schedule and weekly time-invested report. Keep it informational and do not imply the user owes the app time.
- **Habit debt resource:** A missed flexible habit could create a recoverable balance that the user may clear later, followed by a “Debt Free” animation. This can easily turn a helpful habit tracker into a guilt/overwork system. Keep it optional, capped, noncompounding, and separate from essential habits; consider excluding it from the first release.

### Decision Fatigue Reduction mode

If the user has a large plan (research example: six or more habits) and has not started by mid-morning, offer a simpler presentation with only the highest-priority first action. After completion, reveal the next one; the user can always expand the full schedule. This is a presentation mode, not deletion or automatic rescheduling.

### Energy Gradient on the schedule page

Beyond wallpaper colors, an optional schedule background can softly indicate historically strong completion hours with warmer/brighter tones and weak hours with cooler/muted tones. Explain that the visual uses personal completion history, wait for adequate data, and provide a toggle. Do not encode personal performance in color alone.

### Additional habit-science prompts

- **Affirmations:** Let users save one to three personal statements and optionally show one at app open or in a chosen routine.
- **Visualization prompt:** An optional short prompt such as imagining what a good day looks like; do not force it into onboarding.
- **Intentional “not doing” list:** At weekly planning, let the user name activities they deliberately choose not to take on. Keep it private and distinct from anti-habit tracking.
- **Pay-yourself-first scheduling:** Offer to place the user's chosen most important habit before lower-priority items in the plan; user remains in control.
- **Soft active-habit limit:** If a user accumulates many habits, offer a gentle suggestion to focus on fewer. Never impose a hard limit; the research cites a suggested three-to-five range as a prompt, not a rule.
- **Mind Sweep:** A weekly 10-minute capture routine to write down open thoughts into the inbox, then clarify next actions. It uses the lightweight inbox and should not become a note-taking system.

### Habit recommendation engine

Separate from conversational coaching: after the user has some habits and completion history, suggest a new habit that complements the existing routine or supports a stated goal. Show the reason (“you already walk after lunch; a short stretch could follow”) and allow dismiss/save. Start with curated goal-to-habit mappings; only personalize from history when sample size supports it.

### Mood logging as an exploratory option

HabitHarmony was not found or reviewed, so no specific mood UI is validated. If explored, offer a quick optional mood check-in and private mood-versus-habit pattern chart, with neutral language and no diagnosis or claim that a habit caused a mood. This is lower-confidence than energy/completion insights.

### Screen-time analytics and routine voice guidance

- **Screen-time dashboard:** If the user enables platform access, show time by selected app/category and trends alongside focus sessions. Explain exactly what is read and keep it local where possible. This is separate from the app-blocker's allow/block list.
- **Routine voice transitions:** For a timer-guided habit stack, optional spoken cues can announce the next step and remaining time. Let the user pause, skip, or adjust duration without breaking the routine. If a habit finishes early, offer the next step rather than silently advancing.

### Calendar personal dates

Calendar integration may optionally surface events such as birthdays (the Amie review noticed birthday discovery from Gmail). Make the calendar source and permission explicit, allow read-only mode, and let the user select which event types appear. Calendar import should not be required to use Odyssey.

---

## 13. App_Reviews.md reference index

This table preserves the category, platform, and price/access notes in the personal review sheet. These are the user's September 2026 notes, not current verified market data.

| App | Category in review | Platforms in review | Price/access note in review |
|---|---|---|---|
| HabitShare | Social habit tracker | iOS, Android | Free |
| Habitica | RPG-gamified habit tracker | iOS, Android, Web | Free; optional premium |
| Habi | Accountability habit tracker | iOS, Android | Free |
| Lifestack | AI habit scheduler | iOS, Android | Freemium; reviewer could not use without paying |
| HabitBee | AI habit agent | iOS, Android | Freemium |
| HabitDriven / Motivated | Conversational AI habit coach; tested app attribution uncertain | iOS, Android | Freemium in review notes |
| HabitHarmony | Mood-correlated habit tracker | iOS, Android | Freemium; app not found |
| Streaks | Minimal streak tracker | iOS | $4.99 one-time in review notes |
| Fabulous | Behavior-science routine builder | iOS, Android | Freemium/subscription |
| Habitify | Cross-platform habit tracker | iOS, Android, Mac, Web | Freemium |
| Productive | Long-term habit tracker | iOS | Freemium |
| TickTick | Task + habit + calendar | iOS, Android, Web, Desktop | Freemium |
| Structured | Visual daily planner/timeline | iOS, Mac, Apple Watch | Free; Pro price noted around $3/month |
| Sunsama | Mindful daily planner | Web, Mac, Windows, iOS, Android | $16–22/month; no free tier in notes |
| Motion | AI auto-scheduler | Web, Mac, Windows, iOS, Android | $19–34/month; no free tier in notes; user could not log in |
| Reclaim.ai | AI habit/focus-time defender | Web / Google Calendar | Free Lite; Starter noted at $8/month; app/site not found by reviewer |
| Morgen | Unified calendar + AI suggestions | Mac, Windows, Linux, iOS, Android, Web | Free tier; Plus noted at $9/month |
| Amie | Design-first calendar + tasks | Mac, iOS, Web | Free tier; Pro noted around $5/month |
| Akiflow | Universal task inbox/command center | Mac, Windows, iOS, Android | $19/month; no free tier in notes |
| FlowSavvy | Budget AI auto-scheduler | Web | Free tier; Pro noted at $8/month |
| SkedPal | Rule-based smart scheduler | Web, Mac, Windows | $9.95/month in notes |
| Forest | Focus/anti-phone-addiction gamification | iOS, Android | $3.99 one-time in notes |
| Regain | Focus timer + app blocker + study gamification | iOS, Android | Free; premium for selected features |

The personal review also lists “What to Explore” questions. Those are research prompts, not confirmed app functions unless supported by written observations or the secondary competitor reports.

---

## 14. Supplemental market-profile notes

The following numbers and prices came from Habit Research/competitor_analysis.md and were not independently checked. Treat them as descriptions of the source research, not live competitive facts.

| Product | Research-described positioning/features | Recorded market/pricing note |
|---|---|---|
| Habitica | RPG task types, classes, XP/gold, parties/quests, guilds, pets, mounts, seasonal gear, Wear OS | Research cites 4M+ downloads, about 4.1 rating, free with paid cosmetics/social |
| LifeUp | Custom skills, coin economy, user reward shop, crafting/loot, task tiers, teams, offline backup, AI | Research cites 500K+ downloads, about 4.6 rating, roughly $2–4 one-time |
| Structured | Unified duration-sized timeline, inbox, AI planning, energy, calendar sync, multiple views | Research cites 2M+ downloads, about 4.8 rating, free and roughly $3/month Pro |
| Finch | Virtual pet, modular daily goals, mood journaling, breathing, gratitude, insights, widget | Research cites 10M+ downloads, about 4.8 rating, freemium |
| Fabulous | Journeys, audio coach, habit stacks, challenges, progress letters, holistic routines | Research cites 25M+ downloads, about 4.6 rating, freemium with paywall concerns |
| Routinery | Timer-guided routines, voice alerts, sequence, flexible pause/skip/adjust, widget, Wear OS | Research cites 1M+ downloads, about 4.5 rating, limited free tier/subscription |
| Sectograph | Circular calendar sectors sized by duration, widget, Google Calendar, Wear OS | Research cites 5M+ downloads, about 4.4 rating, free with one-time Pro option |
| Regain | Focus timers, app/site blocking, Shorts blocking, YouTube Study Mode, rooms, leaderboards, subject stats, sounds | Research describes free core and premium Strict Mode/themes/soundscapes; strong Indian student audience |

The wider research also discusses Duolingo (streaks, leagues, shields), Way of Life (habit history and weak-day patterns), Session (focus analytics), TimeStripe (day-to-life goal horizons), Twos (daily capture and auto-rollover), Amplenote (Jot Mode and priority score), Anytype (offline/local-first), Heptabase (visual canvas), and Carly AI (enterprise agents). Their Odyssey-relevant lessons are captured above. Rich notes, wikis, databases, canvases, backlinks, project kanban, and enterprise email/CRM automation are out of scope.

---

## 15. MASTER_TODO.md comparison: additions and more exact specifications

MASTER_TODO.md was compared item by item with this guide. Most of its roadmap repeats features already consolidated in Sections 1–9 and 12. This section records the material it adds or specifies more exactly so no unique detail is lost.

### 15.1 Visual design system and interaction language

**Current Odyssey direction (supersedes the earlier Cyber-Zen palette and conflicting screen-generation prompts):** use the soft ambient light palette described in the Lifestack review, with Amie's selective editorial serif/sans-serif pairing. This is a visual refinement of the existing product, not a new information architecture.

| Token | Current direction | Use |
|---|---|---|
| Main background | Warm off-white, blending through pale peach to soft lavender | App shell and landing backdrop; keep gradients subtle behind content |
| Primary surface | White or warm-white, softly tinted | Cards, sheets, and content areas |
| Secondary surface | Pale peach/lavender tints | Grouping, selected regions, and gentle visual depth |
| Primary accent | Violet/purple, approximately #6C00FF | Primary actions, active navigation, focus and selected states |
| Primary text | Deep charcoal/near-black | Titles, labels, and important content |
| Secondary text | Readable neutral gray | Supporting copy and metadata |
| Status colors | Existing semantic success, warning, and danger colors | Keep status colors distinct from the violet brand accent and verify contrast |

Avoid treating the old deep blue-black/indigo palette as Odyssey's default. Preserve user preference and existing semantic state colors where needed; do not force every screen into gradients or recolor meaningful status data as branding.

**Typography:** use an editorial serif for major page titles, greetings, and occasional feature headlines, with a clear sans-serif for body copy, controls, labels, and data. Keep the serif selective, ensure legibility at small sizes, and specify implementation-ready font families and fallbacks when coding.

**Motion and landing:** retain generous spacing, soft edges, subtle elevation, and scannable hierarchy. Prefer purposeful, short interactions: date transitions, cards settling into schedule, completion rings filling, and compact milestone celebrations. Build an interactive landing/onboarding that demonstrates real Odyssey states and responds to input; avoid relying on a static Stitch-generated website. Use Stitch for exploration and mockups only, then implement functional responsive UI with working state and navigation. Include reduced-motion support and keep routine actions fast.

**Time accents:** morning 05:00–11:59 amber/gold (#F59E0B); afternoon 12:00–16:59 azure/cyan (#3B82F6); evening 17:00–20:59 purple/rose (#8B5CF6); night 21:00–04:59 indigo (#4F46E5). Treat these as optional time-context indicators, not a competing brand palette; maintain contrast and do not communicate status by color alone.

### 15.2 More exact gesture behavior

- **Swipe right:** binary habit completes immediately with emerald slide-reveal, spring feedback, confetti and a haptic tick. For measurable habits, reveal an inline numeric stepper/slider first; do not mark complete until the user confirms the amount.
- **Swipe left:** reveal a compact action drawer with **Snooze +1 hour**, **2-Minute Version**, or **Skip with Reason**. This swipe-to-snooze/skip interaction was not specified in the earlier guide.
- **Day navigation:** on the Planner, horizontal swipe right goes to yesterday and left goes to tomorrow. Keep this separate from habit-card swipes and show a clear date change.
- **Commitment hold:** use a radial ring that fills clockwise over about 1.5 seconds, with gradually stronger haptics and a completion pulse. Master Todo suggests this at onboarding completion, new-habit creation, and morning-plan confirmation. Keep it optional, short, and skippable.
- **AI orbital loader:** for longer parsing/planning work, the design brief specifies 4–6 luminous colored dots orbiting elliptically with speed-up and fading trails; use this instead of a blank screen or generic spinner.
- **Focus activation:** use the radar sweep from a centered timer icon, subtle grid lines, and a pulse that can transition into the focus-room presence state.

### 15.3 Planner layout details

Use a sticky planner header with month selector, horizontal seven-day strip, completion markers, and a compact “4/6 Done · 67%” fraction. Keep the daily timeline focused on approximately 05:00–23:00, with a continuous left time axis.

The Structured-inspired category icon sits on the far-left rail and stretches vertically across the scheduled duration (for example, a two-hour Deep Work block). This preserves horizontal room for title, energy, Why, and action controls. The first pending habit in the current hour gets the highest priority treatment: a restrained glow plus an **UP NEXT** badge.

When the active block is tagged Study, Work, or Deep Work, show an inline Pomodoro launch. The Master Todo's named visual options are Ring, Flip Clock, Minimal Zen, and Lofi Ambient. The + button opens a bottom quick-capture drawer; backlog items can later be dragged into open schedule slots.

If load is high, the triage mode may collapse to only the current active task full-screen. The earlier guide's version triggers when many habits remain unstarted by mid-morning; Master Todo emphasizes an overwhelmed/current-task state. Treat these as candidate trigger rules for one user-controlled Decision Fatigue mode, with an always-available expand action.

### 15.4 Habit-screen density and color consistency

The proposed Grid mode uses a two-column card layout with icon, flame, priority, and seven-day mini-checks; List is a compact single-row scan layout; Heatmap is a scrollable **five-month** contribution-style matrix per habit. Preserve a narrow-screen fallback that changes grid density rather than clipping labels.

Use the Lifestack-inspired ambient light palette as Odyssey's default visual theme. Keep stable habit/category colors and status colors consistent across cards, date rings, timeline, and wallpaper. Preserve existing theme preferences if implemented; defer expanding theme customization until the core light-theme screens are consistent. A later habit/category color picker may customize data colors without changing the violet brand accent, and must preserve contrast and stable mappings.

The Quit/Detox area may be a dedicated section or filter rather than a separate top-level destination. Include clean-day counters and an optional emergency action when temptation is strong.

### 15.5 Wallpaper and avatar-world specifics

The Master Todo restates the existing 24-hour spectrum, NOW/NEXT blocks, and daypart-based four-habit grid. Its additional exact UI asks are:
- Show the active habit's identity/Why as a clean ambient subtitle.
- Transition through a pre-habit warning, active glow, and completed dim state; background also shifts from sunrise through midday/golden hour to midnight.
- Keep the three-day neglect desaturation as a recoverable visual state that regains color on completion.

The avatar world is more concrete than the original room concept:
- Present an illustrated 2D or isometric room.
- Reading completion can add books to a bookshelf; Focus Mode can put the avatar at a study desk; earned diamonds can unlock posters; streaks grow a garden/plant; eggs hatch in the pet corner after a proposed seven-day streak.
- Candidate settings include dorm room, mountain cabin/chalet, cyberpunk loft/apartment, seaside villa, Zen Dojo, and oceanic sanctuary.
- Avatar and room states may reflect study, rest/sleep, an intact streak, or neglected habits (clean/sunlit versus dusty). Keep this cosmetic and supportive rather than shaming.
- Avatar dialogue bubbles can encourage routines. If app blocking is enabled, injury/bandage and health states can show its consequence.
- If health reaches zero, the Master Todo proposes losing room decorations or taking an XP penalty; the original app review proposes losing customizations/accessories. These are conflicting punitive implementations. Preserve them as proposed variants only; apply the opt-in, no paid/user-owned item destruction, recovery safeguards in Section 5 before building.

### 15.6 Exact reward and analytics refinements

- **Perfect day:** when daily completion reaches 100%, show a “Perfect Day Achieved” banner and a proposed +50 bonus XP. This is an unapproved economy parameter; verify XP balance before use.
- **Habit creation:** confirmation may name the first milestone, such as a three-day streak.
- **Rank copy:** the nine rank names in the Master Todo are Beginner, Explorer, Voyager, Pathfinder, Vanguard, Ascendant, Master, Grandmaster, and Legend. Use a unique rank-specific dialog/message and an avatar portal/doorway scene when a tier unlocks.
- **Badges:** Master Todo proposes 24 badges grouped around Streaks, Deep Work, Early Rising, Consistency, and Comebacks, each with a unique icon, XP payout, and short narrative explaining the milestone. This is a larger proposed set than the example badges in Section 5; criteria and reward balance need a separate catalog.
- **Streak recovery:** show previous best, optionally ask what changed/what the user learned, and offer the three-day ramp-up.
- **Streak milestones:** include 3 and 21 days in addition to 7, 14, 30, 60, 100, and 365. Deduplicate overlaps into one milestone system.
- **Keystone:** Master Todo proposes a 1.5x XP multiplier; earlier backlog says “rewarded more.” Treat 1.5x as a specific proposed tuning value, not a settled rule.
- **Frog:** Master Todo proposes 2x XP if completed before 10:00 AM. Keep it distinct from the standard completion reward and test against XP inflation.
- **Capacity labels:** concrete sample labels include Light (about 3 habits), Balanced (about 5), and Heavy (8+); keep thresholds configurable and use duration/history, not count alone.
- **Energy check-in:** Master Todo says a five-second 1–5 star/emoji prompt on first app open; keep optional and dismissible.
- **Daily capacity warning:** compare total planned hours to the user's waking/available window, not just the habit count.

### 15.7 Notification and ritual precision

Notification options in Master Todo include exact start time, 5 or 15 minutes before, and at block end. The earlier research also proposes mid-hour and Never Miss Twice reminders. Let each habit choose its timing and suppress duplicate messages.

Its morning blueprint uses 07:00 as the sample default, while other research suggests 08:00. Keep the time user-configurable and localize it; the example can show habit count and first habit/time. The 60-second morning flow is: review yesterday, confirm today's slots, select Frog, then optionally commit.

The evening reflection specifically includes completed tasks, movement of missed habits into backlog, gratitude, and a day score. The Sunday digest may add total focus hours and top-performing habit. Keep the evening plan preview, shutdown reflection, and streak defense as separate intents so they do not generate three overlapping notifications.

Soundscape options explicitly include rain, forest, lofi, white noise, and cafe ambience. The breathing pacer names Box Breathing and 4-7-8, with gentle haptic rhythm as an optional cue.

### 15.8 Social, community, and real-world impact additions

- Public profile can include avatar, rank title, current streak, trophy shelf, and monthly heatmap; this supplements the profile fields already listed in Section 5.
- A squad heatmap can aggregate daily consistency across a study group. Share only group-visible data and allow opt-out.
- Study-room audio can synchronize ambient sound and group Pomodoro timers, beyond simply listing live focusers.
- Community challenge examples in the source include 75-Day Hard, JEE 10-Hour Deep Work Club, and 30-Day Morning Club; use these as examples, not default prescriptions.
- Add an exploratory way to convert virtual coins/achievements into real-world tree planting or charity contributions (Forest inspiration). This is separate from cash-out to a user's bank account and requires a transparent funding/donation model.

### 15.9 Additional AI and pricing details

- The Master Todo adds an **AI Habit & Routine Architect**: generate editable multi-week progression plans based on a chosen career/exam goal (example: a JEE Advanced six-month blueprint). This is distinct from recommending one complementary habit; require user review and avoid guaranteeing outcomes.
- Monthly pruning can flag habits with repeatedly low completion (Master Todo example: below 30%); the full-day audit elsewhere uses a different threshold (<40%). Make the trigger configurable/evidence-based and present Commit, Modify, Pause, or Archive rather than auto-removing.
- The weekly AI coach may synthesize mental stamina/focus depth and strategic advice. Keep any such interpretation grounded in observed behavior, avoid clinical language, and begin with the template summary.
- Profession-based examples include Student, JEE/NEET Aspirant, Tech, and Professional presets plus relevant routines. Any coupon or discount (the screenshot shows AKISTUDENTFOCUS40) must be transparent and must not hide standard terms.
- Master Todo proposes a seven-day auto-converting trial after personalized plan generation. Preserve this only as an optional offer with explicit trial end, charge date, cancellation path, and a usable free route.

### 15.10 Master Todo template variants

These additions complement the ten curated bundles in Section 6 rather than replacing them:

1. **JEE/NEET Exam Protocol:** 05:30 wake, formula revision, problem practice, flashcards, mock-test analysis, and phone cutoff around 21:00.
2. **Deep Work & Software Engineering:** no phone for 30 minutes, hardest bug/feature first, 90-minute focus, code review, shutdown.
3. **Sleep & Circadian:** consistent wake, morning sunlight, no caffeine after 14:00, screen dimming around 20:00, wind-down.
4. **Digital Detox & Dopamine Reset:** no social before noon, batch notifications twice daily, optional grayscale, phone away around 21:00.
5. **Student Anti-Procrastination Kit:** five-minute start, 25/5 Pomodoro, clear desk, subject rotation, evening review.
6. **Physical Peak Conditioning:** 10k steps, mobility, resistance training, hydration, optional protein tracking.
7. **Mental Clarity & Mindfulness:** Box Breathing, gratitude, nature walk, evening brain dump, reading.

All are editable starter templates, not advice that every user should follow. The JEE/NEET and career-specific routines should be offered only when relevant and selected by the user.

### 15.11 Master Todo traceability

The explicit Master Todo ranges were checked against Sections 1–9 and 12–15:

| Master Todo group | Coverage |
|---|---|
| UI system, palettes, motion, screen layouts | Sections 4–5 and 15.1–15.5 |
| M1–M18 micro implementations | Sections 5, 12, 15.6; M18 coffee support is in Section 5 |
| S1–S25 small implementations | Sections 5, 12, 15.2, 15.4, 15.6 |
| HD1–HD28 medium implementations | Sections 5, 12, 15.3–15.4, 15.7 |
| FD1–FD19 full-day systems | Sections 5, 12, 15.5–15.6 |
| XL1–XL15 flagship systems | Sections 5, 12, 15.5, 15.8 |
| SC1–SC8 social expansion | Sections 5, 15.8 |
| AI-1–AI-21 | Section 5.I and 15.9 |
| TB1–TB10 template bundles | Sections 6 and 15.10 |

The master roadmap's effort totals and feature counts are source estimates, not re-estimated in this guide. Its 144-entry total should not be added to the other backlog totals because many entries are the same underlying features.

---

## 16. Final cross-check against the research folder

I rechecked the distinct content areas from each source against this guide. Repeated features map to one canonical entry rather than appearing repeatedly.

| Source | Coverage in this guide |
|---|---|
| App_Reviews.md | Sections 3–5 and 13: all 23 named apps, user's likes/dislikes/ideas, platform/price notes, and the most praised UI interactions |
| Review_Analysis.md | Sections 3–4, 7, 10, 13–14: rating patterns, anti-patterns, video summaries, priorities, build sequence, unreviewed-app gaps |
| TODO.md | Sections 5–6, 8–9, 12, 15: non-AI checklist capabilities, templates, phased implementation |
| AI_TODO.md | Section 5.I: rule-based, statistical, NLP/LLM features including all distinct recommendation, recovery, optimization, and forecast behaviors |
| Habit Research/books_brainstorm_and_habits.md | Sections 5–6, 12, 15: book principles, prompts, unique wallpaper/world ideas, anti-habits, templates and habit idea bank |
| Habit Research/competitor_analysis.md | Sections 3–5, 7, 14–15: habit/focus product profiles, UI lessons, market map, feature gaps and source-claimed figures |
| Habit Research/feature_lists.md | Sections 2, 5, 8, 10, 12: existing-feature baseline and distinct AI/standard feature proposals |
| Habit Research/integration_roadmap.md | Sections 5, 8, 12: microcopy, streak recovery, stats, reminders, habit fields, flexible habits, capture, pause, focus, templates and integrations |
| Habit Research/video_analysis_shuomi.md | Sections 5, 7, 12: goal horizons, goal links, rollover, quick capture, priority, privacy/local-first, and excluded knowledge-management patterns |
| Schedule Research/competitor_analysis.md | Sections 5, 7–9, 14–15: planner competitors, rituals, timeboxing, integrations, auto-scheduling, and opportunity map |
| Schedule Research/feature_lists.md | Sections 5, 7–9, 12, 15: proven schedule patterns, unique wallpaper/forecast/debt/replay/gravity/break/triage concepts, and schedule AI |
| MASTER_TODO.md | Sections 15.1–15.11: visual tokens, exact gestures, screen layouts, detailed avatar mechanics, additional feature parameters, AI additions and templates |

**Verification outcome:** All distinct written research ideas and checklist items are represented either in the canonical feature catalogue, the source reference indexes, or the Master Todo comparison addendum. Items intentionally labeled exploratory/unvalidated are still documented as such. The remaining evidence limit is direct replay of local MP4 files: browser policy blocks local-file playback, so this guide still relies on the existing written video analysis for recording-only details. The six saved images were inspected; Aime's video file is zero bytes. Market, pricing, retention, and behavioral-science figures remain unverified source claims.

---

## 17. Final audit additions and quantitative source claims

### 17.1 Final Master Todo specifics

- **Android widget detail:** the Master Todo specifies a compact widget with the **next three habits**, today's completion fraction, streak flame, and a quick-check action. This is more specific than the earlier current/next summary. Keep it interactive, provide compact and wide sizes, and open the relevant schedule after tapping.
- **Priority appearance:** its suggested mapping is Critical = red, Focus = amber/yellow, Optional = green, shown as card accents and wallpaper highlights. Keep labels/icons as well so meaning is not color-only.
- **Onboarding labels:** suggested goal chips are Academic Excellence, Peak Health, Deep Focus, Mindfulness, and Digital Detox. Profession presets include Student, JEE/NEET Aspirant, Tech, and Professional. Show only a small relevant set and allow skipping.
- **Local-first badge copy:** the Master Todo proposes “100% Local-First — Your data never leaves your device.” Use this exact strength of claim only if the current storage/sync architecture makes it true; otherwise use accurate wording such as “Your habits are stored on this device.”
- **Shareable replay destination:** the 10-second replay is proposed as a video ready to share on WhatsApp or Instagram. Keep export opt-in; preview content before sharing and do not expose private habits automatically.
- **Master effort estimates:** the source dashboard reports Micro 18 features / about 18 hours; Small 25 / about 65 hours; Medium 28 / about 160 hours; Full-day 19 / about 28 days; Flagship 15 / about 60 days; Social 8 / about 20 days; AI 21 / about 25 days; Templates 10 / about 6 hours. It calls the total 144 detailed features. These are source estimates; do not add this total to other backlogs or treat it as a fresh engineering estimate.
- **Checkbox audit:** the Master Todo contains 144 unchecked checklist entries: M1–M18 (18), S1–S25 (25), HD1–HD28 (28), FD1–FD19 (19), XL1–XL15 (15), SC1–SC8 (8), AI-1–AI-21 (21), TB1–TB10 (10). The counts sum to 144. The unchecked status remains “not yet decided.”

### 17.2 Quantitative claims present in the research

These numbers are included so the research record is complete. They are claims copied from the source notes, not independently verified facts or Odyssey requirements.

| Source claim | Value recorded in source | How to use it |
|---|---:|---|
| Broader digital-wellness market size | About $14.95B in 2026; $50.22B projected for 2035; CAGR about 14.41% | Background market estimate only |
| New habit apps with gamification | 58–60% | Source estimate, not a design target |
| Six-month churn without gamification | 48–55% | Source estimate; validate before business planning |
| Retention uplift attributed to gamification | Up to 24% | Source claim, not a guaranteed Odyssey effect |
| Retention uplift attributed to widgets | About 25% | Source claim, not a guaranteed Odyssey effect |
| North American market share | 37–55% | Source estimate; range itself is broad |
| Phone/lockscreen checks | 70–90 checks per day | Market-research claim supporting ambient UI |
| Onboarding with at least three habits | 4x 30-day retention | Source claim; treat as a hypothesis for onboarding experiments |
| Morning/shutdown rituals | 30–40% retention improvement | Source claim; not independently validated |
| Generic notification open rate | Under 5%; contextual messaging said to achieve 3x engagement | Source claim; don't infer guaranteed notification performance |
| Passive progress visibility | Users said to be 2x more likely to act when they notice a gap | Source claim supporting widgets/wallpaper |
| Regain user screen-time reduction | 25%+ reported | Product/research claim, not independently confirmed |
| Deep-work capacity | About four hours of true deep work/day for many people | Book-derived estimate; not a user limit |
| Journaling productivity | 22.8% increase cited | Research claim; do not promise this outcome |
| Writing daily top priorities | Up to 40% higher completion cited | Research claim; not a guarantee |
| Nature and divergent thinking | 60% increase cited | Research claim; don't present as a guaranteed effect |
| Exercise recommendation | At least 150 minutes/week | Source habit list; not individualized health advice |
| Sleep duration | 7–9 hours | Source habit list; do not treat as personalized medical guidance |
| Dehydration and cognition | Even 1% dehydration said to affect concentration/mood | Source claim; verify before user-facing health copy |
| Alcohol and REM sleep | Up to 40% reduction cited | Source claim; verify before user-facing health copy |
| Loneliness comparison | Compared in source to smoking 15 cigarettes/day | Strong health claim; do not repeat in product UI without authoritative verification |
| Sauna/heat claim | 12 minutes at 174°F, three times/week, associated with 40% lower cardiovascular mortality | Strong health claim; exclude from product guidance unless verified by suitable evidence |

### 17.3 Final verification statement

The comparison now includes every Master Todo checklist range and the design/screen/interaction specifications around those ranges. The Master-only deltas are stated in Sections 15 and 17 rather than duplicating already-covered features. Section 16 maps the remaining research files to their coverage.

The completeness check is for the written files and inspectable still images. It does not claim independent playback of the MP4s: local-file video playback remained blocked, so video-only observations continue to rely on the existing Review_Analysis.md and App_Reviews.md summaries. Any numerical market, retention, behavioral, or health claim above remains a source claim until separately verified.

---

## 18. Last-pass omissions found during source-by-source verification

These small but distinct details were not explicit enough in the earlier sections, so they are added here rather than assumed from broader descriptions:

- **Today-at-a-Glance weather:** one schedule research version includes the day's local weather alongside the date, completion count, streak, and first incomplete habit. Treat weather as optional context with explicit location access; omit it if the user does not want location/weather data.
- **Protect the Asset category:** offer a special recovery category for sleep, rest, walks, and recovery habits. Present it as valuable maintenance, not as a productivity failure or an excuse to overfill the schedule.
- **5 AM Club badge criteria:** one source defines this as completing morning habits before 6 AM on seven consecutive days. Keep the badge opt-in/contextual; do not imply waking at 5 AM is universally better.
- **Wallpaper theme unlock levels from TODO.md:** the suggested sequence is Midnight Blue at level 3, Forest Green at level 5, Sunset Amber at level 8, Neon Minimal at level 12, and Diamond at level 20. These are proposals; preserve preview, user choice, and existing theme access rules.
- **User-defined skill areas:** allow optional skill/category names such as Health, Coding, Learning, Fitness, or Social, then let users link habits to them and review progress. This is a light LifeUp-inspired skill map, not a complex skill-tree editor.
- **Followed-user milestone notifications:** optionally notify about a friend's streak/badge milestone, with per-person/per-event mute controls and no exposure of private habits.
- **Community overview:** a Discover page may include top users (only where opted in), trending habits/templates, and community statistics. Keep it secondary and provide a noncompetitive view.
- **Friction-free sequenced routines:** routines may launch as a timed sequence, offer the next step if a habit finishes early, and allow pause/skip/adjust. The optional voice cue is defined in Section 12.
- **Profile sharing details:** public profile can include avatar, rank title, streak, trophy shelf, and monthly heatmap, but the user chooses each field's visibility. Social habit heatmaps remain separately permissioned.
- **Real-world charity/tree rewards:** where a user redeems coins for a tree-planting/charity contribution, show the contribution source, amount, and confirmation; this is a future program separate from app-store cosmetic purchases.
- **Reminder suppression:** if the user is already inside a focus session, suppress or defer nonessential pre-habit/mid-hour reminders so the app does not interrupt the activity it is meant to support.
- **Image and video sharing:** schedule/replay exports can target story formats such as WhatsApp/Instagram, but must show a preview and allow removal of habit names, profile details, and completion data before leaving the device.

The final written-source audit covers all 144 MASTER_TODO.md checklist entries, the other TODO and AI ranges, and the unique proposals in the habit/schedule research notes. This verifies content coverage and deduplication; it does not independently validate source statistics or replay video files.

---

## 19. Master Production Feature Matrix & Interactive Roadmap

This master matrix converts all research findings, competitor lessons, and architectural proposals into an actionable, sprint-ready checklist. Use this section as the primary engineering backlog during active production.

### Phase 1: Core Foundation & Frictionless Daily Use

#### Tier 1: Micro Polish (30 min – 2 hours each)
- [ ] **M1 — Local-First Trust Badge:** Display "🔒 100% Local-First — Your data lives on your device" in Settings, Onboarding, and Profile.
- [ ] **M2 — Habits Page Empty State:** Motivational empty state illustration: "Your journey begins with one keystone habit" + animated (+) pulse.
- [ ] **M3 — Planner Empty State:** "Your day is a clean slate. Tap + or import a routine template to begin."
- [ ] **M4 — All-Habits-Done Celebration:** Celebratory card appearing on Day Schedule when daily score = 100%: "🌟 Perfect Day Achieved! +50 Bonus XP Claimed."
- [ ] **M5 — Creation Confirmation Toast:** "Your journey with [Habit Name] begins now. First milestone: 3-day streak."
- [ ] **M6 — First-Open Welcome Banner:** Warm greeting on first launch highlighting the 3 core pillars (Habits, Schedule, Wallpaper).
- [ ] **M7 — Last Completed Label:** Contextual subtitle on habit cards: "Last done: Today at 8:15 AM" / "Yesterday" / "3 days ago".
- [ ] **M8 — Daily Capacity Indicator:** Badge on Planner header calculating workload: "Light Day (3 habits)" / "Balanced (5 habits)" / "Heavy Capacity (8+ habits)".
- [ ] **M9 — Completion Fraction Header:** Sticky fraction display in schedule header: "3/5 Habits Done · 60%".
- [ ] **M10 — Wallpaper Completion Gauge:** Render miniature completion percentage ("75%") and fraction ("3/4") directly on the live wallpaper preview.
- [ ] **M11 — Time Period Color Accents:** Ambient color coding across cards: Morning (Amber `#F59E0B`), Afternoon (Blue `#3B82F6`), Evening (Purple `#8B5CF6`), Night (Indigo `#4F46E5`).
- [ ] **M12 — Up Next Preview Line:** Dynamic ticker on Planner: "⏳ Up next in 35 min: Deep Work Session (2h)".
- [ ] **M13 — Warm Microcopy Throughout:** Replace generic labels with inspiring copy across XP toasts, streak counters, and empty states.
- [ ] **M14 — Unique Rank Level-Up Dialogs:** Custom lore messages for each of the 9 ranks (Beginner → Legend).
- [ ] **M15 — Achievement Unlock Micro-Narratives:** Unique flavor text for every badge unlock explaining the psychological significance of the milestone.
- [ ] **M16 — Onboarding Goal Category Tags:** Crisp category labels during onboarding: "Academic Excellence", "Peak Health", "Deep Focus", "Mindfulness", "Digital Detox".
- [ ] **M17 — AI Processing Orbital Loader:** Multi-color orbital dot animation (HabitDriven style) for all AI and background computation states.
- [ ] **M18 — Tip Jar / Coffee Button:** "☕ Buy the Developer a Coffee" support tile in Settings (Forest inspired).

#### Tier 2: Small Enhancements & Interactions (2–4 hours each)
- [ ] **S1 — Per-Habit Streak Flames:** Individual flame icon and number on each habit card distinct from global profile streak.
- [ ] **S2 — Habit Priority Tags:** `Critical 🔴` / `Focus 🟡` / `Optional 🟢` tags rendered as colored border accents and wallpaper highlights.
- [ ] **S3 — Energy Level Indicators:** `⚡ High Energy` / `🌙 Low Energy` / `☕ Passive` badges on cards and create/edit modal.
- [ ] **S4 — Habit Cue/Trigger Field:** Input field: "What triggers this habit?" (e.g., "After I pour my morning coffee").
- [ ] **S5 — Habit Reward Field:** Input field: "What is your immediate reward?" (e.g., "5 minutes of music").
- [ ] **S6 — Identity Statement Field:** Input field: "Who does this make you?" (e.g., "I am an athlete who never skips training") — displayed on habit detail sheet and wallpaper.
- [ ] **S7 — Habit "Why" Purpose Statement:** Single-line reminder displayed during active habit hours.
- [ ] **S8 — 2-Minute Emergency Version:** User defines minimal fall-back version (e.g., "Read 1 page" instead of "Read 30 mins") shown when streak is endangered.
- [ ] **S9 — Break Bad Habits / Quit Mode:** Toggle habit type to "Anti-Habit / Quit" with red accent styling and clean-days tracker.
- [ ] **S10 — Color-Coded Date Completion Rings:** Multi-color segmented rings below each date in horizontal calendar strip (HabitDriven/Motivated style).
- [ ] **S11 — Swipe-Right to Complete Gesture:** Tactile right-swipe on habit card with green spring feedback and haptic tick.
- [ ] **S12 — Swipe-Left for Action Drawer:** Tactile left-swipe revealing "Snooze 1h", "2-Min Version", or "Skip with Reason".
- [ ] **S13 — Inline Numeric Stepper on Swipe:** For measurable habits, swiping right smoothly exposes `[-] [ Count ] [+]` stepper directly in card.
- [ ] **S14 — Tap-and-Hold Commitment Ritual:** Circular hold-to-commit button with radial progress fill for onboarding and habit creation (Fabulous style).
- [ ] **S15 — Horizontal Day-Swipe Navigation:** Swipe left/right across day planner to change dates effortlessly (Sunsama style).
- [ ] **S16 — Current Time Indicator Line:** Glowing red/indigo horizontal marker on day timeline showing "NOW (14:25)".
- [ ] **S17 — Buffer Gap Visualizer:** Subtle dashed spacing between consecutive habits indicating rest/transition periods.
- [ ] **S18 — Planned Duration Field:** Automatic duration calculator warning if total planned hours exceed waking hours.
- [ ] **S19 — Keystone Habit Pinning:** User designates 1 keystone habit that takes top priority on wallpaper and awards 1.5x XP.
- [ ] **S20 — Today's Highlight (Make Time):** Pinned non-negotiable daily goal displayed prominently on lock screen wallpaper.
- [ ] **S21 — "Eat That Frog" Morning Bonus:** Marking hardest habit as Frog gives 2x XP bonus if completed before 10:00 AM.
- [ ] **S22 — Hero Unlogged Habit Position:** Incomplete habits automatically take precedence in wallpaper and schedule top card (Habi style).
- [ ] **S23 — Week-over-Week Delta Card:** "📈 84% completion this week vs 68% last week (+16% improvement)".
- [ ] **S24 — Streak Milestone Popups:** Custom celebration dialogs at 3, 7, 14, 21, 30, 60, 100, and 365 days.
- [ ] **S25 — Daily Morning Energy Check-In:** 5-second 1-to-5 star/emoji energy prompt upon first app open.

---

### Phase 2: Routines, Scheduling Depth & Feedback Systems

#### Tier 3: Medium Implementations (4–8 hours each)
- [ ] **HD1 — Tri-Mode Habit View Switcher:** Smooth tab toggle between **Grid Cards**, **Compact List**, and **GitHub Heatmap Matrix** (HabitBee style).
- [ ] **HD2 — Left-Rail Timeline Layout:** Structured-style timeline with category icons pinned left and vertically stretched across block duration.
- [ ] **HD3 — Unscheduled Backlog / Inbox Drawer:** Floating drawer to capture raw ideas/tasks and drag them onto schedule slots (Structured & Sunsama style).
- [ ] **HD4 — Consistent Light Theme Polish:** Apply the Lifestack-inspired warm off-white/peach/lavender surfaces and violet primary accent consistently across app screens; preserve accessible contrast and existing semantic status colors. Defer a full theme customizer or new dark-mode work until this default experience is cohesive.
- [ ] **HD5 — Habit & Category Color Picker:** Allow users to customize habit/category colors while keeping the violet brand accent consistent; preserve accessible contrast and stable date-ring, timeline, and wallpaper mappings.
- [ ] **HD6 — Multi-Trigger Habit Notifications:** Configurable reminders: Exact time, 5 min before, 15 min before, or on block end.
- [ ] **HD7 — Morning Blueprint Push:** Daily 07:00 AM notification: "Good morning! 5 habits planned today. First up: Morning Meditation at 07:30."
- [ ] **HD8 — Evening Streak Defense Alert:** 20:00 PM nudge if 5+ day streak habit remains uncompleted: "🔥 Don't break your 14-day streak! 2 habits left."
- [ ] **HD9 — "Never Miss Twice" High-Priority Alert:** If habit was missed yesterday, triggers special motivational alert today.
- [ ] **HD10 — Sunday Weekly Digest Notification:** Weekly stats recap push with total hours logged and top performing habit.
- [ ] **HD11 — Guided Morning Planning Flow:** 60-second morning modal: Review yesterday → Confirm today's slots → Select Frog → Commit.
- [ ] **HD12 — Evening Shutdown & Reflection Modal:** Review completed tasks → Reallocate missed habits to backlog → Log gratitude/score.
- [ ] **HD13 — Contextual Pomodoro Engine:** Embedded Pomodoro timer that activates during Study/Deep Work hours with multiple clock faces (TickTick style).
- [ ] **HD14 — Focus Audio Soundscapes:** Integrated ambient sound player (Rain, Forest, Lofi Beats, White Noise, Cafe) for study sessions (Forest style).
- [ ] **HD15 — Breathing Pacer Widget:** Guided 4-7-8 and Box Breathing circle animation with gentle haptic rhythms for pre-study grounding.
- [ ] **HD16 — Habit Stacking Chains:** Link habits in direct sequence ("After [Morning Coffee] ➔ [Read 10 Pages]") with visual chain links.
- [ ] **HD17 — Flexible Auto-Rollover:** Flexible habits automatically slide to next available free time slot if missed.
- [ ] **HD18 — Habit Vacation / Freeze Mode:** Pause individual habits for 1–30 days without resetting streak counters.
- [ ] **HD19 — Auto-Archive Inactive Habits:** Prompt to pause or archive habits abandoned for 14+ consecutive days.
- [ ] **HD20 — Temptation Bundling Tag:** Pair an effortful habit with an enjoyable perk (e.g., "Only listen to favorite podcast while running").
- [ ] **HD21 — 52-Week Annual Heatmap:** Year-at-a-glance GitHub-style density grid on Stats page.
- [ ] **HD22 — Deep Work / Study Hour Accumulator:** Dedicated counter tracking cumulative deep focus hours per week/month.
- [ ] **HD23 — Time-of-Day Performance Graph:** Visual bar breakdown showing completion % across Morning, Afternoon, Evening, and Night.
- [ ] **HD24 — Best Day vs Worst Day Analysis:** Day-of-week breakdown identifying user's most productive and most vulnerable days.
- [ ] **HD25 — Profession-Tailored Onboarding & Paywall:** Ask user profession (Student / JEE-NEET Aspirant / Tech / Pro) and customize paywall copy, discount codes (e.g., `STUDENTFOCUS40`), and preset routines (Akiflow style).
- [ ] **HD26 — Modular Feature Pricing System:** All-inclusive discounted subscription vs individual micro-passes for specific modules.
- [ ] **HD27 — 7-Day Free Trial Auto-Conversion Hook:** Post-onboarding personalized plan generation followed by seamless 7-day trial offering.
- [ ] **HD28 — Shareable Timetable Image Exporter:** One-tap export of daily schedule formatted as a sleek mobile wallpaper or story graphic.
- [ ] **HD29 — Searchable Template Library:** Curated goal packs with search, category filters, and 1-tap import.
- [ ] **HD30 — Sequenced Routine Runner:** Step-by-step timed execution flow with optional audio chime/voice cues and auto-advance.

---

### Phase 3: Gamification, Avatar World & Behavioral Systems

#### Tier 4: Full-Day Behavioral Engines (1–2 days each)
- [ ] **FD1 — Comprehensive Achievement Badge System:** 24 unlockable badges across Streaks, Deep Work, Early Rising, Consistency, and Comebacks with unique icons and XP payouts.
- [ ] **FD2 — Non-Punitive Streak Recovery Screen:** Encouraging restart flow showing previous best streak, lessons learned, and 3-day ramp-up plan.
- [ ] **FD3 — Monthly Seasons & Chapter Passes:** 30-day themed progression chapters (e.g., "Chapter 1: The Foundation") with exclusive wallpaper and cosmetic rewards.
- [ ] **FD4 — Rank-Up Cinematic Structure Entry:** Animated illustration of user avatar entering new architectural realms upon achieving higher rank tiers (Fabulous style).
- [ ] **FD5 — Dynamic Habit SIP Auto-Scaling (Systematic Improvement Plan):** After 14 days of 100% completion, prompt user to systematically scale habit parameters (+10% duration/reps) like an automated investment plan.
- [ ] **FD6 — Habit Resonance Card Visuals:** Habit cards visually evolve as habits age: New (Plain Matte) ➔ Consistent (Subtle Glow) ➔ Established (Gold Trim) ➔ Permanent Mastery (Diamond Hologram).
- [ ] **FD7 — Parallel Self Mirror:** Sunday projection: "If you had hit 100% this week, you would have logged +6.5 hours of Deep Work and reached Rank Level 8."
- [ ] **FD8 — Habit Weather Daily Forecast:** Morning predictive indicator: "⛅ 78% completion probability today based on your Wednesday trends."
- [ ] **FD9 — Compound Effect Visualizer:** Interactive calculator: "Doing [Habit] for 30 min/day = 182.5 hours/year = Equivalent to 4.5 college courses."
- [ ] **FD10 — Emergency Minimum Viable Habit (MVH) Switch:** One-tap emergency toggle that collapses all today's habits to their 2-minute versions during sickness or travel.
- [ ] **FD11 — Monthly Essentialism Audit:** End-of-month review highlighting habits with <35% completion and guiding user to Commit, Modify, or Archive.
- [ ] **FD12 — Habit Debt Clearing System:** Missed flexible habits accumulate into a manageable "Debt Hours" pool that can be cleared during weekend catch-up sessions.
- [ ] **FD13 — Memento Mori / Life Weeks Dot Grid:** Visual perspective grid showing total weeks lived vs remaining based on life expectancy.
- [ ] **FD14 — Decision Fatigue Triage Mode:** When user is overwhelmed, collapses schedule into a single full-screen card showing ONLY the current active task.
- [ ] **FD15 — Wallpaper Dynamic State Transitions:** Wallpaper visual state shifts in real-time (Pre-Habit Warning ➔ Active Habit Glow ➔ Completed Dim).
- [ ] **FD16 — Live Identity Statement Rendering:** Active habit's identity statement rendered in clean typography on lock screen during its scheduled hour.
- [ ] **FD17 — Wallpaper Neglect Decay Mode:** Colors desaturate over 3 days of inactivity, regaining lush saturation as habits are logged.
- [ ] **FD18 — Circadian Sky Gradient Background:** Wallpaper background color shifts smoothly through sunrise, zenith midday, golden hour, and midnight indigo.
- [ ] **FD19 — Ghost Schedule Overlay:** Faint translucent blueprint of the ideal planned schedule displayed behind actual logged progress to visualize drift.

#### Tier 5: Multi-Day Flagship Moats (3–7 days each)
- [ ] **XL1 — Interactive Avatar Living Room Engine:** Isometric/2D customizable room where the user's avatar resides.
- [ ] **XL2 — Dynamic Furniture Habit Sync:** Bookshelf populates with reading, study desk triggers during focus, posters bought with diamonds, plants grow with streaks, eggs hatch after 7-day streaks.
- [ ] **XL3 — Room Themes & Background Environments:** Unlockable room styles (Cyberpunk Apartment, Zen Dojo, Mountain Chalet, Campus Dorm, Oceanic Sanctuary).
- [ ] **XL4 — Avatar Nudge Engine:** Avatar in room displays dialogue bubbles encouraging user to maintain daily momentum.
- [ ] **XL5 — App & Website Blocker Integration:** Android Accessibility / UsageStats service blocking distracting apps (Instagram, YouTube Shorts, Reels, Games).
- [ ] **XL6 — Task-Unlock Gate:** To open blocked apps, user must complete their pending scheduled habit or study block.
- [ ] **XL7 — Avatar Health Damage Penalty (Hardcore Mode):** Exceeding emergency limits deals 1 HP damage per minute to avatar with visible bandage states (max 5 HP/day cap, clear recovery potions, zero loss of paid items).
- [ ] **XL8 — Live Social Focus Counter:** "🔥 142 students focusing right now" displayed in real-time with pulsing avatar rings.
- [ ] **XL9 — Radar Sweep Initialization:** Sonar wave animation when entering study rooms searching for live peers.
- [ ] **XL10 — Live Focus Leaderboard:** Real-time leaderboard showcasing top focus hours and unbroken streaks for today.
- [ ] **XL11 — Study Room Audio Sync:** Synchronized ambient study audio and group Pomodoro timers for study squads.
- [ ] **XL12 — Android Glance Home Screen Widgets:** Interactive 2x2 and 4x1 home screen widgets showing next 3 habits, fraction done, streak flame, and quick-check button.
- [ ] **XL13 — Persistent Notification Shade HUD:** Compact persistent notification card: "3/6 Habits Done · 🔥 12-Day Streak · Up Next: Deep Work 15:00".
- [ ] **XL14 — Interactive Landing & Onboarding:** A short, skippable, responsive first-run experience with animated real-product previews, clear feature demonstrations, animated permission explanations, goal discovery, and personalized routine setup in under 60 seconds. Build functional UI with working state and navigation; use Stitch only for exploration and static reference mockups.
- [ ] **XL15 — Daily Schedule Replay Video Generator:** 10-second animated recap of the day's timeline completing sequentially, ready for WhatsApp/Instagram sharing.

---

### Phase 4: AI Intelligence Roadmap

#### Tier A: Local Deterministic Rules (Zero Cost, 100% Offline)
- [ ] **AI-1 — Period Completion Probability at Creation:** Shows historical success rate when picking a slot: "Morning: 88% completion · Evening: 41%".
- [ ] **AI-2 — Overcommitment Warning Engine:** Triggers soft warning if scheduled workload exceeds 14-day rolling average by >50%.
- [ ] **AI-3 — Persistent Weak Day Detection:** Identifies recurring drop-offs: "Sundays average 35% completion. Consider scheduling a recovery routine."
- [ ] **AI-4 — Energy-Slot Conflict Alert:** Warns if a High Energy habit is scheduled during a historically low-energy hour.
- [ ] **AI-5 — Schedule Collision Resolver:** Flags overlapping habits and automatically suggests adjacent free slots.
- [ ] **AI-6 — Optimal Time Learner:** After 30 days of logs, calculates exact hour of highest completion probability per habit.
- [ ] **AI-7 — Automated Weekly Progress Narrative:** Template-based weekly summary highlighting top wins and key areas for improvement.
- [ ] **AI-8 — Dynamic Streak Recovery Path:** Generates 3-day step-down restart plan when a major streak breaks.
- [ ] **AI-9 — Smart Auto-Reschedule on Miss:** If habit is missed at scheduled hour, prompts with one-tap reschedule to next free block.
- [ ] **AI-10 — Weekly Routine Optimizer:** Sunday evening automated suggestions to rebalance unevenly loaded days.
- [ ] **AI-11 — Monthly Habit Pruning Recommendations:** Recommends archiving habits that consistently fail to pass 30% completion.

#### Tier B: Statistical ML & Correlation Discovery (Local Math)
- [ ] **AI-12 — Habit Catalyst Correlation Detector:** Identifies habits that boost others: "On days you complete Morning Meditation, Deep Work completion increases by 34%."
- [ ] **AI-13 — Energy-Performance Correlation:** Correlates daily 1-5 energy logs with habit completion to identify optimal productivity conditions.
- [ ] **AI-14 — Predictive Day Completion Forecast:** Calculates morning probability score (e.g., "⛅ 76% Likely") based on day of week, streak momentum, and planned load.
- [ ] **AI-15 — Habit Time Drift Detector:** Detects when actual completion time systematically drifts from scheduled time (e.g., scheduled at 18:00, completed at 19:30) and prompts schedule update.
- [ ] **AI-16 — Burnout Early Warning System:** Detects 20%+ velocity drop over 14 days and prescribes a 3-day de-load routine.

#### Tier C: Natural Language & LLM Coaching (Cloud / Hybrid)
- [ ] **AI-17 — Natural Language Habit Creation:** Type "Gym workout for 1 hour every Mon Wed Fri at 6 PM" ➔ auto-populates full habit schema.
- [ ] **AI-18 — Natural Language Schedule Command:** Type "Add 2 hours mock test tomorrow afternoon" ➔ slots block into timetable.
- [ ] **AI-19 — Conversational AI Onboarding Profiler:** Interactive AI chat during onboarding assessing goals, obstacles, and student schedule to build starter routine (Amie style).
- [ ] **AI-20 — AI Habit & Routine Architect:** Generates custom multi-week habit progression blueprints based on user career/exam target (e.g., "JEE Advanced 6-Month Study Blueprint").
- [ ] **AI-21 — Personalized AI Weekly Coach Narrative:** Deep weekly synthesis evaluating mental stamina, focus depth, and giving personalized strategic advice.
- [ ] **AI-22 — Habit Recommendation Engine:** Suggests complementary habits based on user routine and goals.
- [ ] **AI-23 — Dynamic Conversational Personality Profiler:** Conversational test that adapts tone and guidance style to user psychology.

---

### Phase 5: Social, Community & Expansion

- [ ] **SC1 — Public User Profile:** Sharable profile showing avatar, title rank, current streak, trophy shelf, and monthly completion heatmap.
- [ ] **SC2 — Friend System & Following:** Connect with study buddies and friends with granular privacy controls.
- [ ] **SC3 — Social Habit Comments & High-Fives:** Leave encouraging comments and reactions on friends' logged completions (HabitShare style).
- [ ] **SC4 — One-Tap Routine Sharing Links:** Generate public web links for routine templates allowing friends to import your full schedule.
- [ ] **SC5 — Community Challenge Squads:** Strava-style group challenges (e.g., "75-Day Hard", "JEE 10-Hour Deep Work Club", "30-Day Morning Club") with group leaderboards.
- [ ] **SC6 — Squad Habit Heatmap:** Shared grid showing daily consistency across the entire study group.
- [ ] **SC7 — Marketplace for Item & Skin Trading:** User-to-user trading of rare cosmetic avatar accessories and room items.
- [ ] **SC8 — Real-World Impact Rewards:** Convert virtual coins/achievements into real-world tree planting or charity contributions (Forest style).
- [ ] **SC9 — External Calendar 2-Way Sync:** Bi-directional sync with Google Calendar and Outlook.
- [ ] **SC10 — Wear OS Companion App:** Glanceable wrist companion for checking off habits and viewing live focus timers.

---

## 20. Technical Architecture, Android Native Service Bridges & Data Schemas

To ensure seamless production, Odyssey relies on a local-first reactive architecture combining web technologies (TypeScript/Next.js/React) with native Android Kotlin services via Javascript Bridge.

### 20.1 Core Database Schemas (Dexie.js / IndexedDB & SQLite)

```typescript
// 1. Habit Schema
interface Habit {
  id: string;
  title: string;
  category: 'health' | 'learning' | 'deep_work' | 'mindfulness' | 'detox' | 'custom';
  color: string; // Hex color (e.g. #6366F1)
  icon: string;
  type: 'binary' | 'measurable' | 'avoid' | 'time_limit';
  targetValue?: number; // e.g., 2000 (ml) or 20 (pages)
  unit?: string; // "ml", "pages", "reps"
  frequency: 'daily' | 'weekdays' | 'weekends' | 'custom_days';
  customDays?: number[]; // [0 = Sun, 1 = Mon, ... 6 = Sat]
  scheduledPeriod: 'morning' | 'afternoon' | 'evening' | 'night' | 'flexible';
  scheduledTime?: string; // "07:30"
  durationMinutes: number; // e.g., 30
  priority: 'critical' | 'focus' | 'optional';
  energyLevel: 'high' | 'low' | 'passive';
  isKeystone: boolean;
  isDailyHighlight: boolean;
  isFrog: boolean;
  cueText?: string;
  whyText?: string;
  identityStatement?: string;
  twoMinuteVersion?: string;
  streakCurrent: number;
  streakBest: number;
  isPaused: boolean;
  pauseUntil?: string; // ISO date
  isArchived: boolean;
  createdAt: string;
}

// 2. Schedule Block Schema
interface ScheduleBlock {
  id: string;
  date: string; // "YYYY-MM-DD"
  habitId?: string; // Linked habit or custom task
  title: string;
  category: string;
  color: string;
  startTime: string; // "14:00"
  endTime: string; // "15:30"
  durationMinutes: number;
  isCompleted: boolean;
  completedAt?: string;
  loggedValue?: number;
  isSkipped: boolean;
  skipReason?: string;
  isHardened: boolean; // Flexible habit that became fixed
}

// 3. User Gamification & Avatar State
interface UserProfile {
  id: string;
  name: string;
  rankTitle: string; // "Explorer", "Voyager", etc.
  level: number;
  currentXP: number;
  xpToNextLevel: number;
  diamonds: number;
  globalStreak: number;
  streakFreezeCount: number;
  avatarHealth: number; // 0 - 100
  avatarRoom: {
    theme: string; // "zen_dojo", "cyberpunk_loft", etc.
    unlockedFurniture: string[];
    booksCount: number;
    plantGrowthStage: number; // 0 (withered) - 5 (lush)
    equippedPetId?: string;
  };
  unlockedWallpaperThemes: string[];
  activeWallpaperTheme: string;
}
```

### 20.2 Android Native Bridge Contracts

1. **`OdysseyWallpaperService.kt` & `WallpaperWorker.kt`:**
   - **Trigger:** Hourly background sync + Immediate broadcast whenever a habit is completed in the React webview.
   - **Payload Rendered:** 24h spectrum gradient bar, NOW and NEXT active blocks, dynamic 4-habit checklist with colored check rings, ambient identity subtitle, and circadian background palette.
2. **`FocusLockService.kt` (Accessibility & UsageStats):**
   - **Trigger:** User opens a blacklisted package (e.g., `com.instagram.android`).
   - **Action:** If an active Focus Session is running or pending tasks exist, displays full-screen overlay gate `TaskUnlockActivity.kt`.
   - **Hardcore Damage Handler:** Bypassing the gate deducts 1 HP per minute from `userProfile.avatarHealth` via local SQLite update.
3. **`AlarmManager` & `NotificationHelper.kt`:**
   - Exact alarms scheduled for:
     - Pre-Habit Nudge (T-15 min, T-5 min)
     - Morning Blueprint (07:00 AM)
     - Streak Defense Alert (20:00 PM)
     - Evening Shutdown (21:30 PM)

---

## 21. Production Decision Matrix & Default Parameter Calibrations

To prevent ambiguity during implementation, the following concrete production defaults are established:

| Domain | Feature Area | Production Default Parameter | Rationale / Source |
|---|---|---|---|
| **Progression** | Level XP Curve | `XP_Required = 100 * (Level ^ 1.5)` | Smooth progression: Lv 1→2 = 100 XP, Lv 5 = 1118 XP, Lv 10 = 3162 XP. |
| **Progression** | Base Habit Completion XP | `+10 XP` per standard habit completion | Consistent micro-reward matching existing `gamification.ts`. |
| **Progression** | Frog Habit Bonus | `2.0x XP (+20 XP)` if done before 10:00 AM | Strong morning behavioral anchor (Eat That Frog). |
| **Progression** | Keystone Habit Bonus | `1.5x XP (+15 XP)` | Rewarding foundational anchor habits (Power of Habit). |
| **Progression** | Perfect Day Bonus | `+50 Bonus XP + 5 Diamonds` | Major milestone for 100% daily follow-through. |
| **Gamification** | Avatar Damage Model | `1 HP / minute`, capped at `5 HP / day max` | Prevents excessive punishment while maintaining real stakes. |
| **Gamification** | Avatar Item Loss | **Zero permanent loss of paid/earned items.** | If HP hits 0, avatar enters "Exhausted" state (needs 24h rest or potion). |
| **Scheduling** | Heavy Day Warning Threshold | `8+ habits` OR `6+ total planned hours` | Heuristic from Sunsama & Essentialism research. |
| **Scheduling** | Overcommitment AI Trigger | Scheduled load > 150% of 14-day rolling average | Prevents burnout before the day begins. |
| **Scheduling** | Decision Fatigue Trigger | `6+ scheduled habits` AND `0 completed by 11:00 AM` | Collapses schedule to single highest-priority Frog habit. |
| **Scheduling** | Buffer Time Insertion | `5 - 10 minutes` between consecutive blocks | Prevents calendar claustrophobia (Reclaim.ai). |
| **Notifications** | Default Morning Push | `07:00 AM local time` (User configurable) | Delivers day blueprint before typical morning routines start. |
| **Notifications** | Default Streak Defense | `20:00 PM local time` (User configurable) | Sufficient evening buffer to complete 1-2 pending habits. |
| **Notifications** | Evening Shutdown Flow | `21:30 PM local time` (User configurable) | Promotes healthy circadian wind-down. |
| **AI Analytics** | Pruning / Audit Threshold | Habit completion `< 35%` over 30 days | Prompts user to Commit, Modify, or Archive without auto-deleting. |
| **AI Analytics** | Weak Day Pattern Threshold | Weekday completion `< 40%` for 4+ consecutive weeks | Triggers suggested lighter schedule for that specific weekday. |

---

## 22. Pre-production readiness review

This review checks the revised guide for roadmap count drift, conflicting product rules, and implementation assumptions that need verification before feature work.

### 22.1 Roadmap count and source of truth

- The original `MASTER_TODO.md` has **144 unchecked checklist items**: M1–M18 (18), S1–S25 (25), HD1–HD28 (28), FD1–FD19 (19), XL1–XL15 (15), AI-1–AI-21 (21), SC1–SC8 (8), and TB1–TB10 (10).
- The revised feature matrix in Section 19 has **140 implementation items**: M1–M18 (18), S1–S25 (25), HD1–HD30 (30), FD1–FD19 (19), XL1–XL15 (15), AI-1–AI-23 (23), and SC1–SC10 (10).
- This is a deliberate reorganization if the ten TB template bundles are treated as reusable content rather than engineering tickets: the revised matrix removes those ten content entries and adds six implementation items (HD29–HD30, AI-22–AI-23, SC9–SC10), for a net change of minus four. The template content remains in Sections 6 and 15.10. Keep both totals labeled by source; do not call the revised matrix “144 features.”
- Section 8 is the recommended product sequence; Section 19 is the expanded candidate backlog grouped by rough effort. Section 19 does not make all 140 items approved for the first release. Re-estimate tiers after inspecting the application and split each selected feature into acceptance criteria.

### 22.2 Architecture assumptions to verify against the app

Section 20 is a proposal, not a verified design for the current codebase. The Market Research folder does not contain the application source, so this audit cannot confirm its framework, Android shell, persistence, or existing service contracts.

- Confirm the first release platform and the actual app entry point. The proposed Kotlin wallpaper, notification, and focus services are Android-specific; do not assume they apply to a web or iOS release.
- Resolve the proposed **Dexie/IndexedDB plus SQLite** arrangement before implementing writes. Choose one authoritative store, or document the exact ownership, transaction, migration, retry, and conflict rules between stores. The wallpaper, app UI, rewards, and notification services must read consistent state.
- Version the JS–Android bridge and make commands/results explicit, including error handling and idempotency. A “habit completed” event must not award XP twice if the bridge or worker retries.
- Model scheduled occurrences and completion history as dated records, with explicit local-time/time-zone behavior, daylight-saving handling, and recurrence exceptions. Avoid representing “completed” and “skipped” as independent booleans that can both be true. Derived values such as streaks and level progress should have one documented source of truth.
- Reconcile the example schema with the planned custom skill areas, anti-habits, measurable targets, pause/freeze history, and user-created categories. The current fixed category/type enums and minimal schedule block do not yet express all of those cases.
- Decide which data remains on-device and which optional features send data to a service. The guide proposes social accounts, cloud AI, calendar sync, and cloud-enabled sharing, so the unconditional “100% Local-First — Your data never leaves your device” badge is only valid for a clearly defined mode where that statement is true. Explain each opt-in data flow and preserve a useful offline path.

### 22.3 Product rules to settle before coding the corresponding features

- **Rewards:** define whether the level curve is XP needed for the next level or cumulative lifetime XP; specify how Frog and Keystone bonuses combine; state whether the perfect-day reward is +50 XP alone or +50 XP and five diamonds; and award each event once. Define which scheduled habits count toward a perfect day, including skipped, paused, flexible, and deleted items. The current M4 copy and Section 21 reward table differ.
- **Capacity:** Section 19 labels 8+ habits “Heavy Capacity,” while Section 21 uses 8+ habits **or** six planned hours as a heavy-day warning. Name the states consistently and let users adjust capacity; treat these thresholds as starting hypotheses, not validated limits.
- **Schedule changes:** rollover, auto-reschedule, decision-fatigue mode, and weekly optimization must preview the proposed change, allow decline/undo, and never silently move or hide commitments. The existing user-control principle remains the rule.
- **Interactions:** state the swipe behavior by habit type: a binary habit may complete on right-swipe, while a measurable habit should reveal the numeric stepper before committing a value. Keep visible buttons and accessible alternatives; gestures cannot be the only way to complete, snooze, or skip.
- **Notifications and focus:** make reminders individually configurable, respect quiet hours and active focus sessions, and use the device's local time. Treat 07:00, 20:00, and 21:30 as editable defaults, not universal schedules.
- **Analytics:** show sample size and uncertainty for personal predictions, wait for sufficient history, and describe correlations as correlations. Rename “Burnout Early Warning” to a neutral workload/consistency trend; do not present it as a health diagnosis or claim a routine will treat burnout.
- **Habit identity, energy, mood, age/life-week estimates, and social sharing** should be optional, explain their purpose, and have clear visibility controls. Avoid displaying sensitive habit names on a lock screen or exported image without an explicit preview choice.

### 22.4 Android permission and distribution gates

- Section 20 currently says to use exact alarms for all listed reminders. Prefer inexact alarms or scheduled background work when minute-level timing is not essential. Request exact-alarm access only for a user-facing function that truly needs precision, check access before scheduling, explain the request, and degrade gracefully when it is denied. Android documents exact alarms as resource-intensive and recommends inexact alarms for most app workflows ([Android alarm scheduling guidance](https://developer.android.com/develop/background-work/services/alarms)).
- Keep app blocking out of the first release unless it proves central to the product. The proposed `AccessibilityService` use requires an accurate Play declaration; for a non-accessibility app it also requires a prominent, separate in-app disclosure and affirmative consent, and Play policy review. Do not present approval as guaranteed ([Google Play Accessibility API policy](https://support.google.com/googleplay/android-developer/answer/10964491?hl=en)). Any Usage Access, package visibility, overlay, and background-running requirements also need a permission-by-permission platform review before implementation.
- If a subscription or trial is added, keep the core path usable without accepting a trial where promised. Before enrollment, clearly show trial length, the price and billing period after trial, automatic renewal, and cancellation steps; provide subscription management. Do not make “auto-conversion” a hidden onboarding outcome ([Google Play subscriptions policy](https://support.google.com/googleplay/android-developer/answer/9900533?hl=en)).

### 22.5 Recommended first production gate

There is no research-level reason to stop production planning, but the full 140-item matrix is not a release scope. Start with a codebase audit and a small, testable daily-use slice: verify the current habit create/edit and completion flows, confirm the authoritative local data path, and trace one habit from setup through today’s schedule, completion history, progress display, and (if Android is the target) wallpaper refresh. Record the current behavior first; then define acceptance criteria for any gap before implementation. Read the active project instructions and the installed framework documentation before changing code.

Do not begin with app blocking, cloud AI, social accounts, subscriptions, or the avatar penalty system. Those features depend on unresolved permission, privacy, platform, or reward rules above. The optional ideas and numeric thresholds in this guide remain proposals until explicitly selected for a release.

**Readiness result:** The research is consolidated and usable to begin Phase 0 (inspect and verify the application). Production feature implementation should begin after the target platform, data ownership, first-release scope, and reward rules are confirmed against the actual app.

---

*End of Odyssey Master Production Guide — ready for the application audit and launch-scope definition.*
