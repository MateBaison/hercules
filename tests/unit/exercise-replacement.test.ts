import { expect, test } from "bun:test";
import { createDefaultSnapshot } from "../../src/domain/legacy/read-snapshot";
import { startWorkout, findExercise } from "../../src/domain/workouts";
import {
  replacementPlan,
  replaceWorkoutExercise,
} from "../../src/domain/exercise-replacement";
import { localizedSetTypes, setTypeLabels } from "../../src/data/set-types";
test("set type names and letters follow the selected language", () => {
  expect(localizedSetTypes("es")[0]?.letter).toBe("C");
  expect(localizedSetTypes("en")[0]?.letter).toBe("W");
  for (const lang of Object.keys(setTypeLabels))
    expect(localizedSetTypes(lang)).toHaveLength(4);
});
test("replacement retains logged original sets and does not convert loads across exercises", () => {
  const snapshot = createDefaultSnapshot();
  startWorkout(snapshot, "r1", "d1");
  const entry = snapshot.workout!.entries[0]!;
  entry.sets[0] = { kg: 40, reps: 12, entered: true, type: "failure" };
  const routine = JSON.stringify(snapshot.routines);
  const count = entry.sets.length - 1;
  const plan = replacementPlan(snapshot, entry, "plancha");
  expect(findExercise(snapshot, "plancha")?.tracking).toBe("seconds");
  expect(plan.metric).toBe("seconds");
  expect(plan.sets).toHaveLength(count);
  expect(plan.sets[0]?.kg).toBeNull();
  expect(plan.sets[0]?.seconds).toBe(30);
  replaceWorkoutExercise(snapshot, 0, "plancha");
  expect(snapshot.workout!.entries[0]!.sets).toEqual([
    { kg: 40, reps: 12, entered: true, type: "failure" },
  ]);
  expect(snapshot.workout!.entries[1]!.id).toBe("plancha");
  expect(snapshot.workout!.entries[1]!.sets[0]?.entered).toBe(false);
  expect(JSON.stringify(snapshot.routines)).toBe(routine);
});
test("replacement takes load recommendations from the target history with unit conversion", () => {
  const snapshot = createDefaultSnapshot();
  startWorkout(snapshot, "r1", "d1");
  snapshot.sessions.push({
    id: "s",
    date: "2026-01-01",
    routine: "r",
    day: "d",
    weightUnit: "lb",
    exercises: [
      { id: "press-militar", performedSets: [{ kg: 44.0924, reps: 8 }] },
    ],
  });
  const plan = replacementPlan(
    snapshot,
    snapshot.workout!.entries[0]!,
    "press-militar",
  );
  expect(plan.hasHistory).toBe(true);
  expect(plan.sets[0]?.kg).toBe(20);
  expect(plan.sets[0]?.reps).toBe(8);
});
