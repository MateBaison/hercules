"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-[720px] space-y-4 p-6" role="alert">
      <h1 className="text-2xl font-bold">No pudimos cargar esta pantalla</h1>
      <p>Tus datos no se han reemplazado. Podés volver a intentarlo.</p>
      <Button onClick={reset}>Reintentar</Button>
    </div>
  );
}
