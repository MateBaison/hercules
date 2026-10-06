import { z } from "zod";
import { exercises, muscleImages } from "@/data/exercises";
import { muscleGroupSchema, type Exercise } from "./schemas/exercise";
import {
  customExerciseFormSchema,
  type SavedSet,
  type Snapshot,
} from "./schemas/snapshot";
export type CatalogExercise = Exercise & { custom?: boolean };
export type Session = Snapshot["sessions"][number];
export type Entry = NonNullable<Snapshot["workout"]>["entries"][number];
export function catalogFor(snapshot: Snapshot): CatalogExercise[] {
  return [
    ...exercises,
    ...snapshot.customExercises.flatMap((item) => {
      const parsed = customExerciseFormSchema.safeParse({
        id: item.id,
        name: item.name,
        group: item.group,
        equipment: item.equipment,
        tracking: item.tracking ?? "reps",
        steps: item.steps ?? [],
      });
      if (!parsed.success) return [];
      return [
        {
          ...parsed.data,
          custom: true,
          pattern: "move",
          level: "Personalizado",
          image: muscleImages[parsed.data.group],
        },
      ];
    }),
  ];
}
export function findExercise(snapshot: Snapshot, id: string) {
  return catalogFor(snapshot).find((item) => item.id === id);
}
export function metricFor(
  snapshot: Snapshot,
  id: string,
  entry?: Entry,
): "reps" | "seconds" {
  return entry?.tracking === "seconds" ||
    (entry?.tracking !== "reps" &&
      findExercise(snapshot, id)?.tracking === "seconds")
    ? "seconds"
    : "reps";
}
export function blankSet(metric: "reps" | "seconds"): SavedSet {
  return { kg: null, [metric]: null, entered: false, done: false };
}
export function localDateKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function validDateKey(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    localDateKey(`${value}T12:00:00`) === value
  );
}
export function color(value?: string): string {
  return /^#[0-9a-f]{6}$/i.test(value ?? "") ? (value ?? "#ff5538") : "#ff5538";
}
export function previousSets(
  snapshot: Snapshot,
  id: string,
  metric: "reps" | "seconds",
  before: number,
) {
  const session = snapshot.sessions
    .filter(
      (session) =>
        new Date(session.date).getTime() < before &&
        session.exercises?.some(
          (item) =>
            item.id === id &&
            item.performedSets?.some((set) => Number(set[metric]) > 0),
        ),
    )
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  if (!session) return [];
  const factor =
    (session.weightUnit ?? "kg") === (snapshot.settings.weight ?? "kg")
      ? 1
      : snapshot.settings.weight === "lb"
        ? 2.20462
        : 1 / 2.20462;
  return (
    session.exercises
      ?.filter((item) => item.id === id)
      .flatMap((item) => item.performedSets ?? [])
      .filter((set) => Number(set[metric]) > 0)
      .map((set) => ({
        kg: Math.round((Number(set.kg) || 0) * factor * 10) / 10,
        value: Number(set[metric]),
      })) ?? []
  );
}
export function startWorkout(snapshot: Snapshot, rid: string, did: string) {
  if (snapshot.workout) throw new Error("Ya hay un entrenamiento en curso.");
  const day = snapshot.routines
    .find((routine) => routine.id === rid)
    ?.days.find((day) => day.id === did);
  if (!day?.items.length) throw new Error("Agregá ejercicios a este día.");
  snapshot.workout = {
    rid,
    did,
    started: Date.now(),
    index: 0,
    openExercises: [0],
    entries: day.items.map((id) => ({
      id,
      note: "",
      sets: Array.from({ length: 3 }, () => blankSet(metricFor(snapshot, id))),
      ...(day.supersets?.find((group) => group.includes(id))
        ? {
            superset: `${rid}-${did}-superset-${day.supersets.findIndex((group) => group.includes(id))}`,
          }
        : {}),
    })),
  };
}
export const extrasSchema = z.object({
  color: z.string().regex(/^#[a-f0-9]{6}$/i),
  comment: z.string().max(2000),
  photos: z.array(z.string()).max(3),
  bodyWeightStartKg: z.number().positive().nullable(),
  bodyWeightEndKg: z.number().positive().nullable(),
});
export type Extras = z.infer<typeof extrasSchema>;
export function buildSession(
  snapshot: Snapshot,
  entries: Entry[],
  names: { routine: string; day: string },
  date: string,
  extras: Extras,
  manual = false,
): Session {
  extrasSchema.parse(extras);
  if (!Number.isFinite(new Date(date).getTime()))
    throw new Error("Fecha inválida");
  const groupSets = Object.fromEntries(
    Object.keys(muscleImages).map((group) => [group, 0]),
  );
  let volume = 0,
    reps = 0,
    sets = 0;
  const recorded = entries.map((entry) => {
    const metric = metricFor(snapshot, entry.id, entry);
    if (entry.sets.some((set) => set.entered && !(Number(set[metric]) > 0)))
      throw new Error(
        "Completá las repeticiones o segundos de las series ingresadas.",
      );
    const performedSets = entry.sets
      .filter(
        (set) =>
          Number(set[metric]) > 0 &&
          (manual ||
            set.done ||
            set.entered ||
            (!Object.hasOwn(set, "entered") &&
              ((Number(set.kg) || 0) > 0 ||
                Number(set[metric]) !== (metric === "seconds" ? 30 : 10)))),
      )
      .map((set) => ({
        kg: Number(set.kg) || 0,
        [metric]: Number(set[metric]),
      }));
    const exerciseVolume =
      metric === "seconds"
        ? 0
        : performedSets.reduce(
            (sum, set) => sum + (set.kg ?? 0) * (set.reps ?? 0),
            0,
          );
    const quantity = performedSets.reduce(
        (sum, set) => sum + (set.reps ?? 0),
        0,
      ),
      group = findExercise(snapshot, entry.id)?.group ?? "";
    if (muscleGroupSchema.safeParse(group).success)
      groupSets[group] = (groupSets[group] ?? 0) + performedSets.length;
    volume += exerciseVolume;
    reps += quantity;
    sets += performedSets.length;
    return {
      id: entry.id,
      group,
      sets: performedSets.length,
      reps: quantity,
      volume: exerciseVolume,
      performedSets,
      note: entry.note ?? "",
    };
  });
  return {
    id: crypto.randomUUID(),
    date,
    ...names,
    exercises: recorded,
    groupSets,
    volume,
    volumeKg: snapshot.settings.weight === "lb" ? volume / 2.20462 : volume,
    weightUnit: snapshot.settings.weight ?? "kg",
    sets,
    reps,
    duration: null,
    dateOnly: true,
    manual,
    ...extras,
  };
}
export function copySessions(sessions: Session[], date: string): Session[] {
  if (!validDateKey(date)) throw new Error("Fecha inválida");
  return sessions.map((session) => ({
    ...structuredClone(session),
    id: crypto.randomUUID(),
    date: new Date(`${date}T12:00:00`).toISOString(),
    dateOnly: true,
    manual: true,
    duration: null,
    photos: [],
    bodyWeightStartKg: null,
    bodyWeightEndKg: null,
  }));
}
