import { expect, test } from "bun:test";
import { createClient, type User } from "@supabase/supabase-js";
import { createDefaultSnapshot } from "../../src/domain/legacy/read-snapshot";
import {
  stateRepository,
  RemoteStateChanged,
} from "../../src/lib/supabase/state-repository";

const owner = "11111111-1111-4111-8111-111111111111";
test("two devices cannot overwrite the same loaded revision", async () => {
  let row = {
    payload: createDefaultSnapshot(),
    updated_at: "2026-01-01T00:00:00Z",
  };
  const fetcher = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    if (init?.method === "PATCH") {
      if (url.searchParams.get("updated_at") !== `eq.${row.updated_at}`)
        return Response.json([]);
      const values = JSON.parse(String(init.body)) as typeof row;
      row = values;
      return Response.json([{ updated_at: row.updated_at }]);
    }
    return Response.json([row]);
  };
  const make = () => {
    const client = createClient("https://example.invalid", "public-test", {
      global: { fetch: fetcher as typeof fetch },
      auth: { persistSession: false },
    });
    client.auth.getUser = async () => ({
      data: { user: { id: owner } as User },
      error: null,
    });
    return stateRepository(client, owner);
  };
  const first = make(),
    second = make(),
    signal = new AbortController().signal;
  await first.load(signal);
  await second.load(signal);
  expect(await first.changed!(signal)).toBe(false);
  const one = createDefaultSnapshot();
  one.profile.name = "First device";
  await first.save(one, signal);
  expect(await second.changed!(signal)).toBe(true);
  const two = createDefaultSnapshot();
  two.profile.name = "Second device";
  await expect(second.save(two, signal)).rejects.toBeInstanceOf(
    RemoteStateChanged,
  );
  expect(row.payload.profile.name).toBe("First device");
  await second.load(signal);
  await second.save(two, signal);
  expect(row.payload.profile.name).toBe("Second device");
});

test("concurrent first saves insert once instead of upserting over another device", async () => {
  let row: {
    payload: ReturnType<typeof createDefaultSnapshot>;
    updated_at: string;
  } | null = null;
  const fetcher = async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "POST") {
      if (row)
        return Response.json(
          { code: "23505", message: "Duplicate account" },
          { status: 409 },
        );
      row = JSON.parse(String(init.body)) as {
        payload: ReturnType<typeof createDefaultSnapshot>;
        updated_at: string;
      };
      return Response.json([{ updated_at: row.updated_at }]);
    }
    return Response.json(row ? [row] : []);
  };
  const make = () => {
    const client = createClient("https://example.invalid", "public-test", {
      global: { fetch: fetcher as typeof fetch },
      auth: { persistSession: false },
    });
    client.auth.getUser = async () => ({
      data: { user: { id: owner } as User },
      error: null,
    });
    return stateRepository(client, owner);
  };
  const first = make(),
    second = make(),
    signal = new AbortController().signal;
  await expect(first.save(createDefaultSnapshot(), signal)).rejects.toThrow(
    "Leé la cuenta",
  );
  await first.load(signal);
  await second.load(signal);
  await first.save(createDefaultSnapshot(), signal);
  await expect(
    second.save(createDefaultSnapshot(), signal),
  ).rejects.toBeInstanceOf(RemoteStateChanged);
});
