# Hindsight Memory (Odyssey)

**This setup no longer applies to Odyssey.** It documented the previous
OmniRoute + `uvx hindsight-embed` arrangement. OmniRoute, the profile daemon and
the `RMSA-AI` combo have all been removed.

The current bare-metal Hindsight server (Dahl as the LLM endpoint) is documented
in the canonical location:

> **[`docs/HINDSIGHT.md`](../../docs/HINDSIGHT.md)** — repo root
>
> Covers install, `.env` configuration, starting `hindsight-api`, the
> retain/recall verification test, troubleshooting, and the known Dahl HTTP 429
> limitation.

Quick reference for the current arrangement:

| | |
|---|---|
| Server | `hindsight-api` on `http://127.0.0.1:8888` |
| LLM | Dahl — `deepseek-ai/DeepSeek-V4-Flash-0731` |
| Config | `c:\PROJECTS\.env` (git-ignored) |
| Verify | `.\.venv\Scripts\python.exe test_hindsight.py` |

If you are reading this because you followed an old instruction and found a
missing OmniRoute or a `uvx` command: that instruction is obsolete. Use the
document linked above.


Hindsight gives this project persistent, cross-session memory. An agent can **store** what it
learned about this codebase and **recall** it later, instead of rediscovering it every session.

This file is the single source of truth for setup on any machine. It is tracked in git on purpose,
so a fresh clone has everything needed.

---

## 1. Prerequisites

| Requirement | Notes |
|---|---|
| `uv` / `uvx` | Installed alongside Python 3.11+. Check with `uvx --version` |
| An LLM provider + API key | Hindsight extracts facts with an LLM, so **it needs one**. Cost depends on the provider. |
| ~1 GB disk | Embedding + reranker models download locally on first start |

There is **no** Python, Node or Docker step to manage for the embedded (local) profile. Hindsight
embeds its own PostgreSQL instance.

---

## 2. One-time setup

This project's configuration routes through **OmniRoute** (see section 2.1). For any other
LLM provider, swap the `--env` values accordingly -- everything below stays the same.

### 2.1 OmniRoute setup (this project)

OmniRoute is a local gateway on port `20128` that fronts several upstream providers behind one
OpenAI-compatible endpoint. Point Hindsight at it and name a **combo** as the model.

```powershell
uvx hindsight-embed profile create odyssey --port 8888 `
  --env HINDSIGHT_API_LLM_PROVIDER=openai `
  --env HINDSIGHT_API_LLM_MODEL=RMSA-AI `
  --env HINDSIGHT_API_LLM_BASE_URL=http://localhost:20128/v1 `
  --env HINDSIGHT_API_LLM_API_KEY=<your-omniroute-key>
```

- `HINDSIGHT_API_LLM_MODEL` is the **combo name**, not an upstream model. OmniRoute resolves it to a
  real provider/model per request and records which one it picked in its own call logs.
- Confirm the combo is reachable before blaming Hindsight:

```powershell
$k = '<your-omniroute-key>'
Invoke-RestMethod http://localhost:20128/v1/chat/completions -Method Post `
  -Headers @{ Authorization = "Bearer $k" } -ContentType 'application/json' `
  -Body (@{ model = 'RMSA-AI'; stream = $false
            messages = @(@{ role = 'user'; content = 'Say OK' }); max_tokens = 5 } | ConvertTo-Json -Depth 5)
```

> **`stream = $false` is required.** OmniRoute defaults to Server-Sent Events. Without it you get
> `data: {...}` frames instead of a JSON object and any strict JSON parser fails with
> `SyntaxError: Unexpected token 'd'`. Hindsight requests non-streaming itself, so this only bites
> manual `curl`/script calls.

### 2.2 Start the daemon

```powershell
uvx hindsight-embed -p odyssey daemon start   # first run downloads models, ~1-2 minutes
uvx hindsight-embed -p odyssey daemon status  # confirm it is listening
```

> **`daemon start` looks like it hangs.** It blocks while it verifies stability and prints a box.
> That is normal. If you are scripting it, run it detached and poll port 8888.

### Which environment variable holds the key

This is the single most common setup mistake:

- `HINDSIGHT_API_LLM_API_KEY` - **this is the one Hindsight reads**
- `OPENAI_API_KEY` - Hindsight ignores this

If you already have a key in `$env:OPENAI_API_KEY`, pass it into the variable above:

```powershell
uvx hindsight-embed profile set-env odyssey HINDSIGHT_API_LLM_API_KEY $env:OPENAI_API_KEY
```

