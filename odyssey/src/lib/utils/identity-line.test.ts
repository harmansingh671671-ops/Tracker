import { describe, it, expect } from "vitest";
import { IDENTITY_ATTRIBUTION, IDENTITY_QUOTE } from "./identity-line";

/**
 * These constants are **edited by hand** -- that is the whole point of `A5`'s
 * quote. So these tests are not pinning a value to freeze it; they are guards
 * against the edit going wrong in the ways that are easy to make and hard to see:
 * a stray newline from a copy-paste, an unbalanced quote mark, a name left behind
 * from the previous quote, or a line long enough to be clipped on a phone.
 *
 * Change the quote freely. If one of these fails, read the message before
 * "fixing" the test.
 */

describe("identity quote", () => {
  it("is not empty", () => {
    expect(IDENTITY_QUOTE.trim().length).toBeGreaterThan(0);
  });

  it("has no stray newlines or tabs, which would render as odd gaps", () => {
    expect(IDENTITY_QUOTE).not.toMatch(/[\n\r\t]/);
  });

  it("is attributed, and the attribution is single-line", () => {
    expect(IDENTITY_ATTRIBUTION.trim().length).toBeGreaterThan(0);
    expect(IDENTITY_ATTRIBUTION).not.toMatch(/[\n\r\t]/);
  });

  it("is not so long that it would be clipped rather than wrapped", () => {
    // It wraps, so this is a legibility bound rather than a hard limit. A quote
    // that runs to many lines stops being a line you read at a glance.
    expect(IDENTITY_QUOTE.trim().length).toBeLessThanOrEqual(140);
  });

  it("does not begin or end mid-sentence", () => {
    expect(IDENTITY_QUOTE.trim()).toMatch(/^[A-Z"'\u201c]/);
    expect(IDENTITY_QUOTE.trim()).toMatch(/[.!?"'\u201d]$/);
  });

  it("does not carry its own em-dash attribution that could contradict the one beside it", () => {
    // An em-dash inside the text plus a rendered "— Name" underneath would read as
    // two attributions. Keep the name out of the sentence.
    expect(IDENTITY_QUOTE).not.toContain("\u2014");
  });
});