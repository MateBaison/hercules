"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  INCOMING_ROUTINE_KEY,
  LEGACY_AUTH_KEY,
} from "@/lib/storage/account-cache";
export function AuthEntry() {
  const router = useRouter();
  useEffect(() => {
    const hash = new URLSearchParams(location.hash.slice(1));
    const routine = hash.get("routine");
    if (routine && routine.length <= 120_000) {
      sessionStorage.setItem(INCOMING_ROUTINE_KEY, routine);
      history.replaceState(null, "", location.pathname + location.search);
    }
    const access_token = hash.get("access_token"),
      refresh_token = hash.get("refresh_token");
    if (!access_token || !refresh_token) return;
    history.replaceState(null, "", location.pathname + location.search); // Remove secrets before any request.
    void fetch("/auth/legacy-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token, refresh_token }),
    }).then((response) => {
      if (response.ok) {
        localStorage.removeItem(LEGACY_AUTH_KEY);
        router.replace("/home");
        router.refresh();
      }
    });
  }, [router]);
  return null;
}
