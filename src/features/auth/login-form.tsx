"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buttonVariants, Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  googleLogin,
  requestCode,
  verifyCode,
} from "@/lib/supabase/auth-actions";
import { PENDING_EMAIL_KEY } from "@/lib/storage/account-cache";
import { z } from "zod";
export function LoginForm() {
  const [email, setEmail] = useState(""),
    [code, setCode] = useState(""),
    [sent, setSent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const router = useRouter();
  useEffect(() => {
    try {
      const saved = z
        .email()
        .safeParse(sessionStorage.getItem(PENDING_EMAIL_KEY));
      if (saved.success) {
        setEmail(saved.data);
        setSent(true);
      }
    } catch {
      /* Storage can be blocked; login remains usable. */
    }
  }, []);
  return (
    <div className="space-y-4">
      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          setBusy(true);
          setError("");
          try {
            const result = sent
              ? await verifyCode(email, code)
              : await requestCode(email);
            if (result.error) setError(result.error);
            else if (sent) {
              try {
                sessionStorage.removeItem(PENDING_EMAIL_KEY);
              } catch {}
              router.replace("/home");
              router.refresh();
            } else {
              try {
                sessionStorage.setItem(PENDING_EMAIL_KEY, email);
              } catch {}
              setSent(true);
            }
          } catch {
            setError(
              "No pudimos conectar. Revisá la configuración o tu conexión.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="block">
          Correo electrónico
          <Input
            type="email"
            autoComplete="email"
            required
            value={email}
            disabled={sent}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        {sent && (
          <label className="block">
            Código del correo
            <Input
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6,8}"
              required
              minLength={6}
              maxLength={8}
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </label>
        )}
        {error && (
          <p role="alert" className="text-red-300">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Conectando…" : sent ? "Verificar código" : "Enviar código"}
        </Button>
      </form>
      {sent && (
        <Button
          variant="secondary"
          className="w-full"
          disabled={busy}
          onClick={() => {
            try {
              sessionStorage.removeItem(PENDING_EMAIL_KEY);
            } catch {}
            setError("");
            setSent(false);
            setCode("");
          }}
        >
          Cambiar correo o pedir otro código
        </Button>
      )}
      <form action={googleLogin}>
        <Button variant="secondary" className="w-full" type="submit">
          Continuar con Google
        </Button>
      </form>
      <Link
        href="/"
        className={buttonVariants({ variant: "ghost", className: "w-full" })}
        onClick={() => {
          try {
            sessionStorage.removeItem(PENDING_EMAIL_KEY);
          } catch {}
        }}
      >
        Volver al inicio
      </Link>
      <p className="text-sm text-muted-foreground">
        Tu cuenta guarda rutinas y entrenamientos en la nube. Nunca compartas el
        código recibido.
      </p>
    </div>
  );
}
