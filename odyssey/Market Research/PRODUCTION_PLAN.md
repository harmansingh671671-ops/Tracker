# Odyssey — Production Plan

**Purpose:** Provide the staged production roadmap for turning the Market Research folder into Odyssey: an all-ages, Android-first self-improvement app for habits, schedules, focus, reflection, and motivating personal progress.

**Plan sources:** MASTER_TODO_REVISED.md is the current consolidated product guide. It combines the written competitor reviews, app recordings and UI notes, Habit Research, Schedule Research, TODO.md, AI_TODO.md, and the earlier master backlog. This plan sorts those findings into production phases and records the decisions that should guide implementation.

**Current boundary:** This workspace contains the research, not the existing app source. Phase 0 must inspect the actual app project before anyone changes app code or treats a proposed framework, database, or Android service design as verified.

## Product direction

Odyssey should make it easy to decide what matters today, start the next action, and recover when plans change. Its core combines:

- A clear daily schedule and lightweight task capture.
- Positive, measurable, avoid, and quit-habit tracking.
- Focus sessions, routines, and helpful recovery paths.
- Free progress graphs and personal history.
- Optional avatar progression, customization, and social accountability.
- AI assistance with a limited free chat tier and additional Pro capabilities.

Keep the normal daily experience simple and supportive. Advanced features should be discoverable without crowding the everyday flow. Use competitor apps as references for interaction quality, not as sources to copy assets or distinctive branding.

## Decisions to carry into production

- **Product sequence:** Phase 0 foundations, then Phases 1–7 below.
- **Platform and audience:** Android first; broad self-improvement, not student-only; optional goal packs; English first; India and global markets where product, payment, legal, and support requirements are met.
- **Data:** Core planning should work locally. Cloud AI, sync, calendar, and social use require clear opt-in and accurate data-flow explanations.
- **Free and paid:** Phases 1–4 are free. Phase 5 offers free AI chat only at two visible app credits per day. Pro provides advanced AI and higher AI usage once Phase 6 activates subscriptions.
- **Subscriptions:** One Pro subscription with monthly and annual options. No token packs or per-module passes. No required trial; an optional trial needs clear terms and validation.
- **Avatar strict mode:** Optional and available at any age, with gentle, capped, recoverable states. No injury or death depiction and no permanent loss of earned or paid items.
- **Social access:** Age-aware controls and guardian management for younger users; privacy defaults are opt-in.

## Production phases

### Phase 0 — Foundations and audit the existing app

**Goal:** Replace research assumptions with verified facts and prepare safe, coherent implementation boundaries.

- Open the existing app project; record its working features, screens, routes, data store, native Android services, build process, and known issues.
- Compare the verified app baseline with this roadmap. Mark items as working, partial, missing, conflicting, or deferred.
- Read the active project instructions before coding. If the project uses Next.js, read the guide for the installed version under node_modules/next/dist/docs/ before changing code.
- Confirm supported Android versions and screen sizes, existing user-data migration needs, and the current permission behavior.
- Choose one authoritative source for habits, dated schedule occurrences, completions, rewards, and the wallpaper/widget state. Do not make independent writes to IndexedDB and SQLite without explicit ownership, migration, retry, and synchronization rules.
- Define dated history, recurrence exceptions, local-time/time-zone and daylight-saving behavior, and retry-safe completion/reward events.
- Establish what stays on-device and what is sent to optional services. Update the local-first wording so it remains accurate when a user enables cloud features.
- Review the feasibility and policy path for notifications, exact alarms, app blocking, usage access, accessibility services, billing, children’s privacy, social functions, and distribution regions.
- Define service boundaries for the local domain store, versioned JS–Android bridge, AI request/credit service, social/moderation backend, and shared Pro entitlement. Select specific vendors and APIs only after inspecting the app and the current requirements.

**Exit gate:** The app repository and baseline are documented; one data ownership design is chosen; platform and permission feasibility are recorded; the initial phase acceptance criteria are agreed. No production feature should depend on an unverified architecture assumption.

### Phase 1 — Complete UI/UX redesign from the ground up

**Goal:** Replace the existing visual experience across every current screen and primary interaction while preserving verified product behavior and user data.

This phase must deliver a substantial redesign, not small cosmetic edits to the current interface. Inventory every existing screen, route, dialog, empty state, loading state, and important interaction before generating replacements. Redesign the navigation, information hierarchy, layouts, typography, color system, cards, forms, controls, icon treatment, and interaction feedback as one coherent Odyssey design system.

#### Antigravity and Stitch MCP requirement

Whenever Antigravity is asked to use Stitch MCP to regenerate the app UI, give it an explicit full-redesign brief. Do not ask it merely to “improve” or “polish” the existing screens. It must:

