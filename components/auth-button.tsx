import Link from "next/link";
import { Button } from "./ui/button";
import { createClient } from "@/lib/supabase/server";
import { LogoutButton } from "./logout-button";

export async function AuthButton() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user ? (
    <div className="flex items-center gap-4">
      <div className="w-8 h-8 bg-white border border-gray-300 rounded-full flex items-center justify-center text-black text-sm font-medium">
        {user.email?.charAt(0).toUpperCase()}
      </div>
      <LogoutButton />
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/auth/login">Iniciar Sesión</Link>
      </Button>
      <Button asChild size="sm" className="bg-indigo-500 text-white hover:bg-indigo-600">
        <Link href="/auth/sign-up">Registrarse</Link>
      </Button>
    </div>
  );
}
