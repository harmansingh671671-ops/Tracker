# Working in this repo with two agents

**Read this if you are an agent other than the one who wrote it.** Two agents now work
`odyssey` concurrently. This file is the shared contract. It supersedes any assumption
that the checkout at `C:\PROJECTS` is the only one.

---

## 1. Where you work

| | Directory | Branch |
|---|---|---|
| **Owner + second agent** | `C:\PROJECTS` | `main` |
| **First agent** | `C:\Users\harma\odyssey-wt-mainline` | `agent/mainline` |

Run commands from **`C:\PROJECTS\odyssey`** (your side). The first agent runs them from
`C:\Users\harma\odyssey-wt-mainline\odyssey`.

These are **`git worktree`s**, not clones. Same repository, separate indexes. Verified:
a file written in one worktree never appears in the other's status. That isolation is the
entire point — a shared checkout still shares one index, and that is what caused the
incident in §5.

**`node_modules` in the first agent's worktree is a directory junction** to
`C:\PROJECTS\odyssey\node_modules`. Do not delete it, and do not run a second
`npm install` expecting it to be isolated — the install is shared. If you add a
dependency, add it from `C:\PROJECTS\odyssey` so both sides get it.

**Never enter the other agent's directory.** Not to read a file, not to run a gate, not
to "check something quickly". If you need something from there, ask the owner.

---

## 2. Never push

**Standing owner instruction, verbatim:**

> *"you will not push anything, you will only commit things, i will push the code."*

Branches are **local only**. No `git push`, no `git push --force`, no setting an
upstream. The owner pushes and merges.

To take the first agent's work:

```
cd C:\PROJECTS
git merge agent/mainline
```

---

## 3. Your existing worktree is stale — fix it first

There is a detached worktree at:

```
C:\Users\harma\.local\share\kilo\worktree-pool\projects-e7f25cddbe08\observant-dash
```

It is pinned at `7a98720`, which is **five commits behind `main`**. It does **not**
contain any of:

- `0240e58` `PERF-0` — reconcile + web baselines
- `0aa4e3c` `BUG-12`/`BUG-14` — the category escape hatch, closed
- `d4d32fe` `BUG-13` — 1,806 orphaned lines deleted
- `feb19e7` `AGENTS` rules 17–21
- `35b6ed2` `M15` — streak milestones

**Do not write code from that worktree.** It contains code that no longer exists here,
including a `BUG-12` fix you would be reverting and a `BUG-13` deletion you would be
restoring. Either `git -C <path> checkout main` or `git worktree prune` and recreate it.

---

## 4. `AGENTS.md` changed under you

`AGENTS.md` now carries **rules 17–21**, added in `feb19e7`:

> 17. Grep every caller before editing a shared function; fix the root cause once, in
>     the shared code.
> 18. List every place a change must reach — callers, tests, fixtures, config, exports —
>     before you write it.
> 19. Ask what your change could do to the **user's data**: destroy it, silently alter
>     it, or expose it.
> 20. Mark a deliberate shortcut: `shortcut: <the limit>, <when to upgrade>`.
> 21. Code you move, merge or consolidate keeps its error handling and validation.

Rules **1–16 are unchanged and still binding**, including the commit sequence, the
background-server rule, and the component-size and hydration rules.

**Rule 19 is the one this repo has paid for most.** `BUG-5` reported a streak of 0 as 1 in
**nine** places and `BUG-12` rewrote a block's category on every title edit — both shipped
with `tsc`, lint, the build and the whole test suite green. Green gates are not evidence
that data is intact.

---

## 5. `ponytail` is not installed, and its installer damaged this repo

The `ponytail` install at 19:19 on 2026-10-17 **overwrote `odyssey/AGENTS.md`** with its
own 2.7 KB ruleset, deleting the mandatory rules, the commit sequence and the whole
server-hygiene section. It was restored from git. If your plan assumed ponytail was
installed: **it is not, and was never deliberately installed.**

Its directory has been moved out of the workspace:

```
C:\PROJECTS\ponytail   ->   C:\Users\harma\Downloads\ponytail
```

**Why that mattered.** `C:\PROJECTS` is the workspace root. Any `AGENTS.md` inside it is
**auto-discovered by agents** — the file was being loaded as instructions, not merely
present on disk. Keeping third-party agent instructions inside the workspace root is how
this repo lost its own rules.

Five rules were reviewed and adopted (17–21 above). **Four were rejected** as conflicting:
"no abstraction, wrapper, type conversion" against rules 13/14; "comment only the why, in
one line" against this repo's explanatory comments; "end your reply with one or two lines"
against the honest-reporting norm; and its `lite`/`full`/`ultra` modes against the binding
workflow. Rule 3 already **is** its reuse ladder. Do not re-add them.

If you want ponytail's review or audit behaviour, **read** it from the `Downloads` copy as
reference material. Do not copy its `AGENTS.md` into any project directory.

---

## 6. The commit sequence — unchanged, still binding

