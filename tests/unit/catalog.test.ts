import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import {
  exercises,
  exerciseImage,
  imageVariants,
  matchesEquipment,
  muscleImages,
  normalizeSearch,
} from "../../src/data/exercises";
import { muscleGroups } from "../../src/domain/schemas/exercise";
import retired from "../../src/data/legacy/retired.json";
import legacyExercises from "../../src/data/legacy/exercises.json";

describe("Phase 1 catalog/asset parity", () => {
  test("retains all 136 IDs, eight groups and no retired catalog entries", () => {
    expect(exercises).toHaveLength(139);
    expect(new Set(exercises.map((exercise) => exercise.id)).size).toBe(139);
    expect(JSON.stringify(exercises.slice(0, 136))).toBe(
      JSON.stringify(legacyExercises),
    );
    expect(new Set(exercises.map((exercise) => exercise.group))).toEqual(
      new Set(muscleGroups),
    );
    expect(exercises.some((exercise) => retired.includes(exercise.id))).toBe(
      false,
    );
  });
  test("every catalog, muscle and variant path exists with valid image bytes", async () => {
    const paths = new Set([
      ...exercises.map((exercise) => exercise.image),
      ...Object.values(muscleImages),
      ...Object.values(imageVariants).flatMap(Object.values),
    ]);
    for (const path of paths) {
      const bytes = await readFile(`public/assets/${path}`);
      if (path.endsWith(".svg")) expect(bytes.toString()).toContain("<svg");
      else expect(bytes.subarray(0, 2).toString("hex")).toBe("ffd8");
    }
  });
  test("preserves both sex-specific variants and neutral fallback", () => {
    const exercise = exercises.find(
      (item) => item.id === "extension-de-triceps-con-polea-trasnuca",
    );
    if (!exercise) throw new Error("Missing canonical exercise");
    expect(exerciseImage(exercise, "hombre")).toContain("maniqui-v2.jpg");
    expect(exerciseImage(exercise, "mujer")).toContain("femenino-v1.jpg");
    expect(exerciseImage(exercise, "no_decirlo")).toBe(
      `/assets/${exercise.image}`,
    );
    expect(Object.keys(imageVariants)).toHaveLength(17);
  });
  test("static holds use seconds, dynamic planks and presses use reps", () => {
    for (const id of [
      "plancha-lateral",
      "lumbares-superman",
      "lumbares-cruzados",
    ]) {
      const exercise = exercises.find((item) => item.id === id)!;
      expect(exercise.tracking).toBe(
        id === "plancha-lateral" ? "seconds" : "reps",
      );
      expect(exerciseImage(exercise, "hombre")).toContain(
        `${id}-masculino.jpg`,
      );
      expect(exerciseImage(exercise, "mujer")).toContain(`${id}-femenino.jpg`);
    }
    expect(
      exercises.find((exercise) => exercise.id === "plancha")?.tracking,
    ).toBe("seconds");
    expect(
      exercises.find((exercise) => exercise.id === "plancha-con-flexion")
        ?.tracking,
    ).toBe("reps");
    expect(
      exercises.find((exercise) => exercise.id === "press-militar")?.tracking,
    ).toBe("reps");
  });
  test("search ignores accents; bar T is included under bar", () => {
    expect(normalizeSearch("  TrÍceps ")).toBe("triceps");
    const row = exercises.find((exercise) => exercise.id === "remo-en-barra-t");
    if (!row) throw new Error("Missing row");
    expect(matchesEquipment(row, "Barra")).toBe(true);
    expect(matchesEquipment(row, "Mancuernas")).toBe(false);
  });
});
