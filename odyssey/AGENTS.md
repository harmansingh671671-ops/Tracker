<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# ⚠️ MANDATORY: Read `Market Research/context.md` FIRST, then `main_plan.md`

**`Market Research/context.md` is the entry point for every session.** It carries the product
brief, stack, routes, data model, environment quirks, durable learnings and the live task
state, so you never have to ask for context you could have read.

Read it before anything else, then `main_plan.md` for feature order and status, then the
spec each feature cites. **Do not ask the owner to repeat context that is already written
down** — if something is missing, add it.

**At the end of every session, write back to `context.md` in the same commit as your code:**
a §9 session-log entry for anything shipped, a fix in place for any fact you found wrong,
and a §10 update for the working tree / HEAD / next feature. Protocol in `context.md` §0.2.

`context.md` never holds feature status — `main_plan.md` is the only status record.

---

**`main_plan.md` is the single source of truth for what gets built, in what order, and its
status.** Read it before starting any task. It contains:

- **The 7-phase plan and order of work** — never start feature work out of order
- **Every feature with its status** — `SHIPPED` / `PARTIAL` / `NOT BUILT` / `GATED`
- **A source reference per feature** — open the cited `doc §section Lnnn` and read the full
  spec before coding; the one-line brief is not sufficient
- **A contradictions log (§10)** — do not implement anything listed as OPEN
- **A binding 10-step agent workflow (§1)** and **Definition of Done**

Then read `DEVELOPMENT_PLAN.md` for the **how**: engineering conventions (§5), workflow and
process rules (§6), the risk register (§7), and resolved conflicts (§2).

### Non-negotiables

1. **Never start a feature without its ID and phase from `main_plan.md`.** If the feature is
   not listed there, add it first, then implement it.
2. **`src/lib/db.ts` is the canonical schema** — *not* `Market Research/MASTER_TODO_REVISED.md` §20.1,
   which is an unapproved proposal. Schema changes are additive by default and need an ADR.
3. **`MASTER_TODO_REVISED.md` `AI-n` IDs are canonical** — *not* `AI_TODO.md`, which uses the same
   IDs for different features (e.g. `AI-13` means different things in each).
4. **The app is Next.js 16.3.5**, not 14. Read `node_modules/next/dist/docs/` before using any
   Next.js API. Do not rely on training-data knowledge.
5. **Never raw hex in components** — use the CSS-var Tailwind tokens from `globals.css`.
6. **Every UI change must work in light AND dark mode.**
7. **Status lives only in `main_plan.md`.** Update that feature's line (checkbox **and** status)
   in the same commit as the code. Do not maintain status in any other document.
8. **Code beats documents.** If `main_plan.md` or `context.md` disagrees with the code, the code
   is right — fix the document in the same commit.
8a. **Never re-request context that `context.md` already records.** Missing context is a defect
   in that file: add it (§0.2), don't ask for it again.
9. **Phase gates are hard.** Proposing to skip a gate is a decision for the plan owner, not an
   implementation detail.
10. **Ask the battery question before coding** anything that runs while the app is closed:
    what wakes the device, what is the default when state is unreadable, and what exactly
    happens when the user turns it off. A feature that cannot be stopped is unfinished.
11. **Update `main_plan.md`, then `context.md`, then commit — in that order, always.**
    The status record is not optional paperwork; a commit that ships code without it is
    the same defect as uncommitted work, just harder to spot. See "The commit sequence"
    below.
12. **Never leave a background server running.** `Start-Process` returns immediately and
    leaves the process alive forever, holding its port. See "Background servers" below.

### The commit sequence — order matters

No exceptions, no "I'll do the docs at the end". A commit is the boundary of a feature,
and both documents describe that feature.

```
1. implement  →  2. verify (tsc, lint, test, build, visual)  →  3. update main_plan.md
                                                                 status + checkbox for
                                                                 every line this commit
                                                                 touched
                                                              →  4. update context.md
                                                                 §9 session log,
                                                                 §10 HEAD/next feature,
                                                                 §11 rules if learned
                                                              →  5. commit, all of it together
```

If step 3 or 4 is skipped the feature is **in progress**, not done — the same status an
uncommitted diff has. `main_plan.md` is the only status record (rule 7); `context.md` is
the only orientation record. A commit that updates neither leaves the next session
guessing what happened, which is precisely the failure mode `context.md` §0.2 exists to
prevent.

