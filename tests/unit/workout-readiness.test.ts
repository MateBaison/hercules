import { expect, test } from "bun:test";
import { workoutReadinessAdvice } from "../../src/domain/workout-readiness";
test("readiness prioritizes severe pain and adapts to today's reported wellbeing", () => {
  for (const pain of ["none", "mild", "strong"] as const)
    for (const energy of ["good", "low"] as const)
      for (const sleep of ["good", "poor"] as const) {
        expect(workoutReadinessAdvice({ pain, energy, sleep })).toBe(
          pain === "strong"
            ? "rest"
            : pain === "mild" || energy === "low" || sleep === "poor"
              ? "lighter"
              : "usual",
        );
      }
});
