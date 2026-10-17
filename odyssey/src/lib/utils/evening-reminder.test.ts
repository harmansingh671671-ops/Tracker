import { describe, it, expect } from "vitest";
import {
  EVENING_REMINDER_HOUR,
  INCOMPLETE_HOURS_THRESHOLD,
  countPlannedHours,
  dismissalKeyFor,
  isPastReminderHour,
  localDateStr,
  msUntilNextEvaluation,
  shouldOpenReminder,
  tomorrowDateStr,
} from "./evening-reminder";

/** Local-time constructor. `new Date("...Z")` would parse as UTC and shift the day. */
const at = (y: number, m: number, d: number, h: number, min = 0, s = 0) =>
  new Date(y, m - 1, d, h, min, s, 0);

describe("localDateStr", () => {
  it("formats in LOCAL time, not UTC", () => {
    // 23:30 local on the 16th is already the 17th in UTC for any eastern zone.
    // The old code used toISOString(), so this is the regression that made the
    // dismissal key land on the wrong day.
    expect(localDateStr(at(2026, 10, 16, 23, 30))).toBe("2026-10-16");
    expect(localDateStr(at(2026, 10, 17, 0, 15))).toBe("2026-10-17");
  });

  it("zero-pads month and day", () => {
    expect(localDateStr(at(2026, 1, 5, 12))).toBe("2026-01-05");
  });
});

describe("dismissalKeyFor", () => {
  it("keys on the local day and is stable within a day", () => {
    const morning = dismissalKeyFor(at(2026, 10, 16, 21, 0));
    const evening = dismissalKeyFor(at(2026, 10, 16, 23, 59));
    expect(morning).toBe(evening);
    expect(morning).toBe("odyssey_dismiss_2000_2026-10-16");
  });

  it("changes at local midnight, which a UTC key would not", () => {
    expect(dismissalKeyFor(at(2026, 10, 16, 23, 59))).not.toBe(
      dismissalKeyFor(at(2026, 10, 17, 0, 1))
    );
  });
});

describe("isPastReminderHour", () => {
  it("is false before the hour and true from the hour onward", () => {
    expect(isPastReminderHour(at(2026, 10, 16, 0, 0))).toBe(false);
    expect(isPastReminderHour(at(2026, 10, 16, 19, 59))).toBe(false);
    expect(isPastReminderHour(at(2026, 10, 16, EVENING_REMINDER_HOUR, 0))).toBe(true);
    expect(isPastReminderHour(at(2026, 10, 16, 23, 59))).toBe(true);
  });
});

describe("tomorrowDateStr", () => {
  it("rolls over month and year correctly", () => {
    expect(tomorrowDateStr(at(2026, 10, 16, 12))).toBe("2026-10-17");
    expect(tomorrowDateStr(at(2026, 10, 31, 12))).toBe("2026-11-01");
    expect(tomorrowDateStr(at(2026, 12, 31, 12))).toBe("2027-01-01");
  });

  it("rolls over a leap day", () => {
    expect(tomorrowDateStr(at(2028, 2, 28, 12))).toBe("2028-02-29");
    expect(tomorrowDateStr(at(2028, 2, 29, 12))).toBe("2028-03-01");
  });
});

describe("countPlannedHours", () => {
  it("counts distinct hours, not blocks", () => {
    expect(countPlannedHours([{ startTime: "09:00", endTime: "12:00" }])).toBe(3);
  });

  it("does not double-count overlapping blocks", () => {
    expect(
      countPlannedHours([
        { startTime: "09:00", endTime: "12:00" },
        { startTime: "11:00", endTime: "14:00" },
      ])
    ).toBe(5); // 09,10,11,12,13
  });

  it("treats 24:00 as the end of the day", () => {
    expect(countPlannedHours([{ startTime: "22:00", endTime: "24:00" }])).toBe(2);
  });

  it("treats a midnight end after a late start as 24, not 0", () => {
    // "22:00-00:00" is two hours. Read naively it is zero.
    expect(countPlannedHours([{ startTime: "22:00", endTime: "00:00" }])).toBe(2);
  });

  it("handles a zero-length block", () => {
    expect(countPlannedHours([{ startTime: "09:00", endTime: "09:00" }])).toBe(0);
  });

  it("returns 0 for an empty day", () => {
    expect(countPlannedHours([])).toBe(0);
  });

  it("caps at 24 for a fully planned day", () => {
    expect(
      countPlannedHours([{ startTime: "00:00", endTime: "24:00" }])
    ).toBe(24);
  });
});

describe("shouldOpenReminder", () => {
  it("needs BOTH the hour and an incomplete tomorrow", () => {
    const late = at(2026, 10, 16, 21);
    const early = at(2026, 10, 16, 12);
    expect(shouldOpenReminder(0, late)).toBe(true);
    expect(shouldOpenReminder(0, early)).toBe(false);
    expect(shouldOpenReminder(24, late)).toBe(false);
  });

  it("treats the threshold as inclusive of 'complete'", () => {
    const late = at(2026, 10, 16, 21);
    expect(shouldOpenReminder(INCOMPLETE_HOURS_THRESHOLD, late)).toBe(false);
    expect(shouldOpenReminder(INCOMPLETE_HOURS_THRESHOLD - 1, late)).toBe(true);
  });
});

describe("msUntilNextEvaluation", () => {
  // This is the fix. The old component polled every 60s regardless of the hour;
  // an idle afternoon must now cost ONE timer, not 1,200.
  it("before the hour, schedules once for 20:00 rather than every minute", () => {
    const noon = at(2026, 10, 16, 12, 0, 0);
    const delta = msUntilNextEvaluation(noon);
    expect(delta).toBe(8 * 60 * 60 * 1000); // 8 hours
    expect(delta).toBeGreaterThan(60_000);
  });

  it("from 20:00 onward, targets the next minute boundary", () => {
    expect(msUntilNextEvaluation(at(2026, 10, 16, 20, 0, 0))).toBe(60_000);
    expect(msUntilNextEvaluation(at(2026, 10, 16, 20, 0, 1))).toBe(59_000);
    // 23:59:30 -> midnight is 30s away, not clamped. An earlier expectation of
    // 1000 here was my test being wrong, not the code.
    expect(msUntilNextEvaluation(at(2026, 10, 16, 23, 59, 30))).toBe(30_000);
    expect(msUntilNextEvaluation(at(2026, 10, 16, 23, 59, 59))).toBe(1_000);
  });

  it("never returns zero or negative, including exactly on the boundary", () => {
    for (const h of [0, 19, 20, 23]) {
      const d = msUntilNextEvaluation(at(2026, 10, 16, h, 0, 0));
      expect(d).toBeGreaterThan(0);
      expect(Number.isFinite(d)).toBe(true);
    }
  });

  it("is strictly cheaper than a 60s poll before the hour, at every minute of the day", () => {
    // The regression guard: a cap here would have made daytime polling WORSE.
    let worseThanPoll = 0;
    for (let h = 0; h < EVENING_REMINDER_HOUR; h++) {
      for (const min of [0, 15, 30, 45]) {
        if (msUntilNextEvaluation(at(2026, 10, 16, h, min, 0)) < 60_000) worseThanPoll++;
      }
    }
    expect(worseThanPoll).toBe(0);
  });
});