"use client";
import { useApp } from "@/state/app-provider";
import { SignOutButton } from "@/features/auth/sign-out-button";
import { Button } from "@/components/ui/button";
export function AccountPanel() {
  const { user, message, retry, flush, t, snapshot } = useApp();
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
      <SignOutButton flush={flush} language={snapshot.settings.language} />
    </>
  );
}
