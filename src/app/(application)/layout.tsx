import { AppProvider } from "@/state/app-provider";
import { verifiedUser, accountSummary } from "@/lib/supabase/account-reader";
import { configured } from "@/lib/env";
import { redirect } from "next/navigation";
import { AccountShell } from "@/components/layout/account-shell";
export const dynamic = "force-dynamic";
export default async function ApplicationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!configured()) redirect("/login");
  const user = await verifiedUser();
  if (!user) redirect("/login");
  if (!(await accountSummary(user.id)).complete) redirect("/onboarding");
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <AppProvider
        key={user.id}
        user={{ id: user.id, email: user.email ?? "" }}
      >
        <AccountShell>{children}</AccountShell>
      </AppProvider>
    </div>
  );
}
