import { NextResponse } from "next/server";
import { z } from "zod";
import { publicEnv, trustedOrigin } from "@/lib/env";
import { serverClient } from "@/lib/supabase/server";
export async function POST(request: Request) {
  const until = process.env.LEGACY_AUTH_COMPAT_UNTIL;
  if (
    !until ||
    Date.now() > Date.parse(until) ||
    !Number.isFinite(Date.parse(until))
  )
    return NextResponse.json(
      { error: "Volvé a iniciar sesión." },
      { status: 410 },
    );
  if (!trustedOrigin(request.headers.get("origin"), publicEnv().site))
    return NextResponse.json(
      { error: "Origen no autorizado" },
      { status: 403 },
    );
  const parsed = z
    .strictObject({
      access_token: z.string().min(20).max(8192),
      refresh_token: z.string().min(10).max(8192),
    })
    .safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Sesión inválida" }, { status: 400 });
  const client = await serverClient();
  const { error } = await client.auth.setSession(parsed.data);
  const { data } = await client.auth.getUser();
  if (error || !data.user) {
    await client.auth.signOut({ scope: "local" });
    return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
  }
  return NextResponse.json(
    { ok: true },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
