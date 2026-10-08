"use client";
import { useState } from "react";
import { Star } from "lucide-react";
import { useApp } from "@/state/app-provider";
import { catalogFor } from "@/domain/workouts";
import { muscleGroups, type MuscleGroup } from "@/domain/schemas/exercise";
import { normalizeSearch, muscleImages } from "@/data/exercises";
import { AppDialog } from "@/components/ui/app-dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ExerciseVisual } from "./exercise-visual";
export function ExercisePicker({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (ids: string[]) => void;
}) {
  const { snapshot, change, t } = useApp();
  const [group, setGroup] = useState<MuscleGroup | "Favoritos" | null>(null),
    [query, setQuery] = useState(""),
    [selected, setSelected] = useState<string[]>([]);
  const list = catalogFor(snapshot).filter(
    (exercise) =>
      (group === "Favoritos"
        ? snapshot.favorites.includes(exercise.id)
        : exercise.group === group) &&
      normalizeSearch(exercise.name + exercise.equipment).includes(
        normalizeSearch(query),
      ),
  );
  return (
    <AppDialog
      open
      onClose={onClose}
      title={t("Agregar ejercicios", "Add exercises")}
      description="Elegí varios ejercicios y confirmá juntos."
    >
      {!group ? (
        <div className="exercise-grid">
          {(["Favoritos", ...muscleGroups] as const).map((muscle) => (
            <button
              type="button"
              className="exercise-card"
              aria-label={muscle}
              key={muscle}
              onClick={() => setGroup(muscle)}
            >
              {muscle === "Favoritos" ? (
                <Star className="mx-auto my-6 size-16 text-yellow-300" />
              ) : (
                <img
                  className="picker-muscle-image"
                  src={`/assets/${muscleImages[muscle]}`}
                  alt={muscle}
                />
              )}
              <h2>{muscle}</h2>
            </button>
          ))}
        </div>
      ) : (
        <>
          <Button
            variant="secondary"
            onClick={() => {
              setGroup(null);
              setQuery("");
            }}
          >
            ← {t("Zonas musculares", "Muscle groups")}
          </Button>
          <Input
            aria-label={t("Buscar ejercicio", "Search exercise")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("Buscar…", "Search…")}
          />
          <div className="space-y-2">
            {list.map((exercise) => (
              <div className="picker-row" key={exercise.id}>
                <div className="picker-thumb">
                  <ExerciseVisual exercise={exercise} />
                </div>
                <div className="min-w-0 flex-1">
                  <strong>{exercise.name}</strong>
                  <small className="block text-muted-foreground">
                    {exercise.equipment}
                  </small>
                </div>
                <Button
                  variant="ghost"
                  aria-label={`Favorito ${exercise.name}`}
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
                <input
                  type="checkbox"
                  aria-label={`Seleccionar ${exercise.name}`}
                  checked={selected.includes(exercise.id)}
                  onChange={() =>
                    setSelected((previous) =>
                      previous.includes(exercise.id)
                        ? previous.filter((id) => id !== exercise.id)
                        : [...previous, exercise.id],
                    )
                  }
                />
              </div>
            ))}
          </div>
        </>
      )}
      <Button disabled={!selected.length} onClick={() => onPick(selected)}>
        {t("Agregar seleccionados", "Add selected")} ({selected.length})
      </Button>
    </AppDialog>
  );
}
