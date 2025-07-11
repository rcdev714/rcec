import { LoginForm } from "@/components/login-form";
import { AuthLayout } from "@/components/auth-layout";

export default function Page() {
  return (
    <AuthLayout 
      title="Iniciar sesión" 
      subtitle="Accede a tu cuenta para continuar"
    >
      <LoginForm />
    </AuthLayout>
  );
}
