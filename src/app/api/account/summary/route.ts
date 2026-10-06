import { NextResponse } from "next/server";
import { verifiedUser, accountSummary } from "@/lib/supabase/account-reader";
export async function GET() {
  const user = await verifiedUser();
  if (!user)
    return NextResponse.json(
      { error: "No autorizado" },
      { status: 401, headers: { "Cache-Control": "private, no-store" } },
    );
  return NextResponse.json(await accountSummary(user.id), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
