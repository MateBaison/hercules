"use client";
import { useEffect, useRef, useState } from "react";
import type { Map, Polyline, CircleMarker } from "leaflet";
import "leaflet/dist/leaflet.css";
import "maplibre-gl/dist/maplibre-gl.css";
import type { StyleSpecification } from "maplibre-gl";
import { quietMapStyle } from "@/lib/browser/map-style";
import type { Point } from "@/domain/tracking";
import { useApp } from "@/state/app-provider";
import { Button } from "@/components/ui/button";

export function RouteMap({
  points,
  live = false,
  locateOnOpen = false,
}: {
  points: Point[];
  live?: boolean;
  locateOnOpen?: boolean;
}) {
  const { t } = useApp();
  const element = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const layers = useRef<{
    line: Polyline;
    current: CircleMarker;
    start: CircleMarker;
  } | null>(null);
  const [ready, setReady] = useState(false);
  const [follow, setFollow] = useState(true);
  const [tileError, setTileError] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [previewPosition, setPreviewPosition] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const initializedView = useRef(false);
  const latestPoints = useRef(points);
  latestPoints.current = points;
  const latestLive = useRef(live);
  latestLive.current = live;
  useEffect(() => {
    let disposed = false;
    let resize: ResizeObserver | undefined;
    const controller = new AbortController();
    void import("leaflet")
      .then((L) => {
        if (disposed || !element.current) return;
        const instance = L.map(element.current, {
          scrollWheelZoom: false,
          minZoom: 1,
          maxZoom: 19,
        }).setView([0, 0], 2);
        map.current = instance;
        instance.attributionControl.addAttribution(
          '<a href="https://openfreemap.org">OpenFreeMap</a> &copy; <a href="https://openmaptiles.org">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        );
        void Promise.all([
          import("@maplibre/maplibre-gl-leaflet"),
          import("maplibre-gl"),
          fetch("https://tiles.openfreemap.org/styles/positron", {
            signal: controller.signal,
          }).then((response) => {
            if (!response.ok) throw new Error("Map style unavailable");
            return response.json() as Promise<StyleSpecification>;
          }),
        ])
          .then(([adapter, libre, style]) => {
            if (disposed) return;
            libre.setWorkerUrl(
              new URL(
                "maplibre-gl/dist/maplibre-gl-worker.mjs",
                import.meta.url,
              ).href,
            );
            const background = adapter
              .maplibreGL({
                style: quietMapStyle(style),
                attributionControl: false,
              })
              .addTo(instance);
            background.getMaplibreMap().on("error", () => {
              if (!disposed) setTileError(true);
            });
            background.getMaplibreMap().on("load", () => {
              if (!disposed && element.current)
                element.current.dataset.basemapReady = "true";
            });
          })
          .catch(() => {
            if (!disposed) setTileError(true);
          });
        layers.current = {
          line: L.polyline([], { color: "#ff5538", weight: 5 }).addTo(instance),
          current: L.circleMarker([0, 0], {
            radius: 7,
            color: "#fff",
            weight: 2,
            fillColor: "#38bdf8",
            fillOpacity: 0,
            opacity: 0,
          }).addTo(instance),
          start: L.circleMarker([0, 0], {
            radius: 6,
            color: "#fff",
            weight: 2,
            fillColor: "#4ade80",
            fillOpacity: 0,
            opacity: 0,
          }).addTo(instance),
        };
        instance.on("dragstart", () => setFollow(false));
        resize = new ResizeObserver(() => instance.invalidateSize());
        resize.observe(element.current);
        setReady(true);
      })
      .catch(() => {
        if (!disposed) setTileError(true);
      });
    return () => {
      disposed = true;
      controller.abort();
      resize?.disconnect();
      map.current?.remove();
      map.current = null;
      layers.current = null;
    };
  }, []);
  useEffect(() => {
    if (!ready || !locateOnOpen || latestLive.current) return;
    const instance = map.current;
    const initialPoints = latestPoints.current;
    let cancelled = false;
    if (typeof navigator.geolocation?.getCurrentPosition !== "function") {
      setLocationError(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (cancelled || map.current !== instance || !instance) return;
        // A delayed initial fix must not overwrite a route that has started meanwhile.
        if (latestLive.current || latestPoints.current !== initialPoints)
          return;
        setPreviewPosition({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        setLocationError(false);
      },
      () => {
        if (
          !cancelled &&
          !latestLive.current &&
          latestPoints.current === initialPoints
        )
          setLocationError(true);
      },
      { enableHighAccuracy: true, maximumAge: 15000, timeout: 12000 },
    );
    return () => {
      cancelled = true;
    };
  }, [ready, locateOnOpen]);
  useEffect(() => {
    const instance = map.current,
      drawing = layers.current;
    if (!ready || !instance || !drawing || !points.length) return;
    setLocationError(false);
    drawing.line.setLatLngs(points.map((point) => [point.lat, point.lon]));
    const first = points[0]!,
      last = points.at(-1)!;
    drawing.start
      .setLatLng([first.lat, first.lon])
      .setStyle({ opacity: 1, fillOpacity: 1 });
    const current = !live && previewPosition ? previewPosition : last;
    drawing.current
      .setLatLng([current.lat, current.lon])
      .setStyle({ opacity: 1, fillOpacity: 1 });
    if (!initializedView.current) {
      initializedView.current = true;
      if (live || points.length === 1)
        instance.setView([last.lat, last.lon], 16);
      else
        instance.fitBounds(drawing.line.getBounds(), {
          padding: [20, 20],
          maxZoom: 17,
        });
    } else if (live && follow)
      instance.panTo([last.lat, last.lon], { animate: false });
  }, [points, ready, live, follow, previewPosition]);
  useEffect(() => {
    if (live) {
      if (previewPosition) setPreviewPosition(null);
      return;
    }
    if (!previewPosition || !ready) return;
    map.current?.setView([previewPosition.lat, previewPosition.lon], 16);
    layers.current?.current
      .setLatLng([previewPosition.lat, previewPosition.lon])
      .setStyle({ opacity: 1, fillOpacity: 1 });
  }, [previewPosition, ready, live]);
  return (
    <div className="my-4 space-y-2">
      <div
        ref={element}
        className="route-map gps-map"
        role="region"
        aria-label={t("Mapa del recorrido", "Route map")}
      />
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={!ready}
          onClick={() => {
            const last =
              !live && previewPosition ? previewPosition : points.at(-1);
            if (last) {
              map.current?.setView([last.lat, last.lon], 16);
              setFollow(true);
              return;
            }
            if (
              typeof navigator.geolocation?.getCurrentPosition !== "function"
            ) {
              setLocationError(true);
              return;
            }
            navigator.geolocation.getCurrentPosition(
              (position) => {
                if (!map.current) return;
                map.current.setView(
                  [position.coords.latitude, position.coords.longitude],
                  16,
                );
                layers.current?.current
                  .setLatLng([
                    position.coords.latitude,
                    position.coords.longitude,
                  ])
                  .setStyle({ opacity: 1, fillOpacity: 1 });
                setLocationError(false);
              },
              () => setLocationError(true),
              { enableHighAccuracy: true, timeout: 12000 },
            );
          }}
        >
          {t("Centrar ubicación", "Center location")}
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={!ready || points.length < 2}
          onClick={() => {
            const bounds = layers.current?.line.getBounds();
            if (bounds?.isValid()) {
              setFollow(false);
              map.current?.fitBounds(bounds, {
                padding: [20, 20],
                maxZoom: 17,
              });
            }
          }}
        >
          {t("Ver recorrido completo", "View full route")}
        </Button>
      </div>
      {tileError && (
        <p className="text-sm text-muted-foreground">
          {t(
            "El mapa de calles no pudo cargarse. El GPS y el registro del recorrido siguen disponibles.",
            "Street tiles could not load. GPS and route recording remain available.",
          )}
        </p>
      )}
      {locationError && (
        <p role="alert">
          {t(
            "Permití el acceso a tu ubicación en el navegador.",
            "Allow location access in your browser.",
          )}
        </p>
      )}
    </div>
  );
}
