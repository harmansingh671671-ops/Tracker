# ODYSSEY - FEATURE WORKFLOW

> **This file defines how every feature is briefed, built and closed.**
>
> Feature **order, phase and status** come from `main_plan.md` — read it first.
> The 10-step agent workflow and Definition of Done in `main_plan.md` §1 apply to
> every feature; this file covers the briefing/approval conversation around them.
> It exists so these rules are never restated in conversation.

---

## THE THREE STAGES

Every feature moves through exactly three stages. No stage is skipped.

| Stage | Name | Rule |
|---|---|---|
| 1 | BEFORE | I brief you. You approve or adjust. **Only then does work begin.** |
| 2 | DURING | One feature. Nothing else touched. Nothing bundled. |
| 3 | AFTER | Explain the finished feature. Verify. Commit. Stop. |

---

## STAGE 1 -- BEFORE (briefing and approval gate)

**No code is written during this stage.** I present the feature; you decide.

Every briefing contains these sections, in this order:

1. **What it is** -- one sentence, plain language.
2. **The problem it solves** -- what is wrong or missing today.
3. **What you will see** -- the visible change in the app.
4. **What already exists** -- what is being reused, changed, or newly written.
5. **How we will know it worked** -- concrete verification steps.
6. **What this deliberately excludes** -- the scope boundary.
7. **Anything you may want to change** -- an explicit invitation to redirect.

### Rules

- **No code, no file paths, no technical jargon** in a briefing. Speak in terms of the app.
- **Do not start work** until the user replies with approval or changes.
- If the user changes scope, restate the adjusted feature and confirm before starting.
- If a briefing reveals the next feature is unnecessary, say so rather than building it anyway.

---
## STAGE 2 -- DURING (the work)

- **One feature at a time.** Never two.
- **Never bundle.** A feature is not finished until it is committed and verified.
- **Never talk about the following feature** while this one is open. The user decides what is next.
- Keep changes confined to what the feature requires. No opportunistic refactors alongside it.
- If a surprise appears that is out of scope, note it, do not fix it now.

### Verification required before calling anything finished

| Area | Check |
|---|---|
| Build | Type checking and linting both clean |
| Visual | Light **and** dark, at 360 / 390 / 430 widths |
| Interaction | Keyboard reachable, focus visible, reduced-motion honoured |
| States | Empty, loading, error, and long-content states handled |
| Offline | Core still works with no network (local-first promise) |
| Regression | Nothing that previously worked is now broken |

---

## STAGE 3 -- AFTER (completion report)

The completion report is **plain language about the app**. No code, no file names, no jargon.

1. **What the feature does** -- in user terms, as a small titled summary.
2. **What was wrong before** and **what it is like now**.
3. **What you will actually notice** -- stated honestly. If the answer is "almost nothing visible",
   say so plainly. Do not dress up an internal fix as a headline improvement.
4. **Verification result** -- what was checked and what passed, with counts and exit codes.
5. **Status** -- committed, or still in progress.
6. **An invitation to refine this feature**, not a pitch for the next one.

Then **stop**. Wait for the user to decide what happens next.

### The commit sequence -- both documents, then commit

Binding. The report is not the last step; **updating the two documents is**.

```
implement → verify → main_plan.md → context.md → commit → report → STOP
```

| # | Step | What it means | Skipping it costs |
|---|---|---|---|
| 1 | `main_plan.md` | Flip the checkbox **and** correct the status wording for every line this commit touched — including lines that turned out `PARTIAL`, `BLOCKED`, or deferred | The plan says a shipped feature is unbuilt, and the next session re-does it or skips it |
| 1b | `main_plan.md` cross-references | **Grep the file for your id** and for every id the commit also touched; fix each hit your change made false, even on another feature's line | A stale neighbour reads as authoritative and nothing prompts anyone to re-check it |
| 2 | `context.md` | §9 session log entry · §10 HEAD + next feature + tree state · §7 if an environment surprise · §11 if a permanent rule was learned | The next session re-derives what was already learned, at full cost |
| 3 | Commit | Code **and** both documents together, one commit | Two half-truths in history; the docs drift from the code permanently |

