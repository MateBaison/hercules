import { expect, test } from "bun:test";
import { compactRoute, recordedRoute } from "../../src/domain/tracking";
import {
  createDefaultSnapshot,
  readSnapshot,
} from "../../src/domain/legacy/read-snapshot";

test("GPS routes retain coordinates, seconds and unknown metadata through account snapshots", () => {
  const snapshot = createDefaultSnapshot();
  expect(snapshot.trackingSessions).toBeUndefined();
  const points = [
    { lat: 52, lon: 13, time: 1000, speed: 0 },
    { lat: 52.001, lon: 13, time: 61000, speed: 2 },
  ];
  const route = recordedRoute(
    { mode: "run", started: 1000, distance: 111, points },
    61000,
  );
  expect(route.durationSeconds).toBe(60);
  expect(route.distanceMeters).toBe(111);
  expect(route.points).toEqual(points);
  snapshot.trackingSessions = [{ ...route, futureMetadata: "preserved" }];
  const result = readSnapshot(JSON.parse(JSON.stringify(snapshot)));
  expect(result.ok).toBe(true);
  if (result.ok)
    expect(result.snapshot.trackingSessions?.[0]?.futureMetadata).toBe(
      "preserved",
    );
  expect(() =>
    recordedRoute(
      { mode: "run", started: 1000, distance: 111, points: points.slice(0, 1) },
      61000,
    ),
  ).toThrow();
  expect(() =>
    recordedRoute(
      {
        mode: "run",
        started: 1000,
        distance: 111,
        points: [{ ...points[0]!, lat: 100 }, points[1]!],
      },
      61000,
    ),
  ).toThrow();
});
test("long routes are bounded without losing endpoints or changing distance", () => {
  const points = Array.from({ length: 11000 }, (_, time) => ({
    lat: 52,
    lon: 13 + time / 1000000,
    time,
    speed: 0,
  }));
  const compact = compactRoute(points);
  expect(compact).toHaveLength(10000);
  expect(compact[0]).toEqual(points[0]);
  expect(compact.at(-1)).toEqual(points.at(-1));
  expect(
    compact.every(
      (point, index) => !index || point.time > compact[index - 1]!.time,
    ),
  ).toBe(true);
  compact[0]!.lat = 0;
  expect(points[0]!.lat).toBe(52);
});