1. Review the full screen and state inventory from the app, not only the screen currently open.
2. Propose a new visual direction and regenerate every current screen and primary flow in that direction.
3. Change the visual hierarchy and layout where needed; do not preserve the current composition by default.
4. Use the market research references below as inspiration while creating original Odyssey layouts, assets, copy, and motion.
5. Compare the generated result against the current app screen by screen. If the result is still substantially similar or changes only small details, revise the brief and regenerate before implementation.
6. Keep all existing working actions and saved-data behavior available in the redesigned UI. Do not ship controls for features that have not been implemented.

Use these instructions as the baseline prompt for the UI regeneration work:

> Completely redesign the Odyssey app UI from the ground up. Do not make minor edits to, or automatically preserve, the current screen layouts, navigation, typography, colors, or component styling. First inventory every current screen, route, dialog, empty/loading/error state, and primary user flow. Then create a coherent, original Android-first visual system and regenerate the entire screen set and key interaction states. Use the market research references for interaction inspiration, not for copying their branding or assets. Make the interface polished, clear, warm, and easy to use on narrow phones. Add purposeful, smooth animations for navigation, progress, gestures, onboarding, focus, and completion; keep them responsive, non-blocking, and accessible with reduced-motion alternatives. Preserve the app’s verified functionality and saved data. Show a screen-by-screen comparison and revise any output that still looks substantially like the old UI.

#### UI and interaction direction

- **HabitDriven/Motivated:** use segmented date completion rings as a prominent date-strip pattern; keep labels and accessible descriptions so the meaning does not depend on color.
- **Structured:** use a readable vertical schedule with a stable left rail for time/category icons, duration-sized blocks, a clear NOW marker, and visual breathing gaps. Make inbox items easy to promote into scheduled blocks.
- **HabitBee:** support clear list, grid, and heatmap views when each is usable on small screens.
- **Fabulous:** use thoughtful illustrations, brief commitment interactions, and milestone scenes; avoid its question-heavy onboarding and walkthrough style the reviewer disliked.
- **Regain:** show a short radar/pulse moment when focus starts and explain sensitive permissions with a visual preview, plain language, and a skip path.
- **Akiflow:** present paid value clearly when Phase 6 arrives; do not obscure what remains free.
- Create Odyssey’s own assets and motion language. Keep animation intentional: screen transitions, ring/progress fills, tactile swipe feedback, focus start, and meaningful milestones. Respect reduced motion; animations must not delay input or hide controls.
- Redesign onboarding to be short and skippable, with broad optional goal packs rather than a student-first assumption.
- Apply the new design system to every existing screen. Future feature screens should follow the system when their phase begins, but do not present nonfunctional placeholder features as if they are ready.

**Feature mapping:** M1–M3, M5–M6, M11, M13, M16–M17; HD1; foundational theme and accessibility work in HD4; onboarding portion of HD25; S14; XL14. M17 establishes a reusable loading treatment for later AI work. Use accurate local-data wording; do not display an unconditional “100% local” claim if enabled services send data elsewhere.

**Exit gate:** Every current screen and major state has a reviewed redesign; core actions remain discoverable; motion is smooth and purposeful on the supported device range; reduced-motion and accessible alternatives work; no current workflow or saved data was lost.

### Phase 2 — Free core app: habits, schedule, focus, and feedback

**Goal:** Make the daily self-improvement loop useful, dependable, and complete without requiring an account or subscription.

- Add or complete binary, measurable, avoid, and quit habits; frequency, cues, purpose, identity, energy, priority, rewards, keystone/highlight/Frog fields, two-minute versions, streaks, pause/freeze, and recovery.
- Build the schedule timeline, date navigation, current-time and next-up states, duration and capacity summaries, buffers, recurrence, capture inbox, routine chains, and editable starter templates.
- Support user-controlled rollover/rescheduling with a preview, decline, and undo. Include morning planning and evening review only where they reduce effort.
- Add configurable reminders, quiet hours, active-focus suppression, optional focus/Pomodoro modes, breathing, soundscapes, and routine voice cues.
- Add ordinary code-based progress feedback: completion fractions, history, date rings, weekly comparisons, time-of-day and weekday charts, annual heatmap, focus-hour totals, and clear sample sizes.
- Add minimum-viable-habit/emergency mode, decision-fatigue presentation, optional time-debt markers, and screen-time analytics only with explicit platform permission. Mood check-ins and life-weeks reflection are exploratory, optional, private, and non-diagnostic.
- Include the supplemental planning ideas from the research: context tags; weekly/monthly/yearly goals; optional ideal-week planning compared with actual completion; a private intentional “not doing” list; pay-yourself-first ordering; a gentle suggestion to keep the active habit set manageable; a weekly Mind Sweep into the inbox; and optional affirmations or short visualization prompts. These must stay user-controlled and must not become extra mandatory onboarding questions.
- Add an optional schedule energy gradient only after enough personal history exists, with a toggle and labels so color is never the sole explanation. A read-only calendar overlay may show only user-selected personal event types such as birthdays; it is optional and must not be required for planning.
- Keep schedule time-debt informational. The separate habit-debt idea is experimental and optional: if retained, cap it, prevent compounding, exclude essential habits, and never imply that the user owes the app work.
- Add the core wallpaper, interactive Android widgets, and optional notification progress card using the same saved state as the app. Hide sensitive habit names by default on lock-screen surfaces and exports.
- App blocking and task-unlock gates are opt-in and gated by Phase 0 feasibility. Explain access before requesting it; preserve the rest of the app when permission is denied.