**Write the status last, not first.** `BUILT` is a claim about shipped reality. A status
written before the code lands describes what you *intended*, and it will not be revisited:
`M4` sat at `PARTIAL` reading *"no page mounts the component yet"* from the very commit
that mounted it, while `F3` still claimed *"no first-day card"* after that same commit
shipped one. Ticking your own line is the minimum — grep for the id and fix the
neighbours. And a bare `PARTIAL` is not a status; it must name what is missing.

A commit with code but no status update is **the same defect as uncommitted work** — it is
just harder to notice, because `git status` is clean. `main_plan.md` is the only status
record (C10) and `context.md` is the only orientation record, so if either is not updated
in the commit, the knowledge did not ship. Feature ids that were planned but not built,
or built under a different id, **must** say so in `main_plan.md` in the same commit — a
silent drop is the traceability failure rule 7 exists to prevent.

Order is main_plan **then** context, because `context.md` points at `main_plan.md` and
should be written knowing what the status now says.

### Process traps in this environment

Recorded because each one cost real time this session.

- **`Start-Process` never terminates.** It returns while the server keeps running
  forever. Always chain start → assert `Ready` → use → **kill by the port's owning PID**
  in one command. A stale server answers requests with the *previous* build, so a clean
  page load is not proof you are testing your change. See `AGENTS.md` §Background servers.
- **Headless Chrome reports `prefers-color-scheme: dark`.** A "light mode" pass that only
  leaves the theme on `system` silently renders dark. Force both the emulation and
  `odyssey_theme_mode`, then assert the rendered background.
- **A fixed `z-50` overlay swallows real mouse clicks.** `AppShell` renders the OTA update
  modal on every route. `page.click` hit-tests and lands on the backdrop, so the target
  looks broken. Use a DOM `el.click()` via `evaluate`.
- **Never edit markdown with PowerShell `Set-Content`.** It re-encodes the whole file
  (BOM added, UTF-8 em-dashes become mojibake) and silently corrupts hundreds of lines.
  It did this once to `context.md` here. Use the file tools.
- **A failing assertion on the headline requirement needs a control before a fix.** The
  A1 habit-persistence check reported the headline requirement broken; the script had
  skipped the very step that created the data. Log state after each step before
  believing a failure.

---

## WHEN A FEATURE MAY START

A feature may begin only when **all** of these are true:

- [ ] The feature has an ID from `main_plan.md` (e.g. `M2`, `HD13`, `P0-T1`), and its phase matches the current one.
- [ ] It belongs to the **current phase**. Phases run in order; do not jump ahead.
- [ ] The **previous feature is committed**, not left in progress.
- [ ] The phase exit gate for the current phase is either met or not required for this item.
- [ ] A briefing has been presented and **explicitly approved**.
- [ ] Nothing in the feature depends on an unfinished decision.
- [ ] `main_plan.md` and `context.md` will be updated **before** the commit, not after.

**A phase is not a feature.** A phase is a container. One feature from it is worked at a time.

**Never start two features in one session** unless the user explicitly asks for it.

---

## BLOCKING DECISIONS

If a feature requires a decision that has not been made -- a new data field, a permission request, a
reward rule, a breaking change -- that decision must be settled and written down **before** the work
starts. See `DEVELOPMENT_PLAN.md` section 2 and the `docs/adr/` requirement in section 5.9.

---

## SUMMARY

```
BEFORE  ->  brief the feature  ->  user approves or adjusts  ->  STOP and wait
DURING  ->  implement exactly one feature, verify everything
AFTER   ->  main_plan.md  ->  context.md  ->  commit  ->  plain-language report  ->  STOP
```

**The two documents are part of the feature, not follow-up work.** Status that is not
written down before the commit did not ship.

---

## CURRENTLY STAGED FEATURE

*(None awaiting approval. The next feature to brief is recorded here once proposed.)*

**To find the next feature:** read `Market Research/context.md` → §10 → "Where the work is
right now" first (that table is refreshed every session), then confirm against
`main_plan.md` → **Phase 1** → the first unchecked line in plan order. Do not dig through the
code or the research corpus to decide.

> `FEATURES.md` used to be named here as the status of record. That moved to `main_plan.md`
> (contradiction C10). `FEATURES.md` remains useful for its NEXT UP table and the P8 cleanup
> record, but its status columns are not authoritative.
