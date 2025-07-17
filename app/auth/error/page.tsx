import { AuthLayout } from "@/components/auth-layout";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default async function ErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; description?: string }>;
}) {
  const params = await searchParams;
  const error = params.error || "Unknown error";
  const description = params.description || "";

  // Map common error codes to user-friendly messages
  const getErrorMessage = () => {
    if (error.includes("otp_expired") || error.includes("expired")) {
      return {
        title: "Link expirado",
        message: "El enlace de confirmación ha expirado. Por favor, intenta registrarte o iniciar sesión nuevamente para recibir un nuevo enlace.",
      };
    }
    if (error.includes("access_denied")) {
      return {
        title: "Acceso denegado",
        message: "No tienes permisos para acceder a este recurso.",
      };
    }
    if (error.includes("missing_parameters")) {
      return {
        title: "Parámetros faltantes",
        message: "El enlace de confirmación no es válido. Por favor, verifica tu correo electrónico.",
      };
    }
    return {
      title: "Error de autenticación",
      message: description || error,
    };
  };

  const { title, message } = getErrorMessage();

  return (
    <AuthLayout title={title} subtitle="">
      <div className="w-full space-y-4">
        <p className="text-center text-muted-foreground">{message}</p>
        <div className="flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link href="/auth/login">Volver a iniciar sesión</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/auth/sign-up">Crear nueva cuenta</Link>
          </Button>
        </div>
      </div>
    </AuthLayout>
  );
}
