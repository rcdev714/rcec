import { Card, CardContent } from "@/components/ui/card";
import { AuthLayout } from "@/components/auth-layout";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthLayout 
      title="Error de autenticación" 
      subtitle="Ocurrió un problema durante el proceso"
    >
      <Card className="border-border/50 shadow-sm">
        <CardContent className="pt-6 text-center">
          <div className="mb-6">
            {params?.error ? (
              <p className="text-sm text-muted-foreground mb-2">
                Detalles del error: {params.error}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground mb-2">
                Ha ocurrido un error no especificado.
              </p>
            )}
            <p className="text-sm text-muted-foreground">
              Por favor, intenta nuevamente o contacta con soporte si el problema persiste.
            </p>
          </div>
          <Button asChild className="w-full bg-primary hover:bg-primary/90">
            <Link href="/auth/login">
              Volver al inicio de sesión
            </Link>
          </Button>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
