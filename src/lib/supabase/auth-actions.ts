"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { publicEnv, trustedOrigin } from "@/lib/env";
import { serverClient } from "./server";
async function assertOrigin() {
  if (!trustedOrigin((await headers()).get("origin"), publicEnv().site))
    throw new Error("Origen no autorizado. Revisá la URL configurada.");
}
const emailSchema = z.email().max(254);
export async function requestCode(email: string): Promise<{ error?: string }> {
  await assertOrigin();
  const parsed = emailSchema.safeParse(email);
  if (!parsed.success) return { error: "Ingresá un correo válido." };
  const client = await serverClient();
  const { error } = await client.auth.signInWithOtp({
    email: parsed.data,
    options: { shouldCreateUser: true },
  });
  return error
    ? {
        error:
          "No pudimos enviar el código. Revisá el correo o esperá antes de reintentar.",
      }
    : {};
}
export async function verifyCode(
  email: string,
  token: string,
): Promise<{ error?: string }> {
  await assertOrigin();
  const parsed = z
    .object({ email: emailSchema, token: z.string().regex(/^\d{6,8}$/) })
    .safeParse({ email, token });
  if (!parsed.success) return { error: "Ingresá el código de 6 a 8 dígitos." };
  const client = await serverClient();
  const { error } = await client.auth.verifyOtp({
    ...parsed.data,
    type: "email",
  });
  return error ? { error: "El código no es válido o venció." } : {};
}
export async function googleLogin() {
  await assertOrigin();
  const client = await serverClient();
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: new URL("/auth/callback", publicEnv().site).href,
      skipBrowserRedirect: true,
    },
  });
  if (error || !data.url) throw new Error("No pudimos iniciar Google.");
  redirect(data.url);
}
export async function signOut() {
  await assertOrigin();
  const client = await serverClient();
  const { error } = await client.auth.signOut({ scope: "local" });
  if (error)
    return {
      error: "No se pudo cerrar sesión. Reintentá cuando tengas conexión.",
    };
  redirect("/login");
}
