"use client";
import { menstrualCalendarEnabled } from "@/domain/menstrual-calendar";
import { localeFor } from "@/data/translations";
import { useState } from "react";
import { useApp } from "@/state/app-provider";
import {
  buildSession,
  blankSet,
  color,
  copySessions,
  findExercise,
  localDateKey,
  metricFor,
  validDateKey,
  workoutRatings,
  type Entry,
  type Session,
  type Extras,
} from "@/domain/workouts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AppDialog } from "@/components/ui/app-dialog";
import { ExercisePicker } from "@/features/exercises/exercise-picker";
import { ExerciseVisual } from "@/features/exercises/exercise-visual";
import { SetGrid } from "@/features/workouts/set-grid";
import { SessionExtras, emptyExtras } from "@/features/workouts/session-extras";
import { safePhoto } from "@/lib/browser/photos";
import { shareWorkoutPoster } from "@/features/sharing/workout-poster";
import { useRuntime } from "@/state/runtime-provider";

export function CalendarPanel() {
  const { snapshot, change, notify, t } = useApp(),
    [month, setMonth] = useState(
      () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
    ),
    [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { clipboard, setClipboard } = useRuntime();
  const [editing, setEditing] = useState<{
      id: string | null;
      date: string;
    } | null>(null),
    [entries, setEntries] = useState<Entry[]>([]),
    [names, setNames] = useState({
      routine: "Entrenamiento libre",
      day: "Día libre",
    }),
    [extras, setExtras] = useState<Extras>(emptyExtras),
    [picking, setPicking] = useState(false);
  const [detailsEdited, setDetailsEdited] = useState(false);
  const year = month.getFullYear(),
    number = month.getMonth(),
    first = (month.getDay() + 6) % 7,
    count = new Date(year, number + 1, 0).getDate(),
    locale = localeFor(snapshot.settings.language);
  const sessions = snapshot.sessions.filter(
    (session) => selectedDate && localDateKey(session.date) === selectedDate,
  );
  const edit = (date: string, session?: Session) => {
    setEditing({ id: session?.id ?? null, date });
    setDetailsEdited(false);
    setNames({
      routine: session?.routine ?? "Entrenamiento libre",
      day: session?.day ?? "Día libre",
    });
    const factor =
      (session?.weightUnit ?? "kg") === (snapshot.settings.weight ?? "kg")
        ? 1
        : snapshot.settings.weight === "lb"
          ? 2.20462
          : 1 / 2.20462;
    setEntries(
      session?.exercises?.map((exercise) => ({
        id: exercise.id,
        note: exercise.note ?? "",
        tracking: exercise.performedSets?.some((set) => set.seconds != null)
          ? "seconds"
          : metricFor(snapshot, exercise.id),
        sets: exercise.performedSets?.length
          ? exercise.performedSets.map((set) => ({
              ...set,
              kg:
                factor === 1
                  ? (set.kg ?? 0)
                  : Math.round((Number(set.kg) || 0) * factor * 10) / 10,
              entered: true,
            }))
          : [blankSet(metricFor(snapshot, exercise.id))],
      })) ?? [],
    );
    setExtras({
      ...(workoutRatings.includes(
        session?.rating as (typeof workoutRatings)[number],
      )
        ? { rating: session!.rating as (typeof workoutRatings)[number] }
        : {}),
      color: color(session?.color),
      comment: session?.comment ?? "",
      photos: session?.photos ?? [],
      bodyWeightStartKg: session?.bodyWeightStartKg ?? null,
      bodyWeightEndKg: session?.bodyWeightEndKg ?? null,
    });
  };
  return (
    <section className="panel calendar-panel">
      <div className="mb-4 flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          aria-label={t("Mes anterior", "Previous month")}
          onClick={() => setMonth(new Date(year, number - 1, 1))}
        >
          ‹
        </Button>
        <h2 className="text-lg font-bold">
          {new Intl.DateTimeFormat(locale, { month: "long" }).format(month)}{" "}
          {year}
        </h2>
        <Button
          variant="ghost"
          aria-label={t("Mes siguiente", "Next month")}
          onClick={() => setMonth(new Date(year, number + 1, 1))}
        >
          ›
        </Button>
      </div>
      <div className="calendar-grid">
        {Array.from({ length: 7 }, (_, index) => (
          <small key={index}>
            {new Intl.DateTimeFormat(locale, { weekday: "short" }).format(
              new Date(2024, 0, 1 + index),
            )}
          </small>
        ))}
        {Array.from({ length: first }, (_, index) => (
          <span key={`empty-${index}`} />
        ))}
        {Array.from({ length: count }, (_, index) => {
          const date = localDateKey(new Date(year, number, index + 1)),
            recorded = snapshot.sessions.filter(
              (session) => localDateKey(session.date) === date,
            ),
            colors = [
              ...new Set(recorded.map((session) => color(session.color))),
            ],
            menstrualTraining =
              menstrualCalendarEnabled(snapshot.profile) &&
              recorded.length > 0 &&
              snapshot.profile.menstrualCalendar?.dates?.includes(date) ===
                true;
          return (
            <button
              type="button"
              key={date}
              data-calendar-date={date}
              aria-label={`${date}, ${recorded.length} entrenamientos${menstrualTraining ? t(", sangrado menstrual registrado", ", recorded menstrual bleeding") : ""}`}
              data-menstrual-training={menstrualTraining || undefined}
              className={date === localDateKey(new Date()) ? "today" : ""}
              style={
                colors.length
                  ? {
                      background:
                        colors.length === 1
                          ? colors[0]
                          : `linear-gradient(135deg,${colors.flatMap((value, number) => [`${value} ${(number / colors.length) * 100}%`, `${value} ${((number + 1) / colors.length) * 100}%`]).join(",")})`,
                      color: "#090b10",
                    }
                  : undefined
              }
              onClick={() => setSelectedDate(date)}
            >
              {index + 1}
              <span className="calendar-dots">
                {colors.map((value) => (
                  <i
                    key={value}
                    style={{
                      background: `color-mix(in srgb, ${value} 72%, black)`,
                    }}
                  />
                ))}
              </span>
            </button>
          );
        })}
      </div>
      {menstrualCalendarEnabled(snapshot.profile) && (
        <p className="mt-3 text-sm text-muted-foreground">
          <span aria-hidden="true" style={{ color: "#c4b5fd" }}>
            ▢
          </span>{" "}
          {t(
            "Borde violeta: entrenamiento con sangrado menstrual registrado.",
            "Purple border: workout with recorded menstrual bleeding.",
          )}
        </p>
      )}
      <AppDialog
        open={selectedDate !== null && !editing && !picking}
        onClose={() => setSelectedDate(null)}
        title={
          selectedDate
            ? new Date(`${selectedDate}T12:00:00`).toLocaleDateString(locale, {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })
            : "Calendario"
        }
      >
        {sessions.map((session) => (
          <details
            key={session.id}
            className="routine-day calendar-workout"
            style={{ borderLeft: `4px solid ${color(session.color)}` }}
          >
            <summary>
              <strong>{session.day}</strong>
              {workoutRatings.includes(
                session.rating as (typeof workoutRatings)[number],
              ) && (
                <span
                  className="ms-2 text-xl"
                  aria-label={t("¿Cómo te fue?", "How did it go?")}
                >
                  {
                    ["🤩", "😊", "😐", "😕", "😣"][
                      workoutRatings.indexOf(
                        session.rating as (typeof workoutRatings)[number],
                      )
                    ]
                  }
                </span>
              )}
              <small className="block text-muted-foreground">
                {session.routine}
              </small>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm font-normal">
                <span>
                  {t("Tiempo", "Time")}:{" "}
                  {session.duration == null
                    ? t("Sin registro", "Not recorded")
                    : `${Math.floor(session.duration / 60)} h ${Math.round(session.duration % 60)} min`}
                </span>
                <span>
                  {t("Volumen", "Volume")}:{" "}
                  {session.volumeKg == null && session.volume == null
                    ? t("Sin registro", "Not recorded")
                    : `${Math.round((session.volumeKg ?? (session.volume ?? 0) / (session.weightUnit === "lb" ? 2.20462 : 1)) * (snapshot.settings.weight === "lb" ? 2.20462 : 1)).toLocaleString(locale)} ${snapshot.settings.weight}`}
                </span>
              </div>
            </summary>
            {session.exercises?.map((exercise, index) => (
              <div key={index} className="my-3">
                <strong>
                  {findExercise(snapshot, exercise.id)?.name ?? exercise.id}
                </strong>
                {exercise.performedSets?.map((set, number) => (
                  <p className="text-sm text-muted-foreground" key={number}>
                    {t("Serie", "Set")} {number + 1}: {set.kg ?? 0}{" "}
                    {session.weightUnit ?? "kg"} ×{" "}
                    {set.seconds != null
                      ? `${set.seconds} s`
                      : `${set.reps ?? 0} reps`}
                  </p>
                ))}
                {exercise.note && <p>{exercise.note}</p>}
              </div>
            ))}
            {session.comment && <p className="my-3">{session.comment}</p>}
            {session.bodyWeightStartKg != null && (
              <p>
                {t("Peso inicial:", "Starting weight:")}{" "}
                {Math.round(
                  session.bodyWeightStartKg *
                    (snapshot.settings.weight === "lb" ? 2.20462 : 1) *
                    10,
                ) / 10}{" "}
                {snapshot.settings.weight}
              </p>
            )}
            {session.bodyWeightEndKg != null && (
              <p>
                {t("Peso final:", "Final weight:")}{" "}
                {Math.round(
                  session.bodyWeightEndKg *
                    (snapshot.settings.weight === "lb" ? 2.20462 : 1) *
                    10,
                ) / 10}{" "}
                {snapshot.settings.weight}
              </p>
            )}
            <div className="my-3 flex gap-2">
              {session.photos
                ?.filter((photo) => safePhoto(photo))
                .map((photo, index) => (
                  <img
                    key={index}
                    src={photo}
                    alt="Foto del entrenamiento"
                    className="h-24 w-24 rounded-xl object-cover"
                  />
                ))}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                onClick={() => {
                  if (selectedDate) edit(selectedDate, session);
                }}
              >
                {t("Editar", "Edit")}
              </Button>
              <Button
                variant="secondary"
                onClick={() => setClipboard([structuredClone(session)])}
              >
                {t("Copiar", "Copy")}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  void shareWorkoutPoster(snapshot, session).catch(
                    (error: unknown) =>
                      notify(
                        error instanceof Error
                          ? error.message
                          : "No se pudo compartir.",
                      ),
                  );
                }}
              >
                {t("Compartir imagen", "Share image")}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  if (confirm("¿Eliminar este entrenamiento?"))
                    change((draft) => {
                      draft.sessions = draft.sessions.filter(
                        (item) => item.id !== session.id,
                      );
                    });
                }}
              >
                {t("Eliminar", "Delete")}
              </Button>
            </div>
          </details>
        ))}
        {!sessions.length && (
          <p className="text-muted-foreground">
            {t(
              "No hay entrenamientos guardados este día.",
              "No workouts saved for this day.",
            )}
          </p>
        )}
        {sessions.length > 1 && (
          <Button
            variant="secondary"
            onClick={() => setClipboard(structuredClone(sessions))}
          >
            {t("Copiar todo el día", "Copy entire day")}
          </Button>
        )}
        {clipboard.length > 0 && (
          <Button
            variant="secondary"
            onClick={() => {
              if (
                selectedDate &&
                confirm(
                  "Se agregarán copias sin fotos ni pesos corporales, sin reemplazar lo existente. ¿Pegar?",
                )
              )
                change((draft) => {
                  draft.sessions.push(...copySessions(clipboard, selectedDate));
                });
            }}
          >
            {t("Pegar entrenamientos copiados", "Paste copied workouts")}
          </Button>
        )}
        <Button
          onClick={() => {
            if (selectedDate) edit(selectedDate);
          }}
        >
          {t("Agregar entrenamiento a este día", "Add workout to this day")}
        </Button>
      </AppDialog>
      <AppDialog
        open={editing !== null && !picking}
        onClose={() => setEditing(null)}
        title={editing?.id ? "Editar entrenamiento" : "Agregar entrenamiento"}
      >
        <label>
          {t("Fecha", "Date")}
          <Input
            type="date"
            value={editing?.date ?? ""}
            onChange={(event) =>
              setEditing((previous) =>
                previous ? { ...previous, date: event.target.value } : null,
              )
            }
          />
        </label>
        <div className="form-grid">
          <label>
            {t("Rutina", "Routine")}
            <Input
              value={names.routine}
              onChange={(event) =>
                setNames({ ...names, routine: event.target.value })
              }
            />
          </label>
          <label>
            {t("Nombre del día", "Day name")}
            <Input
              value={names.day}
              onChange={(event) =>
                setNames({ ...names, day: event.target.value })
              }
            />
          </label>
        </div>
        {entries.map((entry, index) => {
          const exercise = findExercise(snapshot, entry.id);
          return (
            <details className="routine-day" key={index} open>
              <summary className="picker-row">
                {exercise && (
                  <div className="picker-thumb">
                    <ExerciseVisual exercise={exercise} />
                  </div>
                )}
                <strong>{exercise?.name ?? entry.id}</strong>
              </summary>
              <SetGrid
                entry={entry}
                index={index}
                started={
                  editing
                    ? new Date(`${editing.date}T23:59:59`).getTime()
                    : Date.now()
                }
                onChange={(mutate) => {
                  setDetailsEdited(true);
                  setEntries((previous) => {
                    const next = structuredClone(previous);
                    const item = next[index];
                    if (item) mutate(item);
                    return next;
                  });
                }}
              />
              <Button
                variant="ghost"
                onClick={() => {
                  setDetailsEdited(true);
                  setEntries((previous) =>
                    previous.filter((_, number) => number !== index),
                  );
                }}
              >
                {t("Quitar ejercicio", "Remove exercise")}
              </Button>
            </details>
          );
        })}
        <Button variant="secondary" onClick={() => setPicking(true)}>
          {t("Agregar ejercicios", "Add exercises")}
        </Button>
        <SessionExtras value={extras} onChange={setExtras} />
        <Button
          onClick={() => {
            if (
              !editing ||
              !validDateKey(editing.date) ||
              (!editing.id && !entries.length)
            )
              return notify("Elegí una fecha válida y agregá ejercicios.");
            const editValue = editing;
            if (
              change((draft) => {
                const old = editValue.id
                  ? draft.sessions.find(
                      (session) => session.id === editValue.id,
                    )
                  : undefined;
                const date = new Date(
                  `${editValue.date}T12:00:00`,
                ).toISOString();
                if (old && !detailsEdited)
                  Object.assign(old, names, extras, { date });
                else {
                  const next = buildSession(
                    draft,
                    entries,
                    names,
                    date,
                    extras,
                    true,
                  );
                  if (old) Object.assign(old, next, { id: old.id });
                  else draft.sessions.push(next);
                }
                draft.sessions.sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime(),
                );
              })
            ) {
              setSelectedDate(editValue.date);
              setEditing(null);
              notify("Entrenamiento guardado");
            }
          }}
        >
          {t("Guardar entrenamiento", "Save workout")}
        </Button>
      </AppDialog>
      {picking && (
        <ExercisePicker
          onClose={() => setPicking(false)}
          onPick={(ids) => {
            setDetailsEdited(true);
            setEntries((previous) => [
              ...previous,
              ...ids.map((id) => ({
                id,
                note: "",
                sets: [blankSet(metricFor(snapshot, id))],
              })),
            ]);
            setPicking(false);
          }}
        />
      )}
    </section>
  );
}
