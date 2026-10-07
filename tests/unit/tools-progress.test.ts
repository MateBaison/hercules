import { expect, test } from "bun:test";
import { CombatMachine } from "../../src/domain/combat";
import { haversine, routePoints } from "../../src/domain/tracking";
import {
  comparable,
  exerciseHistories,
  improvement,
  weeklyData,
} from "../../src/domain/progress";
import { createDefaultSnapshot } from "../../src/domain/legacy/read-snapshot";
test("combat preparation, rounds, warning, rest and finish are emitted once", () => {
  const clock = new CombatMachine({
    mode: "boxeo",
    rounds: 2,
    work: 20,
    rest: 5,
    prep: 3,
  });
  expect(clock.toggle(0)).toEqual([]);
  expect(clock.advance(3000)).toEqual(["round"]);
  expect(clock.advance(8000)).toEqual(["warning"]);
  expect(clock.advance(9000)).toEqual([]);
  expect(clock.advance(23000)).toEqual(["rest"]);
  expect(clock.advance(24000)).toEqual([]);
  expect(clock.state.phase).toBe("rest");
  expect(clock.advance(28000)).toEqual(["round"]);
  expect(clock.advance(48000)).toEqual(["finish"]);
  expect(clock.advance(50000)).toEqual([]);
});
test("combat pause preserves deadline, resume does not repeat sound, catch-up ends cleanly", () => {
  const clock = new CombatMachine({
    mode: "hiit",
    rounds: 2,
    work: 20,
    rest: 0,
    prep: 0,
  });
  expect(clock.toggle(0)).toEqual(["round"]);
  clock.toggle(5000);
  expect(clock.state.remaining).toBe(15);
  expect(clock.toggle(100000)).toEqual([]);
  expect(clock.advance(100000)).toEqual(["warning"]);
  expect(clock.advance(135000)).toEqual(["round", "finish"]);
  expect(clock.state.running).toBe(false);
  expect(() => clock.reset({ ...clock.config, rounds: 0 })).toThrow();
});
test("GPS distance and route drawing fit the contained viewport", () => {
  const start = { lat: 52, lon: 13, time: 0, speed: 0 },
    end = { ...start, lat: 52.001 };
  expect(haversine(start, end)).toBeCloseTo(111.195, 2);
  expect(routePoints([start, end])).toBe("20,190 20,20");
  expect(routePoints([start])).toBe("");
});
test("progress converts historical pounds and compares like metrics only", () => {
  const snapshot = createDefaultSnapshot();
  snapshot.sessions = [
    {
      id: "a",
      date: "2026-10-05T12:00:00",
      routine: "r",
      day: "d",
      weightUnit: "lb",
      exercises: [
        {
          id: "press",
          group: "Pectorales",
          performedSets: [{ kg: 44.0924, reps: 10 }],
        },
      ],
    },
    {
      id: "b",
      date: "2026-10-06T12:00:00",
      routine: "r",
      day: "d",
      exercises: [
        {
          id: "press",
          group: "Pectorales",
          performedSets: [{ kg: 20, reps: 12 }],
        },
        {
          id: "plancha",
          group: "Abdominales",
          performedSets: [{ kg: 0, seconds: 40 }],
        },
      ],
    },
  ];
  const records = exerciseHistories(snapshot).get("press")!;
  expect(records[0]?.sets[0]?.kg).toBeCloseTo(20);
  expect(improvement(records[1]!, records[0])?.kind).toBe("quantity");
  expect(comparable(records[1]!, records[0])).toBe(true);
  expect(
    improvement(
      { date: new Date(), sets: [{ kg: 20, value: 12, metric: "seconds" }] },
      records[0],
    ),
  ).toBeNull();
  const weeks = weeklyData(snapshot, 4, new Date(2026, 9, 6));
  expect(weeks.at(-1)?.sessions).toBe(2);
  expect(weeks.at(-1)?.groups.Pectorales).toBe(2);
  expect(weeks.at(-1)?.groups.Abdominales).toBe(1);
});
