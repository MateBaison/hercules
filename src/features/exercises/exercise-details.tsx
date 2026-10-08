"use client";
import { useEffect, useRef } from "react";
import { Star } from "lucide-react";
import { useApp } from "@/state/app-provider";
import type { CatalogExercise } from "@/domain/workouts";
import { Button } from "@/components/ui/button";
import { AppDialog } from "@/components/ui/app-dialog";
import { ExerciseVisual } from "./exercise-visual";
export function ExerciseDetails({
  exercise,
  onClose,
  previous,
  next,
  onSelect,
  onAdd,
}: {
  exercise: CatalogExercise | null;
  onClose: () => void;
  previous?: CatalogExercise;
  next?: CatalogExercise;
  onSelect?: (exercise: CatalogExercise) => void;
  onAdd?: () => void;
}) {
  const { snapshot, change, t } = useApp(),
    ref = useRef({ previous, next, onSelect });
  ref.current = { previous, next, onSelect };
  useEffect(() => {
    if (!exercise) return;
    const keys = (event: KeyboardEvent) => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      const choice =
        event.key === "ArrowLeft" ? ref.current.previous : ref.current.next;
      if (choice && ref.current.onSelect) {
        event.preventDefault();
        ref.current.onSelect(choice);
      }
    };
    window.addEventListener("keydown", keys, true);
    return () => window.removeEventListener("keydown", keys, true);
  }, [exercise]);
  return (
    <AppDialog
      open={exercise !== null}
      onClose={onClose}
      title={exercise?.name ?? ""}
      description={exercise ? `${exercise.group} · ${exercise.equipment}` : ""}
    >
      {exercise && (
        <>
          <ExerciseVisual exercise={exercise} large />
          <h3 className="font-bold">{t("Técnica", "Technique")}</h3>
          <ol className="list-decimal space-y-3 pl-5 text-muted-foreground">
            {exercise.steps.map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
          <div className="flex justify-center gap-3">
            <Button
              variant="secondary"
              disabled={!previous}
              onClick={() => {
                if (previous) onSelect?.(previous);
              }}
            >
              {t("Anterior", "Previous")}
            </Button>
            <Button
              variant="ghost"
              aria-label={t("Favorito", "Favorite")}
              aria-pressed={snapshot.favorites.includes(exercise.id)}
              onClick={() =>
                change((draft) => {
                  draft.favorites = draft.favorites.includes(exercise.id)
                    ? draft.favorites.filter((id) => id !== exercise.id)
                    : [...draft.favorites, exercise.id];
                })
              }
            >
              <Star
                className={
                  snapshot.favorites.includes(exercise.id)
                    ? "favorite-star active"
                    : "favorite-star"
                }
              />
            </Button>
            <Button
              variant="secondary"
              disabled={!next}
              onClick={() => {
                if (next) onSelect?.(next);
              }}
            >
              {t("Siguiente", "Next")}
            </Button>
          </div>
          {onAdd && (
            <Button onClick={onAdd}>
              {t("Agregar a rutina", "Add to routine")}
            </Button>
          )}
        </>
      )}
    </AppDialog>
  );
}