**Feature mapping:** M7–M10, M12; S1–S13 and S15–S25; HD2–HD24 and HD29–HD30; XL5–XL6 and XL12–XL13; deterministic AI-2, AI-5, AI-7–AI-9, AI-11; FD9–FD14 and FD15–FD19. For AI-3, the weak-day chart belongs here and its personalized suggestion belongs in Phase 5.

**Content mapping:** Include all ten curated template bundles in MASTER_TODO_REVISED.md and the seven supplemental market-research packs as editable, optional starting points. Templates are examples, not mandatory routines or health prescriptions.

**Exit gate:** Schedule and completion history agree across screens; recurrence and time-zone behavior are correct; offline core use works; stats are understandable; reminders and permissions can be declined; widgets/wallpaper reflect the same state as the app.

### Phase 3 — Free avatar, progression, and customization

**Goal:** Make progress visible and rewarding without making the core habit loop pay-to-win or punitive.

- Verify current XP and rank behavior before changing reward math. Define one source of truth and retry-safe awards.
- Add achievement badges, streak milestones and recovery, rank-up scenes, chapters/seasons, and restrained habit resonance visuals.
- Build the avatar’s room/world, responsive furniture and environment, themes, pets, and cosmetic inventory.
- Add an earnable-currency shop with clear prices and unlock conditions. Keep it cosmetic; subscriptions and purchases must not provide an unfair progress advantage.
- Strict mode may affect the avatar only through gentle, bounded, recoverable states. Users can turn it off; no permanent loss or harsh imagery.

**Feature mapping:** M4, M14–M15; FD1–FD4 and FD6; XL1–XL4 and XL7.

**Exit gate:** Reward rules are visible, repeated events do not grant duplicate rewards, users can recover, and purchases never remove earned or paid items.

### Phase 4 — Free social and community

**Goal:** Add optional social accountability while preserving privacy and age-appropriate access.

- Add opt-in profiles, friend/follow connections, routine sharing, habit comments/reactions, interest-based communities, squad challenges, shared progress views, and social focus rooms.
- Give separate visibility controls for profile fields, streaks, heatmaps, and individual habits. Sharing a routine must preview exactly what another person receives.
- Add a secondary Discover view for opted-in top users, trending habits/templates, and community statistics; provide a noncompetitive view and notification controls.
- Provide community terms, ongoing moderation, in-app reporting and blocking, safety reminders, guardian controls, and age-aware community access.
- Do not introduce anonymous stranger chat or unsolicited adult-to-minor direct messages. Keep social features free.

