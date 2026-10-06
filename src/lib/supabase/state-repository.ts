import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { snapshotSchema, type Snapshot } from "@/domain/schemas/snapshot";
export interface StateRepository {
  load(signal: AbortSignal): Promise<unknown | null>;
  save(snapshot: Snapshot, signal: AbortSignal): Promise<void>;
}
export function stateRepository(
  client: SupabaseClient,
  owner: string,
): StateRepository {
  const userId = z.uuid().parse(owner);
  async function checkOwner() {
    const { data, error } = await client.auth.getUser();
    if (error || data.user?.id !== userId)
      throw new Error("La cuenta cambió. Volvé a iniciar sesión.");
  }
  return {
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
      return data === null
        ? null
        : z
            .object({ payload: z.unknown(), updated_at: z.string() })
            .parse(data as unknown).payload;
    },
    async save(snapshot, signal) {
      await checkOwner();
      const { error } = await client
        .from("mrgymson_state")
        .upsert(
          {
            user_id: userId,
            payload: snapshotSchema.parse(snapshot),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" },
        )
        .abortSignal(signal);
      if (error)
        throw new Error(
          "No se pudo sincronizar. Tus cambios siguen guardados en este dispositivo.",
        );
    },
  };
}
