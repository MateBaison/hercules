import { redirect } from "next/navigation";
import { verifiedUser } from "@/lib/supabase/account-reader";
import { configured } from "@/lib/env";
import { AppProvider } from "@/state/app-provider";
import { AppHeader } from "@/components/layout/app-header";
import { PersonalForm } from "@/features/profile/personal-form";
export default async function OnboardingPage() {
  if (!configured()) redirect("/login");
  const user = await verifiedUser();
  if (!user) redirect("/login");
  return (
    <div className="app-shell">
      <AppHeader />
      <AppProvider
        key={user.id}
        user={{ id: user.id, email: user.email ?? "" }}
      >
        <main className="panel">
          <h1 className="mb-5 text-2xl font-bold">Crear tu perfil</h1>
          <PersonalForm onboarding />
        </main>
      </AppProvider>
    </div>
  );
}
