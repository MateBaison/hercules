"use client";
import { ClockProvider } from "@/features/clocks/clock-provider";
import { BottomNav } from "./bottom-nav";
export function AccountShell({ children }: { children: React.ReactNode }) {
  return (
    <ClockProvider>
      <main id="main-content" tabIndex={-1}>
        {children}
      </main>
      <BottomNav />
    </ClockProvider>
  );
}
