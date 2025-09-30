import { SignUpForm } from "@/components/sign-up-form";
import { AuthLayout } from "@/components/auth-layout";

export default function Page() {
  return (
    <AuthLayout
      title="Crear cuenta"
      subtitle="Únete para empezar"
    >
      <SignUpForm />
    </AuthLayout>
  );
}
