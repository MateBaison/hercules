"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { localeFor, translate } from "@/data/translations";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";

export function AppHeader({
  accountAction,
  language = "es",
}: {
  accountAction?: React.ReactNode;
  language?: string;
}) {
  const pathname = usePathname();
  const section = [
    { path: "/home", es: "Inicio", en: "Home" },
    { path: "/library", es: "Biblioteca", en: "Library" },
    { path: "/tools", es: "Herramientas", en: "Tools" },
    { path: "/progress", es: "Progreso", en: "Progress" },
    { path: "/profile", es: "Perfil", en: "Profile" },
  ].find((item) => item.path === pathname);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const timer = setInterval(update, 30_000);
    return () => clearInterval(timer);
  }, []);
  return (
    <header className={cn("app-header", section && "app-header-section")}>
      <Link
        href="/home"
        className="brand"
        aria-label={`HERCULES — ${translate(language, "Volver al inicio", "Go home")}`}
      >
        <img src="/assets/hercules-logo-v1.jpg" alt="" width={44} height={44} />
        <span>
          <strong>HERCULES</strong>
          <small>GYM TRACKER</small>
        </span>
      </Link>
      <div className="header-actions">
        <div
          className="header-date"
          aria-label={translate(language, "Fecha y hora", "Date and time")}
        >
          {now && (
            <>
              <time dateTime={now.toISOString()}>
                {new Intl.DateTimeFormat(localeFor(language), {
                  day: "numeric",
                  month: "short",
                }).format(now)}
              </time>
              <span>
                {new Intl.DateTimeFormat(localeFor(language), {
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(now)}
              </span>
            </>
          )}
        </div>
        {accountAction}
      </div>
      {section && (
        <h1 className="header-section-title">
          {translate(language, section.es, section.en)}
        </h1>
      )}
    </header>
  );
}
