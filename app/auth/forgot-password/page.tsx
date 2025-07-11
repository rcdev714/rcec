import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { AuthLayout } from "@/components/auth-layout";

export default function Page() {
  return (
    <AuthLayout 
      title="Recuperar contraseña" 
      subtitle="Te enviaremos un enlace para restablecer tu contraseña"
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
