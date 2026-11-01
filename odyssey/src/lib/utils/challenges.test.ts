import { describe, it, expect } from "vitest";
import {
  CHALLENGES,
  planChallengeStart,
  getChallengeStatus,
  toChallengeInputs,
  type Challenge,
} from "./challenges";

/**
 * B7 — challenges that create habits.
 *
 * The contract these tests pin is deliberately narrow, because it is the whole
 * promise the preview screen makes to the user: (1) a challenge never adds a
 * habit they already have, (2) progress is counted from the day they started,
 * and (3) a challenge that has ended does not touch their habits at all.
 */

const challenge: Challenge = {
  id: "reading-21",
  packId: "morning",
  title: "21-Day Reading",
  goal: "Read every morning for three weeks",
  durationDays: 21,
};

const tpl = (name: string) => ({ name, id: name.toLowerCase() });

describe("planChallengeStart - never duplicates a habit you already have", () => {
  it("adds everything when the user has nothing", () => {
    const plan = planChallengeStart([tpl("Read"), tpl("Stretch")], []);
    expect(plan.toAdd.map((t) => t.name)).toEqual(["Read", "Stretch"]);
    expect(plan.skipped).toEqual([]);
  });

  it("skips a habit the user already has, by exact name", () => {
    const plan = planChallengeStart([tpl("Read"), tpl("Stretch")], ["Read"]);
    expect(plan.toAdd.map((t) => t.name)).toEqual(["Stretch"]);
    expect(plan.skipped.map((t) => t.name)).toEqual(["Read"]);
  });

  it("treats case and surrounding spaces as the same habit", () => {
    // The habit list is user-typed, so "  read " and "Read" are the same habit.
    const plan = planChallengeStart([tpl("Read")], ["  read "]);
    expect(plan.toAdd).toEqual([]);
    expect(plan.skipped.map((t) => t.name)).toEqual(["Read"]);
  });

  it("returns an empty plan rather than an error when everything is already there", () => {
    const plan = planChallengeStart([tpl("Read")], ["Read"]);
    expect(plan.toAdd).toEqual([]);
    expect(plan.skipped.length).toBe(1);
  });
});

describe("getChallengeStatus - progress from the day you started", () => {
  const habit = (startedAt: string, id = challenge.id) => ({
    challengeId: id,
    challengeStartedAt: startedAt,
    challengeDurationDays: 21,
  });

  it("is not joined when no habit belongs to the challenge", () => {
    const s = getChallengeStatus(challenge, [], "2026-11-01");
    expect(s.joined).toBe(false);
    expect(s.dayNumber).toBeNull();
    expect(s.finished).toBe(false);
  });

  it("reads day 1 on the start date", () => {
    const s = getChallengeStatus(challenge, [habit("2026-11-01")], "2026-11-01");
    expect(s.joined).toBe(true);
    expect(s.dayNumber).toBe(1);
    expect(s.finished).toBe(false);
  });

  it("reads day 6 five days in", () => {
    const s = getChallengeStatus(challenge, [habit("2026-11-01")], "2026-11-06");
    expect(s.dayNumber).toBe(6);
  });

  it("is still unfinished on the last day", () => {
    const s = getChallengeStatus(challenge, [habit("2026-11-01")], "2026-11-21");
    expect(s.dayNumber).toBe(21);
    expect(s.finished).toBe(false);
  });

  it("is finished the day after the last day", () => {
    const s = getChallengeStatus(challenge, [habit("2026-11-01")], "2026-11-22");
    expect(s.finished).toBe(true);
  });

  it("ignores habits that belong to a different challenge", () => {
    const s = getChallengeStatus(challenge, [habit("2026-11-01", "other")], "2026-11-06");
    expect(s.joined).toBe(false);
  });

  it("uses the earliest start when several habits disagree", () => {
    // A challenge is one start date; if rows ever disagree, the earliest wins so
    // progress cannot appear to move backwards.
    const s = getChallengeStatus(
      challenge,
      [habit("2026-11-03"), habit("2026-11-01")],
      "2026-11-06"
    );
    expect(s.dayNumber).toBe(6);
  });

  it("never mutates the habits it reads", () => {
    const habits = [habit("2026-11-01")];
    const before = JSON.stringify(habits);
    getChallengeStatus(challenge, habits, "2026-11-30");
    expect(JSON.stringify(habits)).toBe(before);
  });

  it("clamps a start date in the future to day 1 instead of a negative day", () => {
    const s = getChallengeStatus(challenge, [habit("2026-11-05")], "2026-11-01");
    expect(s.dayNumber).toBe(1);
    expect(s.finished).toBe(false);
  });
});

describe("CHALLENGES - the catalogue itself", () => {
  it("has unique ids", () => {
    const ids = CHALLENGES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every challenge states a goal, a positive length and a real pack", () => {
    const packs = ["morning", "deep_work", "sleep", "vitality", "mindfulness", "detox"];
    for (const c of CHALLENGES) {
      expect(c.goal.trim().length).toBeGreaterThan(0);
      expect(c.durationDays).toBeGreaterThan(0);
      expect(packs).toContain(c.packId);
    }
  });
});

describe("toChallengeInputs - the stamp that makes progress work", () => {
  const template = {
    name: "Read 20 Pages",
    icon: "📚",
    domainLabel: "Craft & Skill" as const,
    targetDays: [1, 2, 3],
    period: "morning" as const,
    packId: "morning",
  };

  it("stamps every habit with the challenge, its start date and its length", () => {
    const inputs = toChallengeInputs(challenge, [template], "2026-11-01");
    expect(inputs).toHaveLength(1);
    expect(inputs[0]).toMatchObject({
      name: "Read 20 Pages",
      challengeId: "reading-21",
      challengeStartedAt: "2026-11-01",
      challengeDurationDays: 21,
      timeOfDay: "morning",
      category: "Craft & Skill",
      targetDays: [1, 2, 3],
    });
  });

  it("carries no challenge stamp when there is nothing to add", () => {
    expect(toChallengeInputs(challenge, [], "2026-11-01")).toEqual([]);
  });
});
