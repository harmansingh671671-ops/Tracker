# Hindsight Memory (Shared Setup)

Hindsight gives this project persistent, cross-session memory. An agent can **store** what it
learned about this codebase and **recall** it later, instead of rediscovering it every session.

This file is the single source of truth for setup on any machine. It is tracked in git on purpose,
so a fresh clone has everything needed.

---

## 1. Prerequisites

| Requirement | Notes |
|---|---|
| `uv` / `uvx` | Installed alongside Python 3.11+. Check with `uvx --version` |
| An LLM provider + API key | Hindsight extracts facts with an LLM, so **it needs one**. Costs money per call. |
| ~1 GB disk | Embedding + reranker models download locally on first start |

There is **no** Python, Node or Docker step to manage for the embedded (local) profile. Hindsight
embeds its own PostgreSQL instance.

---

## 2. One-time setup

```powershell
# 2.1 Create a profile (do NOT use `configure`; it is deprecated and interactive)
uvx hindsight-embed profile create odyssey --port 8888 `
  --env HINDSIGHT_API_LLM_PROVIDER=openai `
  --env HINDSIGHT_API_LLM_MODEL=gpt-4o `
  --env HINDSIGHT_API_LLM_BASE_URL=<your-endpoint> `
  --env HINDSIGHT_API_LLM_API_KEY=<your-key>

# 2.2 Start the daemon (first run downloads models and takes ~1-2 minutes)
uvx hindsight-embed -p odyssey daemon start

# 2.3 Confirm it is listening
uvx hindsight-embed -p odyssey daemon status
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

### If your key routes through a local proxy

If `OPENAI_BASE_URL` / `OPENAI_API_BASE` point at a local gateway, Hindsight will inherit that
gateway and fail with:

```
404 {"error": {"message": "No active credentials for provider: openai", "code": "model_not_found"}}
```

That message comes from the **gateway**, not from Hindsight. Set the base URL explicitly so the
routing is deliberate, and pick a model the gateway actually serves:

```powershell
# list what your gateway really offers
Invoke-RestMethod http://localhost:20128/v1/models -Headers @{ Authorization = "Bearer $env:OPENAI_API_KEY" }
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
| `Daemon is not running` | Not started | `uvx hindsight-embed -p odyssey daemon start` |
| `404 ... No active credentials for provider: openai` | Key in the wrong variable, or a gateway without that provider | Set `HINDSIGHT_API_LLM_API_KEY`; verify `HINDSIGHT_API_LLM_BASE_URL` and model name |
| `422 Unprocessable Entity` on retain | Body missing the `items` array | Wrap content in `items` |
| `execvpe(/bin/bash) failed` | Using the `memory` subcommand on Windows | Use the REST API, or install WSL |
| Daemon start appears to hang | It blocks while verifying stability | Wait it out, or run detached |
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
