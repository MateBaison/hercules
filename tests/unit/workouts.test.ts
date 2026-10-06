import { expect, test } from "bun:test";
import { createDefaultSnapshot } from "../../src/domain/legacy/read-snapshot";
import {
  startWorkout,
  buildSession,
  blankSet,
  copySessions,
  previousSets,
} from "../../src/domain/workouts";
import {
  decodeRoutine,
  encodeRoutine,
  importRoutine,
} from "../../src/domain/sharing";
const extras = {
  color: "#4b9bff",
  comment: "Private comment",
  photos: ["data:image/jpeg;base64,AA"],
  bodyWeightStartKg: 70,
  bodyWeightEndKg: 69.8,
};
test("workout blanks are not logged; entered reps and seconds keep distinct metrics", () => {
  const snapshot = createDefaultSnapshot();
  startWorkout(snapshot, "r1", "d1");
  const workout = snapshot.workout;
  if (!workout) throw new Error("No workout");
  const first = workout.entries[0];
  if (!first) throw new Error("No entry");
  first.sets[0] = { kg: 20, reps: 12, entered: true };
  first.note = "Private note";
  workout.entries.push({
    id: "plancha",
    sets: [{ kg: null, seconds: 45, entered: true }],
  });
  const session = buildSession(
    snapshot,
    workout.entries,
    { routine: "Routine", day: "Day" },
    "2026-10-06T12:00:00Z",
    extras,
  );
  expect(session.sets).toBe(2);
  expect(session.volume).toBe(240);
  expect(session.exercises?.at(-1)?.performedSets?.[0]?.seconds).toBe(45);
  expect(session.exercises?.[0]?.note).toBe("Private note");
  first.sets[0] = { kg: 20, reps: null, entered: true };
  expect(() =>
    buildSession(
      snapshot,
      workout.entries,
      { routine: "Routine", day: "Day" },
      session.date,
      extras,
    ),
  ).toThrow();
});
test("copies appendable independent IDs, keep sets/notes/colors, omit photos/body weights", () => {
  const snapshot = createDefaultSnapshot();
  const session = buildSession(
    snapshot,
    [
      {
        id: "plancha",
        note: "Keep",
        sets: [{ kg: 0, seconds: 40, entered: true }],
      },
    ],
    { routine: "Routine", day: "Day" },
    "2026-10-06T12:00:00Z",
    extras,
  );
  const copied = copySessions([session], "2026-10-07")[0];
  expect(copied?.id).not.toBe(session.id);
  expect(copied?.photos).toEqual([]);
  expect(copied?.bodyWeightStartKg).toBeNull();
  expect(copied?.exercises).toEqual(session.exercises);
  expect(copied?.color).toBe(session.color);
});
test("previous sets copy both quantity and weight with unit conversion", () => {
  const snapshot = createDefaultSnapshot();
  snapshot.sessions = [
    {
      id: "s",
      date: "2026-10-01",
      routine: "Routine",
      day: "Day",
      weightUnit: "lb",
      exercises: [
        { id: "press-militar", performedSets: [{ kg: 44.0924, reps: 12 }] },
      ],
    },
  ];
  expect(
    previousSets(snapshot, "press-militar", "reps", Date.now())[0],
  ).toEqual({ kg: 20, value: 12 });
  expect(blankSet("seconds")).toEqual({
    kg: null,
    seconds: null,
    entered: false,
    done: false,
  });
});
test("shared routines preserve legacy v1, remap custom IDs and do not expose private fields", () => {
  const snapshot = createDefaultSnapshot();
  snapshot.profile.name = "Private person";
  snapshot.customExercises.push({
    id: "custom-original",
    name: "Personal",
    group: "Piernas",
    equipment: "Peso corporal",
    tracking: "seconds",
    steps: ["Step"],
    privateMetadata: "Do not share",
  });
  const routine = snapshot.routines[0];
  if (!routine?.days[0]) throw new Error("No routine");
  routine.days[0].items.push("custom-original");
  routine.days[0].privateNote = "No share";
  const token = encodeRoutine(snapshot, routine);
  const decoded = decodeRoutine(token);
  expect(decoded.name).toBe(routine.name);
  expect(JSON.stringify(decoded)).not.toContain("Private");
  expect(JSON.stringify(decoded)).not.toContain("privateMetadata");
  importRoutine(snapshot, token);
  const imported = snapshot.routines.at(-1);
  expect(imported?.id).not.toBe(routine.id);
  expect(imported?.days[0]?.items.at(-1)).not.toBe("custom-original");
  expect(snapshot.customExercises).toHaveLength(2);
  expect(() => decodeRoutine("invalid<token>")).toThrow();
});
