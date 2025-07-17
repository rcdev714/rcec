"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function LogoutButton() {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = async () => {
    try {
      setIsLoggingOut(true);
      const supabase = createClient();
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Logout error:", error);
      }
      
      // Clear any local storage or session storage
      if (typeof window !== 'undefined') {
        localStorage.clear();
        sessionStorage.clear();
      }
      
      // Force a hard navigation to ensure clean state
      window.location.href = "/auth/login";
      
    } catch (error) {
      console.error("Unexpected logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Button 
      onClick={logout}
      variant="ghost"
      size="sm"
      disabled={isLoggingOut}
      className="bg-white border border-gray-300 text-gray-400 hover:text-gray-600 hover:border-gray-400 hover:!bg-gray-50"
    >
      {isLoggingOut ? "Logging out..." : "Logout"}
    </Button>
  );
}
