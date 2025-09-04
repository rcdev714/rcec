"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { AuthLayout } from "@/components/auth-layout";
import { createClient } from "@/lib/supabase/client";

export default function ConfirmPage() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    
    // Listen for the SIGNED_IN event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Redirect to dashboard once the user is signed in
        router.push("/dashboard");
      }
    });

    // Cleanup subscription on component unmount
    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <AuthLayout
      title="Confirmando tu cuenta..."
      subtitle="Por favor espera mientras confirmamos tu correo electrónico. Serás redirigido en breve."
    >
      <div className="text-center text-gray-600">
        Verificando...
      </div>
    </AuthLayout>
  );
}
