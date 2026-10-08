import { expect, test } from "bun:test";
import { createDefaultSnapshot } from "../../src/domain/legacy/read-snapshot";
import { weeklySummary } from "../../src/domain/progress";
import type { Snapshot } from "../../src/domain/schemas/snapshot";

const session = (
  date: Date,
  duration?: number | null,
): Snapshot["sessions"][number] => ({
  id: crypto.randomUUID(),
  date: date.toISOString(),
  routine: "Test",
  day: "Day",
  exercises: [],
  duration,
});
test("weekly time adds multiple sessions per local day and keeps unknown durations distinct", () => {
  const snapshot = createDefaultSnapshot();
  snapshot.sessions = [
    session(new Date(2026, 9, 5, 10), 45),
    session(new Date(2026, 9, 5, 18), 30),
    session(new Date(2026, 9, 6, 8), null),
    session(new Date(2026, 9, 6, 9), 0),
    session(new Date(2026, 9, 4, 23), 80),
    session(new Date(2026, 9, 12, 0), 90),
  ];
  const result = weeklySummary(snapshot, new Date(2026, 9, 8));
  expect(result.sessions).toBe(4);
  expect(result.trainedDays).toBe(2);
  expect(result.minutes).toBe(75);
  expect(result.unknown).toBe(1);
  expect(result.days[0]?.minutes).toBe(75);
  expect(result.days[1]?.unknown).toBe(1);
  expect(result.days[2]?.sessions).toBe(0);
});
test("a week covers seven local dates across a daylight saving change", () => {
  const result = weeklySummary(createDefaultSnapshot(), new Date(2026, 9, 25));
  expect(result.days.map((day) => day.date.getDate())).toEqual([
    19, 20, 21, 22, 23, 24, 25,
  ]);
  expect(result.sessions).toBe(0);
});