Set it again whenever you rotate the key, then restart the daemon.

### If your gateway rejects the key or the model

A `404 {"error": {"message": "No active credentials for provider: openai", ...}}` comes from the
**gateway**, not from Hindsight. Two usual causes:

- the key is not in `HINDSIGHT_API_LLM_API_KEY` (see above), or
- the model name is not one the gateway serves

```powershell
# list what the gateway really offers
Invoke-RestMethod http://localhost:20128/v1/models -Headers @{ Authorization = "Bearer $env:OPENAI_API_KEY" }
```

Note that OmniRoute's `/v1/models` list does **not** necessarily include combo names, so a combo
missing from that list is not proof it is unavailable -- test it with a direct call instead.

---

## 2.5 Keeping both services running automatically

Hindsight depends on OmniRoute. If OmniRoute is not listening on `20128`, every retain and recall
fails. This project uses a **watchdog** scheduled task so neither service has to be started by
hand.

| Piece | Location |
|---|---|
| Watchdog script | `%LOCALAPPDATA%\OmniRouteWatchdog\watchdog.ps1` |
| Watchdog log | `%LOCALAPPDATA%\OmniRouteWatchdog\watchdog.log` |
| Scheduled task | `OmniRouteWatchdog` - triggers **at logon** and **every 5 minutes** |

What it does, in order:

1. Probes OmniRoute on `20128`. If down, launches it hidden and waits up to 80s for readiness.
2. **Independently** probes Hindsight on `8888`. If down, starts the daemon and waits up to 90s.

Each service is checked on its own, so a failure in one does not mask the other, and the script is
idempotent -- when both are healthy it exits immediately without restarting anything.

```powershell
# check what it last did
Get-Content "$env:LOCALAPPDATA\OmniRouteWatchdog\watchdog.log" -Tail 20
Get-ScheduledTaskInfo -TaskName OmniRouteWatchdog
```

Expected cold-start timing: **OmniRoute ~2.5 min, Hindsight ~1 min.** Recovery after a single
failure is faster, because only the dead service restarts.

> **It never stops anything.** There is no idle-shutdown and no logoff hook -- deliberately, since
> Hindsight's memory is a live PostgreSQL instance and killing it risks interrupting a write.

### The env file rewrites itself -- clean it last

`profile create`, `profile set-env` **and `daemon start`** all rewrite
`%USERPROFILE%\.hindsight\profiles\odyssey.env` from Hindsight's full commented template, expanding
it from ~5 lines to ~735. The active settings survive; the file just becomes unreadable.

**Rule: start the daemon first, trim the file afterwards.** To trim it back, write exactly the five
active settings, and use a BOM-free writer -- PowerShell's `Set-Content -Encoding UTF8` adds a byte
order mark that corrupts the first line into `ï»¿HINDSIGHT_API_LLM_PROVIDER=...`, which then fails
to parse.

```powershell
$p = "$env:USERPROFILE\.hindsight\profiles\odyssey.env"
$lines = @(
  'HINDSIGHT_API_LLM_PROVIDER=openai'
  'HINDSIGHT_API_LLM_MODEL=RMSA-AI'
  'HINDSIGHT_API_LLM_BASE_URL=http://localhost:20128/v1'
  'HINDSIGHT_API_LLM_API_KEY=<your-omniroute-key>'
  'HINDSIGHT_API_PORT=8888'
)
[System.IO.File]::WriteAllText($p, ($lines -join "`n") + "`n", (New-Object System.Text.UTF8Encoding($false)))
```

---

## 3. Windows: the `memory` subcommand does not work

The upstream skill documents commands like:

```bash
uvx hindsight-embed memory retain default "..."
```

**These fail on Windows without WSL.** On first use Hindsight tries to install a helper CLI through
a `bash` script and dies with:

```
stderr: <3>WSL (9 - Relay) ERROR: CreateProcessCommon:818:
execvpe(/bin/bash) failed: No such file or directory
```

Choose one of these instead:

- **Option A (recommended, no extra tooling)** - use the REST API, see below.
- **Option B** - install WSL, then the documented CLI commands work.

---


## 4. Daily use on Windows (REST API)

The daemon exposes a full REST API on `http://127.0.0.1:8888`. Base path for this profile:

```
http://127.0.0.1:8888/v1/default/banks/default
```

### Store a memory

```powershell
$body = @{
  items  = @(@{ content = "Full context goes here, not a summary."; context = "learnings" })
  async  = $false
} | ConvertTo-Json -Depth 6

Invoke-RestMethod -Uri 'http://127.0.0.1:8888/v1/default/banks/default/memories' `
  -Method Post -Body $body -ContentType 'application/json' -TimeoutSec 300
