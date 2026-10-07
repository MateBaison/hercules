export type WorkoutReadiness = {
  pain: "none" | "mild" | "strong";
  energy: "good" | "low";
  sleep: "good" | "poor";
};
export function workoutReadinessAdvice(
  value: WorkoutReadiness,
): "usual" | "lighter" | "rest" {
  if (value.pain === "strong") return "rest";
  if (value.pain === "mild" || value.energy === "low" || value.sleep === "poor")
    return "lighter";
  return "usual";
}
