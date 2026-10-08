"use client";
import { useState } from "react";
import { Switch } from "@base-ui/react/switch";
import { useRouter } from "next/navigation";
import { Timer } from "lucide-react";
import { useApp } from "@/state/app-provider";
import {
  buildSession,
  findExercise,
  type CatalogExercise,
  type Entry,
} from "@/domain/workouts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppDialog } from "@/components/ui/app-dialog";
import { ExerciseVisual } from "@/features/exercises/exercise-visual";
import { ExerciseDetails } from "@/features/exercises/exercise-details";
import { SetGrid } from "./set-grid";
import { SessionExtras, emptyExtras } from "./session-extras";
import { useRuntime } from "@/state/runtime-provider";
import { ReplacementDialog } from "./replacement-dialog";
import { replaceWorkoutExercise } from "@/domain/exercise-replacement";
export function WorkoutScreen() {
  const [replacement, setReplacement] = useState<number | null>(null);
  const { snapshot, change, notify, t } = useApp(),
    router = useRouter(),
    workout = snapshot.workout;
  const [image, setImage] = useState<CatalogExercise | null>(null),
    [finish, setFinish] = useState(false),
    [extras, setExtras] = useState(emptyExtras),
    [supersetOpen, setSupersetOpen] = useState(false),
    [members, setMembers] = useState<number[]>([]);
  const { rest, now, setRest } = useRuntime(),
    restEnd = rest.end;
  const setRestEnd = (end: number) =>
    setRest({
      end,
      duration: Math.max(5, Number(snapshot.settings.restSeconds) || 60),
    });
  const restSeconds = Math.max(
      5,
      Math.min(3600, Number(snapshot.settings.restSeconds) || 60),
    ),
    remaining = Math.max(0, Math.ceil((restEnd - now) / 1000)),
    enabled = snapshot.settings.restEnabled === true;
  if (!workout)
    return (
      <section className="panel">
        <h1 className="text-2xl font-bold">
          {t("No hay un entrenamiento en curso.", "No workout in progress.")}
        </h1>
        <Button className="mt-4" onClick={() => router.push("/home")}>
          {t("Volver al inicio", "Go home")}
        </Button>
      </section>
    );
  const routine = snapshot.routines.find(
      (routine) => routine.id === workout.rid,
    ),
    day = routine?.days.find((day) => day.id === workout.did),
    individual = snapshot.settings.workoutLayout === "individual";
  const editEntry = (index: number, edit: (draft: Entry) => void) =>
    change((draft) => {
      const entry = draft.workout?.entries[index];
      if (entry && draft.workout) {
        draft.workout.index = index;
        edit(entry);
      }
    });
  const selected = workout.entries[workout.index],
    selectedExercise = selected ? findExercise(snapshot, selected.id) : null;
  const renderEntry = (entry: Entry, index: number) => {
    const exercise = findExercise(snapshot, entry.id),
      opened = workout.openExercises?.includes(index) ?? index === 0;
    const content = (
      <>
        <Button
          type="button"
          variant="secondary"
          className="mb-3"
          onClick={() => setReplacement(index)}
        >
          {t("Reemplazar ejercicio", "Replace exercise")}
        </Button>
        <SetGrid
          entry={entry}
          index={index}
          started={workout.started}
          onChange={(edit) => editEntry(index, edit)}
        />
        {individual && (
          <div className="mt-5 flex justify-center gap-3">
            <Button
              variant="secondary"
              disabled={workout.index === 0}
              onClick={() =>
                change((draft) => {
                  if (draft.workout) draft.workout.index--;
                })
              }
            >
              {t("Anterior", "Previous")}
            </Button>
            <Button
              onClick={() => {
                if (workout.index === workout.entries.length - 1)
                  setFinish(true);
                else
                  change((draft) => {
                    if (draft.workout) draft.workout.index++;
                  });
              }}
            >
              {workout.index === workout.entries.length - 1
                ? t("Finalizar", "Finish")
                : t("Siguiente", "Next")}
            </Button>
          </div>
        )}
      </>
    );
    if (individual)
      return (
        <section key={index} className="panel">
          {content}
        </section>
      );
    return (
      <details
        key={index}
        className={`panel workout-fold ${entry.superset ? "superset-fold" : ""}`}
        data-workout-entry={index}
        open={opened}
        onToggle={(event) => {
          const open = event.currentTarget.open;
          if (open === opened) return;
          change((draft) => {
            const current = draft.workout;
            if (current)
              current.openExercises = open
                ? [...new Set([...(current.openExercises ?? []), index])]
                : (current.openExercises ?? []).filter(
                    (number) => number !== index,
                  );
          });
        }}
      >
        <summary className="picker-row">
          <button
            type="button"
            className="picker-thumb"
            aria-label={`${t("Ampliar", "Enlarge")} ${exercise?.name ?? entry.id}`}
            onClick={(event) => {
              event.preventDefault();
              if (exercise) setImage(exercise);
            }}
          >
            {exercise && <ExerciseVisual exercise={exercise} />}
          </button>
          <span className="min-w-0 flex-1">
            <strong>{exercise?.name ?? entry.id}</strong>
            <small className="block text-muted-foreground">
              {entry.superset ? `${t("Superserie", "Superset")} · ` : ""}
              {entry.sets.length} {t("series", "sets")}
            </small>
          </span>
          <span>⌄</span>
        </summary>
        <div className="pt-3">{content}</div>
      </details>
    );
  };
  return (
    <>
      {replacement !== null && workout.entries[replacement] && (
        <ReplacementDialog
          entry={workout.entries[replacement]}
          onClose={() => setReplacement(null)}
          onReplace={(id) => {
            change((draft) => replaceWorkoutExercise(draft, replacement, id));
            setReplacement(null);
          }}
        />
      )}
      <div className="workout-banner">
        <span className="eyebrow">
          {day?.name ?? t("Entrenamiento", "Workout")} · {workout.index + 1}/
          {workout.entries.length}
        </span>
        <h1>
          {individual
            ? (selectedExercise?.name ?? selected?.id)
            : t("Tu entrenamiento", "Your workout")}
        </h1>
      </div>
      {individual && selectedExercise && (
        <button
          type="button"
          className="mb-4 w-full"
          aria-label={`${t("Ampliar", "Enlarge")} ${selectedExercise.name}`}
          onClick={() => setImage(selectedExercise)}
        >
          <ExerciseVisual exercise={selectedExercise} large />
        </button>
      )}
      <div className="workout-toolbar">
        <Button
          variant="secondary"
          onClick={() =>
            change((draft) => {
              draft.settings.workoutLayout = individual ? "list" : "individual";
            })
          }
        >
          {individual
            ? t("Ver todos los ejercicios", "View all exercises")
            : t("Vista individual", "Individual view")}
        </Button>
        {!individual && (
          <Button
            variant="secondary"
            onClick={() =>
              change((draft) => {
                if (!draft.workout) return;
                const allOpen =
                  draft.workout.openExercises?.length ===
                  draft.workout.entries.length;
                draft.workout.openExercises = allOpen
                  ? []
                  : draft.workout.entries.map((_, index) => index);
              })
            }
          >
            {workout.openExercises?.length === workout.entries.length
              ? t("Cerrar todos", "Collapse all")
              : t("Desplegar todos", "Expand all")}
          </Button>
        )}
        <Button
          variant="secondary"
          onClick={() => {
            setSupersetOpen(true);
            setMembers([]);
          }}
        >
          {t("Superseries", "Supersets")}
        </Button>
      </div>
      <section className="panel">
        <div className="workout-rest-controls">
          <span id="workout-rest-label">{t("Descanso", "Rest")}</span>
          <Switch.Root
            render={<button type="button" />}
            className="routine-switch"
            aria-label={t("Descanso entre series", "Rest between sets")}
            checked={enabled}
            onCheckedChange={(checked) => {
              change((draft) => {
                draft.settings.restEnabled = checked;
              });
              if (!checked) setRestEnd(0);
            }}
          >
            <Switch.Thumb className="routine-switch-thumb" />
          </Switch.Root>
          <label className="workout-rest-duration">
            <Input
              aria-label={t("Segundos", "Seconds")}
              type="number"
              min={5}
              max={3600}
              disabled={!enabled}
              value={restSeconds}
              onChange={(event) =>
                change((draft) => {
                  draft.settings.restSeconds = Math.max(
                    5,
                    Math.min(3600, Number(event.target.value)),
                  );
                })
              }
            />
            <span>{t("segundos", "seconds")}</span>
          </label>
          {enabled && (
            <button
              type="button"
              className={`rest-start ${restEnd && remaining ? "running" : ""}`}
              style={{
                background: restEnd
                  ? `conic-gradient(#ff8a4c ${Math.min(100, (1 - remaining / Math.max(1, rest.duration)) * 100)}%, #191d26 0)`
                  : undefined,
              }}
              aria-label={t("Iniciar descanso", "Start rest")}
              onClick={() => setRestEnd(Date.now() + restSeconds * 1000)}
            >
              <Timer />
            </button>
          )}
        </div>
        {restEnd > 0 && (
          <div className="mt-3 flex items-center justify-between">
            <strong>
              {t("Descanso", "Rest")}: {remaining} s
            </strong>
            <Button variant="ghost" onClick={() => setRestEnd(0)}>
              {t("Omitir descanso", "Skip rest")}
            </Button>
          </div>
        )}
      </section>
      {individual && selected
        ? renderEntry(selected, workout.index)
        : workout.entries.flatMap((entry, index) => {
            if (!entry.superset) return [renderEntry(entry, index)];
            const indices = workout.entries.flatMap((item, number) =>
              item.superset === entry.superset ? [number] : [],
            );
            if (indices[0] !== index) return [];
            return [
              <section className="panel superset-group" key={entry.superset}>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <strong>{t("Superserie", "Superset")}</strong>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      const next =
                        indices[
                          (indices.indexOf(workout.index) + 1) % indices.length
                        ];
                      if (next === undefined) return;
                      change((draft) => {
                        if (draft.workout) {
                          draft.workout.index = next;
                          draft.workout.openExercises = [
                            ...new Set([
                              ...(draft.workout.openExercises ?? []),
                              next,
                            ]),
                          ];
                        }
                      });
                      document
                        .querySelector(`[data-workout-entry="${next}"]`)
                        ?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                    }}
                  >
                    {t("Alternar ejercicio", "Switch exercise")}
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  {t(
                    "Una serie de cada ejercicio; después, descanso.",
                    "One set of each exercise, then rest.",
                  )}
                </p>
                {indices.map((number) => {
                  const item = workout.entries[number];
                  return item ? renderEntry(item, number) : null;
                })}
              </section>,
            ];
          })}
      {!individual && (
        <Button className="mt-3 w-full" onClick={() => setFinish(true)}>
          {t("Finalizar entrenamiento", "Finish workout")}
        </Button>
      )}
      <Button
        variant="ghost"
        className="mt-3 w-full"
        onClick={() => {
          if (
            confirm(
              t("¿Cancelar este entrenamiento?", "Cancel this workout?"),
            ) &&
            change((draft) => {
              draft.workout = null;
            })
          )
            router.push("/home");
        }}
      >
        {t("Cancelar entrenamiento", "Cancel workout")}
      </Button>
      <ExerciseDetails exercise={image} onClose={() => setImage(null)} />
      <AppDialog
        open={finish}
        onClose={() => setFinish(false)}
        title={t("Finalizar entrenamiento", "Finish workout")}
      >
        <SessionExtras value={extras} onChange={setExtras} />
        <Button
          onClick={() => {
            if (
              change((draft) => {
                if (!draft.workout) return;
                const record = buildSession(
                  draft,
                  draft.workout.entries,
                  {
                    routine: routine?.name ?? "Rutina",
                    day: day?.name ?? t("Entrenamiento", "Workout"),
                  },
                  new Date().toISOString(),
                  extras,
                );
                record.duration = Math.max(
                  0,
                  Math.round((Date.now() - draft.workout.started) / 60000),
                );
                draft.sessions.unshift(record);
                draft.workout = null;
              })
            ) {
              setFinish(false);
              notify(t("Entrenamiento guardado", "Workout saved"));
              router.push("/home");
            }
          }}
        >
          {t("Guardar entrenamiento", "Save workout")}
        </Button>
      </AppDialog>
      <AppDialog
        open={supersetOpen}
        onClose={() => setSupersetOpen(false)}
        title={t("Superseries", "Supersets")}
      >
        {workout.entries.map((entry, index) => (
          <label className="flex min-h-12 items-center gap-3" key={index}>
            <input
              type="checkbox"
              checked={members.includes(index)}
              onChange={() =>
                setMembers((previous) =>
                  previous.includes(index)
                    ? previous.filter((item) => item !== index)
                    : [...previous, index],
                )
              }
            />
            {findExercise(snapshot, entry.id)?.name ?? entry.id}
          </label>
        ))}
        <Button
          disabled={members.length < 2}
          onClick={() => {
            change((draft) => {
              const key = crypto.randomUUID();
              draft.workout?.entries.forEach((entry, index) => {
                if (members.includes(index)) entry.superset = key;
              });
            });
            setSupersetOpen(false);
          }}
        >
          {t("Crear superserie", "Create superset")}
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            change((draft) => {
              draft.workout?.entries.forEach((entry) => {
                delete entry.superset;
              });
            });
            setSupersetOpen(false);
          }}
        >
          {t("Quitar superseries", "Remove supersets")}
        </Button>
      </AppDialog>
    </>
  );
}
