import { Skeleton } from "@/components/ui/skeleton";
export default function Loading() {
  return (
    <div
      className="mx-auto max-w-[720px] space-y-4 p-6"
      role="status"
      aria-label="Cargando"
    >
      <Skeleton className="h-12 w-1/2" />
      <Skeleton className="h-56 w-full" />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
