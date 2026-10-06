import { expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { runInNewContext } from "node:vm";
import rawPools from "../../src/data/legacy/automaticPools.json";
import { exercises } from "../../src/data/exercises";
import { muscleGroups } from "../../src/domain/schemas/exercise";
import { buildAutomaticRoutine } from "../../src/domain/calculations/automatic-routine";
import { routineSchema } from "../../src/domain/schemas/snapshot";

test("typed generator matches the preserved legacy algorithm for all 1,785 combinations", async () => {
  const html = await readFile("migration-baseline/published.html", "utf8");
  const start = html.indexOf(
    "function buildAutomaticRoutine(groups,dayCount){",
  );
  const end = html.indexOf("function cryptoRoutineId()", start);
  if (start < 0 || end < 0)
    throw new Error("Legacy generator boundaries changed");
  const source = html.slice(start, end);
  const catalog = new Map(exercises.map((exercise) => [exercise.id, exercise]));
  for (let mask = 1; mask < 256; mask++) {
    const groups = muscleGroups.filter(
      (_, index) => (mask & (1 << index)) !== 0,
    );
    for (let days = 1; days <= 7; days++) {
      const legacy: unknown = runInNewContext(
        `${source}\nJSON.stringify(buildAutomaticRoutine(input.groups,input.days))`,
        {
          input: { groups, days },
          GROUPS: Object.fromEntries(muscleGroups.map((group) => [group, []])),
          AUTO_ROUTINE_EXERCISES: rawPools,
          byId: (id: string) => catalog.get(id),
          cryptoRoutineId: () => "test",
          txt: (spanish: string) => spanish,
        },
        { timeout: 1000 },
      );
      if (typeof legacy !== "string") throw new Error("Invalid legacy result");
      const modern = buildAutomaticRoutine(
        { groups, days },
        { makeId: () => "test", language: "es" },
      );
      expect(modern).toEqual(
        routineSchema.parse(JSON.parse(legacy) as unknown),
      );
    }
  }
});
