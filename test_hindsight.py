"""
End-to-end check of the bare-metal Hindsight server at http://localhost:8888.

Proves that the Dahl endpoint is actually driving the LLM side of the pipeline:

  1. wait for the server to become healthy
  2. create a bank
  3. retain a memory   -> requires Dahl to extract entities/relationships
  4. recall it back    -> requires Dahl to answer a natural-language query
  5. list memories     -> confirms it was persisted, not just echoed

Each run uses its own bank and deletes it afterwards, so runs cannot contaminate
each other through consolidation dedup.

Known failure mode: Dahl intermittently answers HTTP 429
("model_concurrency ... signed-in and paid accounts are admitted first") for keys
that are not linked to a Dahl account. That kills fact extraction, so the memory
is stored but never becomes recallable and this test fails. Check the server log
for 429s before concluding the .env is wrong.

Run:  python test_hindsight.py
"""

import sys
import time
import uuid

from hindsight import HindsightClient

BASE_URL = "http://localhost:8888"

# A fresh bank per run: consolidation dedups near-identical facts, so reusing one
# bank across runs can leave an older marker winning the recall.
BANK = f"dahl-test-{uuid.uuid4().hex[:8]}"
MARKER = uuid.uuid4().hex[:8]
FACT = f"The verification marker is {MARKER} and the answer is 42."
QUERY = "What is the verification marker?"


def wait_for_server(client: HindsightClient, timeout: int = 180) -> None:
    """The embedded PostgreSQL needs time to initialise on a cold start."""
    deadline = time.time() + timeout
    last = ""
    while time.time() < deadline:
        try:
            client.get_version()
            print(f"  server is up (waited {int(timeout - (deadline - time.time()))}s)")
            return
        except Exception as exc:  # noqa: BLE001 - report whatever went wrong
            last = str(exc)
            time.sleep(3)
    raise SystemExit(f"server never became ready: {last}")


def main() -> int:
    client = HindsightClient(base_url=BASE_URL)
    started_all = time.time()

    print(f"bank   : {BANK}")
    print(f"marker : {MARKER}")

    print("[1/5] waiting for server")
    wait_for_server(client)

    print("[2/5] creating bank")
    client.create_bank(bank_id=BANK, background="Verification bank for the Dahl LLM test")

    print("[3/5] retaining a memory (this calls Dahl)")
    started = time.time()
    client.retain(bank_id=BANK, content=FACT)
    print(f"      retain() returned in {time.time() - started:.1f}s (consolidation continues in background)")

    print("[4/5] polling until Dahl produces an LLM-derived observation")
    # Two different things can surface here, and only one proves the LLM worked:
    #   type='world'      -> the raw stored fact, available immediately
    #   type='observation'-> written by the consolidation worker AFTER Dahl has
    #                        extracted entities/relationships (~10-20s)
    # A test that stops at 'world' passes before the model has even answered, so
    # require the observation, otherwise this proves nothing about the LLM.
    result = None
    text = ""
    found_observation = False
    attempts = 0
    deadline = time.time() + 180
    while time.time() < deadline:
        attempts += 1
        started = time.time()
        result = client.recall(bank_id=BANK, query=QUERY)
        text = str(result)
        for entry in getattr(result, "results", []) or []:
            if getattr(entry, "type", "") == "observation" and MARKER in getattr(entry, "text", ""):
                found_observation = True
                print(f"      LLM observation after {attempts} attempt(s) "
                      f"({time.time() - started:.1f}s each)")
                break
        if found_observation:
            break
        time.sleep(5)
    else:
        print(f"      NO LLM observation after {attempts} attempts "
              f"over {int(time.time() - started_all)}s")

    print("[5/5] listing stored memories")
    stored = client.list_memories(bank_id=BANK)
    # ListMemoryUnitsResponse is a pydantic model, not a sequence.
    items = getattr(stored, "items", None) or []

    passed = found_observation

    print("\n" + "=" * 62)
    print(f"stored memories        : {len(items)}")
    print(f"marker in raw storage  : {MARKER in str(items)}")
    print(f"LLM observation found  : {found_observation}")
    print(f"total elapsed          : {time.time() - started_all:.1f}s")
    print("=" * 62)
    print(str(result)[:700])

    # Close before returning: the client holds an aiohttp session, and leaking it
    # prints an "Unclosed client session" traceback that looks like a crash.
    client.close()

    # Leave no throwaway banks behind.
    try:
        client.delete_bank(bank_id=BANK)
    except Exception:  # noqa: BLE001 - cleanup is best-effort
        pass

    if passed:
        print("\nPASS - Dahl produced an LLM-derived observation for the retained fact.")
        return 0

    print("\nFAIL - no LLM observation was produced.")
    print("      The raw fact may be stored, but extraction did not complete.")
    print("      Most likely cause: Dahl HTTP 429 (model_concurrency) killed fact")
    print("      extraction. Grep hindsight-server.log for '429'.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
