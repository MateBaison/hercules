import { expect, test } from "bun:test";
import { Glob } from "bun";
import { readFileSync } from "node:fs";
import { translate } from "../../src/data/translations";
import legacy from "../../src/data/legacy/translations.json";
import additions from "../../src/data/ui-translations.json";

test("literal translated UI messages have entries in every additional language", () => {
  const keys = new Set<string>();
  for (const path of new Glob("src/**/*.tsx").scanSync()) {
    for (const match of readFileSync(path, "utf8").matchAll(
      /\bt\(\s*"([^"\n]+)"/g,
    ))
      keys.add(match[1]!);
  }
  const original: Record<string, Record<string, string>> = legacy;
  const added: Record<string, Record<string, string>> = additions;
  for (const language of ["fr", "zh", "hi", "ar", "de", "it", "pt"]) {
    const missing = [...keys].filter(
      (key) => !original[language]?.[key] && !added[language]?.[key],
    );
    expect(missing).toEqual([]);
  }
  expect(translate("en", "Objetivo de peso", "Objetivo de peso")).toBe(
    "Weight goal",
  );
  expect(translate("ar", "Resumen semanal", "Weekly summary")).toBe(
    "ملخص أسبوعي",
  );
});
