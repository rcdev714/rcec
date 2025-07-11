import { UpdatePasswordForm } from "@/components/update-password-form";
import { AuthLayout } from "@/components/auth-layout";

export default function Page() {
  return (
    <AuthLayout 
      title="Nueva contraseña" 
      subtitle="Crea una nueva contraseña para tu cuenta"
    >
      <UpdatePasswordForm />
    </AuthLayout>
  );
}
