"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { browserClient } from "@/lib/supabase/browser";
import { stateRepository } from "@/lib/supabase/state-repository";
import { SyncController, type SyncView } from "@/lib/supabase/sync-controller";
import type { Snapshot } from "@/domain/schemas/snapshot";
import { translate } from "@/data/translations";
import { AppHeader } from "@/components/layout/app-header";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { RuntimeProvider } from "./runtime-provider";

type AccountContext = {
  snapshot: Snapshot;
  user: { id: string; email: string };
  status: SyncView["status"];
  message: string;
  change: (edit: (draft: Snapshot) => void) => boolean;
  flush: () => Promise<boolean>;
  retry: () => Promise<void>;
  holdRefresh: () => () => void;
  t: (es: string, en: string) => string;
  notify: (message: string) => void;
};
const Context = createContext<AccountContext | null>(null);
export function useApp() {
  const value = useContext(Context);
  if (!value) throw new Error("Account state unavailable");
  return value;
}
export function AppProvider({
  user,
  children,
}: {
  user: { id: string; email: string };
  children: React.ReactNode;
}) {
  const [view, setView] = useState<SyncView>({
    snapshot: null,
    status: "loading",
    message: "Cargando tu cuenta…",
  });
  const [notice, setNotice] = useState("");
  const controller = useRef<SyncController | null>(null);
  const router = useRouter();
  const holdRefresh = useCallback(
    () => controller.current?.holdRefresh() ?? (() => {}),
    [],
  );
  useEffect(() => {
    const client = browserClient(),
      sync = new SyncController(
        user.id,
        stateRepository(client, user.id),
        localStorage,
      );
    controller.current = sync;
    const unsubscribe = sync.subscribe(setView);
    void sync.start();
    const auth = client.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || (session && session.user.id !== user.id)) {
        sync.dispose();
        setView({
          snapshot: null,
          status: "loading",
          message: "La cuenta cambió.",
        });
        queueMicrotask(() => {
          router.replace("/login");
          router.refresh();
        });
      }
    });
    const retry = () => {
      void sync.start();
    };
    const refresh = () => {
      if (document.visibilityState === "visible") void sync.refresh();
    };
    const interval = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", retry);
    return () => {
      unsubscribe();
      auth.data.subscription.unsubscribe();
      window.removeEventListener("online", retry);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      window.clearInterval(interval);
      sync.dispose();
      controller.current = null;
    };
  }, [user.id, router]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!view.snapshot) return;
    document.documentElement.lang = view.snapshot.settings.language ?? "es";
    document.documentElement.dir =
      view.snapshot.settings.language === "ar" ? "rtl" : "ltr";
  }, [view.snapshot?.settings.language]);
  const t = (es: string, en: string) =>
    translate(
      view.snapshot?.settings.language ?? controller.current?.language ?? "es",
      es,
      en,
    );
  const header = (
    <AppHeader
      language={
        view.snapshot?.settings.language ?? controller.current?.language
      }
      accountAction={
        <SignOutButton
          iconOnly
          language={
            view.snapshot?.settings.language ?? controller.current?.language
          }
          flush={() => controller.current?.flush() ?? Promise.resolve(false)}
        />
      }
    />
  );
  if (view.status === "conflict")
    return (
      <>
        {header}
        <section className="hero-panel">
          <h1>{t("Elegir copia de tus datos", "Choose a data copy")}</h1>
          <p>{t(view.message, view.message)}</p>
          <div className="flex flex-wrap gap-3">
            <Button
              disabled={!controller.current?.hasCloud}
              onClick={() => controller.current?.resolve("cloud")}
            >
              {t("Usar nube", "Use cloud")}
            </Button>
            <Button
              variant="secondary"
              onClick={() => controller.current?.resolve("local")}
            >
              {t("Usar dispositivo", "Use device")}
            </Button>
          </div>
        </section>
      </>
    );
  if (!view.snapshot)
    return (
      <>
        {header}
        <section className="hero-panel" role="status">
          <h1>
            {view.status === "error"
              ? t("No pudimos cargar tu cuenta", "Could not load your account")
              : t("Cargando…", "Loading…")}
          </h1>
          <p>{t(view.message, view.message)}</p>
          {view.status === "error" && (
            <Button
              onClick={() => {
                void controller.current?.start();
              }}
            >
              {t("Reintentar conexión", "Retry connection")}
            </Button>
          )}
        </section>
      </>
    );
  return (
    <Context.Provider
      value={{
        snapshot: view.snapshot,
        user,
        status: view.status,
        message: t(view.message, view.message),
        change: (edit) => {
          try {
            if (!controller.current) return false;
            controller.current.edit(edit);
            return true;
          } catch (error) {
            setNotice(
              error instanceof Error ? error.message : "No se pudo guardar",
            );
            return false;
          }
        },
        flush: () => controller.current?.flush() ?? Promise.resolve(false),
        retry: () => controller.current?.start() ?? Promise.resolve(),
        holdRefresh,
        t,
        notify: setNotice,
      }}
    >
      {header}
      <RuntimeProvider
        onRestComplete={() =>
          setNotice(
            translate(
              view.snapshot?.settings.language ?? "es",
              "Descanso terminado",
              "Rest finished",
            ),
          )
        }
      >
        <div
          aria-live="polite"
          className="sync-indicator"
          data-sync-status={view.status}
        >
          {t(view.message, view.message)}
        </div>
        {children}
        {notice && (
          <div className="save-toast" role="status">
            {notice}
          </div>
        )}
      </RuntimeProvider>
    </Context.Provider>
  );
}
