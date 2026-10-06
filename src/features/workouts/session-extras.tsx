"use client";
import { useState } from "react";
import { useApp } from "@/state/app-provider";
import type { Extras } from "@/domain/workouts";
import { compressedPhoto, safePhoto } from "@/lib/browser/photos";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export const emptyExtras: Extras = {
  color: "#ff5538",
  comment: "",
  photos: [],
  bodyWeightStartKg: null,
  bodyWeightEndKg: null,
};
export function SessionExtras({
  value,
  onChange,
}: {
  value: Extras;
  onChange: (value: Extras) => void;
}) {
  const { snapshot, t, notify } = useApp(),
    [busy, setBusy] = useState(false),
    factor = snapshot.settings.weight === "lb" ? 2.20462 : 1;
  return (
    <div className="space-y-4">
      <label className="block">
        {t("Color del calendario", "Calendar color")}
        <Input
          type="color"
          value={value.color}
          onChange={(event) =>
            onChange({ ...value, color: event.target.value })
          }
        />
      </label>
      <label className="block">
        {t("Comentario del entrenamiento", "Workout comment")}
        <textarea
          maxLength={2000}
          value={value.comment}
          onChange={(event) =>
            onChange({ ...value, comment: event.target.value })
          }
        />
      </label>
      <div className="form-grid">
        {(["bodyWeightStartKg", "bodyWeightEndKg"] as const).map(
          (key, index) => (
            <label key={key}>
              {t(
                index ? "Peso corporal final" : "Peso corporal inicial",
                index ? "Final body weight" : "Initial body weight",
              )}{" "}
              ({snapshot.settings.weight})
              <Input
                type="number"
                min={1}
                step={0.1}
                value={
                  value[key] === null
                    ? ""
                    : Math.round(value[key] * factor * 10) / 10
                }
                onChange={(event) =>
                  onChange({
                    ...value,
                    [key]:
                      event.target.value === ""
                        ? null
                        : Number(event.target.value) / factor,
                  })
                }
              />
            </label>
          ),
        )}
      </div>
      <label className="block">
        {t("Fotos del entrenamiento (hasta 3)", "Workout photos (up to 3)")}
        <Input
          type="file"
          accept="image/*"
          multiple
          disabled={busy || value.photos.length >= 3}
          onChange={async (event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length + value.photos.length > 3) {
              notify("Podés guardar hasta 3 fotos.");
              return;
            }
            setBusy(true);
            try {
              const photos = await Promise.all(
                files.map((file) => compressedPhoto(file)),
              );
              onChange({ ...value, photos: [...value.photos, ...photos] });
            } catch (error) {
              notify(
                error instanceof Error
                  ? error.message
                  : "No se pudo cargar la foto.",
              );
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      <div className="flex flex-wrap gap-3">
        {value.photos.map((photo, index) => (
          <div key={index}>
            {safePhoto(photo) && (
              <img
                src={photo}
                alt="Foto del entrenamiento"
                className="h-24 w-24 rounded-xl object-cover"
              />
            )}
            <Button
              variant="ghost"
              onClick={() =>
                onChange({
                  ...value,
                  photos: value.photos.filter((_, number) => number !== index),
                })
              }
            >
              Quitar foto
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
