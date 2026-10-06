import { z } from "zod";

export const muscleGroups = [
  "Pectorales",
  "Espalda",
  "Hombros",
  "Bíceps",
  "Tríceps",
  "Abdominales",
  "Piernas",
  "Gemelos",
] as const;
export const muscleGroupSchema = z.enum(muscleGroups);
export type MuscleGroup = z.infer<typeof muscleGroupSchema>;
export const trackingSchema = z.enum(["reps", "seconds"]);
export const assetPathSchema = z
  .string()
  .min(1)
  .refine(
    (value) =>
      !value.startsWith("/") &&
      !value.includes("..") &&
      !value.includes(":") &&
      !value.includes("\\"),
    "Expected a relative asset path",
  );
export const exerciseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  group: muscleGroupSchema,
  equipment: z.string().min(1),
  pattern: z.string().min(1),
  level: z.string().min(1),
  steps: z.array(z.string()),
  image: assetPathSchema,
  tracking: trackingSchema,
});
export type Exercise = z.infer<typeof exerciseSchema>;
