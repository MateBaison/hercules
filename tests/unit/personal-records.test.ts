import { expect, test } from "bun:test";
import { createDefaultSnapshot } from "../../src/domain/legacy/read-snapshot";
import { personalRecords } from "../../src/domain/personal-records";

test("personal records compare history by exercise, metric and converted load", () => {
  const snapshot = createDefaultSnapshot();
  snapshot.sessions = [
    {
      id: "old",
      date: "2026-10-01T12:00:00Z",
      routine: "R",
      day: "D",
      weightUnit: "kg",
      exercises: [
        { id: "press", performedSets: [{ kg: 20, reps: 10 }] },
        { id: "hold", performedSets: [{ kg: 0, seconds: 30 }] },
      ],
    },
  ];
  const before = Date.parse("2026-10-10T12:00:00Z");
  expect(
    personalRecords(
      snapshot,
      "press",
      [
        { kg: 20, reps: 10 },
        { kg: 22, reps: 8 },
        { kg: 22, reps: 8 },
        { kg: 20, reps: 12 },
      ],
      "kg",
      before,
    ),
  ).toEqual([[], ["weight"], [], ["reps"]]);
  expect(
    personalRecords(
      snapshot,
      "press",
      [{ kg: 20 * 2.20462, reps: 10 }],
      "lb",
      before,
    ),
  ).toEqual([[]]);
  expect(
    personalRecords(snapshot, "press", [{ kg: 20, seconds: 60 }], "kg", before),
  ).toEqual([[]]);
  expect(
    personalRecords(snapshot, "hold", [{ kg: 0, seconds: 40 }], "kg", before),
  ).toEqual([["seconds"]]);
  expect(
    personalRecords(
      snapshot,
      "press",
      [
        { kg: 30, reps: 10, entered: false },
        { kg: 30, reps: null },
      ],
      "kg",
      before,
    ),
  ).toEqual([[], []]);
  expect(
    personalRecords(snapshot, "press", [{ kg: 15, reps: 20 }], "kg", before),
  ).toEqual([[]]);
  expect(
    personalRecords(snapshot, "new", [{ kg: 30, reps: 10 }], "kg", before),
  ).toEqual([[]]);
  expect(
    personalRecords(
      snapshot,
      "press",
      [{ kg: 22, reps: 12 }],
      "kg",
      Date.parse(snapshot.sessions[0]!.date),
      "old",
    ),
  ).toEqual([[]]);
  expect(
    personalRecords(
      snapshot,
      "press",
      [{ kg: 20, reps: 12, seconds: 60 }],
      "kg",
      before,
      undefined,
      "reps",
    ),
  ).toEqual([["reps"]]);
});
