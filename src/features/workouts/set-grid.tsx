"use client";
import { useApp } from "@/state/app-provider";
import {
  blankSet,
  metricFor,
  previousSets,
  type Entry,
} from "@/domain/workouts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export function SetGrid({
  entry,
  index,
  started,
  onChange,
}: {
  entry: Entry;
  index: number;
  started: number;
  onChange: (edit: (draft: Entry) => void) => void;
}) {
  const { snapshot, t } = useApp(),
    metric = metricFor(snapshot, entry.id, entry),
    previous = previousSets(snapshot, entry.id, metric, started);
  return (
    <>
      <label className="block text-sm text-muted-foreground">
        {t("Cómo registrar", "Tracking metric")}
        <select
          value={metric}
          onChange={(event) => {
            const value = event.target.value;
            onChange((draft) => {
              draft.tracking = value === "seconds" ? "seconds" : "reps";
            });
          }}
        >
          <option value="reps">{t("Repeticiones", "Repetitions")}</option>
          <option value="seconds">
            {t("Tiempo (segundos)", "Time (seconds)")}
          </option>
        </select>
      </label>
      <div className="set-grid-heading">
        <span>{t("Series", "Sets")}</span>
        <span>{t("Anterior", "Previous")}</span>
        <span>{snapshot.settings.weight ?? "kg"}</span>
        <span>
          {metric === "seconds"
            ? t("Segundos", "Seconds")
            : t("Repeticiones", "Repetitions")}
        </span>
      </div>
      {entry.sets.map((set, number) => (
        <div className="set-grid-row" key={number} data-set-row={number}>
          <b>{number + 1}</b>
          <button
            type="button"
            className="previous-set"
            disabled={!previous[number]}
            aria-label={`Usar datos anteriores ${index + 1} serie ${number + 1}`}
            onClick={() => {
              const old = previous[number];
              if (old)
                onChange((draft) => {
                  const current = draft.sets[number];
                  if (current) {
                    current.kg = old.kg;
                    current[metric] = old.value;
                    current.entered = true;
                  }
                });
            }}
          >
            {previous[number] ? (
              <>
                <strong>
                  {previous[number]?.kg} {snapshot.settings.weight}
                </strong>
                <small>
                  × {previous[number]?.value}{" "}
                  {metric === "seconds" ? "s" : "reps"}
                </small>
              </>
            ) : (
              "—"
            )}
          </button>
          <Input
            type="number"
            min={0}
            step={0.5}
            inputMode="decimal"
            aria-label={`Peso ${index + 1} serie ${number + 1}`}
            value={set.kg ?? ""}
            onChange={(event) => {
              const value =
                event.target.value === ""
                  ? null
                  : Math.max(0, Number(event.target.value));
              onChange((draft) => {
                const current = draft.sets[number];
                if (current) {
                  current.kg = value;
                  current.entered = value !== null || current[metric] != null;
                }
              });
            }}
          />
          <Input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            aria-label={`${metric === "seconds" ? "Segundos" : "Repeticiones"} ${index + 1} serie ${number + 1}`}
            value={set[metric] ?? ""}
            onChange={(event) => {
              const value =
                event.target.value === ""
                  ? null
                  : Math.max(0, Math.floor(Number(event.target.value)));
              onChange((draft) => {
                const current = draft.sets[number];
                if (current) {
                  current[metric] = value;
                  current.entered = value !== null || current.kg != null;
                }
              });
            }}
          />
        </div>
      ))}
      <div className="set-tools my-4 flex justify-between gap-2">
        <Button
          variant="secondary"
          disabled={entry.sets.length <= 1}
          onClick={() =>
            onChange((draft) => {
              draft.sets.pop();
            })
          }
        >
          − {t("Eliminar última serie", "Remove last set")}
        </Button>
        <Button
          variant="secondary"
          onClick={() =>
            onChange((draft) => {
              draft.sets.push(blankSet(metric));
            })
          }
        >
          ＋ {t("Agregar serie", "Add set")}
        </Button>
      </div>
      <label className="block">
        {t("Nota de este ejercicio", "Note for this exercise")}
        <textarea
          aria-label={`Nota ejercicio ${index + 1}`}
          maxLength={1000}
          value={entry.note ?? ""}
          onChange={(event) =>
            onChange((draft) => {
              draft.note = event.target.value;
            })
          }
        />
      </label>
    </>
  );
}