### Background servers — do not get stuck here

`Start-Process npx.cmd next start …` **returns as soon as the process is spawned and then
leaves it running forever.** The tool call looks finished. That is the trap: an agent that
treats the call's return as "done" walks away holding a port and a Node process, and the
next `Start-Process` fails with `EADDRINUSE` while silently serving **stale output**.

**The rule: never issue `Start-Process` on its own line.** Chain it into a single command
that starts, verifies, uses, and kills:

```powershell
# start -> verify it is actually up -> (verification happens in later calls) -> kill
Start-Process npx.cmd -ArgumentList "next","start","-p","3100" `
  -WindowStyle Hidden -WorkingDirectory "C:\PROJECTS\odyssey" `
  -RedirectStandardOutput "$env:TEMP\opencode\server.log" `
  -RedirectStandardError  "$env:TEMP\opencode\server.err.log"
Start-Sleep -Seconds 7
if (Select-String -Path "$env:TEMP\opencode\server.log" -Pattern "Ready" -Quiet) {
  "server ready"
} else {
  "NOT READY"; Get-Content "$env:TEMP\opencode\server.err.log" | Select-Object -Last 5
}
```

**Then kill it by the port's owning PID, in the same command as whatever used it** — never
leaving the kill for a later call that might not come:

```powershell
node verify.js
Get-NetTCPConnection -State Listen -LocalPort 3100 |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 1
if (Get-NetTCPConnection -State Listen -LocalPort 3100 -ErrorAction SilentlyContinue) {
  "PORT STILL OPEN"      # treat this as a hard failure, not a warning
} else {
  "server killed"
}
```

Why the port's PID and not a remembered PID: `next start` spawns a child, so the process
you started may already be gone and the one holding the port is not the one you know
about. Why assert `Ready`: a server that failed to bind still answers requests, with the
**previous** build — so "the page loaded" is not evidence you are testing your change.

Kill **every** listener on 3000 / 3001 / 3100 before finishing a task, and say so in the
report. A server left running is the one mistake that silently corrupts the *next* task
rather than the current one.

### Before you finish

```bash
npx tsc --noEmit && npm run lint && npm run build
```

…then satisfy the Definition of Done in `main_plan.md` §1 **and** `DEVELOPMENT_PLAN.md` §6.5 —
including the commit sequence above.

---

> A stray `<!-- END:nextjs-agent-rules -->` used to sit right here, inside the
> hand-written body below the real block at the top of this file. The auto-generated
> block is lines 1–9; a second END marker outside it is wrong and the generator may
> rewrite the file around it. Removed.

---

# MANDATORY: Read `FEATURE_WORKFLOW.md` before starting any feature

`FEATURE_WORKFLOW.md` defines the three stages every feature moves through: **BEFORE** (brief and get
approval), **DURING** (one feature, nothing else), **AFTER** (plain-language report, commit, stop).

### Non-negotiables

1. **Never write code before the feature has been briefed and explicitly approved.**
2. **One feature at a time.** Never bundle two. A feature is not done until committed.
3. **Never mention the next feature** while the current one is open.
4. **Speak in app terms, not code terms.** No file paths, no function names, no jargon when
   briefing or reporting. Describe what the user will see.
5. **Be honest about visibility.** If a fix is internal and the user will notice almost nothing,
   say so plainly rather than overselling it.
6. **A phase is not a feature.** Work one feature from the current phase at a time, in phase order.
7. After completing a feature, **stop** and let the user decide what is next.
8. **Update `main_plan.md`, then `context.md`, then commit** — every feature, every time.
   Status that is not written down before the commit did not ship. See "The commit sequence".
9. **Leave no background server running.** Start it, assert `Ready`, use it, and kill it by the
   port's owning PID inside one chained command. See "Background servers".
---

# Project memory (Hindsight)

This project keeps persistent cross-session memory via Hindsight. See `docs/HINDSIGHT.md` for setup.

- **Before non-trivial work**, recall prior context so you do not rediscover it.
- **After learning something durable** (an architecture decision, a non-obvious constraint, a bug
  and its real fix), store it.
- Pass **full context, not a summary** - Hindsight extracts the facts itself.
- On Windows the `uvx hindsight-embed memory ...` subcommand **does not work** (needs bash/WSL).
  Use the REST API examples in `docs/HINDSIGHT.md`.
- **Never** store secrets, API keys, or user PII in memory.