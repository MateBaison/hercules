"use client";
import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";
export function browserClient() {
  const env = publicEnv();
  return createBrowserClient(env.url, env.key);
}
