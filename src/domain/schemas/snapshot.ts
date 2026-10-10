import { z } from "zod";
import { muscleGroupSchema, trackingSchema } from "./exercise";

const id = z.string().min(1);
const nonnegative = z.number().finite().nonnegative();
const optionalValue = nonnegative.nullable().optional();

// Tolerant persisted-data readers: never strip metadata or retired exercise IDs.
export const savedSetSchema = z.looseObject({
  type: z.string().optional(),
  kg: optionalValue,
  reps: optionalValue,
  seconds: optionalValue,
  entered: z.boolean().optional(),
  done: z.boolean().optional(),
});
export const routineDaySchema = z.looseObject({
  id,
  name: z.string(),
  items: z.array(id),
  supersets: z.array(z.array(id)).optional(),
});
export const routineSchema = z.looseObject({
  id,
  name: z.string(),
  goal: z.string().optional(),
  days: z.array(routineDaySchema),
});
export const workoutEntrySchema = z.looseObject({
  id,
  note: z.string().optional(),
  sets: z.array(savedSetSchema),
  superset: z.string().optional(),
});
export const workoutSchema = z.looseObject({
  rid: id,
  did: id,
  started: nonnegative,
  index: nonnegative.int(),
  entries: z.array(workoutEntrySchema),
  openExercises: z.array(nonnegative.int()).optional(),
});
const historicalExerciseSchema = z.looseObject({
  id,
  group: z.string().optional(),
  sets: nonnegative.optional(),
  reps: nonnegative.optional(),
  volume: nonnegative.optional(),
  performedSets: z.array(savedSetSchema).optional(),
  note: z.string().optional(),
});
export const sessionSchema = z.looseObject({
  id,
  date: z.string().min(1),
  routine: z.string(),
  day: z.string(),
  // Older sessions contain totals but not individual sets; keep both formats.
  exercises: z.array(historicalExerciseSchema).optional(),
  weightUnit: z.enum(["kg", "lb"]).optional(),
  volume: nonnegative.optional(),
  volumeKg: nonnegative.optional(),
  sets: nonnegative.optional(),
  reps: nonnegative.optional(),
  duration: nonnegative.nullable().optional(),
  color: z.string().optional(),
  comment: z.string().optional(),
  rating: z.string().optional(),
  photos: z.array(z.string()).optional(),
  bodyWeightStartKg: optionalValue,
  bodyWeightEndKg: optionalValue,
});
export const profileSchema = z.looseObject({
  name: z.string().optional(),
  email: z.string().optional(),
  birth: z.string().optional(),
  country: z.string().optional(),
  gender: z.string().optional(),
  menstrualCalendar: z
    .looseObject({
      enabled: z.boolean().optional(),
      dates: z.array(z.string()).optional(),
    })
    .optional(),
  photo: z.string().optional(),
  // Some historical profile forms persisted strings. Do not coerce or lose originals.
  weight: z.union([nonnegative, z.string()]).optional(),
  height: z.union([nonnegative, z.string()]).optional(),
  onboardingComplete: z.boolean().optional(),
  instagram: z.string().optional(),
  snapchat: z.string().optional(),
});
export const settingsSchema = z.looseObject({
  weight: z.enum(["kg", "lb"]).optional(),
  height: z.enum(["cm", "ft"]).optional(),
  distance: z.enum(["km", "mi"]).optional(),
  language: z.string().optional(),
  restEnabled: z.boolean().optional(),
  restSeconds: nonnegative.optional(),
  workoutLayout: z.enum(["individual", "list"]).optional(),
});
const savedCustomExerciseSchema = z.looseObject({
  id,
  name: z.string(),
  group: z.string(),
  equipment: z.string(),
  tracking: trackingSchema.optional(),
  custom: z.boolean().optional(),
  steps: z.array(z.string()).optional(),
});
export const trackingPointSchema = z.looseObject({
  lat: z.number().finite().min(-90).max(90),
  lon: z.number().finite().min(-180).max(180),
  time: nonnegative,
  speed: z.number().finite(),
});
export const trackingSessionSchema = z.looseObject({
  id,
  date: z.string().min(1),
  mode: z.enum(["run", "cycle"]),
  durationSeconds: nonnegative,
  distanceMeters: nonnegative,
  points: z.array(trackingPointSchema),
});
export type TrackingSession = z.infer<typeof trackingSessionSchema>;
export const snapshotSchema = z.looseObject({
  routines: z.array(routineSchema),
  selected: z.string().nullable(),
  sessions: z.array(sessionSchema),
  trackingSessions: z.array(trackingSessionSchema).optional(),
  workout: workoutSchema.nullable(),
  profile: profileSchema,
  settings: settingsSchema,
  favorites: z.array(id),
  customExercises: z.array(savedCustomExerciseSchema),
});
export const legacySnapshotSchema = snapshotSchema.partial();
export type Snapshot = z.infer<typeof snapshotSchema>;
export type SavedSet = z.infer<typeof savedSetSchema>;
export type Routine = z.infer<typeof routineSchema>;

export const routineEditSchema = routineSchema.superRefine(
  (routine, context) => {
    const dayIds = new Set<string>();
    routine.days.forEach((day, dayIndex) => {
      if (dayIds.has(day.id))
        context.addIssue({
          code: "custom",
          path: ["days", dayIndex, "id"],
          message: "Duplicate day ID",
        });
      dayIds.add(day.id);
      const grouped = new Set<string>();
      day.supersets?.forEach((superset, groupIndex) => {
        const path = ["days", dayIndex, "supersets", groupIndex];
        if (superset.length < 2 || new Set(superset).size !== superset.length)
          context.addIssue({
            code: "custom",
            path,
            message: "A superset needs at least two distinct exercises",
          });
        for (const exerciseId of superset) {
          if (!day.items.includes(exerciseId) || grouped.has(exerciseId))
            context.addIssue({
              code: "custom",
              path,
              message: "Superset membership is missing or duplicated",
            });
          grouped.add(exerciseId);
        }
      });
    });
  },
);

// New external inputs are stricter than the historical reader.
export const customExerciseFormSchema = z.strictObject({
  id: z.string().regex(/^custom-[a-zA-Z0-9-]{4,100}$/),
  name: z.string().trim().min(1).max(100),
  group: muscleGroupSchema,
  equipment: z.enum([
    "Barra",
    "Mancuernas",
    "Polea",
    "Máquina",
    "Peso corporal",
    "Otros",
  ]),
  tracking: trackingSchema,
  steps: z.array(z.string().max(1000)).max(10),
});
export const setInputSchema = z.discriminatedUnion("metric", [
  z.strictObject({
    metric: z.literal("reps"),
    kg: nonnegative.nullable(),
    reps: nonnegative.int().nullable(),
  }),
  z.strictObject({
    metric: z.literal("seconds"),
    kg: nonnegative.nullable(),
    seconds: nonnegative.int().nullable(),
  }),
]);
