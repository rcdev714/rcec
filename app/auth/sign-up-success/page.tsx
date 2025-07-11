import { Card, CardContent } from "@/components/ui/card";
import { AuthLayout } from "@/components/auth-layout";

export default function Page() {
  return (
    <AuthLayout 
      title="¡Cuenta creada!" 
      subtitle="Revisa tu correo para confirmar tu cuenta"
    >
      <Card className="border-border/50 shadow-sm">
        <CardContent className="pt-6 text-center">
          <div className="mb-4">
            <p className="text-sm text-muted-foreground">
              Hemos enviado un enlace de confirmación a tu correo electrónico. 
              Por favor, haz clic en el enlace para activar tu cuenta.
            </p>
          </div>
        </CardContent>
      </Card>
    </AuthLayout>
  );
}
