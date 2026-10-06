import { AppHeader } from "@/components/layout/app-header";
import { LoginForm } from "@/features/auth/login-form";
import { configured } from "@/lib/env";
import { verifiedUser } from "@/lib/supabase/account-reader";
import { redirect } from "next/navigation";
export default async function LoginPage() {
  if (configured() && (await verifiedUser())) redirect("/home");
  return (
    <div className="app-shell">
      <AppHeader />
      <main className="hero-panel mt-8">
        <h1>Iniciar sesión</h1>
        {configured() ? (
          <LoginForm />
        ) : (
          <p>
            Configurá las variables de Supabase de .env.example para habilitar
            el acceso. No se ha conectado ninguna cuenta.
          </p>
        )}
      </main>
    </div>
  );
}
