import {
  createDefaultSnapshot,
  readSnapshot,
} from "@/domain/legacy/read-snapshot";
import { snapshotSchema, type Snapshot } from "@/domain/schemas/snapshot";
import {
  accountCacheKey,
  backupRawCache,
  readCache,
  writeCache,
  type StoragePort,
} from "@/lib/storage/account-cache";
import type { StateRepository } from "./state-repository";
import { z } from "zod";
import { fingerprint } from "@/lib/storage/fingerprint";

export type SyncStatus =
  "loading" | "synced" | "dirty" | "saving" | "offline" | "conflict" | "error";
export type SyncView = {
  snapshot: Snapshot | null;
  status: SyncStatus;
  message: string;
};
const metaSchema = z.object({
  pending: z.boolean(),
  base: z.string().nullable(),
});
const encoded = fingerprint;
// Exactly one controller owns full-snapshot uploads for one verified user.
export class SyncController {
  view: SyncView = {
    snapshot: null,
    status: "loading",
    message: "Cargando tu cuenta…",
  };
  private key: string;
  private metaKey: string;
  private base: string | null = null;
  private pending = false;
  private ready = false;
  private cloudReady = false;
  private disposed = false;
  private generation = 0;
  private loadAttempt = 0;
  private cancelTimer: (() => void) | null = null;
  private flight: Promise<boolean> | null = null;
  private abort = new AbortController();
  private cloud: Snapshot | null = null;
  private local: Snapshot | null = null;
  private listeners = new Set<(view: SyncView) => void>();
  constructor(
    owner: string,
    private repo: StateRepository,
    private storage: StoragePort,
    private schedule = (fn: () => void, delay: number) => {
      const timer = setTimeout(fn, delay);
      return () => clearTimeout(timer);
    },
  ) {
    this.key = accountCacheKey(owner);
    this.metaKey = this.key + ":sync-meta-v1";
  }
  subscribe(listener: (view: SyncView) => void) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  get hasCloud() {
    return this.cloud !== null;
  }
  private emit(snapshot: Snapshot | null, status: SyncStatus, message: string) {
    if (this.disposed) return;
    this.view = { snapshot, status, message };
    this.listeners.forEach((listener) => listener(this.view));
  }
  private persist(snapshot: Snapshot) {
    writeCache(this.storage, this.key, snapshot);
    this.storage.setItem(
      this.metaKey,
      JSON.stringify({ pending: this.pending, base: this.base }),
    );
  }
  async start() {
    if (this.disposed) return;
    if (this.flight) await this.flush();
    if (this.disposed) return;
    const attempt = ++this.loadAttempt;
    this.cancelTimer?.();
    this.ready = false;
    this.cloudReady = false;
    const cached = readCache(this.storage, this.key);
    try {
      let validMeta = false;
      try {
        validMeta = metaSchema.safeParse(
          JSON.parse(this.storage.getItem(this.metaKey) ?? "null"),
        ).success;
      } catch {
        /* Preserve raw cache before repairing malformed metadata. */
      }
      if (!validMeta || (cached.status === "present" && !cached.result.ok))
        backupRawCache(this.storage, this.key);
    } catch {
      this.emit(
        null,
        "error",
        "No pudimos crear una copia de recuperación. Liberá espacio antes de continuar.",
      );
      return;
    }
    this.local =
      cached.status === "present" && cached.result.ok
        ? cached.result.snapshot
        : null;
    if (cached.status === "unavailable") {
      this.emit(null, "error", "El navegador bloqueó el almacenamiento local.");
      return;
    }
    try {
      const meta = metaSchema.safeParse(
        JSON.parse(this.storage.getItem(this.metaKey) ?? "null") as unknown,
      );
      this.pending = meta.success && meta.data.pending;
      this.base = meta.success ? meta.data.base : null;
    } catch {
      this.pending = false;
      this.base = null;
    }
    let raw: unknown | null;
    try {
      raw = await this.repo.load(this.abort.signal);
    } catch {
      if (this.disposed || attempt !== this.loadAttempt) return;
      if (this.local) {
        this.ready = true;
        this.emit(
          this.local,
          "offline",
          "Sin conexión: cambios guardados en este dispositivo. Reintentá antes de sincronizar.",
        );
      } else
        this.emit(
          null,
          "error",
          "No pudimos recuperar tu cuenta. No creamos un estado vacío para reemplazarla.",
        );
      return;
    }
    if (this.disposed || attempt !== this.loadAttempt) return;
    this.cloudReady = true;
    if (raw !== null) {
      const read = readSnapshot(raw);
      if (!read.ok) {
        this.emit(
          null,
          "error",
          "Los datos de la nube requieren revisión. No fueron reemplazados.",
        );
        return;
      }
      this.cloud = read.snapshot;
      const cloudEncoded = encoded(this.cloud);
      if (
        this.local &&
        encoded(this.local) !== cloudEncoded &&
        (!this.pending || this.base !== cloudEncoded)
      ) {
        try {
          const cloudKey = `${this.key}:cloud-conflict:${cloudEncoded}`,
            localKey = `${this.key}:local-conflict:${encoded(this.local)}`;
          if (this.storage.getItem(cloudKey) === null)
            this.storage.setItem(cloudKey, JSON.stringify(raw));
          if (this.storage.getItem(localKey) === null)
            this.storage.setItem(localKey, JSON.stringify(this.local));
        } catch {
          this.emit(
            null,
            "error",
            "No hay espacio para respaldar la copia de la nube antes de elegir. Liberá espacio y reintentá.",
          );
          return;
        }
        this.emit(
          null,
          "conflict",
          "Hay datos distintos en este dispositivo y en la nube. Elegí cuál conservar; ambas copias quedan recuperables.",
        );
        return;
      }
      if (this.local && this.pending) {
        this.ready = true;
        this.base = cloudEncoded;
        this.emit(
          this.local,
          "dirty",
          "Recuperamos cambios pendientes de sincronización.",
        );
        await this.flush();
        return;
      }
      this.base = cloudEncoded;
      this.pending = false;
      this.ready = true;
      try {
        this.persist(this.cloud);
      } catch {
        this.ready = false;
        this.emit(
          this.cloud,
          "error",
          "No hay espacio para guardar la copia local.",
        );
        return;
      }
      this.emit(this.cloud, "synced", "Sincronizado con tu cuenta");
    } else if (this.local)
      this.emit(
        null,
        "conflict",
        "Este dispositivo tiene datos, pero la cuenta aún no tiene una copia en la nube. Confirmá la importación.",
      );
    else {
      this.base = null;
      this.pending = false;
      this.ready = true;
      this.emit(
        createDefaultSnapshot(),
        "synced",
        "Cuenta nueva: se guardará cuando hagas cambios.",
      );
    }
  }
  resolve(choice: "cloud" | "local") {
    const snapshot = choice === "cloud" ? this.cloud : this.local;
    if (!snapshot || this.disposed)
      throw new Error("No hay una copia válida de esa opción.");
    this.ready = true;
    this.base = this.cloud ? encoded(this.cloud) : null;
    this.pending = choice === "local";
    try {
      this.persist(snapshot);
    } catch {
      this.ready = false;
      this.emit(
        null,
        "error",
        "No hay espacio para guardar la copia elegida. Los respaldos no fueron eliminados.",
      );
      return;
    }
    this.emit(
      snapshot,
      this.pending ? "dirty" : "synced",
      this.pending
        ? "Importación confirmada; guardando…"
        : "Usando la copia de la nube",
    );
    if (this.pending) void this.flush();
  }
  edit(change: (draft: Snapshot) => void) {
    if (
      !this.ready ||
      this.disposed ||
      !this.view.snapshot ||
      ["error", "conflict"].includes(this.view.status)
    )
      throw new Error("Esperá a recuperar tu cuenta antes de editar.");
    const next = structuredClone(this.view.snapshot);
    change(next);
    snapshotSchema.parse(next);
    const oldPending = this.pending;
    const oldGeneration = this.generation;
    this.pending = true;
    this.generation++;
    try {
      this.persist(next);
    } catch (error) {
      this.pending = oldPending;
      this.generation = oldGeneration;
      throw error;
    }
    this.emit(next, "dirty", "Cambios guardados en este dispositivo");
    this.cancelTimer?.();
    this.cancelTimer = this.schedule(() => {
      void this.flush();
    }, 900);
  }
  async flush(): Promise<boolean> {
    this.cancelTimer?.();
    this.cancelTimer = null;
    if (this.disposed || !this.ready || !this.cloudReady || !this.view.snapshot)
      return false;
    if (this.flight) {
      const success = await this.flight;
      return success && this.pending ? this.flush() : success;
    }
    if (!this.pending) return true;
    const captured = structuredClone(this.view.snapshot),
      revision = this.generation;
    this.emit(this.view.snapshot, "saving", "Guardando en tu cuenta…");
    this.flight = (async () => {
      try {
        await this.repo.save(captured, this.abort.signal);
        if (this.disposed) return false;
        this.base = encoded(captured);
        this.pending = this.generation !== revision;
        if (this.view.snapshot) this.persist(this.view.snapshot);
        this.emit(
          this.view.snapshot,
          this.pending ? "dirty" : "synced",
          this.pending
            ? "Hay cambios nuevos pendientes…"
            : "Sincronizado con tu cuenta",
        );
        return true;
      } catch {
        this.emit(
          this.view.snapshot,
          "offline",
          "Sin conexión: tus cambios siguen guardados en este dispositivo.",
        );
        return false;
      }
    })();
    const success = await this.flight;
    this.flight = null;
    if (success && this.pending) return this.flush();
    return success;
  }
  dispose() {
    this.disposed = true;
    this.cancelTimer?.();
    this.abort.abort();
    this.listeners.clear();
  }
}
