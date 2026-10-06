"use client";
import { useApp } from "@/state/app-provider";
import { signOut } from "@/lib/supabase/auth-actions";
import { Button } from "@/components/ui/button";
export function AccountPanel() {
  const { user, message, retry, flush, t, notify } = useApp();
  return (
    <>
      <section className="panel">
        <h2 className="mb-3 text-xl font-bold">
          {t("Tu cuenta", "Your account")}
        </h2>
        <p>{user.email}</p>
        <p className="my-3 text-muted-foreground">{message}</p>
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => {
            void retry();
          }}
        >
          {t("Reintentar sincronización", "Retry sync")}
        </Button>
      </section>
      <form
        action={async () => {
          const saved = await flush();
          if (
            !saved &&
            !confirm(
              t(
                "Hay cambios pendientes guardados en este dispositivo. ¿Cerrar sesión igualmente?",
                "Changes are pending on this device. Sign out anyway?",
              ),
            )
          )
            return;
          const result = await signOut();
          if (result?.error) notify(result.error);
        }}
      >
        <Button type="submit" variant="secondary" className="w-full">
          {t("Cerrar sesión", "Sign out")}
        </Button>
      </form>
    </>
  );
}
