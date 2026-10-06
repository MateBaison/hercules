"use client";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppDialog } from "@/components/ui/app-dialog";
import { signOut } from "@/lib/supabase/auth-actions";
import { translate } from "@/data/translations";

export function SignOutButton({
  flush,
  language = "es",
  iconOnly = false,
}: {
  flush: () => Promise<boolean>;
  language?: string;
  iconOnly?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const t = (es: string, en: string) => translate(language, es, en);
  return (
    <>
      <Button
        variant={iconOnly ? "destructive-solid" : "secondary"}
        size={iconOnly ? "icon-xl" : "default"}
        className={iconOnly ? "header-exit" : "w-full"}
        aria-label={
          iconOnly ? t("Salir de la cuenta", "Leave account") : undefined
        }
        title={iconOnly ? t("Cerrar sesión", "Sign out") : undefined}
        onClick={() => {
          setPending(false);
          setError("");
          setOpen(true);
        }}
      >
        {iconOnly ? (
          <LogOut data-icon="inline-start" />
        ) : (
          t("Cerrar sesión", "Sign out")
        )}
      </Button>
      <AppDialog
        open={open}
        onClose={() => {
          if (!busy) setOpen(false);
        }}
        title={t("¿Cerrar sesión?", "Sign out?")}
        description={
          pending
            ? t(
                "No pudimos confirmar que todos tus datos estén en la nube. Los cambios guardados localmente seguirán en este dispositivo. ¿Querés salir igualmente?",
                "We could not confirm all your data is in the cloud. Locally saved changes will remain on this device. Leave anyway?",
              )
            : t(
                "Intentaremos sincronizar tus cambios antes de salir de esta cuenta.",
                "We will try to sync your changes before leaving this account.",
              )
        }
      >
        {error && <p role="alert">{error}</p>}
        <div className="flex flex-wrap justify-end gap-3">
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => setOpen(false)}
          >
            {t("Cancelar", "Cancel")}
          </Button>
          <form
            action={async () => {
              setBusy(true);
              setError("");
              try {
                if (!pending) {
                  let saved = false;
                  try {
                    saved = await flush();
                  } catch {
                    /* Require explicit consent before leaving unsynced data. */
                  }
                  if (!saved) {
                    setPending(true);
                    return;
                  }
                }
                const result = await signOut();
                if (result?.error) setError(result.error);
              } finally {
                setBusy(false);
              }
            }}
          >
            <Button type="submit" disabled={busy}>
              {busy
                ? t("Saliendo…", "Leaving…")
                : pending
                  ? t("Salir igualmente", "Leave anyway")
                  : t("Confirmar cierre de sesión", "Confirm sign out")}
            </Button>
          </form>
        </div>
      </AppDialog>
    </>
  );
}
