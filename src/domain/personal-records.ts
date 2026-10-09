import type { Snapshot } from "./schemas/snapshot";

type Set = {
  kg?: number | null;
  reps?: number | null;
  seconds?: number | null;
  entered?: boolean;
  done?: boolean;
};
type Performance = {
  weight: number;
  quantity: number;
  metric: "reps" | "seconds";
};
export type PersonalRecord = "weight" | "reps" | "seconds";

function performance(
  set: Set,
  unit: "kg" | "lb",
  selectedMetric?: "reps" | "seconds",
): Performance | null {
  if (set.entered === false && !set.done) return null;
  const metric =
    selectedMetric ?? (Number(set.seconds) > 0 ? "seconds" : "reps");
  const quantity = Number(set[metric]);
  const weight = Number(set.kg ?? 0) / (unit === "lb" ? 2.20462 : 1);
  return Number.isFinite(quantity) &&
    quantity > 0 &&
    Number.isFinite(weight) &&
    weight >= 0
    ? { metric, quantity, weight }
    : null;
}

/** Compare only the same exercise and metric; ties and untouched defaults are not records. */
export function personalRecords(
  snapshot: Snapshot,
  exerciseId: string,
  sets: Set[],
  unit: "kg" | "lb",
  before: number,
  excludedSession?: string,
  selectedMetric?: "reps" | "seconds",
): PersonalRecord[][] {
  const history = snapshot.sessions
    .filter(
      (session) =>
        session.id !== excludedSession && Date.parse(session.date) < before,
    )
    .flatMap((session) =>
      (session.exercises ?? [])
        .filter((exercise) => exercise.id === exerciseId)
        .flatMap((exercise) =>
          (exercise.performedSets ?? []).flatMap((set) => {
            const value = performance(set, session.weightUnit ?? "kg");
            return value ? [value] : [];
          }),
        ),
    );
  return sets.map((set) => {
    const current = performance(set, unit, selectedMetric);
    if (!current) return [];
    const comparable = history.filter((old) => old.metric === current.metric);
    const records: PersonalRecord[] = [];
    // A first logged performance establishes a baseline instead of inventing a prior record.
    if (comparable.length) {
      if (
        current.weight >
        Math.max(...comparable.map((old) => old.weight)) + 0.05
      )
        records.push("weight");
      const sameLoad = comparable.filter(
        (old) => Math.abs(old.weight - current.weight) <= 0.05,
      );
      if (
        sameLoad.length &&
        current.quantity > Math.max(...sameLoad.map((old) => old.quantity))
      )
        records.push(current.metric);
    }
    history.push(current);
    return records;
  });
}
