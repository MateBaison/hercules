import { z } from "zod";
import { exercises } from "@/data/exercises";
import {
  customExerciseFormSchema,
  routineEditSchema,
  type Snapshot,
  type Routine,
} from "./schemas/snapshot";
const sharedCustom = customExerciseFormSchema.extend({
  custom: z.boolean().optional(),
  pattern: z.string().optional(),
  level: z.string().optional(),
});
const sharedSchema = z.object({
  v: z.literal(1),
  name: z.string().trim().min(1).max(100),
  goal: z.string().max(200).default(""),
  customExercises: z.array(sharedCustom).max(100).default([]),
  days: z
    .array(
      z.object({
        name: z.string().max(100),
        items: z.array(z.string()).max(100),
        supersets: z.array(z.array(z.string()).min(2)).max(50).default([]),
      }),
    )
    .min(1)
    .max(31),
});
export function encodeRoutine(snapshot: Snapshot, routine: Routine): string {
  const ids = new Set(routine.days.flatMap((day) => day.items));
  const raw = {
    v: 1,
    name: routine.name,
    goal: routine.goal ?? "",
    customExercises: snapshot.customExercises
      .filter((exercise) => ids.has(exercise.id))
      .map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        group: exercise.group,
        equipment: exercise.equipment,
        tracking: exercise.tracking ?? "reps",
        steps: exercise.steps ?? [],
        custom: true,
      })),
    days: routine.days.map((day) => ({
      name: day.name,
      items: day.items,
      supersets: day.supersets ?? [],
    })),
  };
  sharedSchema.parse(raw);
  const bytes = new TextEncoder().encode(JSON.stringify(raw));
  const token = btoa(
    Array.from(bytes, (byte) => String.fromCharCode(byte)).join(""),
  )
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
  if (token.length > 50_000)
    throw new Error("Rutina demasiado grande para compartir por enlace.");
  return token;
}
export function decodeRoutine(token: string) {
  z.string()
    .min(1)
    .max(50_000)
    .regex(/^[A-Za-z0-9_-]+$/)
    .parse(token);
  const raw: unknown = JSON.parse(
    new TextDecoder("utf-8", { fatal: true }).decode(
      Uint8Array.from(
        atob(token.replaceAll("-", "+").replaceAll("_", "/")),
        (char) => char.charCodeAt(0),
      ),
    ),
  );
  const parsed = sharedSchema.parse(raw),
    customIds = new Set(parsed.customExercises.map((exercise) => exercise.id));
  if (
    customIds.size !== parsed.customExercises.length ||
    !parsed.days.some((day) => day.items.length)
  )
    throw new Error("Rutina inválida");
  const known = new Set([
    ...exercises.map((exercise) => exercise.id),
    ...customIds,
  ]);
  if (parsed.days.some((day) => day.items.some((id) => !known.has(id))))
    throw new Error("Ejercicio no disponible");
  routineEditSchema.parse({
    id: "shared",
    name: parsed.name,
    days: parsed.days.map((day, index) => ({ ...day, id: `day-${index}` })),
  });
  return parsed;
}
export function importRoutine(snapshot: Snapshot, token: string): void {
  const shared = decodeRoutine(token),
    mapping = new Map(
      shared.customExercises.map((exercise) => [
        exercise.id,
        "custom-" + crypto.randomUUID(),
      ]),
    );
  snapshot.customExercises.push(
    ...shared.customExercises.map((exercise) => ({
      ...exercise,
      id: mapping.get(exercise.id) ?? exercise.id,
      custom: true,
    })),
  );
  const routine = {
    id: crypto.randomUUID(),
    name: shared.name,
    goal: shared.goal,
    days: shared.days.map((day) => ({
      ...day,
      id: crypto.randomUUID(),
      items: day.items.map((id) => mapping.get(id) ?? id),
      supersets: day.supersets.map((group) =>
        group.map((id) => mapping.get(id) ?? id),
      ),
    })),
  };
  snapshot.routines.push(routine);
  snapshot.selected = routine.id;
}
