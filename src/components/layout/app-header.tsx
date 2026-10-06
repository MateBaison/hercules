"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export function AppHeader({
  accountAction,
}: {
  accountAction?: React.ReactNode;
}) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = setInterval(update, 30_000);
    return () => clearInterval(timer);
  }, []);
  return (
    <header className="app-header">
      <Link
        href="/home"
        className="brand"
        aria-label="HERCULES — volver al inicio"
      >
        <img src="/assets/hercules-logo-v1.jpg" alt="" width={44} height={44} />
        <span>
          <strong>HERCULES</strong>
          <small>Tu entrenamiento</small>
        </span>
      </Link>
      <div className="header-actions">
        <div className="header-date" aria-label="Fecha y hora">
          {now && (
            <>
              <time dateTime={now.toISOString()}>
                {new Intl.DateTimeFormat("es", {
                  day: "numeric",
                  month: "short",
                }).format(now)}
              </time>
              <span>
                {new Intl.DateTimeFormat("es", {
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(now)}
              </span>
            </>
          )}
        </div>
        {accountAction}
      </div>
    </header>
  );
}
