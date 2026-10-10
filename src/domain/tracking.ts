import {
  trackingSessionSchema,
  type TrackingSession,
} from "./schemas/snapshot";
export type Point = { lat: number; lon: number; time: number; speed: number };
// Keep the endpoints and chronological order while bounding full-snapshot GPS payloads.
export function compactRoute(points: Point[], limit = 10000): Point[] {
  if (points.length <= limit) return points.map((point) => ({ ...point }));
  return Array.from({ length: limit }, (_, index) => ({
    ...points[Math.round((index * (points.length - 1)) / (limit - 1))]!,
  }));
}
export function recordedRoute(
  track: {
    mode: "run" | "cycle";
    started: number;
    distance: number;
    points: Point[];
  },
  finished: number,
): TrackingSession {
  if (track.points.length < 2 || finished <= track.started)
    throw new Error("Incomplete GPS route");
  return trackingSessionSchema.parse({
    id: crypto.randomUUID(),
    date: new Date(track.started).toISOString(),
    mode: track.mode,
    durationSeconds: Math.floor((finished - track.started) / 1000),
    distanceMeters: track.distance,
    points: compactRoute(track.points),
  });
}
export function haversine(a: Point, b: Point): number {
  const radians = (value: number) => (value * Math.PI) / 180,
    latitude = radians(b.lat - a.lat),
    longitude = radians(b.lon - a.lon),
    term =
      Math.sin(latitude / 2) ** 2 +
      Math.cos(radians(a.lat)) *
        Math.cos(radians(b.lat)) *
        Math.sin(longitude / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(Math.min(1, term)));
}
export function routePoints(points: Point[]): string {
  if (points.length < 2) return "";
  const latitudes = points.map((point) => point.lat),
    longitudes = points.map((point) => point.lon),
    lowLat = Math.min(...latitudes),
    highLat = Math.max(...latitudes),
    lowLon = Math.min(...longitudes),
    highLon = Math.max(...longitudes);
  return points
    .map(
      (point) =>
        `${20 + ((point.lon - lowLon) / (highLon - lowLon || 0.00001)) * 280},${190 - ((point.lat - lowLat) / (highLat - lowLat || 0.00001)) * 170}`,
    )
    .join(" ");
}
