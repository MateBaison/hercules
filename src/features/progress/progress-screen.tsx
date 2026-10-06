"use client";
import { localeFor } from "@/data/translations";
import { useState } from "react";
import { useApp } from "@/state/app-provider";
import { catalogFor } from "@/domain/workouts";
import {
  comparable,
  exerciseHistories,
  groups,
  improvement,
  weeklyData,
  type RecordSet,
} from "@/domain/progress";
import { Button } from "@/components/ui/button";
import { shareWorkoutPoster } from "@/features/sharing/workout-poster";
export function ProgressScreen() {
  const { snapshot, change, t, notify } = useApp(),
    [window, setWindow] = useState(4),
    [selected, setSelected] = useState("");
  const locale = localeFor(snapshot.settings.language);
  const history = exerciseHistories(snapshot),
    catalog = catalogFor(snapshot),
    weeks = weeklyData(snapshot, window),
    unit = snapshot.settings.weight ?? "kg",
    factor = unit === "lb" ? 2.20462 : 1;
  const goal = Math.max(
      0,
      Math.min(7, Number(snapshot.settings.weeklyGoal) || 0),
    ),
    counts = Object.fromEntries(
      groups.map((group) => [
        group,
        weeks.reduce((sum, week) => sum + (week.groups[group] ?? 0), 0),
      ]),
    );
  const format = (set: RecordSet) =>
    `${(set.kg * factor).toFixed(1)} ${unit} × ${set.value} ${set.metric === "seconds" ? "seg" : "reps"}`;
  const advances = [...history]
    .flatMap(([id, records]) => {
      const last = records.at(-1);
      if (!last || Date.now() - last.date.getTime() > 90 * 864e5) return [];
      const result = improvement(last, records.at(-2));
      return result ? [{ id, date: last.date, result }] : [];
    })
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 3);
  const records = history.get(selected) ?? [],
    recent = records.slice(-5),
    plateau =
      recent.length === 5 &&
      Date.now() - recent[4]!.date.getTime() < 60 * 864e5 &&
      recent
        .slice(1)
        .every(
          (record, index) =>
            comparable(record, recent[index]) &&
            !improvement(record, recent[index]),
        );
  const lastSession = [...snapshot.sessions].sort(
    (a, b) => Date.parse(b.date) - Date.parse(a.date),
  )[0];
  return (
    <>
      <p className="page-description">
        {t(
          "Cambios reales en tus ejercicios y hábitos de entrenamiento.",
          "Real changes in your exercises and training habits.",
        )}
      </p>
      <section className="panel">
        <h2>Avances recientes</h2>
        {advances.length ? (
          advances.map(({ id, date, result }) => (
            <article className="result-card result-maintain" key={id}>
              <h3>
                {catalog.find((exercise) => exercise.id === id)?.name ?? id}
              </h3>
              <p>
                {format(result.before)} →{" "}
                <strong>{format(result.after)}</strong>
              </p>
              <small>{date.toLocaleDateString(locale)}</small>
            </article>
          ))
        ) : (
          <p>
            Aún no hay dos sesiones comparables de un ejercicio con una mejora
            registrada.
          </p>
        )}
        <p className="mt-3 text-sm text-muted-foreground">
          Se comparan series del mismo ejercicio y la misma métrica, con las
          mismas repeticiones/segundos o el mismo peso.
        </p>
      </section>
      <section className="panel">
        <h2>Frecuencia de entrenamiento</h2>
        <label>
          Meta semanal (opcional)
          <select
            value={goal}
            onChange={(event) =>
              change((draft) => {
                draft.settings.weeklyGoal = Number(event.target.value);
              })
            }
          >
            <option value={0}>Sin meta</option>
            {Array.from({ length: 7 }, (_, index) => (
              <option key={index} value={index + 1}>
                {index + 1} sesiones
              </option>
            ))}
          </select>
        </label>
        <div className="metric-grid">
          {weeks.slice(-4).map((week) => (
            <div key={week.start.toISOString()}>
              <small>
                {week.start.toLocaleDateString(locale, {
                  day: "numeric",
                  month: "short",
                })}
              </small>
              <strong>
                {week.sessions}
                {goal ? ` / ${goal}` : ""}
              </strong>
            </div>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          La semana actual sigue en curso; esta comparación no marca días
          perdidos.
        </p>
      </section>
      <section className="panel">
        <h2>Series por zona muscular</h2>
        <label>
          Período
          <select
            value={window}
            onChange={(event) => setWindow(Number(event.target.value))}
          >
            <option value={4}>4 semanas</option>
            <option value={8}>8 semanas</option>
          </select>
        </label>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Zona</th>
                {weeks.map((week) => (
                  <th key={week.start.toISOString()}>
                    {week.start.toLocaleDateString(locale, {
                      day: "numeric",
                      month: "short",
                    })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr key={group}>
                  <th>{group}</th>
                  {weeks.map((week) => (
                    <td key={week.start.toISOString()}>{week.groups[group]}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Octagon counts={counts} />
        <p className="text-sm text-muted-foreground">
          Cada ejercicio cuenta para su zona principal. No mide intensidad,
          recuperación ni entrenamiento de músculos secundarios.
        </p>
      </section>
      <section className="panel">
        <h2>Evolución por ejercicio</h2>
        <label>
          Elegí un ejercicio
          <select
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
          >
            <option value="">Seleccionar ejercicio</option>
            {[...history.keys()].map((id) => (
              <option key={id} value={id}>
                {catalog.find((exercise) => exercise.id === id)?.name ?? id}
              </option>
            ))}
          </select>
        </label>
        {selected && (
          <>
            {plateau && (
              <p className="result-card">
                Sin una mejora comparable en las últimas 4 sesiones. Es una
                señal para revisar tu entrenamiento, no un diagnóstico de
                estancamiento.
              </p>
            )}
            <p className="my-4">
              {records.length} sesiones ·{" "}
              {records.length > 1
                ? Math.round(
                    (records.at(-1)!.date.getTime() -
                      records[0]!.date.getTime()) /
                      864e5,
                  )
                : 0}{" "}
              días entre la primera y la última
            </p>
            <Trend
              values={records.map((record) =>
                Math.max(...record.sets.map((set) => set.kg * factor)),
              )}
              label={`Carga máxima (${unit})`}
            />
            <Trend
              values={records
                .filter((record) =>
                  record.sets.some((set) => set.metric === "reps"),
                )
                .map((record) =>
                  Math.max(
                    ...record.sets
                      .filter((set) => set.metric === "reps")
                      .map((set) => set.value),
                  ),
                )}
              label="Repeticiones máximas por serie"
            />
            <Trend
              values={records
                .filter((record) =>
                  record.sets.some((set) => set.metric === "seconds"),
                )
                .map((record) =>
                  Math.max(
                    ...record.sets
                      .filter((set) => set.metric === "seconds")
                      .map((set) => set.value),
                  ),
                )}
              label="Segundos máximos por serie"
            />
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Series registradas</th>
                  </tr>
                </thead>
                <tbody>
                  {records
                    .slice(-8)
                    .reverse()
                    .map((record, index) => (
                      <tr key={index}>
                        <td>{record.date.toLocaleDateString(locale)}</td>
                        <td>{record.sets.map(format).join(" · ")}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <p className="text-sm text-muted-foreground">
              Los gráficos muestran máximos por sesión, no una misma serie.
              Consultá la tabla para comparar peso y cantidad conjuntamente.
            </p>
          </>
        )}
      </section>
      <details className="panel">
        <summary>Estadísticas acumuladas</summary>
        <div className="metric-grid">
          <div>
            <strong>
              {snapshot.sessions.reduce(
                (sum, session) => sum + (session.sets ?? 0),
                0,
              )}
            </strong>
            <small>Series</small>
          </div>
          <div>
            <strong>
              {Math.round(
                snapshot.sessions.reduce(
                  (sum, session) =>
                    sum +
                    (session.volumeKg ??
                      (session.volume ?? 0) /
                        (session.weightUnit === "lb" ? 2.20462 : 1)),
                  0,
                ) * factor,
              )}{" "}
              {unit}
            </strong>
            <small>Volumen</small>
          </div>
          <div>
            <strong>
              {snapshot.sessions.reduce(
                (sum, session) => sum + (session.reps ?? 0),
                0,
              )}
            </strong>
            <small>Repeticiones</small>
          </div>
        </div>
      </details>
      {lastSession && (
        <Button
          className="mt-4"
          onClick={() => {
            void shareWorkoutPoster(snapshot, lastSession).catch(() =>
              notify("No se pudo compartir el entrenamiento."),
            );
          }}
        >
          Compartir último entrenamiento
        </Button>
      )}
    </>
  );
}
function Octagon({ counts }: { counts: Record<string, number> }) {
  const max = Math.max(1, ...Object.values(counts)),
    point = (index: number, scale: number) => {
      const angle = -Math.PI / 2 + (index * Math.PI) / 4;
      return `${180 + Math.cos(angle) * 100 * scale},${170 + Math.sin(angle) * 100 * scale}`;
    };
  return (
    <svg
      className="octagon-chart"
      viewBox="0 0 360 340"
      role="img"
      aria-label={`Series por grupo muscular: ${groups.map((group) => `${group} ${counts[group]}`).join(", ")}`}
    >
      {[0.25, 0.5, 0.75, 1].map((level) => (
        <polygon
          key={level}
          points={groups.map((_, index) => point(index, level)).join(" ")}
          fill="none"
          stroke="#363d4d"
        />
      ))}
      <polygon
        points={groups
          .map((group, index) => point(index, (counts[group] ?? 0) / max))
          .join(" ")}
        fill="#ff553850"
        stroke="#ff8a4c"
        strokeWidth={2}
      />
      {groups.map((group, index) => {
        const angle = -Math.PI / 2 + (index * Math.PI) / 4;
        return (
          <text
            key={group}
            x={180 + Math.cos(angle) * 142}
            y={170 + Math.sin(angle) * 142}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#b9c3d6"
            fontSize={12}
          >
            {group}
          </text>
        );
      })}
    </svg>
  );
}
function Trend({ values, label }: { values: number[]; label: string }) {
  if (!values.length) return null;
  const low = Math.min(...values),
    high = Math.max(...values),
    points = values
      .map(
        (value, index) =>
          `${30 + (index / Math.max(1, values.length - 1)) * 270},${145 - ((value - low) / Math.max(1, high - low)) * 110}`,
      )
      .join(" ");
  return (
    <div className="my-4">
      <h3>{label}</h3>
      <svg
        viewBox="0 0 330 180"
        className="trend-chart"
        role="img"
        aria-label={`${label}: ${values.join(", ")}`}
      >
        <text x={0} y={20} fill="#b9c3d6">
          {high.toFixed(1)}
        </text>
        <text x={0} y={170} fill="#b9c3d6">
          {low.toFixed(1)}
        </text>
        <polyline
          points={points}
          fill="none"
          stroke="#ff8a4c"
          strokeWidth={3}
        />
        {points.split(" ").map((point, index) => (
          <circle
            key={index}
            cx={point.split(",")[0]}
            cy={point.split(",")[1]}
            r={4}
            fill="#ff8a4c"
          >
            <title>{values[index]?.toFixed(1)}</title>
          </circle>
        ))}
      </svg>
    </div>
  );
}
