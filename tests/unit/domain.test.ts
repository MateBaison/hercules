import { describe, expect, test } from "bun:test";
import {
  calorieMetrics,
  calorieTargets,
  macroMetrics,
  oneRepMax,
  weightGoal,
} from "../../src/domain/calculations/calculators";
import { buildAutomaticRoutine } from "../../src/domain/calculations/automatic-routine";
import { exercises } from "../../src/data/exercises";
import { muscleGroups } from "../../src/domain/schemas/exercise";
import { translate, textDirection } from "../../src/data/translations";

const inputs = {
  formula: "male",
  age: 30,
  heightCm: 175,
  weightKg: 75,
  activity: 1.55,
};
describe("Phase 2 domain parity", () => {
  test("calories and all three targets match legacy golden values", () => {
    expect(calorieMetrics(inputs)).toEqual({ bmr: 1699, maintenance: 2633 });
    expect(calorieTargets(2633)).toEqual({
      loss: 2333,
      maintenance: 2633,
      gain: 2933,
    });
    expect(calorieMetrics({ ...inputs, formula: "female" })).toEqual({
      bmr: 1533,
      maintenance: 2376,
    });
    expect(() => calorieMetrics({ ...inputs, age: 15 })).toThrow();
  });
  test("macros retain daily/per-meal rounding; 1RM retains Epley and one-rep exception", () => {
    const macros = macroMetrics({
      calories: 2100,
      meals: 3,
      split: "balanced",
    });
    expect(macros.daily).toEqual({ carbs: 210, protein: 158, fat: 70 });
    expect(macros.perMeal).toEqual({
      calories: 700,
      carbs: 70,
      protein: 53,
      fat: 23,
    });
    expect(oneRepMax({ weight: 100, reps: 5 })).toBeCloseTo(116.6666667);
    expect(oneRepMax({ weight: 100, reps: 1 })).toBe(100);
    expect(() => oneRepMax({ weight: 100, reps: 11 })).toThrow();
  });
  test("weight goal matches legacy range, milestones and safety messages", () => {
    const result = weightGoal({ ...inputs, targetKg: 70 });
    if (result.kind !== "estimate") throw new Error("Missing estimate");
    expect([result.fastWeeks, result.slowWeeks]).toEqual([14, 27]);
    expect(result.milestones[0]?.calories).toBe(2330);
    expect(result.milestones.at(-1)?.kg).toBe(70);
    expect(weightGoal({ ...inputs, targetKg: 75 })).toEqual({
      kind: "message",
      reason: "already-at-target",
    });
    expect(weightGoal({ ...inputs, targetKg: 50 })).toEqual({
      kind: "message",
      reason: "low-weight",
    });
  });
  test("all 255 nonempty group selections work for 1–7 days with canonical IDs", () => {
    const known = new Map(exercises.map((exercise) => [exercise.id, exercise]));
    for (let mask = 1; mask < 256; mask++) {
      const groups = muscleGroups.filter(
        (_, index) => (mask & (1 << index)) !== 0,
      );
      for (let days = 1; days <= 7; days++) {
        const routine = buildAutomaticRoutine(
          { groups, days },
          { makeId: () => "test", language: "es" },
        );
        expect(routine.days).toHaveLength(days);
        const covered = new Set(
          routine.days.flatMap((day) =>
            day.items.map((id) => known.get(id)?.group),
          ),
        );
        expect(covered).toEqual(new Set(groups));
        expect(
          routine.days.every(
            (day) =>
              day.items.length > 0 &&
              new Set(day.items).size === day.items.length,
          ),
        ).toBe(true);
      }
    }
  });
  test("generation rejects empty/invalid requests and preserves explicit ID injection", () => {
    const options = { makeId: () => "fixed", language: "en" };
    expect(() =>
      buildAutomaticRoutine({ groups: [], days: 2 }, options),
    ).toThrow();
    expect(() =>
      buildAutomaticRoutine({ groups: ["Piernas"], days: 8 }, options),
    ).toThrow();
    const routine = buildAutomaticRoutine(
      { groups: ["Gemelos"], days: 2 },
      options,
    );
    expect(routine.id).toBe("rfixed");
    expect(routine.days[0]?.items).toEqual([
      "elevacion-de-gemelos-de-pie",
      "elevacion-de-gemelos-sentado",
    ]);
    expect(routine.days[1]?.items).toEqual([
      "elevacion-de-gemelos-sentado",
      "elevacion-de-gemelos-de-pie",
    ]);
    expect(routine.name).toBe("Automatic routine · 2 days");
  });
  test("translations keep original fallbacks and Arabic direction", () => {
    expect(translate("es", "Filtrar por equipo", "Filter equipment")).toBe(
      "Filtrar por equipo",
    );
    expect(translate("de", "Filtrar por equipo", "Filter equipment")).toBe(
      "Nach Gerät filtern",
    );
    expect(translate("unrecognized", "No disponible", "Fallback")).toBe(
      "Fallback",
    );
    expect(textDirection("ar")).toBe("rtl");
    expect(textDirection("pt")).toBe("ltr");
  });
});
