"use client";
import { useEffect } from "react";

export function useScreenWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return;
    let disposed = false;
    let requesting = false;
    let lock: WakeLockSentinel | null = null;
    const acquire = async () => {
      if (
        disposed ||
        requesting ||
        (lock && !lock.released) ||
        document.visibilityState !== "visible"
      )
        return;
      requesting = true;
      try {
        const next = await navigator.wakeLock.request("screen");
        if (disposed || document.visibilityState !== "visible") {
          await next.release();
        } else {
          lock = next;
          next.addEventListener(
            "release",
            () => {
              if (lock === next) lock = null;
            },
            { once: true },
          );
        }
      } catch {
        // Unsupported policies, low battery and OS refusal must not stop the clock.
      } finally {
        requesting = false;
      }
    };
    const visibility = () => {
      if (document.visibilityState === "visible") void acquire();
      else if (lock) {
        const previous = lock;
        lock = null;
        void previous.release().catch(() => {});
      }
    };
    void acquire();
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("focus", acquire);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("focus", acquire);
      if (lock) void lock.release().catch(() => {});
    };
  }, [active]);
}
