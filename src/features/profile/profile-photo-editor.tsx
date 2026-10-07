"use client";
import { useEffect, useRef, useState } from "react";
import { AppDialog } from "@/components/ui/app-dialog";
import { useApp } from "@/state/app-provider";
import { Button } from "@/components/ui/button";

export function ProfilePhotoEditor({
  source,
  onClose,
  onApply,
}: {
  source: string | null;
  onClose: () => void;
  onApply: (photo: string) => void;
}) {
  const { t } = useApp();
  const canvas = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [error, setError] = useState("");
  useEffect(() => {
    setImage(null);
    setZoom(1);
    setX(50);
    setY(50);
    setError("");
    if (!source) return;
    let active = true;
    const next = new Image();
    next.src = source;
    void next
      .decode()
      .then(() => {
        if (active) setImage(next);
      })
      .catch(() => {
        if (active) setError("No se pudo preparar la foto.");
      });
    return () => {
      active = false;
    };
  }, [source]);
  useEffect(() => {
    if (!image || !canvas.current) return;
    const ctx = canvas.current.getContext("2d");
    if (!ctx) {
      setError("Este navegador no permite recortar la imagen.");
      return;
    }
    const side = Math.min(image.naturalWidth, image.naturalHeight) / zoom;
    ctx.clearRect(0, 0, 360, 360);
    ctx.drawImage(
      image,
      ((image.naturalWidth - side) * x) / 100,
      ((image.naturalHeight - side) * y) / 100,
      side,
      side,
      0,
      0,
      360,
      360,
    );
  }, [image, zoom, x, y]);
  return (
    <AppDialog
      open={source !== null}
      onClose={onClose}
      title={t("Recortar y ajustar foto", "Crop and adjust photo")}
      description={t(
        "Ajustá el zoom y la posición. La vista circular muestra cómo quedará tu foto de perfil.",
        "Adjust the zoom and position. The circular preview shows how your profile photo will look.",
      )}
    >
      <canvas
        ref={canvas}
        width={360}
        height={360}
        className="profile-crop-preview"
        aria-label={t(
          "Vista previa de la foto recortada",
          "Cropped photo preview",
        )}
      />
      {error && <p role="alert">{error}</p>}
      <div className="flex flex-col gap-3">
        <label>
          Zoom
          <input
            type="range"
            aria-label={t("Zoom de la foto", "Photo zoom")}
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(event) => setZoom(Number(event.target.value))}
          />
        </label>
        <label>
          {t("Posición horizontal", "Horizontal position")}
          <input
            type="range"
            aria-label={t(
              "Posición horizontal de la foto",
              "Horizontal photo position",
            )}
            min={0}
            max={100}
            value={x}
            onChange={(event) => setX(Number(event.target.value))}
          />
        </label>
        <label>
          {t("Posición vertical", "Vertical position")}
          <input
            type="range"
            aria-label={t(
              "Posición vertical de la foto",
              "Vertical photo position",
            )}
            min={0}
            max={100}
            value={y}
            onChange={(event) => setY(Number(event.target.value))}
          />
        </label>
      </div>
      <div className="flex flex-wrap justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onClose}>
          {t("Cancelar", "Cancel")}
        </Button>
        <Button
          type="button"
          disabled={!image || !!error}
          onClick={() => {
            if (canvas.current)
              onApply(canvas.current.toDataURL("image/jpeg", 0.85));
          }}
        >
          {t("Usar esta foto", "Use this photo")}
        </Button>
      </div>
    </AppDialog>
  );
}
