import Link from "next/link";
export default function NotFound() {
  return (
    <main className="mx-auto max-w-[720px] space-y-4 p-6">
      <h1 className="text-2xl font-bold">No encontramos esta página</h1>
      <Link href="/home" className="text-primary underline">
        Volver al inicio
      </Link>
    </main>
  );
}
