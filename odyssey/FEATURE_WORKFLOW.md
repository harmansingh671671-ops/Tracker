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
   say so. Do not dress up an internal fix as a headline improvement.
4. **Verification result** -- what was checked and what passed.
5. **Status** -- committed, or still in progress.
6. **An invitation to refine this feature**, not a pitch for the next one.

Then **stop**. Wait for the user to decide what happens next.

---

## WHEN A FEATURE MAY START

A feature may begin only when **all** of these are true:

- [ ] The feature has an ID from `main_plan.md` (e.g. `M2`, `HD13`, `P0-T1`), and its phase matches the current one.
- [ ] It belongs to the **current phase**. Phases run in order; do not jump ahead.
- [ ] The **previous feature is committed**, not left in progress.
- [ ] The phase exit gate for the current phase is either met or not required for this item.
- [ ] A briefing has been presented and **explicitly approved**.
- [ ] Nothing in the feature depends on an unfinished decision.

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
AFTER   ->  plain-language report, honest about visibility, committed, then STOP
```

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