```

Notes:
- The body **must** wrap content in an `items` array. A bare `{ content = ... }` returns `422`.
- `context` is free-form metadata, e.g. `learnings`, `procedures`, `preferences`.
- Allow a generous timeout. The first call per session is slowest.

### Recall memories

```powershell
$body = @{ query = "How does the native Android bridge work?" } | ConvertTo-Json
$r = Invoke-RestMethod -Uri 'http://127.0.0.1:8888/v1/default/banks/default/memories/recall' `
  -Method Post -Body $body -ContentType 'application/json' -TimeoutSec 240

$r.results | Select-Object -First 5 | ForEach-Object { $_.text }
```

Results live under `.results`, and each item's text is under `.text`.

### Reflect (synthesise across memories)

```powershell
$body = @{ query = "What are the project's testing gaps?" } | ConvertTo-Json
Invoke-RestMethod -Uri 'http://127.0.0.1:8888/v1/default/banks/default/reflect' `
  -Method Post -Body $body -ContentType 'application/json' -TimeoutSec 300
```

---

## 5. What to store, and when

Hindsight **extracts facts itself**. Do not pre-summarise. Pass the full observation and let the
model decide what matters - your job is to decide *when* to store, not *what* to extract.

**Always store:**
- Architecture decisions and the reasoning behind them
- Non-obvious constraints (e.g. "Tailwind tokens must be registered in tailwind.config.ts")
- Bugs hit and how they were actually resolved, including the wrong turns
- Workflow rules the team agreed on

**Always recall:**
- Before starting non-trivial work in an unfamiliar area
- Before making an implementation decision
- Before suggesting an approach that may have been tried before

**Do not store:** anything derivable from `git log`, secrets, API keys, or personal data.

---

## 6. Wiring it into an agent as MCP

For clients that support MCP servers, the `hindsight` MCP exposes 36 tools (`retain`, `recall`,
`reflect`, knowledge pages, mental models, banks, directives). Point the client at the running
daemon:

```json
{
  "mcpServers": {
    "hindsight": {
      "command": "uvx",
      "args": ["hindsight-mcp", "--url", "http://127.0.0.1:8888"]
    }
  }
}
```

> MCP tools are loaded when the agent session starts. After editing the client config, **start a new
> session** - the tools will not appear mid-session.

---

## 7. Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| `Daemon is not running` | Not started | `uvx hindsight-embed -p odyssey daemon start`, or wait for `OmniRouteWatchdog` (up to 5 min) |
| `404 ... No active credentials for provider: openai` | Key in the wrong variable, or a gateway without that provider | Set `HINDSIGHT_API_LLM_API_KEY`; verify `HINDSIGHT_API_LLM_BASE_URL` and model name |
| Every call fails, OmniRoute not listening | Gateway is down | Check `OmniRouteWatchdog` log; it retries every 5 min. Cold start is ~2.5 min |
| Hindsight down but OmniRoute up | Watchdog older than the fix, or it was never run | Run `watchdog.ps1` manually -- it checks both services independently |
| `SyntaxError: Unexpected token 'd', "data: {"` | Calling OmniRoute without `stream = $false` | Add `stream = $false` to the request body |
| `422 Unprocessable Entity` on retain | Body missing the `items` array | Wrap content in `items` |
| `404` on `/v1/.../memories` | Wrong URL shape | Path is `/v1/default/banks/default/memories` -- `banks/{bank_id}` is required |
| `execvpe(/bin/bash) failed` | Using the `memory` subcommand on Windows | Use the REST API, or install WSL |
| Daemon start appears to hang | It blocks while verifying stability | Wait it out, or run detached |
| Env file is ~735 lines of comments | `daemon start` / `set-env` rewrote it from template | Trim it afterwards, BOM-free (see 2.5) |
| Nothing recalled | Bank mismatch | Confirm you are using bank `default` consistently |

Logs:

```powershell
uvx hindsight-embed -p odyssey daemon logs -n 50
Get-Content "$env:USERPROFILE\.hindsight\profiles\odyssey.log" -Tail 50
```

Profile config lives at `%USERPROFILE%\.hindsight\profiles\odyssey.env`.

---

## 8. Security

- The profile env file contains your API key in plain text. Do not commit it, do not paste it.
- Hindsight sends memory text to the configured LLM provider. Do not retain secrets or user PII.
- Banks are strictly isolated - `default` is this project's bank. Use a separate bank per project.
