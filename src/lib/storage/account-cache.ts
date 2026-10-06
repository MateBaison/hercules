import { z } from "zod";
import {
  COMPATIBILITY_VERSION,
  readSnapshotJson,
  type SnapshotReadResult,
} from "@/domain/legacy/read-snapshot";
import { snapshotSchema, type Snapshot } from "@/domain/schemas/snapshot";

export const GUEST_CACHE_KEY = "mrgymson-mobile-v1";
export const LEGACY_AUTH_KEY = "mrgymson-auth-v1";
export const INCOMING_ROUTINE_KEY = "gymson-incoming-routine";
export const PENDING_EMAIL_KEY = "mrgymson-email-pending-v1";
export interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export function accountCacheKey(userId: string): string {
  return `mrgymson-user-${z.uuid().parse(userId)}`;
}

export type CacheReadResult =
  | { status: "missing" }
  | { status: "unavailable" }
  | { status: "present"; result: SnapshotReadResult };
export function readCache(storage: StoragePort, key: string): CacheReadResult {
  try {
    const raw = storage.getItem(key);
    return raw === null
      ? { status: "missing" }
      : { status: "present", result: readSnapshotJson(raw) };
  } catch {
    return { status: "unavailable" };
  }
}
export function writeCache(
  storage: StoragePort,
  key: string,
  snapshot: Snapshot,
): void {
  // Validate before replacing a cache; no fallback defaults on corruption.
  storage.setItem(key, JSON.stringify(snapshotSchema.parse(snapshot)));
}
export function backupRawCache(
  storage: StoragePort,
  key: string,
  now = Date.now(),
): string | null {
  const raw = storage.getItem(key);
  if (raw === null) return null;
  const backupKey = `${key}:migration-backup-v${COMPATIBILITY_VERSION}:${now}`;
  // Never overwrite an existing recovery point even when calls share a timestamp.
  if (storage.getItem(backupKey) === null) storage.setItem(backupKey, raw);
  return backupKey;
}