Google Play requires additional safeguards when children are included in an app’s declared audience, including management of social features and safety steps. User-generated content also requires moderation, terms, reporting, and blocking; confirm the current policy and legal requirements for each launch region before implementation. See [Google Play Families Policy](https://support.google.com/googleplay/android-developer/answer/9893335?hl=en) and [Google Play UGC Policy](https://support.google.com/googleplay/android-developer/answer/9876937?hl=en).

**Feature mapping:** SC1–SC6; XL8–XL11 and XL15; HD28 for shareable schedule exports.

**Exit gate:** Privacy defaults, age bands, guardian controls, reporting, blocking, moderation operations, and community safety flows are implemented before users can publish or exchange content.

### Phase 5 — AI and personalization

**Goal:** Introduce useful AI while preserving user control, privacy, and transparent limits.

- Build a provider-neutral AI gateway and a visible free-credit meter. Free access is chat only: two app credits per day, with simple requests costing one and medium requests costing two. Complex Pro requests should show a useful preview and explain the upgrade path.
- Add advanced personalized weekly coaching, natural-language habit/schedule drafts, multi-week routine planning, recommendation, and optional conversational onboarding.
- Show generated habits and schedule changes as editable proposals. Never silently create, move, complete, or delete user commitments.
- Make AI cloud context opt-in. Keep credentials out of the client. Provide useful failure and offline states; do not imply that statistical correlations prove causation or diagnose health conditions.
- Build and validate the advanced AI capabilities in this phase, but keep them unavailable to free users until Phase 6 turns on the Pro entitlement. Free users continue to receive chat only.

**Feature mapping:** AI-1, AI-3–AI-4, AI-6, AI-10, AI-12–AI-23; FD5, FD7–FD8. Free charts and deterministic summaries remain in Phase 2.

**Exit gate:** Daily credits are enforced and explained; generated changes require approval; cloud fields are disclosed; failures, low data, and uncertain recommendations are handled honestly.

### Phase 6 — Pro, distribution, and initial public launch

**Goal:** Establish a clear paid tier and release the product through the chosen Android channels.

- Offer one Pro subscription with monthly and annual options. Do not add token packs or individual module passes.
- Keep core habits, schedule, completion, Phase 2 graphs, and the free chat allowance available without subscribing.
- Pro unlocks advanced AI and higher AI usage. A trial is optional, never required, and must state duration, post-trial price, billing period, renewal, and cancellation before enrollment.
- Provide Google Play and direct Android builds through channel-specific purchase adapters with one shared entitlement decision.
- Add purchase restore, account/data management, privacy and subscription disclosures, support, crash/error monitoring, store listing, and release operations.
- Keep the tip jar separate from Pro and entirely optional. Confirm current payment and distribution rules before offering a direct purchase path.

**Feature mapping:** M18; HD26 becomes the single all-inclusive Pro plan; HD27 becomes an optional, clearly disclosed trial; the paywall portion of HD25 belongs here.

**Exit gate:** Users can understand the free/Pro difference, purchase and restore through either supported channel, cancel/manage subscriptions, and use core app features without starting a trial.

### Phase 7 — Post-launch expansion

**Goal:** Add larger integrations after the Android core release is stable.

- Consider two-way calendar sync with Google Calendar and Outlook; keep any Phase 2 read-only calendar view distinct from write access and bidirectional sync.
- Consider a Wear OS companion after Android mobile data and completion behavior are stable.
- Consider cosmetic item trading only after moderation, ownership, fraud, and economy rules are defined. Do not introduce real-money trading by implication.
- Consider real-world impact rewards only after partner, funding, redemption, privacy, and regional operations are viable.
- Evaluate opt-in cloud backup/sync as a separate service with clear conflict handling and data deletion/export behavior.

**Feature mapping:** SC7–SC10.

**Exit gate:** Each expansion has a scoped implementation, support and safety plan, and does not weaken the local core experience.

## Cross-phase implementation rules

1. **One source of truth:** Habits, dated occurrences, completions, streaks, rewards, widgets, wallpaper, and notifications must not develop independent conflicting state.
2. **No silent changes:** Rollover, auto-rescheduling, optimization, AI drafts, and bulk schedule adjustments require preview and explicit apply; support undo where possible.
3. **Accessible interaction:** Gestures always have visible alternatives. Color is not the only status signal. Support larger text, screen readers, reduced motion, readable contrast, and narrow phones.
4. **Permission integrity:** Request special access only when a user starts the related feature; explain why, offer skip/decline, and preserve graceful behavior. Review current Android alarm guidance and app-blocking restrictions before implementing platform services.
5. **Privacy integrity:** Habit identity, energy, mood, age/life-week estimates, and sharing are optional. Preview sensitive lock-screen/export content. Ensure product claims match real data flows.
6. **Evidence and estimates:** Treat market-size, retention, and uplift numbers in research as source claims, not guaranteed results. Treat proposed thresholds as hypotheses and allow adjustment where appropriate.
7. **Feature traceability:** Keep every master feature ID marked as planned, split across phases, changed, deferred, or excluded. Do not silently drop research items.

## Backlog reconciliation

Use the revised guide’s 140 implementation items as the engineering feature matrix: M1–M18, S1–S25, HD1–HD30, FD1–FD19, XL1–XL15, AI-1–AI-23, and SC1–SC10. The ten TB template bundles remain content assets rather than separate engineering tickets. The earlier MASTER_TODO.md has a different total because its list is organized differently; preserve both counts with their source labels.

AI_TODO.md is an older companion list. Reconcile its numbering and descriptions against the revised guide before implementation; its summary says 22 features while its numbered list runs through AI-23. Use the revised guide’s descriptions and IDs as the canonical AI map.

## Current readiness

The research is ready to guide production planning. The next production step is Phase 0: open the actual app project and verify its implementation. This Market Research workspace does not include the application source. No production code should be changed until the app repository, project instructions, framework documentation, and current data behavior have been inspected.
