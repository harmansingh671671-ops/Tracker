import { describe, expect, it } from "vitest";
import {
  canonicalCategoryKey,
  SCHEDULE_CATEGORY_KEYS,
} from "./schedule-category-key";

describe("canonicalCategoryKey", () => {
  it("folds the five ids to themselves", () => {
    for (const key of SCHEDULE_CATEGORY_KEYS) {
      expect(canonicalCategoryKey(key)).toBe(key);
    }
  });

  it("folds legacy spellings into the family they display as", () => {
    expect(canonicalCategoryKey("rest")).toBe("sleep");
    expect(canonicalCategoryKey("Sleep")).toBe("sleep");
    expect(canonicalCategoryKey("habits")).toBe("vitality");
    expect(canonicalCategoryKey("health")).toBe("vitality");
    expect(canonicalCategoryKey("admin")).toBe("sync");
    expect(canonicalCategoryKey("meetings")).toBe("sync");
    expect(canonicalCategoryKey("buffer")).toBe("renewal");
    expect(canonicalCategoryKey("leisure")).toBe("renewal");
  });

  it("treats an empty or unknown value as work", () => {
    expect(canonicalCategoryKey("")).toBe("work");
    expect(canonicalCategoryKey(undefined)).toBe("work");
    expect(canonicalCategoryKey("something else")).toBe("work");
  });
});
