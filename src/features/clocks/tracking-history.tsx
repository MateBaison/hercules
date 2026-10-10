"use client";
import { useState } from "react";
import { useApp } from "@/state/app-provider";
import { localeFor } from "@/data/translations";
import type { TrackingSession } from "@/domain/schemas/snapshot";
import { Button } from "@/components/ui/button";
import { AppDialog } from "@/components/ui/app-dialog";
import { RouteMap } from "./route-map";
import { timeFormat } from "@/domain/combat";

export function TrackingHistory() {
  const { snapshot, t } = useApp();
  const [selected, setSelected] = useState<TrackingSession | null>(null);
  const sessions = [...(snapshot.trackingSessions ?? [])].sort(
    (a, b) => Date.parse(b.date) - Date.parse(a.date),
  );
  const description = (route: TrackingSession) =>
    `${new Date(route.date).toLocaleString(localeFor(snapshot.settings.language))} · ${route.mode === "cycle" ? t("Ciclismo", "Cycling") : t("Correr", "Running")} · ${(route.distanceMeters / (snapshot.settings.distance === "mi" ? 1609.344 : 1000)).toFixed(2)} ${snapshot.settings.distance} · ${timeFormat(route.durationSeconds)}`;
  return (
    <section className="mt-6 space-y-3">
      <h3 className="font-bold">{t("Recorridos guardados", "Saved routes")}</h3>
      {!sessions.length && (
        <p className="text-sm text-muted-foreground">
          {t(
            "Al finalizar una actividad con GPS, tu recorrido se guarda aquí.",
            "Finish a GPS activity to save its route here.",
          )}
        </p>
      )}
      {sessions.map((route) => (
        <Button
          key={route.id}
          type="button"
          variant="secondary"
          className="h-auto w-full justify-start whitespace-normal p-3 text-start"
          onClick={() => setSelected(route)}
        >
          {description(route)}
        </Button>
      ))}
      <AppDialog
        open={selected !== null}
        onClose={() => setSelected(null)}
        title={t("Recorrido guardado", "Saved route")}
      >
        {selected && (
          <>
            <p className="text-sm">{description(selected)}</p>
            <RouteMap key={selected.id} points={selected.points} />
          </>
        )}
      </AppDialog>
    </section>
  );
}
