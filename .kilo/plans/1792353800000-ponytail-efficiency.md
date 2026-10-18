# Plan: run ponytail over odyssey and act on efficiency findings

**Goal:** Run ponytail over the odyssey project, surface efficiency/performance findings, implement the high-impact ones, verify, and ship per the repo's commit sequence.

## Context

- App: `odyssey/`, Next.js 16.3.5, React 19, App Router, Tailwind v4, Zustand + Dexie.
- Commands run from `C:\PROJECTS\odyssey` (or `C:\PROJECTS` root delegates via `npm --prefix odyssey run <script>`).
- Gates, cheapest-first: `npx tsc --noEmit → npx eslint src → npx vitest run → npm run build`.
- No `gradlew`, no device, Kotlin can't compile here — native-side items stay unverified and must be recorded as such, never promoted.
- Ponytail is an agent-host plugin, not a bash CLI: `/ponytail-audit` (whole repo), `/ponytail-review` (diff), `/ponytail-debt`, levels `lite/full/ultra/off`, env `PONYTAIL_DEFAULT_MODE`.
- Efficiency work already has an owner-sanctioned home: Performance phase `main_plan.md` §6.5 (`PERF-0`…`PERF-19`), authority `inefficiencies.md` §11. `PERF-0` (reconcile figures + baselines) is `PARTIAL`.
- Repo rules: no raw hex in components, light + dark at 360/390/430, no timer sprawl, max component 200–250 lines, no inline sub-render functions, SSR/hydration guards, commit sequence `main_plan.md → context.md → commit`.

## Decisions (recorded here, not deferred)

| Decision | Choice | Reason |
|---|---|---|
| Ponytail entry point | `/ponytail-audit` whole repo first | "Run ponytail over the current project" maps to the whole-repo audit; findings are ranked most-important-first. |
| Scope | Efficiency / performance findings only | Ignore style/cut findings that don't map to speed, bundle, render cost, or battery. |
| Where fixes land | Existing Performance phase items (`PERF-*`), new ids only if nothing fits | Don't invent a parallel efficiency track; the phase already owns it. |
| Dependency rule | Existing code → stdlib → installed dep → new package last | `.clinerules` §2 reuse order; no new deps without checking `context.md` §2. |
| Verification environment | Web suite only (tsc, lint, vitest, build); native items recorded blocked | No `gradlew`/device here (R14). Never claim native verified. |
| Who invokes ponytail | You, in your agent host | I cannot run slash commands or mutating commands from plan mode. |

## Tasks (in order)

1. **You run ponytail-audit** over `odyssey/` (`/ponytail-audit`, default `full` level; adjust with `/ponytail lite|full|ultra` if needed). Capture findings: id, what it checks, severity, file/line.
2. **Filter findings to efficiency:** bundle size, render cost, timer/setInterval sprawl, backdrop-blur count, wake-up alarms, image weight, hydration/SSR cost, redundant DB reads, unused CSS/JS, dead code. Defer non-efficiency findings (typo, naming, etc.) — note them but don't bundle.
3. **Map each efficiency finding to a `PERF-*` item** in `main_plan.md` §6.5. If none fits, create the smallest new `PERF-N` id with a one-line spec, not a paragraph.
4. **Reconcile baselines** (`PERF-0`): re-measure gzipped client JS + CSS + combined vs the recorded 459.8 KB baseline; separate compressed from already-compressed assets (images gzip ~1%). Record measured vs plan figures, correcting any wrong ones in place.
5. **Implement top efficiency fixes** one per commit, confined to what each needs (no opportunistic refactors alongside). Prefer existing utilities; keep components ≤250 lines; no inline renderItem; CSS-var tokens only; no raw hex.
6. **Verify after each commit:** `tsc --noEmit` exit 0, `eslint src` 0 errors, `vitest run` green, `npm run build` clean. Visual: light + dark at 360/390/430, reduced motion honoured; screenshot before/after for anything visual.
7. **Update `main_plan.md`** (checkbox + status + cross-reference sweep for every touched id) then `context.md` (§9 session log, §10 HEAD/next/tree state), then commit — all three together, never code alone.
8. **Report** plain-language: what changed, what the user will notice (honest if "almost nothing visible"), verification counts/exit codes, committed or in progress.

## Risks

- **Ponytail not runnable by me:** the plan stops at task 1 until you invoke `/ponytail-audit` in your agent host and paste the findings back.
- **Vague scope:** "efficient as possible" has no stopping point — efficiency work is gated by the PERF ids and your approval of each fix, not by an open-ended rewrite.
- **Stale build served:** `next start` serves the last production build; always `npm run build` after CSS/JS changes before browser verification, and assert `Ready` + kill by port PID.
- **False confidence from green gates:** a green test can be vacuous (e.g., asserting the wrong element); assert the side effect that proves code ran.

## Open questions (none blocking task 1)

- None required to start. After you run ponytail-audit and share findings, we triage which to implement first.

## Definition of Done for this plan

- `/ponytail-audit` run over `odyssey/` and findings captured.
- Efficiency findings triaged to `PERF-*` ids; each implemented fix committed with `main_plan.md` + `context.md` updated.
- `tsc`, `lint`, `test`, `build` all clean; baselines reconciled and corrected.
- No background server left on 3000/3001/3100; said so in report.
