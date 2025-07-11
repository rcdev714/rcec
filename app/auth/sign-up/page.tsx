import { SignUpForm } from "@/components/sign-up-form";
import { AuthLayout } from "@/components/auth-layout";

export default function Page() {
  return (
    <AuthLayout 
      title="Crear cuenta" 
      subtitle="Únete a UNIBROKERS para empezar"
    >
      <SignUpForm />
    </AuthLayout>
  );
}
