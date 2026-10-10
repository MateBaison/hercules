import { z } from "zod";
import rawExercises from "./legacy/exercises.json";
import rawMuscles from "./legacy/muscleImages.json";
import rawVariants from "./legacy/imageVariants.json";
import additions from "./additional-exercises.json";
import additionalVariants from "./additional-image-variants.json";
import {
  assetPathSchema,
  exerciseSchema,
  muscleGroupSchema,
  type Exercise,
} from "@/domain/schemas/exercise";

// Preserve the captured catalog and append new exercises without changing historical IDs.
export const exercises: ReadonlyArray<Exercise> = z
  .array(exerciseSchema)
  .parse([...rawExercises, ...additions]);
export const muscleImages = z
  .record(muscleGroupSchema, assetPathSchema)
  .parse(rawMuscles);
export const imageVariants = z
  .record(z.string(), z.record(z.string(), assetPathSchema))
  .parse({ ...rawVariants, ...additionalVariants });

export function exerciseImage(exercise: Exercise, gender?: string): string {
  const variant = gender ? imageVariants[exercise.id]?.[gender] : undefined;
  return `/assets/${variant ?? exercise.image}`;
}
export const equipmentFilters = [
  "Todos",
  "Barra",
  "Mancuernas",
  "Polea",
  "Máquina",
  "Peso corporal",
  "Otros",
] as const;
export type EquipmentFilter = (typeof equipmentFilters)[number];
export function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}
export function matchesEquipment(
  exercise: Exercise,
  equipment: EquipmentFilter,
): boolean {
  if (equipment === "Todos") return true;
  if (equipment === "Barra")
    return exercise.equipment === "Barra" || exercise.equipment === "Barra T";
  if (equipment === "Otros")
    return ![
      "Barra",
      "Barra T",
      "Mancuernas",
      "Polea",
      "Máquina",
      "Peso corporal",
    ].includes(exercise.equipment);
  return exercise.equipment === equipment;
}
