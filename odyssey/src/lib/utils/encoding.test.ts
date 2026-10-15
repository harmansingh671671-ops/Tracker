import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

/**
 * BUG-4 guard.
 *
 * Mojibake reached the source tree through the documented PowerShell
 * `Set-Content` re-encoding incident (context.md §7). It shipped as visible
 * user-facing text -- a notification title and a date-strip label, both with
 * mangled punctuation -- because no test asserted on those strings, so the only
 * way it was ever going to be caught was by reading it.
 *
 * The failure mode is silent and re-introducible: any tool that writes UTF-8
 * text with the wrong encoding puts it straight back. A test that reads the
 * files is the only cheap guard, so this one runs on every suite.
 *
 * NB: this file cannot quote the bad bytes even in a comment -- doing so made
 * the guard fail on itself, which is the cheapest possible proof that it works.
 */

/** Codepoints that only appear together as the signature of a UTF-8 -> Latin-1 round trip. */
const MOJIBAKE_MARKERS = [
  "\u00e2", // LATIN SMALL LETTER A WITH CIRCUMFLEX -- leads the bullet-mojibake family
  "\u00f0", // LATIN SMALL LETTER ETH -- leads the emoji-mojibake family
  "\u00ef", // leads the BOM-read-as-text family
  "\u00c3", // LATIN CAPITAL LETTER A WITH TILDE -- leads the whole-file-decoded-as-Latin-1 family
];

const SRC = join(__dirname, "..", "..");

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === ".next") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, acc);
    else if (/\.(ts|tsx|css)$/.test(entry)) acc.push(full);
  }
  return acc;
}

describe("source encoding (BUG-4)", () => {
  const files = sourceFiles(SRC);

  it("finds the files it is guarding", () => {
    // A guard that silently matches nothing is worse than no guard: it reads as
    // passing while covering nothing. Same trap as the old `#__next` probe.
    expect(files.length).toBeGreaterThan(100);
  });

  it("contains no mojibake in any source file", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const text = readFileSync(file, "utf8");
      const found = MOJIBAKE_MARKERS.filter((m) => text.includes(m));
      if (found.length) {
        const lines = text
          .split("\n")
          .map((line, i) => ({ line: i + 1, hits: found.filter((m) => line.includes(m)) }))
          .filter((l) => l.hits.length)
          .map((l) => l.line);
        offenders.push(`${relative(SRC, file)}:${lines.join(",")}`);
      }
    }
    expect(
      offenders,
      `Mojibake found in: ${offenders.join(" | ")}. UTF-8 was decoded as Latin-1 somewhere.`,
    ).toEqual([]);
  });

  it("has no byte-order mark, which is how the corruption announced itself", () => {
    const offenders = files
      .filter((f) => {
        const b = readFileSync(f);
        return b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf;
      })
      .map((f) => relative(SRC, f));
    expect(offenders, `BOM present: ${offenders.join(", ")}`).toEqual([]);
  });
});