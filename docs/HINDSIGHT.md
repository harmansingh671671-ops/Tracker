# Hindsight — Agent Memory (bare metal, Dahl LLM)

Persistent agent memory running locally, using **Dahl** as the OpenAI-compatible
LLM endpoint. This replaces the previous OmniRoute + `uvx hindsight-embed`
setup.

## What runs where

| Piece | Detail |
|---|---|
| Server | `hindsight-api` on `http://127.0.0.1:8888` |
| Database | embedded PostgreSQL + pgvector (no external DB) |
| LLM | Dahl — `deepseek-ai/DeepSeek-V4-Flash-0731` |
| Vectors | **local** `BAAI/bge-small-en-v1.5` via sentence-transformers |
| Python | 3.11 (`hindsight-all` 0.10.2) |

Dahl does **not** serve `/embeddings` (verified: HTTP 405), so vectorisation is
local. That is why only one API key is needed.

## Files

| Path | Purpose |
|---|---|
| `c:\PROJECTS\.env` | server config + Dahl key (**git-ignored**) |
| `c:\PROJECTS\test_hindsight.py` | end-to-end retain/recall check |
| `c:\PROJECTS\run-reliability.ps1` | runs the test 3× to catch flakiness |
| `c:\PROJECTS\.venv` | workspace venv (git-ignored) |
| `c:\PROJECTS\hindsight-server.log` | server stdout (git-ignored) |

## Starting the server

`hindsight-api` loads `.env` from the **process working directory**, so it must
be launched from `c:\PROJECTS`. It also crashes on Windows if stdout uses the
default cp1252 codec (its ASCII-art banner raises `UnicodeEncodeError`), so
`PYTHONIOENCODING=utf-8` is required:

```powershell
cd c:\PROJECTS
$env:PYTHONIOENCODING='utf-8'
$env:PYTHONUTF8='1'
hindsight-api
```

First start takes ~40s (embedded PostgreSQL initialises and loads the embedding
model). Verify:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8888/health
```

## Running the test

```powershell
cd c:\PROJECTS
.\.venv\Scripts\python.exe test_hindsight.py
```

Each run creates a throwaway bank with a unique marker, retains it, waits for an
LLM-derived `observation`, then deletes the bank.

> **Why it waits for `observation`, not just the fact.** Recall can return the raw
> stored fact (`type='world'`) within milliseconds of `retain()`. A test that
> stops there passes *before the model has even answered*, which proves nothing
> about Dahl. `type='observation'` is written by the consolidation worker only
> after the LLM extracts entities and relationships (~7-20s), so that is what the
> test asserts on.
>
> Run three times to check for flakiness:
>
> ```powershell
> powershell -ExecutionPolicy Bypass -File .\run-reliability.ps1
> ```

## Interpreting failures

| Symptom | Cause |
|---|---|
| `Unresolved import` on `from hindsight import ...` | IDE is on Python 3.13; Hindsight is on 3.11. Use `c:\PROJECTS\.venv`. |
| `UnicodeEncodeError: 'charmap' codec` | `PYTHONIOENCODING=utf-8` not set |
| Test FAILs, log shows `429` | Dahl throttling — see below |
| Test FAILs, raw fact stored but no observation | extraction did not complete; check the log for 429s |
| `Port 8888 already in use` | an old `hindsight-embed` daemon still holds it |

## Known limitation: Dahl HTTP 429

Dahl intermittently rejects requests from keys that are **not linked to a Dahl
account**:

```
429 {'code': 'model_concurrency',
     'message': 'This model is at concurrency capacity.
                 Signed-in and paid accounts are admitted first.'}
Fact extraction failed: 1/1 chunks failed
```

The memory is still stored, but extraction dies, so **recall silently misses it**.
This was the cause of intermittent test failures, not a configuration error.

Mitigation in `.env` — the upstream defaults (32 concurrent LLM calls, 3
retries) assume a first-party key and are self-inflicted contention against a
shared endpoint:

```
HINDSIGHT_API_LLM_MAX_CONCURRENT=1
HINDSIGHT_API_LLM_MAX_RETRIES=10
HINDSIGHT_API_LLM_INITIAL_BACKOFF=2.0
HINDSIGHT_API_LLM_MAX_BACKOFF=30.0
```

This reduces failures but does not add capacity. **Linking the key at
`inference.dahl.global/account` is the real fix.** Until then, occasional dropped
extractions remain possible. If they matter, check `hindsight-server.log` for
`429` and retry.

### Model caveat

Dahl **ignores `max_tokens`** (requested 5, returned 64 with
`finish_reason: length`). Hindsight's own startup LLM check therefore logs
"LLM output exceeded token limits" and proceeds on retries. It works, but it is
not a clean fit. Alternatives observed on `/models`: `zai-org/GLM-5.3-Flash`,
`MiniMaxAI/MiniMax-M2.7` — both also hit capacity limits intermittently.

## Using it from code

```python
from hindsight import HindsightClient

client = HindsightClient(base_url="http://localhost:8888")
client.create_bank(bank_id="my-agent", background="What this agent is for")
client.retain(bank_id="my-agent", content="User prefers Python for data analysis")
print(client.recall(bank_id="my-agent", query="What language do they prefer?"))
client.close()
```

`client.close()` matters — the client holds an aiohttp session, and leaking it
prints an "Unclosed client session" traceback that looks like a crash.

## Security

- The server binds `127.0.0.1` and has **no authentication**. Do not expose it.
- `.env` holds a live API key. It is git-ignored at the repo root, along with
  `.venv/`, `.vscode/` and the server logs.
- Rotate the Dahl key if this machine is shared or synced — the key has also
  appeared in plaintext in chat history.
