"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Switch } from "@base-ui/react/switch";
import { Pencil, Share, Trash2, Star } from "lucide-react";
import { useApp } from "@/state/app-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppDialog } from "@/components/ui/app-dialog";
import { ExercisePicker } from "@/features/exercises/exercise-picker";
import { SortableExercises } from "./sortable-exercises";
import { startWorkout, findExercise } from "@/domain/workouts";
import { buildAutomaticRoutine } from "@/domain/calculations/automatic-routine";
import { muscleGroups, type MuscleGroup } from "@/domain/schemas/exercise";
import { decodeRoutine, encodeRoutine, importRoutine } from "@/domain/sharing";
import { INCOMING_ROUTINE_KEY } from "@/lib/storage/account-cache";
import { CalendarPanel } from "@/features/calendar/calendar-panel";

type Editor = { type: "new" | "rename" | "day"; rid?: string } | null;
export function RoutinesHome() {
  const { snapshot, change, notify, t } = useApp(),
    router = useRouter();
  const [editor, setEditor] = useState<Editor>(null),
    [mode, setMode] = useState("choose"),
    [name, setName] = useState(""),
    [goal, setGoal] = useState("Fuerza e hipertrofia"),
    [groups, setGroups] = useState<MuscleGroup[]>([]),
    [days, setDays] = useState(3);
  const [picker, setPicker] = useState<{ rid: string; did: string } | null>(
      null,
    ),
    [quick, setQuick] = useState(false),
    [superset, setSuperset] = useState<{ rid: string; did: string } | null>(
      null,
    ),
    [members, setMembers] = useState<string[]>([]),
    [share, setShare] = useState(""),
    [incoming, setIncoming] = useState("");
  const selected =
      snapshot.routines.find((routine) => routine.id === snapshot.selected) ??
      snapshot.routines[0],
    workout = snapshot.workout;
  useEffect(() => {
    const token = sessionStorage.getItem(INCOMING_ROUTINE_KEY);
    if (!token) return;
    try {
      decodeRoutine(token);
      setIncoming(token);
    } catch {
      sessionStorage.removeItem(INCOMING_ROUTINE_KEY);
      notify("El enlace de rutina no es válido.");
    }
  }, [notify]);
  const begin = (rid: string, did: string) => {
    if (change((draft) => startWorkout(draft, rid, did))) {
      setQuick(false);
      router.push("/workout");
    }
  };
  const openEditor = (value: Editor, initial = "") => {
    setEditor(value);
    setName(initial);
    setGoal("Fuerza e hipertrofia");
    setMode("choose");
    setGroups([]);
  };
  const activeRoutine = snapshot.routines.find(
      (routine) => routine.id === workout?.rid,
    ),
    activeDay = activeRoutine?.days.find((day) => day.id === workout?.did);
  return (
    <>
      {workout ? (
        <section className="active-workout hero-panel mb-5">
          <span className="eyebrow">
            ● {t("Entrenamiento en curso", "Workout in progress")}
          </span>
          <h2 className="my-2 text-2xl font-bold">
            {activeDay?.name ?? "Entrenamiento"}
          </h2>
          <p>
            {activeRoutine?.name} ·{" "}
            {findExercise(snapshot, workout.entries[workout.index]?.id ?? "")
              ?.name ?? ""}
          </p>
          <Link href="/workout" className="primary-link">
            {t("Continuar", "Continue")}
          </Link>
        </section>
      ) : (
        <Button className="mb-5 w-full" onClick={() => setQuick(true)}>
          {t("Iniciar entrenamiento", "Start workout")}
        </Button>
      )}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-bold">{t("Mis rutinas", "My routines")}</h2>
        <Button variant="secondary" onClick={() => openEditor({ type: "new" })}>
          ＋ {t("Nueva", "New")}
        </Button>
      </div>
      {snapshot.routines.map((routine) => (
        <details
          className="panel routine-card"
          key={routine.id}
          open={routine.id === selected?.id}
        >
          <summary className="routine-heading">
            <span className="routine-title">
              <span className="font-bold">{routine.name}</span>
              <span className="routine-title-actions">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xl"
                  className="routine-icon-control"
                  aria-label={`Renombrar ${routine.name}`}
                  title={t("Cambiar nombre", "Rename")}
                  onClick={(event) => {
                    event.preventDefault();
                    openEditor(
                      { type: "rename", rid: routine.id },
                      routine.name,
                    );
                  }}
                >
                  <Pencil data-icon="inline-start" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xl"
                  className="routine-icon-control"
                  aria-label={t("Compartir rutina", "Share routine")}
                  title={t("Compartir rutina", "Share routine")}
                  onClick={(event) => {
                    event.preventDefault();
                    try {
                      setShare(
                        `${location.origin}/#routine=${encodeRoutine(snapshot, routine)}`,
                      );
                    } catch (error) {
                      notify(
                        error instanceof Error
                          ? error.message
                          : "No se pudo compartir",
                      );
                    }
                  }}
                >
                  <Share data-icon="inline-start" />
                </Button>
              </span>
            </span>
            <Button
              type="button"
              variant="destructive-solid"
              size="icon-xl"
              className="routine-delete routine-icon-control"
              aria-label={t("Eliminar rutina", "Delete routine")}
              title={t("Eliminar rutina", "Delete routine")}
              onClick={(event) => {
                event.preventDefault();
                if (
                  confirm(
                    t(
                      "¿Eliminar esta rutina? El historial se conserva; su entrenamiento en curso se cancelará.",
                      "Delete this routine? History is preserved; its active workout will be cancelled.",
                    ),
                  )
                )
                  change((draft) => {
                    draft.routines = draft.routines.filter(
                      (item) => item.id !== routine.id,
                    );
                    if (draft.workout?.rid === routine.id) draft.workout = null;
                    if (draft.selected === routine.id)
                      draft.selected = draft.routines[0]?.id ?? null;
                  });
              }}
            >
              <Trash2 data-icon="inline-start" />
            </Button>
          </summary>
          <div className="routine-status-row">
            <label className="routine-activation">
              <Switch.Root
                className="routine-switch"
                aria-label={`${t("Activar rutina", "Activate routine")}: ${routine.name}`}
                checked={snapshot.selected === routine.id}
                onCheckedChange={(checked) =>
                  change((draft) => {
                    draft.selected = checked ? routine.id : null;
                  })
                }
              >
                <Switch.Thumb className="routine-switch-thumb" />
              </Switch.Root>
              <span>
                {snapshot.selected === routine.id
                  ? t("Activa", "Active")
                  : t("Inactiva", "Inactive")}
              </span>
            </label>
            <small>
              {routine.days.length} {t("días", "days")}
            </small>
          </div>
          {routine.days.map((day) => (
            <details className="routine-day" key={day.id}>
              <summary className="font-bold">
                {day.name} <small>({day.items.length})</small>
              </summary>
              <SortableExercises rid={routine.id} did={day.id} />
              <div className="my-3 flex flex-wrap gap-2">
                <Button
                  onClick={() => begin(routine.id, day.id)}
                  disabled={!!workout}
                >
                  {t("Empezar", "Start")}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setPicker({ rid: routine.id, did: day.id })}
                >
                  {t("Agregar ejercicios", "Add exercises")}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSuperset({ rid: routine.id, did: day.id });
                    setMembers([]);
                  }}
                >
                  {t("Superseries", "Supersets")}
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => {
                    if (confirm(t("¿Quitar este día?", "Remove this day?")))
                      change((draft) => {
                        const target = draft.routines.find(
                          (item) => item.id === routine.id,
                        );
                        if (target)
                          target.days = target.days.filter(
                            (item) => item.id !== day.id,
                          );
                        if (draft.workout?.did === day.id) draft.workout = null;
                      });
                  }}
                >
                  {t("Quitar día", "Remove day")}
                </Button>
              </div>
              {!!day.supersets?.length && (
                <p className="mb-3 text-sm text-orange-300">
                  {day.supersets
                    .map((group) =>
                      group
                        .map((id) => findExercise(snapshot, id)?.name ?? id)
                        .join(" + "),
                    )
                    .join(" · ")}
                </p>
              )}
            </details>
          ))}
          <Button
            variant="secondary"
            className="routine-add-day"
            onClick={() => openEditor({ type: "day", rid: routine.id })}
          >
            {t("Agregar día", "Add day")}
          </Button>
        </details>
      ))}
      {!snapshot.routines.length && (
        <p className="panel">
          {t("Creá tu primera rutina.", "Create your first routine.")}
        </p>
      )}
      <CalendarPanel />
      <AppDialog
        open={quick}
        onClose={() => setQuick(false)}
        title={t("Elegir día para entrenar", "Choose training day")}
      >
        {snapshot.routines.flatMap((routine) =>
          routine.days.map((day) => (
            <Button
              key={day.id}
              variant="secondary"
              disabled={!day.items.length}
              onClick={() => begin(routine.id, day.id)}
            >
              {routine.name} · {day.name}
            </Button>
          )),
        )}
      </AppDialog>
      <AppDialog
        open={editor !== null}
        onClose={() => setEditor(null)}
        title={
          editor?.type === "rename"
            ? "Renombrar rutina"
            : editor?.type === "day"
              ? "Agregar día"
              : "Nueva rutina"
        }
      >
        {editor?.type === "new" && mode === "choose" ? (
          <>
            <Button onClick={() => setMode("custom")}>
              {t("Rutina personalizada", "Custom routine")}
            </Button>
            <Button variant="secondary" onClick={() => setMode("auto")}>
              {t("Rutina automática", "Automatic routine")}
            </Button>
          </>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              const editing = editor;
              if (!editing) return;
              if (mode !== "auto" && !name.trim())
                return notify("Escribí un nombre.");
              if (
                change((draft) => {
                  if (editing.type === "rename") {
                    const routine = draft.routines.find(
                      (item) => item.id === editing.rid,
                    );
                    if (routine) routine.name = name.trim();
                  } else if (editing.type === "day")
                    draft.routines
                      .find((item) => item.id === editing.rid)
                      ?.days.push({
                        id: crypto.randomUUID(),
                        name: name.trim(),
                        items: [],
                      });
                  else {
                    const routine =
                      mode === "auto"
                        ? buildAutomaticRoutine(
                            { groups, days },
                            {
                              makeId: () => crypto.randomUUID(),
                              language: draft.settings.language ?? "es",
                            },
                          )
                        : {
                            id: crypto.randomUUID(),
                            name: name.trim(),
                            goal,
                            days: [],
                          };
                    draft.routines.push(routine);
                    draft.selected = routine.id;
                  }
                })
              ) {
                setEditor(null);
                notify(t("Rutina guardada", "Routine saved"));
              }
            }}
          >
            {editor?.type === "new" && mode === "custom" && (
              <label className="block">
                {t("Objetivo", "Goal")}
                <select
                  value={goal}
                  onChange={(event) => setGoal(event.target.value)}
                >
                  {[
                    ["Fuerza e hipertrofia", "Strength and hypertrophy"],
                    ["Ganar masa muscular", "Build muscle"],
                    ["Mejorar condición física", "Improve fitness"],
                  ].map(([es, en]) => (
                    <option key={es} value={es}>
                      {t(es!, en!)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {mode === "auto" ? (
              <>
                <div className="space-y-2">
                  {muscleGroups.map((group) => (
                    <label
                      key={group}
                      className="flex min-h-11 items-center gap-3"
                    >
                      <input
                        type="checkbox"
                        checked={groups.includes(group)}
                        onChange={() =>
                          setGroups((previous) =>
                            previous.includes(group)
                              ? previous.filter((item) => item !== group)
                              : [...previous, group],
                          )
                        }
                      />
                      {group}
                    </label>
                  ))}
                </div>
                <label>
                  Días por semana
                  <select
                    value={days}
                    onChange={(event) => setDays(Number(event.target.value))}
                  >
                    {Array.from({ length: 7 }, (_, index) => (
                      <option key={index} value={index + 1}>
                        {index + 1}
                      </option>
                    ))}
                  </select>
                </label>
              </>
            ) : (
              <label className="block">
                Nombre
                <Input
                  required
                  maxLength={100}
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>
            )}
            <Button type="submit">
              {mode === "auto" ? "Crear rutina" : "Guardar"}
            </Button>
          </form>
        )}
      </AppDialog>
      {picker && (
        <ExercisePicker
          onClose={() => setPicker(null)}
          onPick={(ids) => {
            if (
              change((draft) => {
                draft.routines
                  .find((item) => item.id === picker.rid)
                  ?.days.find((item) => item.id === picker.did)
                  ?.items.push(...ids);
              })
            )
              setPicker(null);
          }}
        />
      )}
      <AppDialog
        open={superset !== null}
        onClose={() => setSuperset(null)}
        title="Superseries"
      >
        {snapshot.routines
          .find((routine) => routine.id === superset?.rid)
          ?.days.find((day) => day.id === superset?.did)
          ?.items.map((id, index) => (
            <label key={index} className="flex min-h-12 items-center gap-3">
              <input
                type="checkbox"
                checked={members.includes(id)}
                onChange={() =>
                  setMembers((previous) =>
                    previous.includes(id)
                      ? previous.filter((item) => item !== id)
                      : [...previous, id],
                  )
                }
              />
              {findExercise(snapshot, id)?.name ?? id}
            </label>
          ))}
        <Button
          disabled={members.length < 2}
          onClick={() => {
            if (
              change((draft) => {
                const day = draft.routines
                  .find((routine) => routine.id === superset?.rid)
                  ?.days.find((day) => day.id === superset?.did);
                if (day)
                  day.supersets = [
                    ...(day.supersets ?? []).filter(
                      (group) => !group.some((id) => members.includes(id)),
                    ),
                    members,
                  ];
              })
            )
              setSuperset(null);
          }}
        >
          Crear superserie
        </Button>
        <Button
          variant="secondary"
          onClick={() => {
            change((draft) => {
              const day = draft.routines
                .find((routine) => routine.id === superset?.rid)
                ?.days.find((day) => day.id === superset?.did);
              if (day) day.supersets = [];
            });
            setSuperset(null);
          }}
        >
          Quitar superseries de este día
        </Button>
      </AppDialog>
      <AppDialog
        open={!!share}
        onClose={() => setShare("")}
        title="Compartir rutina"
        description="Se comparte una copia editable; no tu perfil, historial, pesos ni notas privadas."
      >
        <Input aria-label="Enlace de rutina" readOnly value={share} />
        <Button
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(share);
              notify("Enlace copiado");
            } catch {
              notify("Seleccioná el enlace para copiarlo manualmente.");
            }
          }}
        >
          Copiar enlace
        </Button>
        {typeof navigator !== "undefined" && navigator.share && (
          <Button
            variant="secondary"
            onClick={() => {
              void navigator
                .share({ url: share, title: "HERCULES" })
                .catch(() => {});
            }}
          >
            Compartir…
          </Button>
        )}
      </AppDialog>
      <AppDialog
        open={!!incoming}
        onClose={() => {
          setIncoming("");
          sessionStorage.removeItem(INCOMING_ROUTINE_KEY);
        }}
        title="Rutina compartida"
      >
        <p>
          Se agregará una copia editable sin modificar tus rutinas actuales.
        </p>
        <Button
          onClick={() => {
            if (change((draft) => importRoutine(draft, incoming))) {
              setIncoming("");
              sessionStorage.removeItem(INCOMING_ROUTINE_KEY);
              notify("Rutina agregada a tu cuenta");
            }
          }}
        >
          Agregar a mis rutinas
        </Button>
      </AppDialog>
    </>
  );
}
