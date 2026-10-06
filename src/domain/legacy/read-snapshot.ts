import rawDefaults from "@/data/legacy/snapshot.json";
import {
  legacySnapshotSchema,
  snapshotSchema,
  type Snapshot,
} from "@/domain/schemas/snapshot";

export const COMPATIBILITY_VERSION = 1;
export type SnapshotReadResult =
  | { ok: true; snapshot: Snapshot; compatibilityVersion: number }
  | { ok: false; issues: string[] };

const defaults = snapshotSchema.parse(rawDefaults);
export function createDefaultSnapshot(): Snapshot {
  return structuredClone(defaults);
}

export function readSnapshot(raw: unknown): SnapshotReadResult {
  const parsed = legacySnapshotSchema.safeParse(raw);
  if (!parsed.success)
    return {
      ok: false,
      issues: parsed.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      ),
    };
  const baseline = createDefaultSnapshot();
  const next = snapshotSchema.safeParse({
    ...baseline,
    ...parsed.data,
    profile: { ...baseline.profile, ...parsed.data.profile },
    settings: { ...baseline.settings, ...parsed.data.settings },
  });
  if (!next.success)
    return {
      ok: false,
      issues: next.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
      ),
    };
  return {
    ok: true,
    snapshot: next.data,
    compatibilityVersion: COMPATIBILITY_VERSION,
  };
}

export function readSnapshotJson(raw: string): SnapshotReadResult {
  try {
    return readSnapshot(JSON.parse(raw) as unknown);
  } catch {
    return {
      ok: false,
      issues: ["Invalid JSON; original data must remain recoverable."],
    };
  }
}
