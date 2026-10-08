"use client";
import { useState } from "react";
import { AppDialog } from "@/components/ui/app-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { catalogFor, findExercise, type Entry } from "@/domain/workouts";
import { replacementPlan } from "@/domain/exercise-replacement";
import { useApp } from "@/state/app-provider";
export function ReplacementDialog({
  entry,
  onClose,
  onReplace,
}: {
  entry: Entry;
  onClose: () => void;
  onReplace: (id: string) => void;
}) {
  const { snapshot, t } = useApp();
  const source = findExercise(snapshot, entry.id);
  const [query, setQuery] = useState("");
  const [target, setTarget] = useState("");
  const [all, setAll] = useState(false);
  const list = catalogFor(snapshot)
    .filter(
      (item) =>
        item.id !== entry.id &&
        (all || item.group === source?.group) &&
        item.name.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
    )
    .sort(
      (a, b) =>
        Number(b.pattern === source?.pattern) -
        Number(a.pattern === source?.pattern),
    );
  const plan = target ? replacementPlan(snapshot, entry, target) : null;
  return (
    <AppDialog
      open
      onClose={onClose}
      title={t("Reemplazar ejercicio", "Replace exercise")}
      description={source?.name ?? entry.id}
    >
      <Input
        aria-label={t("Buscar reemplazo", "Search replacement")}
        placeholder={t("Buscar ejercicio", "Search exercise")}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={all}
          onChange={(event) => setAll(event.target.checked)}
        />
        {t("Mostrar todas las zonas", "Show all muscle groups")}
      </label>
      <label>
        {t("Ejercicio alternativo", "Alternative exercise")}
        <select
          value={target}
          onChange={(event) => setTarget(event.target.value)}
        >
          <option value="">
            {t("Elegí un ejercicio", "Choose an exercise")}
          </option>
          {list.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
              {item.pattern === source?.pattern
                ? t(" · movimiento similar", " · similar movement")
                : ""}
            </option>
          ))}
        </select>
      </label>
      {plan && (
        <div className="space-y-3">
          <strong>
            {t("Propuesta inicial", "Starting suggestion")}: {plan.sets.length}{" "}
            {t("series", "sets")}
          </strong>
          <p className="text-sm text-muted-foreground">
            {plan.hasHistory
              ? t(
                  "Los pesos y cantidades se basan en tu historial del ejercicio alternativo. Ajustalos según cómo te sientas hoy.",
                  "Loads and quantities are based on your history for the alternative exercise. Adjust them based on how you feel today.",
                )
              : t(
                  "Sin historial del ejercicio alternativo: no se convierte el peso original entre máquinas. Probá una carga liviana que te permita completar la cantidad propuesta con buena técnica y margen; ingresá el peso antes de registrar la serie.",
                  "No history for the alternative exercise: original loads are not converted between machines. Try a light load that lets you complete the suggested quantity with good form and some reserve; enter the load before logging the set.",
                )}
          </p>
          <div className="space-y-1">
            {plan.sets.map((set, index) => (
              <p key={index}>
                {index + 1}.{" "}
                {set.kg == null
                  ? t("Peso a ajustar", "Choose a load")
                  : `${set.kg} ${snapshot.settings.weight ?? "kg"}`}{" "}
                · {String(set[plan.metric])}{" "}
                {plan.metric === "seconds"
                  ? t("segundos", "seconds")
                  : t("repeticiones", "repetitions")}
              </p>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            {t(
              "Se mantiene la cantidad de series pendientes del original. Si cambia entre repeticiones y tiempo, se usa tu historial o una propuesta inicial de 10 repeticiones / 30 segundos; no son equivalencias. Podés ajustar todo antes de registrar. Las series ya ingresadas se conservan y la rutina guardada no cambia.",
              "The original pending set count is retained. When switching between repetitions and time, your history or a starting suggestion of 10 reps / 30 seconds is used; these are not equivalents. Adjust before logging. Previously entered sets are preserved and your saved routine stays unchanged.",
            )}
          </p>
        </div>
      )}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onClose}>
          {t("Cancelar", "Cancel")}
        </Button>
        <Button
          type="button"
          disabled={!target}
          onClick={() => onReplace(target)}
        >
          {t("Usar reemplazo", "Use replacement")}
        </Button>
      </div>
    </AppDialog>
  );
}
