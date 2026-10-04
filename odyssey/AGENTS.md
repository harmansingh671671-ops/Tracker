<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# ⚠️ MANDATORY: Read `main_plan.md` BEFORE writing any code

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
8. **Code beats documents.** If `main_plan.md` disagrees with the code, the code is right —
   fix `main_plan.md`.
9. **Phase gates are hard.** Proposing to skip a gate is a decision for the plan owner, not an
   implementation detail.
10. **Ask the battery question before coding** anything that runs while the app is closed:
    what wakes the device, what is the default when state is unreadable, and what exactly
    happens when the user turns it off. A feature that cannot be stopped is unfinished.

### Before you finish

```bash
npx tsc --noEmit && npm run lint && npm run build
```

…then satisfy the Definition of Done in `main_plan.md` §1 **and** `DEVELOPMENT_PLAN.md` §6.5.
<!-- END:nextjs-agent-rules -->

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