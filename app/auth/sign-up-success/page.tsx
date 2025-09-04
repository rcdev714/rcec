import { Card, CardContent } from "@/components/ui/card";
import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Page() {
  return (
    <AuthLayout 
      title="¡Cuenta creada con éxito!" 
      subtitle="Ya puedes acceder a la consola."
    >
      <Card className="border-border/50 shadow-sm">
        <CardContent className="pt-6 text-center">
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Tu cuenta ha sido creada. Haz clic en el botón de abajo para continuar.
            </p>
          </div>
          <Link href="/dashboard">
            <Button className="w-full">
              Ir a la Consola
            </Button>
          </Link>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
