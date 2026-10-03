<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# ⚠️ MANDATORY: Read `DEVELOPMENT_PLAN.md` BEFORE writing any code

**`DEVELOPMENT_PLAN.md` is the canonical source of truth for this project.** Read it before starting
any task. It contains:

- The **phase plan and order of work** — never start feature work out of order
- **Resolved conflicts** between the Market Research documents (feature IDs, schemas, phase numbering)
- **Binding engineering conventions** — styling, data, state, native, accessibility rules
- **Exit gates** — the previous phase must be signed off before the next begins
- **Definition of Done** — required before any PR is considered complete

### Non-negotiables

1. **Never start a feature without its ID and phase** from `DEVELOPMENT_PLAN.md` §4.
2. **`src/lib/db.ts` is the canonical schema** — *not* `Market Research/MASTER_TODO_REVISED.md` §20.1,
   which is an unapproved proposal. Schema changes are additive by default and need an ADR.
3. **`MASTER_TODO_REVISED.md` `AI-n` IDs are canonical** — *not* `AI_TODO.md`, which uses the same
   IDs for different features (e.g. `AI-13` means different things in each).
4. **The app is Next.js 16.3.5**, not 14. Read `node_modules/next/dist/docs/` before using any
   Next.js API. Do not rely on training-data knowledge.
5. **Never raw hex in components** — use the CSS-var Tailwind tokens from `globals.css`.
6. **Every UI change must work in light AND dark mode.**
7. **Do not edit files in `Market Research/` for status tracking** — that folder is git-ignored.
   Update the §3 status table in `DEVELOPMENT_PLAN.md` instead.
8. **Phase gates are hard.** Proposing to skip a gate is a decision for the plan owner, not an
   implementation detail.

### Before you finish

```bash
npx tsc --noEmit && npm run lint && npm run build
```

…and satisfy the Definition of Done in `DEVELOPMENT_PLAN.md` §6.4.
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