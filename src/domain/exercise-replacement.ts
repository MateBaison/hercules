import {
  blankSet,
  findExercise,
  metricFor,
  previousSets,
  type Entry,
} from "./workouts";
import type { Snapshot } from "./schemas/snapshot";
export function replacementPlan(
  snapshot: Snapshot,
  original: Entry,
  targetId: string,
) {
  if (targetId === original.id || !findExercise(snapshot, targetId))
    throw new Error("Elegí un ejercicio alternativo válido.");
  const metric = metricFor(snapshot, targetId);
  const originalMetric = metricFor(snapshot, original.id, original);
  const remaining = original.sets.filter((set) => !set.entered && !set.done);
  const reference = remaining.length ? remaining : original.sets;
  const history = previousSets(
    snapshot,
    targetId,
    metric,
    snapshot.workout?.started ?? Date.now(),
  );
  return {
    metric,
    hasHistory: history.length > 0,
    sets: reference.map((set, index) => {
      const old = history[index] ?? history.at(-1);
      return {
        ...blankSet(metric),
        type: set.type ?? "normal",
        kg: old?.kg ?? null,
        [metric]:
          old?.value ??
          (metric === originalMetric
            ? Number(set[metric]) ||
              Number(
                original.sets.find((source) => Number(source[metric]) > 0)?.[
                  metric
                ],
              ) ||
              (metric === "seconds" ? 30 : 10)
            : metric === "seconds"
              ? 30
              : 10),
      };
    }),
  };
}
export function replaceWorkoutExercise(
  snapshot: Snapshot,
  index: number,
  targetId: string,
) {
  const workout = snapshot.workout;
  const original = workout?.entries[index];
  if (!workout || !original)
    throw new Error("No hay ejercicio para reemplazar.");
  const plan = replacementPlan(snapshot, original, targetId);
  const retained = original.sets.filter((set) => set.entered || set.done);
  const next: Entry = {
    id: targetId,
    tracking: plan.metric,
    sets: plan.sets,
    ...(original.superset ? { superset: original.superset } : {}),
  };
  if (retained.length) {
    original.sets = retained;
    workout.entries.splice(index + 1, 0, next);
    workout.openExercises = workout.openExercises?.map((openIndex) =>
      openIndex > index ? openIndex + 1 : openIndex,
    );
    workout.index = index + 1;
  } else {
    workout.entries[index] = next;
    workout.index = index;
  }
  workout.openExercises = [
    ...new Set([...(workout.openExercises ?? []), workout.index]),
  ];
}
