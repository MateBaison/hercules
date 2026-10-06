// Test service only. No production imports/routes/config bypasses. Loopback binding.
import { createServer } from "node:http";
import { z } from "zod";
import { createDefaultSnapshot } from "../src/domain/legacy/read-snapshot";
const ids = [
  "11111111-1111-4111-8111-111111111111",
  "22222222-2222-4222-8222-222222222222",
];
const records = new Map<string, unknown>(),
  tokens = new Map<string, string>();
const writes: string[] = [];
function user(id: string) {
  return {
    id,
    email: id === ids[0] ? "test@example.invalid" : "second@example.invalid",
    aud: "authenticated",
    role: "authenticated",
    app_metadata: { provider: "email" },
    user_metadata: {},
    created_at: "2026-01-01T00:00:00Z",
  };
}
function session(id: string) {
  const token = [
    Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString(
      "base64url",
    ),
    Buffer.from(
      JSON.stringify({
        sub: id,
        exp: Math.floor(Date.now() / 1000) + 3600,
        role: "authenticated",
        aud: "authenticated",
      }),
    ).toString("base64url"),
    "local-test-signature-not-real",
  ].join(".");
  tokens.set(token, id);
  return {
    access_token: token,
    refresh_token: "local-refresh-token-" + id,
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    token_type: "bearer",
    user: user(id),
  };
}
function reset(newAccount = false) {
  records.clear();
  writes.length = 0;
  for (const id of ids) {
    if (!id) continue;
    const snapshot = createDefaultSnapshot();
    snapshot.profile.name =
      newAccount && id === ids[0] ? "" : id === ids[0] ? "Test" : "Second";
    snapshot.profile.onboardingComplete = !(newAccount && id === ids[0]);
    records.set(id, snapshot);
  }
}
reset();
const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", "http://127.0.0.1:54329");
  response.setHeader("Access-Control-Allow-Origin", "http://127.0.0.1:3010");
  response.setHeader(
    "Access-Control-Allow-Headers",
    "authorization, apikey, content-type, prefer, x-client-info, x-supabase-api-version",
  );
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  const send = (body: unknown, status = 200) => {
    response.writeHead(status, { "Content-Type": "application/json" });
    response.end(JSON.stringify(body));
  };
  if (request.method === "OPTIONS") {
    send({});
    return;
  }
  if (url.pathname === "/__reset") {
    reset(url.searchParams.has("new"));
    send({ ok: true });
    return;
  }
  if (url.pathname === "/__audit") {
    send({ writes });
    return;
  }
  if (url.pathname === "/auth/v1/authorize") {
    const target = new URL(
      url.searchParams.get("redirect_to") ??
        "http://127.0.0.1:3010/auth/callback",
    );
    target.searchParams.set("code", "local-google-code");
    response.writeHead(302, { Location: target.href });
    response.end();
    return;
  }
  let text = "";
  for await (const chunk of request) text += String(chunk);
  let raw: unknown = {};
  try {
    raw = JSON.parse(text || "{}");
  } catch {
    send({ message: "Invalid JSON" }, 400);
    return;
  }
  const auth = request.headers.authorization?.replace(/^Bearer /, ""),
    owner = auth ? tokens.get(auth) : undefined;
  if (url.pathname === "/auth/v1/otp") {
    send({});
    return;
  }
  if (url.pathname === "/auth/v1/verify") {
    const body = z.object({ email: z.string(), token: z.string() }).parse(raw);
    if (body.token !== "123456") {
      send({ msg: "Invalid token" }, 403);
      return;
    }
    send(
      session(
        body.email === "second@example.invalid"
          ? (ids[1] ?? "")
          : (ids[0] ?? ""),
      ),
    );
    return;
  }
  if (url.pathname === "/auth/v1/token") {
    const input = z
      .object({
        refresh_token: z.string().optional(),
        auth_code: z.string().optional(),
        code_verifier: z.string().optional(),
      })
      .parse(raw);
    if (
      input.auth_code &&
      (input.auth_code !== "local-google-code" || !input.code_verifier)
    ) {
      send({ message: "Invalid PKCE" }, 400);
      return;
    }
    const id = input.refresh_token?.endsWith(ids[1] ?? "") ? ids[1] : ids[0];
    send(session(id ?? ""));
    return;
  }
  if (url.pathname === "/auth/v1/user") {
    send(owner ? user(owner) : { message: "Invalid token" }, owner ? 200 : 401);
    return;
  }
  if (url.pathname === "/auth/v1/logout") {
    send({});
    return;
  }
  if (url.pathname === "/rest/v1/mrgymson_state") {
    if (!owner) {
      send({ message: "Not authenticated" }, 401);
      return;
    }
    if (request.method === "POST") {
      const body = z
        .object({ user_id: z.string(), payload: z.unknown() })
        .parse(raw);
      if (body.user_id !== owner) {
        send({ message: "RLS rejected" }, 403);
        return;
      }
      records.set(owner, body.payload);
      writes.push(owner);
      send(null, 201);
      return;
    }
    if (url.searchParams.get("user_id") !== `eq.${owner}`) {
      send([]);
      return;
    }
    const snapshot = records.get(owner);
    if (!snapshot) {
      send([]);
      return;
    }
    if (url.searchParams.get("select")?.includes("name:")) {
      const profile = z
        .object({
          profile: z.object({
            name: z.string().optional(),
            onboardingComplete: z.boolean().optional(),
          }),
        })
        .parse(snapshot).profile;
      send([
        {
          name: profile.name ?? null,
          complete: profile.onboardingComplete ?? null,
        },
      ]);
    } else send([{ payload: snapshot, updated_at: "2026-10-06T12:00:00Z" }]);
    return;
  }
  send({ message: "Unknown test endpoint" }, 404);
});
server.listen(54329, "127.0.0.1", () =>
  console.log("Local test Supabase ready"),
);
for (const signal of ["SIGTERM", "SIGINT"] as const)
  process.on(signal, () => server.close(() => process.exit(0)));
