"use client";
import { useState } from "react";
import { AppDialog } from "@/components/ui/app-dialog";
import { useClock } from "./clock-provider";
import { useApp } from "@/state/app-provider";
import { combatPresets, timeFormat, type CombatConfig } from "@/domain/combat";
import { routePoints } from "@/domain/tracking";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
export function ClocksScreen() {
  const [editingTimer, setEditingTimer] = useState(false);
  const [duration, setDuration] = useState({
    hours: "0",
    minutes: "0",
    seconds: "30",
  });
  const clock = useClock(),
    { snapshot, change, t } = useApp(),
    combat = clock.combat,
    phase = combat.state.phase;
  const elapsed = clock.sw.running
      ? clock.now - clock.sw.started
      : clock.sw.elapsed,
    track = clock.track,
    distance =
      snapshot.settings.distance === "mi"
        ? track.distance / 1609.344
        : track.distance / 1000;
  const kg =
      Number(snapshot.profile.weight ?? 75) /
      (snapshot.settings.weight === "lb" ? 2.20462 : 1),
    pace =
      distance && track.elapsed
        ? track.mode === "cycle"
          ? `${(distance / (track.elapsed / 3600)).toFixed(1)} ${snapshot.settings.distance === "mi" ? "mph" : "km/h"}`
          : `${timeFormat(track.elapsed / distance)} /${snapshot.settings.distance}`
        : "—";
  return (
    <>
      <div className="muscle-chips">
        {[
          ["stopwatch", "Cronómetro"],
          ["timer", "Timer"],
          ["combat", "Combate"],
          ["tracking", "Tracking"],
        ].map(([id, name]) => (
          <button
            key={id}
            aria-pressed={clock.section === id}
            onClick={() => {
              if (id) clock.setSection(id);
            }}
          >
            {t(
              name ?? "",
              name === "Cronómetro"
                ? "Stopwatch"
                : name === "Combate"
                  ? "Combat"
                  : (name ?? ""),
            )}
          </button>
        ))}
      </div>
      {clock.section === "stopwatch" && (
        <section className="panel">
          <div className="clock-face" role="timer" aria-label="Cronómetro">
            {timeFormat(elapsed / 1000)}
          </div>
          <div className="flex justify-center gap-3">
            <Button onClick={clock.toggleSw}>
              {clock.sw.running ? "Pausar" : "Iniciar"}
            </Button>
            <Button variant="secondary" onClick={clock.resetSw}>
              Reiniciar
            </Button>
          </div>
        </section>
      )}
      {clock.section === "timer" && (
        <section className="panel">
          <div className="clock-face" role="timer" aria-label="Timer">
            <button
              type="button"
              className="timer-duration-button"
              aria-label={t("Editar tiempo del timer", "Edit timer duration")}
              onClick={() => {
                const seconds = Math.ceil(clock.timer.remaining);
                setDuration({
                  hours: String(Math.floor(seconds / 3600)),
                  minutes: String(Math.floor(seconds / 60) % 60),
                  seconds: String(seconds % 60),
                });
                setEditingTimer(true);
              }}
            >
              {timeFormat(clock.timer.remaining)}
            </button>
          </div>
          <AppDialog
            open={editingTimer}
            onClose={() => setEditingTimer(false)}
            title={t("Tiempo del timer", "Timer duration")}
            description={t(
              "Elegí la duración. Al guardar, el timer queda listo para iniciar.",
              "Choose a duration. Saving prepares the timer to start.",
            )}
          >
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const seconds =
                  Number(duration.hours) * 3600 +
                  Number(duration.minutes) * 60 +
                  Number(duration.seconds);
                if (!Number.isInteger(seconds) || seconds <= 0) return;
                clock.preset(seconds);
                setEditingTimer(false);
              }}
            >
              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    ["hours", t("Horas", "Hours"), 999],
                    ["minutes", t("Minutos", "Minutes"), 59],
                    ["seconds", t("Segundos", "Seconds"), 59],
                  ] as const
                ).map(([key, label, max]) => (
                  <label key={key}>
                    {label}
                    <Input
                      type="number"
                      min={0}
                      max={max}
                      step={1}
                      required
                      value={duration[key]}
                      onChange={(event) =>
                        setDuration((previous) => ({
                          ...previous,
                          [key]: event.target.value,
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
              <div className="mt-4 flex justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setEditingTimer(false)}
                >
                  {t("Cancelar", "Cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={
                    Number(duration.hours) * 3600 +
                      Number(duration.minutes) * 60 +
                      Number(duration.seconds) <=
                    0
                  }
                >
                  {t("Guardar tiempo", "Save duration")}
                </Button>
              </div>
            </form>
          </AppDialog>
          <div className="my-4 flex flex-wrap justify-center gap-2">
            {[
              [15, "15seg"],
              [30, "30seg"],
              [60, "1min"],
              [180, "3min"],
              [300, "5min"],
            ].map(([seconds, label]) => (
              <Button
                variant="secondary"
                key={seconds}
                onClick={() => clock.preset(Number(seconds))}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className="flex justify-center gap-3">
            <Button onClick={clock.toggleTimer}>
              {clock.timer.running ? "Pausar" : "Iniciar"}
            </Button>
            <Button variant="secondary" onClick={() => clock.preset(30)}>
              Reiniciar
            </Button>
          </div>
        </section>
      )}
      {clock.section === "combat" && (
        <section className="panel">
          <p className="text-center text-orange-300">
            {phase === "done"
              ? "Sesión terminada"
              : phase === "prep"
                ? "Preparación"
                : phase === "work"
                  ? "Trabajo"
                  : "Descanso"}{" "}
            · Ronda {combat.state.round}/{combat.config.rounds}
          </p>
          <div
            className="clock-face combat-face"
            role="timer"
            aria-label="Combate"
          >
            {timeFormat(combat.state.remaining)}
          </div>
          <div className="muscle-chips">
            {Object.entries(combatPresets).map(([mode, preset]) => (
              <button
                key={mode}
                aria-pressed={combat.config.mode === mode}
                onClick={() =>
                  clock.configureCombat({
                    mode: mode as CombatConfig["mode"],
                    ...preset,
                    prep: combat.config.prep,
                  })
                }
              >
                {mode === "muay-thai"
                  ? "Muay Thai"
                  : mode === "boxeo"
                    ? "Boxeo"
                    : mode.toUpperCase()}
              </button>
            ))}
          </div>
          <div className="form-grid">
            {(["rounds", "work", "rest", "prep"] as const).map(
              (field, index) => (
                <label key={field}>
                  {
                    [
                      "Rondas",
                      "Trabajo (seg)",
                      "Descanso (seg)",
                      "Preparación (seg)",
                    ][index]
                  }
                  <Input
                    type="number"
                    min={field === "rounds" || field === "work" ? 1 : 0}
                    max={
                      field === "rounds" ? 100 : field === "prep" ? 600 : 3600
                    }
                    value={combat.config[field]}
                    disabled={combat.state.running}
                    onChange={(event) =>
                      clock.configureCombat({
                        ...combat.config,
                        [field]: Number(event.target.value),
                      })
                    }
                  />
                </label>
              ),
            )}
          </div>
          <label className="my-5 flex items-center gap-3">
            <input
              type="checkbox"
              checked={snapshot.settings.combatSound !== false}
              onChange={(event) =>
                change((draft) => {
                  draft.settings.combatSound = event.target.checked;
                })
              }
            />
            Sonido: inicio de round, últimos 15 segundos y final
          </label>
          <div className="flex justify-center gap-3">
            <Button onClick={clock.toggleCombat}>
              {combat.state.running ? "Pausar" : "Iniciar"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => clock.configureCombat(combat.config)}
            >
              Reiniciar
            </Button>
          </div>
        </section>
      )}
      {clock.section === "tracking" && (
        <section className="panel">
          <div className="my-3 flex gap-3">
            <Button
              variant="secondary"
              onClick={() => clock.configureTrack({ mode: "run" })}
            >
              Correr
            </Button>
            <Button
              variant="secondary"
              onClick={() => clock.configureTrack({ mode: "cycle" })}
            >
              Ciclismo
            </Button>
          </div>
          <label>
            Preparación inicial (seg)
            <Input
              type="number"
              min={0}
              max={600}
              value={track.prep}
              disabled={track.running || track.preparing}
              onChange={(event) =>
                clock.configureTrack({
                  prep: Math.max(0, Math.min(600, Number(event.target.value))),
                })
              }
            />
          </label>
          {track.preparing && (
            <p className="my-3">
              Preparación: {timeFormat((track.prepEnd - clock.now) / 1000)}
            </p>
          )}
          <svg
            viewBox="0 0 320 210"
            className="route-map"
            role="img"
            aria-label="Ruta realizada"
          >
            <polyline
              points={routePoints(track.points)}
              fill="none"
              stroke="#ff8a4c"
              strokeWidth={4}
            />
          </svg>
          {track.error && <p role="alert">{track.error}</p>}
          <div className="metric-grid">
            <div>
              <strong>{timeFormat(track.elapsed)}</strong>
              <small>Tiempo</small>
            </div>
            <div>
              <strong>
                {distance.toFixed(2)} {snapshot.settings.distance}
              </strong>
              <small>Distancia</small>
            </div>
            <div>
              <strong>{pace}</strong>
              <small>{track.mode === "cycle" ? "Velocidad" : "Ritmo"}</small>
            </div>
            <div>
              <strong>
                {Math.round(
                  ((track.mode === "run" ? 9.8 : 7.5) * kg * track.elapsed) /
                    3600,
                )}{" "}
                kcal
              </strong>
              <small>Estimación</small>
            </div>
          </div>
          <div className="mt-5 flex justify-center gap-3">
            <Button onClick={clock.toggleTrack}>
              {track.preparing
                ? "Cancelar preparación"
                : track.running
                  ? "Finalizar"
                  : "Iniciar GPS"}
            </Button>
            <Button
              variant="secondary"
              disabled={track.running || track.preparing}
              onClick={clock.resetTrack}
            >
              Reiniciar
            </Button>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            La ruta queda en el reloj durante esta sesión. No es tracking
            nativo: el navegador puede limitar el GPS o el sonido en segundo
            plano.
          </p>
        </section>
      )}
    </>
  );
}
