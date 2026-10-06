import { NextResponse } from "next/server";
import { serverClient } from "@/lib/supabase/server";
import { publicEnv, safeNext } from "@/lib/env";
export async function GET(request: Request) {
  const url = new URL(request.url),
    code = url.searchParams.get("code"),
    env = publicEnv();
  if (code) {
    const client = await serverClient();
    const { error } = await client.auth.exchangeCodeForSession(code);
    const { data } = await client.auth.getUser();
    if (!error && data.user)
      return NextResponse.redirect(
        new URL(safeNext(url.searchParams.get("next")), env.site),
        { headers: { "Cache-Control": "private, no-store" } },
      );
  }
  return NextResponse.redirect(new URL("/login?error=callback", env.site), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
