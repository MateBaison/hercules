import { z } from "zod";

export const calorieInputSchema = z.strictObject({
  formula: z.enum(["male", "female"]),
  age: z.number().int().min(18).max(100),
  heightCm: z.number().min(100).max(250),
  weightKg: z.number().min(25).max(400),
  activity: z.union([
    z.literal(1.2),
    z.literal(1.375),
    z.literal(1.55),
    z.literal(1.725),
    z.literal(1.9),
  ]),
});
export type CalorieInput = z.infer<typeof calorieInputSchema>;
export function calorieMetrics(raw: unknown) {
  const c = calorieInputSchema.parse(raw);
  const bmr =
    10 * c.weightKg +
    6.25 * c.heightCm -
    5 * c.age +
    (c.formula === "male" ? 5 : -161);
  return { bmr: Math.round(bmr), maintenance: Math.round(bmr * c.activity) };
}
export function calorieTargets(maintenance: number) {
  z.number().finite().positive().parse(maintenance);
  return {
    loss: Math.round(maintenance - 300),
    maintenance: Math.round(maintenance),
    gain: Math.round(maintenance + 300),
  };
}
export const macroSplits = {
  balanced: [40, 30, 30],
  protein: [30, 40, 30],
  lowerCarb: [20, 40, 40],
  keto: [5, 25, 70],
} as const;
const macroInputSchema = z.strictObject({
  calories: z.number().min(1000).max(6000),
  meals: z.number().int().min(1).max(8),
  split: z.enum(["balanced", "protein", "lowerCarb", "keto"]),
});
export function macroMetrics(raw: unknown) {
  const m = macroInputSchema.parse(raw);
  const [carbsPct, proteinPct, fatPct] = macroSplits[m.split];
  const daily = {
    carbs: Math.round((m.calories * carbsPct) / 100 / 4),
    protein: Math.round((m.calories * proteinPct) / 100 / 4),
    fat: Math.round((m.calories * fatPct) / 100 / 9),
  };
  return {
    daily,
    percentages: { carbsPct, proteinPct, fatPct },
    perMeal: {
      calories: Math.round(m.calories / m.meals),
      carbs: Math.round(daily.carbs / m.meals),
      protein: Math.round(daily.protein / m.meals),
      fat: Math.round(daily.fat / m.meals),
    },
  };
}
export function oneRepMax(raw: unknown): number {
  const input = z
    .strictObject({
      weight: z.number().positive().max(1000),
      reps: z.number().int().min(1).max(10),
    })
    .parse(raw);
  return input.reps === 1 ? input.weight : input.weight * (1 + input.reps / 30);
}

export type WeightGoalResult =
  | {
      kind: "message";
      reason: "already-at-target" | "low-weight" | "low-intake";
    }
  | {
      kind: "estimate";
      mode: "loss" | "gain";
      fastWeeks: number;
      slowWeeks: number;
      maintenance: number;
      milestones: Array<{
        kg: number;
        fastWeeks: number;
        slowWeeks: number;
        calories: number;
      }>;
    };
export function weightGoal(raw: unknown): WeightGoalResult {
  const { targetKg, ...input } = calorieInputSchema
    .extend({ targetKg: z.number().min(25).max(400) })
    .parse(raw);
  const metrics = calorieMetrics(input),
    difference = targetKg - input.weightKg;
  if (Math.abs(difference) < 0.1)
    return { kind: "message", reason: "already-at-target" };
  const mode = difference < 0 ? "loss" : "gain";
  if (
    mode === "loss" &&
    (input.weightKg / (input.heightCm / 100) ** 2 < 18.5 ||
      targetKg / (input.heightCm / 100) ** 2 < 18.5)
  )
    return { kind: "message", reason: "low-weight" };
  const delta = mode === "loss" ? -300 : 300;
  if (metrics.maintenance + delta < 1200)
    return { kind: "message", reason: "low-intake" };
  const change = Math.abs(difference),
    slowRate = input.weightKg * (mode === "loss" ? 0.0025 : 0.002),
    fastRate = input.weightKg * (mode === "loss" ? 0.005 : 0.004);
  const fastWeeks = Math.max(1, Math.ceil(change / fastRate)),
    slowWeeks = Math.max(1, Math.ceil(change / slowRate));
  return {
    kind: "estimate",
    mode,
    fastWeeks,
    slowWeeks,
    maintenance: metrics.maintenance,
    milestones: [0, 0.25, 0.5, 0.75, 1].map((part) => {
      const kg = input.weightKg + (targetKg - input.weightKg) * part;
      return {
        kg,
        fastWeeks: part === 0 ? 0 : Math.max(1, Math.round(fastWeeks * part)),
        slowWeeks: part === 0 ? 0 : Math.max(1, Math.round(slowWeeks * part)),
        calories:
          Math.round(
            (calorieMetrics({ ...input, weightKg: kg }).maintenance + delta) /
              10,
          ) * 10,
      };
    }),
  };
}
