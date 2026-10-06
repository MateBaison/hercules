"use client";
import { exerciseImage } from "@/data/exercises";
import { useApp } from "@/state/app-provider";
import type { CatalogExercise } from "@/domain/workouts";
export function ExerciseVisual({
  exercise,
  large = false,
}: {
  exercise: CatalogExercise;
  large?: boolean;
}) {
  const { snapshot } = useApp();
  if (exercise.custom)
    return (
      <div className="custom-visual" aria-label="Ejercicio personalizado">
        ＋
        <small>
          Personalizado ·{" "}
          {exercise.tracking === "seconds" ? "Segundos" : "Repeticiones"}
        </small>
      </div>
    );
  return (
    <img
      src={exerciseImage(exercise, snapshot.profile.gender)}
      alt={`Inicio y final de ${exercise.name}`}
      className={`exercise-image ${large ? "large-exercise-image" : ""}`}
      loading="lazy"
    />
  );
}
