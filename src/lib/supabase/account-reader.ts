import "server-only";
import { z } from "zod";
import { serverClient } from "./server";
export async function verifiedUser() {
  const client = await serverClient();
  const { data, error } = await client.auth.getUser();
  return error ? null : data.user;
}
export async function accountSummary(userId: string) {
  const client = await serverClient();
  // Select only small fields; never serialize photo-heavy snapshots through Next.
  const { data, error } = await client
    .from("mrgymson_state")
    .select(
      "name:payload->profile->>name,complete:payload->profile->onboardingComplete",
    )
    .eq("user_id", z.uuid().parse(userId))
    .maybeSingle();
  if (error)
    throw new Error("No pudimos leer tu cuenta. No se reemplazaron tus datos.");
  const summary = z
    .object({ name: z.string().nullable(), complete: z.boolean().nullable() })
    .nullable()
    .parse(data as unknown);
  return { complete: Boolean(summary?.complete || summary?.name?.trim()) };
}
