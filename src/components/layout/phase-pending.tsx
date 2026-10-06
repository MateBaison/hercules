import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
export function PhasePending({
  title,
  description,
  phase,
}: {
  title: string;
  description: string;
  phase: number;
}) {
  return (
    <>
      <div className="page-heading">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Migración en curso</CardTitle>
          <CardDescription>
            Esta sección se implementará en la fase {phase}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            La aplicación original sigue disponible con tus datos. Esta versión
            de desarrollo todavía no inicia sesión ni guarda entrenamientos.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
