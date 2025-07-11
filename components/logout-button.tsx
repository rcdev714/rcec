"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return (
    <Button 
      onClick={logout}
      variant="ghost"
      size="sm"
      className="bg-white border border-gray-300 text-gray-400 hover:text-gray-600 hover:border-gray-400 hover:bg-gray-50 hover:!bg-gray-50"
    >
      Logout
    </Button>
  );
}
