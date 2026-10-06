import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { AppHeader } from "@/components/layout/app-header";

export default function WelcomePage() {
  return (
    <div className="app-shell">
      <AppHeader />
      <main className="hero-panel mt-10">
        <span className="eyebrow">Tu entrenamiento, tu camino</span>
        <h1>Bienvenido a HERCULES</h1>
        <p>
          Creá tu cuenta, organizá tus rutinas y seguí tu progreso. Tus datos
          quedan vinculados a tu cuenta para usarlos en otros dispositivos.
        </p>
        <Link
          href="/login"
          className={`${buttonVariants({ size: "lg" })} min-h-12 px-5`}
        >
          Crear cuenta o iniciar sesión
        </Link>
      </main>
    </div>
  );
}
