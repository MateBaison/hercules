"use client";
import { useMemo, useRef, useState } from "react";
import { useApp } from "@/state/app-provider";
import { catalogFor, type CatalogExercise } from "@/domain/workouts";
import { muscleGroups, type MuscleGroup } from "@/domain/schemas/exercise";
import { customExerciseFormSchema } from "@/domain/schemas/snapshot";
import {
  equipmentFilters,
  matchesEquipment,
  muscleImages,
  normalizeSearch,
  type EquipmentFilter,
} from "@/data/exercises";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppDialog } from "@/components/ui/app-dialog";
import { ExerciseVisual } from "./exercise-visual";
import { ExerciseDetails } from "./exercise-details";
export function ExerciseLibrary() {
  const { snapshot, change, notify, t } = useApp();
  const [group, setGroup] = useState<MuscleGroup | "Todos" | "Favoritos">(
      "Todos",
    ),
    [query, setQuery] = useState(""),
    [equipment, setEquipment] = useState<EquipmentFilter>("Todos"),
    [selected, setSelected] = useState<CatalogExercise | null>(null),
    [custom, setCustom] = useState(false),
    [addId, setAddId] = useState<string | null>(null);
  const filterMenu = useRef<HTMLDetailsElement>(null);
  const filtered = useMemo(
    () =>
      catalogFor(snapshot).filter(
        (exercise) =>
          (group === "Todos" ||
            (group === "Favoritos"
              ? snapshot.favorites.includes(exercise.id)
              : exercise.group === group)) &&
          matchesEquipment(exercise, equipment) &&
          normalizeSearch(exercise.name + " " + exercise.equipment).includes(
            normalizeSearch(query),
          ),
      ),
    [snapshot, group, equipment, query],
  );
  const index = filtered.findIndex((exercise) => exercise.id === selected?.id);
  return (
    <>
      <div className="library-controls">
        <label
          htmlFor="exercise-search"
          className="mb-2 block text-sm text-muted-foreground"
        >
          {t("Buscar ejercicios", "Search exercises")}
        </label>
        <Input
          id="exercise-search"
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t(
            "Buscar ejercicio o equipo…",
            "Search exercise or equipment…",
          )}
        />
        <div
          className="muscle-chips"
          role="group"
          aria-label={t("Zonas musculares", "Muscle groups")}
        >
          {(["Todos", "Favoritos", ...muscleGroups] as const).map((muscle) => (
            <button
              type="button"
              key={muscle}
              aria-pressed={group === muscle}
              onClick={() => setGroup(muscle)}
            >
              {muscle === "Favoritos" ? "★ " : ""}
              {t(
                muscle,
                muscle === "Todos"
                  ? "All"
                  : muscle === "Favoritos"
                    ? "Favorites"
                    : muscle,
              )}
            </button>
          ))}
        </div>
      </div>
      {group !== "Todos" && group !== "Favoritos" && (
        <section className="muscle-summary">
          <img
            src={`/assets/${muscleImages[group]}`}
            alt={`${group}: zona muscular resaltada`}
          />
          <div>
            <span className="eyebrow">
              {t("Zona principal", "Primary area")}
            </span>
            <h2 className="text-xl font-bold">{group}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t(
                "El naranja señala el grupo elegido.",
                "Orange marks the selected muscle group.",
              )}
            </p>
          </div>
        </section>
      )}
      <div className="exercise-results">
        <details ref={filterMenu}>
          <summary>
            {t("Filtrar", "Filter")}
            {equipment !== "Todos" ? ` · ${equipment}` : ""}
          </summary>
          <div
            className="equipment-menu"
            role="group"
            aria-label={t("Equipo", "Equipment")}
          >
            {equipmentFilters.map((filter) => (
              <button
                type="button"
                key={filter}
                aria-pressed={equipment === filter}
                onClick={() => {
                  setEquipment(filter);
                  if (filterMenu.current) filterMenu.current.open = false;
                }}
              >
                {filter}
              </button>
            ))}
          </div>
        </details>
        <p role="status" className="text-sm text-muted-foreground">
          {filtered.length} {t("ejercicios", "exercises")}
        </p>
        <Button
          variant="secondary"
          className="library-create"
          onClick={() => setCustom(true)}
        >
          ＋ {t("Crear ejercicio", "Create exercise")}
        </Button>
      </div>
      <div className="exercise-grid">
        {filtered.map((exercise) => (
          <button
            type="button"
            key={exercise.id}
            className="exercise-card"
            onClick={() => setSelected(exercise)}
            aria-label={`Ver ${exercise.name}`}
          >
            <ExerciseVisual exercise={exercise} />
            <h2>{exercise.name}</h2>
            <p>
              {exercise.group} · {exercise.equipment}
            </p>
          </button>
        ))}
      </div>
      {!filtered.length && (
        <p className="py-10 text-center text-muted-foreground">
          {t(
            "No encontramos ejercicios con estos filtros.",
            "No exercises match these filters.",
          )}
        </p>
      )}
      <ExerciseDetails
        exercise={selected}
        onClose={() => setSelected(null)}
        previous={filtered[index - 1]}
        next={filtered[index + 1]}
        onSelect={setSelected}
        onAdd={() => {
          setAddId(selected?.id ?? null);
          setSelected(null);
        }}
      />
      <AppDialog
        open={addId !== null}
        onClose={() => setAddId(null)}
        title={t("Elegir día", "Choose day")}
      >
        <div className="space-y-2">
          {snapshot.routines.flatMap((routine) =>
            routine.days.map((day) => (
              <Button
                key={day.id}
                variant="secondary"
                className="w-full"
                onClick={() => {
                  if (
                    addId &&
                    change((draft) => {
                      draft.routines
                        .find((item) => item.id === routine.id)
                        ?.days.find((item) => item.id === day.id)
                        ?.items.push(addId);
                    })
                  ) {
                    setAddId(null);
                    notify(t("Ejercicio agregado", "Exercise added"));
                  }
                }}
              >
                {routine.name} · {day.name}
              </Button>
            )),
          )}
          {!snapshot.routines.some((routine) => routine.days.length) && (
            <p>
              {t(
                "Primero creá una rutina con al menos un día en Inicio.",
                "First create a routine with at least one day on Home.",
              )}
            </p>
          )}
        </div>
      </AppDialog>
      <AppDialog
        open={custom}
        onClose={() => setCustom(false)}
        title={t("Crear ejercicio", "Create exercise")}
      >
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget),
              parsed = customExerciseFormSchema.safeParse({
                id: "custom-" + crypto.randomUUID(),
                name: String(form.get("name") ?? ""),
                group: form.get("group"),
                equipment: form.get("equipment"),
                tracking: form.get("tracking"),
                steps: String(form.get("steps") ?? "")
                  .split("\n")
                  .filter((line) => line.trim()),
              });
            if (!parsed.success)
              return notify(
                "Revisá el nombre y las instrucciones (máximo 10 líneas).",
              );
            if (
              change((draft) => {
                draft.customExercises.push({ ...parsed.data, custom: true });
              })
            ) {
              setCustom(false);
              setGroup(parsed.data.group);
              notify(
                t("Ejercicio personalizado guardado", "Custom exercise saved"),
              );
            }
          }}
        >
          <label className="block">
            {t("Nombre", "Name")}
            <Input name="name" required maxLength={100} />
          </label>
          <label className="block">
            {t("Grupo muscular", "Muscle group")}
            <select name="group">
              {muscleGroups.map((muscle) => (
                <option key={muscle}>{muscle}</option>
              ))}
            </select>
          </label>
          <label className="block">
            {t("Equipamiento", "Equipment")}
            <select name="equipment">
              {equipmentFilters
                .filter((item) => item !== "Todos")
                .map((item) => (
                  <option key={item}>{item}</option>
                ))}
            </select>
          </label>
          <label className="block">
            {t("Cómo registrar las series", "How to track sets")}
            <select name="tracking">
              <option value="reps">{t("Repeticiones", "Repetitions")}</option>
              <option value="seconds">
                {t("Tiempo (segundos)", "Time (seconds)")}
              </option>
            </select>
          </label>
          <label className="block">
            {t("Instrucciones (opcional)", "Instructions (optional)")}
            <textarea
              name="steps"
              maxLength={3000}
              placeholder={t(
                "Una indicación por línea",
                "One instruction per line",
              )}
            />
          </label>
          <p className="text-sm text-muted-foreground">
            {t(
              "No se genera una imagen técnica automáticamente.",
              "A technique image is not generated automatically.",
            )}
          </p>
          <Button type="submit">
            {t("Guardar ejercicio", "Save exercise")}
          </Button>
        </form>
      </AppDialog>
    </>
  );
}
