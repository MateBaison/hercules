"use client";
import { useState } from "react";
import { localizedSetTypes } from "@/data/set-types";
import { CircleHelp } from "lucide-react";
import { AppDialog } from "@/components/ui/app-dialog";
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
  const [editingType, setEditingType] = useState<number | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const types = [
    {
      id: "warmup",
      letter: "C",
      name: t("Calentamiento", "Warm-up"),
      help: t(
        "Usá una carga liviana para preparar el movimiento y practicar la técnica antes de las series de trabajo, sin agotarte.",
        "Use a light load to prepare the movement and practice technique before working sets, without tiring yourself out.",
      ),
    },
    {
      id: "normal",
      letter: "N",
      name: t("Normal", "Normal"),
      help: t(
        "Realizá las repeticiones previstas con una carga adecuada y buena técnica. Descansá antes de la siguiente serie.",
        "Perform your planned repetitions with an appropriate load and good technique. Rest before the next set.",
      ),
    },
    {
      id: "failure",
      letter: "F",
      name: t("Fallo", "Failure"),
      help: t(
        "Llegás al límite de repeticiones que podés completar con buena técnica. Registrá solo las repeticiones completas y no fuerces una repetición insegura; usá asistencia o protecciones si corresponde.",
        "Reach the limit of repetitions you can complete with good form. Log completed repetitions only; do not force an unsafe repetition. Use a spotter or safety equipment when appropriate.",
      ),
    },
    {
      id: "drop",
      letter: "D",
      name: t("Descendente", "Drop set"),
      help: t(
        "Empezá con una carga que permita unas 8–12 repeticiones con buena técnica, no con tu peso máximo. Al llegar al fallo técnico, reducí un 20–25% del peso que estás usando y continuá con poco descanso. Podés hacer 1–3 bajadas. Ejemplo con 20%: 40 → 32 → 25,5 kg, ajustando a los pesos disponibles. Registrá cada tramo por separado.",
        "Start with a load you can lift for about 8–12 controlled repetitions, not your maximum weight. At technical failure, reduce the current load by 20–25% and continue with little rest. Use 1–3 drops. Example at 20%: 40 → 32 → 25.5 kg, adjusted to available weights. Log each segment separately.",
      ),
    },
  ].map((type, index) => ({
    ...type,
    ...localizedSetTypes(snapshot.settings.language ?? "es")[index],
  }));
  return (
    <>
      <AppDialog
        open={editingType !== null}
        onClose={() => setEditingType(null)}
        title={t("Tipo de serie", "Set type")}
        titleAction={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="set-type-help"
            aria-label={t("Ayuda sobre tipos de serie", "Help with set types")}
            aria-expanded={showHelp}
            onClick={() => setShowHelp(!showHelp)}
          >
            <CircleHelp />
          </Button>
        }
      >
        <div className="space-y-3">
          {types.map((type) => (
            <div key={type.id}>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                aria-pressed={
                  editingType !== null &&
                  (entry.sets[editingType]?.type ?? "normal") === type.id
                }
                onClick={() => {
                  const number = editingType;
                  if (number !== null)
                    onChange((draft) => {
                      const set = draft.sets[number];
                      if (set) set.type = type.id;
                    });
                  setEditingType(null);
                }}
              >
                <span className="set-type-letter" data-set-type={type.id}>
                  {type.letter}
                </span>
                {type.name}
              </Button>
              {showHelp && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {type.help}
                </p>
              )}
            </div>
          ))}
        </div>
      </AppDialog>
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
        <span>{t("Tipo", "Type")}</span>
      </div>
      {entry.sets.map((set, number) => (
        <div className="set-grid-row" key={number} data-set-row={number}>
          <b>{number + 1}</b>
          <button
            type="button"
            className="previous-set"
            disabled={!previous[number]}
            aria-label={`${t("Usar datos anteriores", "Use previous values")} ${index + 1} ${t("serie", "set")} ${number + 1}`}
            onClick={() => {
              const old = previous[number];
              if (old)
                onChange((draft) => {
                  const current = draft.sets[number];
                  if (current) {
                    current.kg = old.kg;
                    current.type = old.type ?? "normal";
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
            aria-label={`${t("Peso", "Weight")} ${index + 1} ${t("serie", "set")} ${number + 1}`}
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
            aria-label={`${metric === "seconds" ? t("Segundos", "Seconds") : t("Repeticiones", "Repetitions")} ${index + 1} ${t("serie", "set")} ${number + 1}`}
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
          <button
            type="button"
            className="set-type-letter set-type-control"
            data-set-type={
              types.find((type) => type.id === set.type)?.id ?? "normal"
            }
            aria-label={`${t("Tipo de serie", "Set type")} ${index + 1} ${t("serie", "set")} ${number + 1}`}
            onClick={() => {
              setEditingType(number);
              setShowHelp(false);
            }}
          >
            {types.find((type) => type.id === set.type)?.letter ?? "N"}
          </button>
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