```
implement  ->  verify (tsc, lint, test, build, visual)  ->  update main_plan.md
           ->  update context.md  ->  commit, all of it together
```

- **`main_plan.md` is the only status record.** Update the feature's checkbox **and** its
  status word in the same commit as the code. Never maintain status anywhere else.
- **`context.md`** needs a §9 session-log entry, a §10 working-tree/HEAD/next-feature
  update, and an §11 rule if you learned something durable.
- **A commit that ships code without its docs is uncommitted work**, just harder to see.
- **One feature per commit.** Do not bundle two.

---

## 7. Never leave a background server running

`Start-Process` returns while the server keeps running forever, holding its port. A stale
server answers with the **previous** build, so a browser check against one is evidence of
nothing.

Use the wrapper — it refuses to start on a busy port, asserts `Ready`, and kills in a
`finally`:

```powershell
& "$env:TEMP\opencode\verify\with-server.ps1" -Port 3100 -Command node `
    -CommandArgs @("$env:TEMP\opencode\verify\check-*.js")
```

**`npm run build` before any browser check that depends on CSS or assets.** `next start`
serves the last production build; editing a stylesheet and checking without rebuilding
verifies the *previous* build and produces confident, wrong results.

Verify ports yourself at the end: **3000, 3001, 3100.**

---

## 8. PowerShell 5.1 corrupts UTF-8 documents

`Get-Content` reads UTF-8 as **ANSI**. Splicing a line in a `.md` with
`Get-Content`/`Set-Content` turned **every em-dash into mojibake across all 1,142 lines**
of `main_plan.md`, and `Set-Content -Encoding UTF8` adds a **BOM**.

- **Use the `edit` / `write` tools for `.md` files.**
- If a shell splice is unavoidable, read and write with
  `[System.IO.File]::ReadAllText` / `WriteAllLines` and
  `New-Object System.Text.UTF8Encoding($false)`.
- **Check `git diff --numstat` after every doc edit.** One changed line should read
  `1  1`. A whole-file diff means something rewrote every line — revert immediately.
- **Judge encoding by codepoint count and the first 3 bytes**, never by what the terminal
  prints. PowerShell renders a correct em-dash as mojibake, which looks like corruption
  that is not there.
- `src/lib/utils/encoding.test.ts` walks `src/` for mojibake and BOM — but it **does not
  cover `.md`**. That gap is why this happened twice.

---

## 9. Environment limits — do not plan around what does not exist

- **No `gradlew`, no Android device.** JBR 25 cannot start the Kotlin 1.9.22 daemon
  (risk `R14`). Native items **cannot be signed off here** — record them as
  *unverified-pending-device*, never promote them. `PERF-0` is `PARTIAL` for exactly this
  reason: its Android half needs `adb`, `dumpsys` and a release build on real hardware.
- **Never push.** §2.
- The APK loads web content from Vercel via `loadUrl`, so **web changes reach installed
  users with no rebuild**. The APK is only needed for native code.
- **`version.json` is coupled to an APK rebuild** (`REL-1`). Bumping it alone shows every
  installed user an "Update available" prompt pointing at the old binary. Do not bump it
  without rebuilding.

---

## 10. Before you commit

```
npx tsc --noEmit && npx eslint src && npx vitest run && npm run build
```

Then: `main_plan.md` → `context.md` → commit. And confirm no listener on 3000/3001/3100.

Verification scripts live in `%TEMP%\opencode\verify\`. The reusable ones assert against
the real UI and read state back out of IndexedDB, so prefer them over a fresh ad-hoc
check: `check-category.js` (a save must not rewrite untouched fields),
`check-picker.js` (a picker must offer only writable values),
`check-motion.js` (reduced motion, **both directions**),
`check-orphan.js` (all 9 routes, both themes, no surviving references),
`check-assets.js` (images **decode** — a missing small image is invisible).

⚠️ **These live in `%TEMP%` and will not survive a temp-dir clean.** That is a known gap,
not an oversight — and it is exactly the mistake `PERF-18d` fixed for the bundle script,
which now lives at `scripts/measure-bundle.js` and runs as `npm run measure-bundle`. **If
you depend on one of these, copy it into the repo in the same commit as the feature that
needed it.** A verification script that disappears is not a verification step.

---

## 11. If something goes wrong

| Symptom | Do this |
|---|---|
| `git status` shows files you did not create | **Stop.** Another agent is mid-flight. Do not commit, do not revert. Report it. |
| `git status` shows a whole file modified for no reason | Encoding corruption. Check bytes, then `git checkout --` the file. |
| Your changes vanished | `git worktree list` — you may be in the wrong directory. |
| A browser check fails in a way that makes no sense | `git diff --numstat` first. You may be testing a stale build. |
| `AGENTS.md` looks unfamiliar | `git diff -- AGENTS.md`. A third-party installer may have overwritten it. Restore with `git checkout -- AGENTS.md`. |

**Report collisions rather than resolving them.** A half-finished feature swept into
someone else's commit is far more expensive than a paused task.
