import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { configured, publicEnv } from "@/lib/env";
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  if (configured()) {
    const env = publicEnv();
    const client = createServerClient(env.url, env.key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (values) => {
          values.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          values.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    });
    await client.auth.getUser(); // Remote verification also refreshes expired sessions.
  }
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}
export const config = {
  matcher: [
    "/",
    "/home",
    "/library",
    "/workout",
    "/tools",
    "/progress",
    "/profile",
    "/login",
    "/onboarding",
    "/auth/:path*",
    "/api/account/:path*",
  ],
};
