/**
 * Utility functions for calculating Odyssey Journey days and mapping them to calendar dates.
 */

export function getJourneyStartDate(createdAt?: string): string {
  if (createdAt) {
    const cd = new Date(createdAt);
    if (!isNaN(cd.getTime())) {
      const y = cd.getFullYear();
      const m = String(cd.getMonth() + 1).padStart(2, "0");
      const d = String(cd.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${d}`;
      if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
        try {
          localStorage.setItem("odyssey_journey_start_date", dateStr);
        } catch {}
      }
      return dateStr;
    }
  }

  if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
    const stored = localStorage.getItem("odyssey_journey_start_date");
    if (stored && /^\d{4}-\d{2}-\d{2}$/.test(stored)) {
      return stored;
    }
  }

  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  const d = String(today.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getJourneyDayNumber(createdAt?: string, referenceDate: Date = new Date()): number {
  const startStr = getJourneyStartDate(createdAt);
  const [sy, sm, sd] = startStr.split("-").map(Number);
  const startDateMidnight = new Date(sy, sm - 1, sd, 0, 0, 0, 0);

  const todayMidnight = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate(),
    0, 0, 0, 0
  );

  const diffMs = todayMidnight.getTime() - startDateMidnight.getTime();
  const diffDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  return Math.max(1, diffDays + 1);
}

export function getDateForJourneyDay(dayNum: number, createdAt?: string): string {
  const startStr = getJourneyStartDate(createdAt);
  const [sy, sm, sd] = startStr.split("-").map(Number);
  const startDateMidnight = new Date(sy, sm - 1, sd, 0, 0, 0, 0);

  const targetDate = new Date(startDateMidnight);
  targetDate.setDate(targetDate.getDate() + (dayNum - 1));

  const y = targetDate.getFullYear();
  const m = String(targetDate.getMonth() + 1).padStart(2, "0");
  const d = String(targetDate.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
