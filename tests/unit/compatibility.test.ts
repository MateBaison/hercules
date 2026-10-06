import { describe, expect, test } from "bun:test";
import {
  createDefaultSnapshot,
  readSnapshot,
  readSnapshotJson,
} from "../../src/domain/legacy/read-snapshot";
import {
  backupRawCache,
  accountCacheKey,
  GUEST_CACHE_KEY,
  readCache,
  writeCache,
  type StoragePort,
} from "../../src/lib/storage/account-cache";
import {
  routineEditSchema,
  setInputSchema,
} from "../../src/domain/schemas/snapshot";
import { appReducer, initialAppState } from "../../src/state/reducer";

function memoryStorage(): StoragePort {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}
const userA = "11111111-1111-4111-8111-111111111111",
  userB = "22222222-2222-4222-8222-222222222222";

describe("Phase 2 legacy-data safety", () => {
  test("new superset edits reject missing, duplicate and overlapping memberships", () => {
    const day = {
      id: "d",
      name: "Day",
      items: ["a", "b", "c"],
      supersets: [["a", "b"]],
    };
    const routine = { id: "r", name: "Routine", days: [day] };
    expect(routineEditSchema.safeParse(routine).success).toBe(true);
    for (const supersets of [
      [["a"]],
      [["a", "a"]],
      [["a", "missing"]],
      [
        ["a", "b"],
        ["b", "c"],
      ],
    ])
      expect(
        routineEditSchema.safeParse({
          ...routine,
          days: [{ ...day, supersets }],
        }).success,
      ).toBe(false);
    expect(
      routineEditSchema.safeParse({ ...routine, days: [day, day] }).success,
    ).toBe(false);
  });
  test("defaults are independent; read/serialize/read is repeatable", () => {
    const a = createDefaultSnapshot(),
      b = createDefaultSnapshot();
    a.profile.name = "Changed";
    expect(b.profile.name).toBe("");
    const read = readSnapshot(b);
    expect(read.ok).toBe(true);
    if (!read.ok) throw new Error("Invalid defaults");
    expect(readSnapshotJson(JSON.stringify(read.snapshot))).toEqual(read);
  });
  test("keeps unknown fields, removed exercises, old totals and photos", () => {
    const snapshot = createDefaultSnapshot();
    snapshot.futureFlag = { preserve: true };
    snapshot.profile.facebook = "legacy value";
    snapshot.settings.futureUnit = "unchanged";
    snapshot.sessions = [
      {
        id: "old",
        date: "2026-09-24",
        routine: "Deleted routine",
        day: "Old day",
        volume: 123,
        duration: 30,
        legacyField: true,
      },
      {
        id: "pasted",
        date: "2026-09-25",
        routine: "Copied routine",
        day: "Copied day",
        duration: null,
      },
      {
        id: "new",
        date: "2026-10-02T12:00:00Z",
        routine: "Routine",
        day: "Day",
        exercises: [
          {
            id: "curl-de-piernas-sentado",
            performedSets: [{ kg: 30, reps: 10, done: true, unknown: 5 }],
          },
        ],
        photos: ["data:image/jpeg;base64,AA"],
        bodyWeightStartKg: 70,
        bodyWeightEndKg: 69.8,
      },
    ];
    const read = readSnapshot(snapshot);
    if (!read.ok) throw new Error(read.issues.join(", "));
    expect(read.snapshot).toEqual(snapshot);
  });
  test("fills only missing profile/preferences; never replaces malformed data", () => {
    const read = readSnapshot({
      profile: { name: "Existing", future: 1 },
      settings: { language: "pt" },
      routines: [],
      selected: null,
    });
    if (!read.ok) throw new Error("Expected compatible partial snapshot");
    expect(read.snapshot.profile.name).toBe("Existing");
    expect(read.snapshot.profile.future).toBe(1);
    expect(read.snapshot.routines).toEqual([]);
    expect(read.snapshot.settings.language).toBe("pt");
    for (const raw of [
      null,
      [],
      "bad",
      { routines: "corrupted" },
      { sessions: [null] },
      { settings: { weight: "unknown" } },
    ])
      expect(readSnapshot(raw).ok).toBe(false);
    expect(readSnapshotJson("{broken").ok).toBe(false);
  });
  test("keeps null blanks, zero weights, done/entered flags and metric distinctions", () => {
    const snapshot = createDefaultSnapshot();
    snapshot.workout = {
      rid: "r1",
      did: "d1",
      started: 123,
      index: 0,
      entries: [
        {
          id: "plancha",
          sets: [
            { kg: null, seconds: null, entered: false, done: false },
            { kg: 0, seconds: 45, entered: true },
          ],
        },
        { id: "press-militar", sets: [{ kg: 0, reps: 0, done: false }] },
      ],
    };
    const read = readSnapshot(snapshot);
    if (!read.ok) throw new Error("Invalid workout");
    expect(read.snapshot.workout).toEqual(snapshot.workout);
    expect(
      setInputSchema.safeParse({ metric: "reps", kg: 5, seconds: 45 }).success,
    ).toBe(false);
    expect(
      setInputSchema.safeParse({ metric: "seconds", kg: null, seconds: 45 })
        .success,
    ).toBe(true);
  });
  test("isolates account keys, leaves invalid cache intact and backs up originals once", () => {
    const storage = memoryStorage(),
      original = "{broken";
    storage.setItem(accountCacheKey(userA), original);
    expect(readCache(storage, accountCacheKey(userB))).toEqual({
      status: "missing",
    });
    expect(readCache(storage, GUEST_CACHE_KEY)).toEqual({ status: "missing" });
    expect(readCache(storage, accountCacheKey(userA))).toMatchObject({
      status: "present",
      result: { ok: false },
    });
    const backup = backupRawCache(storage, accountCacheKey(userA), 1);
    if (!backup) throw new Error("Missing backup");
    expect(storage.getItem(backup)).toBe(original);
    writeCache(storage, accountCacheKey(userA), createDefaultSnapshot());
    backupRawCache(storage, accountCacheKey(userA), 1);
    expect(storage.getItem(backup)).toBe(original);
    expect(() => accountCacheKey("../another-user")).toThrow();
  });
  test("storage denial is distinct from an empty account; failed backups propagate", () => {
    const denied: StoragePort = {
      getItem() {
        throw new Error("Denied");
      },
      setItem() {
        throw new Error("Denied");
      },
    };
    expect(readCache(denied, GUEST_CACHE_KEY)).toEqual({
      status: "unavailable",
    });
    expect(() => backupRawCache(denied, GUEST_CACHE_KEY)).toThrow();
  });
  test("invalid hydration cannot replace previously loaded data or enable writes", () => {
    const previous = appReducer(initialAppState, {
      type: "hydrate",
      raw: createDefaultSnapshot(),
    });
    const invalid = appReducer(previous, {
      type: "hydrate",
      raw: { routines: "bad" },
    });
    expect(invalid.snapshot).toBe(previous.snapshot);
    expect(invalid.loadError).not.toBeNull();
    expect(
      appReducer(invalid, { type: "toggle-favorite", id: "plancha" }),
    ).toBe(invalid);
  });
  test("set edits are immutable and save without a tick; metric values do not convert", () => {
    const snapshot = createDefaultSnapshot();
    snapshot.workout = {
      rid: "r1",
      did: "d1",
      started: 123,
      index: 0,
      entries: [
        {
          id: "press-militar",
          note: "Note",
          sets: [
            {
              kg: null,
              reps: null,
              done: false,
              entered: false,
              metadata: "keep",
            },
          ],
        },
      ],
    };
    const previous = appReducer(initialAppState, {
      type: "hydrate",
      raw: snapshot,
    });
    const next = appReducer(previous, {
      type: "set-workout-input",
      entry: 0,
      set: 0,
      input: { metric: "reps", kg: 20, reps: 12 },
    });
    expect(next.snapshot?.workout?.entries[0]?.sets[0]).toEqual({
      kg: 20,
      reps: 12,
      done: false,
      entered: true,
      metadata: "keep",
    });
    expect(previous.snapshot?.workout?.entries[0]?.sets[0]?.kg).toBeNull();
    expect(next.revision).toBe(1);
  });
});
