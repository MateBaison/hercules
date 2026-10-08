import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { snapshotSchema, type Snapshot } from "@/domain/schemas/snapshot";
export class RemoteStateChanged extends Error {}
export interface StateRepository {
  load(signal: AbortSignal): Promise<unknown | null>;
  save(snapshot: Snapshot, signal: AbortSignal): Promise<void>;
  changed?(signal: AbortSignal): Promise<boolean>;
}
export function stateRepository(
  client: SupabaseClient,
  owner: string,
): StateRepository {
  const userId = z.uuid().parse(owner);
  let revision: string | null | undefined;
  async function checkOwner() {
    const { data, error } = await client.auth.getUser();
    if (error || data.user?.id !== userId)
      throw new Error("La cuenta cambió. Volvé a iniciar sesión.");
  }
  return {
    async changed(signal) {
      await checkOwner();
      const { data, error } = await client
        .from("mrgymson_state")
        .select("updated_at")
        .eq("user_id", userId)
        .abortSignal(signal)
        .maybeSingle();
      if (error) throw new Error("No pudimos comprobar la sincronización.");
      return (
        (data === null
          ? null
          : z.object({ updated_at: z.string() }).parse(data).updated_at) !==
        revision
      );
    },
    async load(signal) {
      await checkOwner();
      const { data, error } = await client
        .from("mrgymson_state")
        .select("payload,updated_at")
        .eq("user_id", userId)
        .abortSignal(signal)
        .maybeSingle();
      if (error)
        throw new Error(
          "No pudimos cargar tu cuenta. Revisá la conexión y la tabla de Supabase.",
        );
      if (data === null) {
        revision = null;
        return null;
      }
      const row = z
        .object({ payload: z.unknown(), updated_at: z.string() })
        .parse(data as unknown);
      revision = row.updated_at;
      return row.payload;
    },
    async save(snapshot, signal) {
      await checkOwner();
      if (revision === undefined)
        throw new Error("Leé la cuenta antes de guardar.");
      const updatedAt = new Date(
        Math.max(Date.now(), revision ? Date.parse(revision) + 1 : 0),
      ).toISOString();
      const values = {
        user_id: userId,
        payload: snapshotSchema.parse(snapshot),
        updated_at: updatedAt,
      };
      const request =
        revision === null
          ? client.from("mrgymson_state").insert(values)
          : client
              .from("mrgymson_state")
              .update(values)
              .eq("user_id", userId)
              .eq("updated_at", revision);
      const { data, error } = await request
        .select("updated_at")
        .abortSignal(signal);
      if (error?.code === "23505" || (!error && (!data || data.length !== 1)))
        throw new RemoteStateChanged("Otro dispositivo modificó la cuenta.");
      if (error)
        throw new Error(
          "No se pudo sincronizar. Tus cambios siguen guardados en este dispositivo.",
        );
      revision = z
        .array(z.object({ updated_at: z.string() }))
        .length(1)
        .parse(data)[0]!.updated_at;
    },
  };
}
