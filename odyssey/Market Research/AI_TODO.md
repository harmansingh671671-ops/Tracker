# ODYSSEY — AI FEATURES TODO

> **⚠️ FROZEN ARCHIVE — DO NOT USE AS A WORK LIST.**
>
> - **Order and status:** `main_plan.md` at the repo root. Read that first.
> - **Feature definitions:** `MASTER_TODO_REVISED.md` §5 (I-series) and §19 (AI-1..AI-23).
>
> ⚠️ **ID COLLISION:** this file and `MASTER_TODO_REVISED.md` both use `AI-n` with
> **different meanings** — e.g. `AI-1` and `AI-13` describe different features in each.
> **Never cite an `AI-n` ID from this file.** `MASTER_TODO_REVISED.md` is canonical.
> See `main_plan.md` §10 contradiction **C7**.
>
> Its summary count is also unreliable (claims 22, the list runs to AI-23).
## All AI-Powered Features · Sorted by Effort (Smallest → Largest)
## Rule-based v1 first, LLM upgrade later

> **How to use:**
> - [ ] = Not yet decided
> - [x] = Approved to build
> - [-] = Rejected / Won't do

---

---

# TIER A: RULE-BASED (Can ship without any ML/LLM — pure logic)

### Scheduling Intelligence
- [ ] **AI-1** — Scheduling insight at habit creation: show period completion rate when user picks a time slot ("Morning: 85% completion rate · Evening: 43%")
- [ ] **AI-2** — Overcommitment warning: if today's habit count exceeds user's 14-day rolling average by 50%+ → show warning before day starts
- [ ] **AI-3** — Persistent weak day alert: after 4+ weeks of data, flag the consistently lowest day-of-week → suggest lighter schedule ("Sundays are your weakest at 38%. Consider scheduling fewer habits.")
- [ ] **AI-4** — Energy-aware habit warning: if High Energy habit placed in user's weakest completion period → inline warning ("⚠️ Your evening completion rate is 43%. Consider moving this to morning.")
- [ ] **AI-5** — Schedule conflict detection: if new habit overlaps with existing one → warn and suggest alternative slots
- [ ] **AI-6** — "Best time" learner: after 30+ days, identify optimal time for each habit based on actual completion data ("You complete Reading at 8 AM 90% of the time, but only 30% at 9 PM. Move it?")

### Completion Intelligence
- [ ] **AI-7** — Weekly completion summary template: auto-generated text — "This week [X]% — [better/worse] than [Y]% last week. Best: [Habit]. Needs work: [Habit]."
- [ ] **AI-8** — Streak recovery path: when streak breaks → show 3-day restart plan ("Day 1: 5 min version. Day 2: half duration. Day 3: back to full.")
- [ ] **AI-9** — Dynamic difficulty scaling trigger (SIP-like): after 14 days at 100% → suggest leveling up or auto-increase ("You've completed Meditation 10 min every day for 2 weeks. Ready to try 15?")
- [ ] **AI-10** — Auto-reschedule on miss: if a habit is missed at its scheduled time → suggest next available slot ("You missed Meditation at 7 AM. Free slot at 2 PM — reschedule?")

### Weekly/Monthly Insights
- [ ] **AI-11** — Weekly schedule optimizer: once per week → suggest schedule adjustments based on last week's data ("Consider swapping Workout from Thursday to Wednesday — your Wednesday is lighter.")
- [ ] **AI-12** — Monthly essentialism audit trigger: after 30 days → show each habit's completion rate → recommend Commit / Pause / Archive for underperformers

---

---

# TIER B: PATTERN RECOGNITION (Light ML or statistical analysis)

- [ ] **AI-13** — Habit correlation detector: identify which habits boost others ("On days you meditate, your Deep Work completion is 30% higher.")
- [ ] **AI-14** — Energy-completion correlation: if user logs daily energy (1–5), correlate with completion rates → show insights ("Your best days are when energy ≥ 4. That happens most on Mon/Tue/Wed.")
- [ ] **AI-15** — Predictive day forecast: each morning → calculate completion probability based on day-of-week, yesterday's momentum, habit count, historical patterns ("📊 Today's forecast: 73% completion likely.")
- [ ] **AI-16** — Habit gravity detector: track actual completion time vs scheduled time → after 2 weeks of drift → suggest rescheduling ("You do Workout at 7 PM instead of 6 PM. Move it?")
- [ ] **AI-17** — Burnout early warning: if completion rate drops 20%+ over 2 consecutive weeks → gentle alert ("Your completion rate has dropped from 85% to 62%. Consider pausing a habit or reducing scope.")

---

---

# TIER C: NATURAL LANGUAGE / LLM (Requires NLP or LLM integration)

- [ ] **AI-18** — Natural language habit entry: type "Meditate 20 mins every morning" → auto-fills habit form (regex v1, LLM v2)
- [ ] **AI-19** — Natural language schedule entry: type "Deep work 2 hours tomorrow morning" → creates habit block on schedule
- [ ] **AI-20** — Conversational habit coach: chat interface for goal-setting and coaching ("I want to get fit" → AI asks questions → suggests 3 starter habits)
- [ ] **AI-21** — Smart weekly summary narrative: LLM generates a personalized paragraph summarizing the week, highlighting wins, and offering one actionable suggestion
- [ ] **AI-22** — Habit recommendation engine: based on current habits + completion data → suggest new habits that complement the user's routine
- [ ] **AI-23** — Personality assessment via AI chat: conversational profiling during onboarding to personalize app experience (Amie style)

---

---

# SUMMARY

| Tier | Items | Implementation | Effort |
|------|-------|----------------|--------|
| Rule-Based | 12 | Pure JS/TS logic, Dexie queries | 2–6 hours each |
| Pattern Recognition | 5 | Statistical analysis on local data | 4–12 hours each |
| NLP / LLM | 5 | Regex v1, optional LLM v2 | 1–3 days each |
| **TOTAL** | **22 AI features** | | |

### Implementation Strategy
1. **Ship rule-based (Tier A) first** — no dependencies, no API keys, no cost. Pure logic on local Dexie data.
2. **Add pattern recognition (Tier B)** — still local, still free, just more math.
3. **LLM features (Tier C) last** — requires API integration, costs money per call, needs careful UX.

---

*Last updated: September 2026*
*Sources: Habit Research/, Schedule Research/, books_brainstorm_and_habits.md*
