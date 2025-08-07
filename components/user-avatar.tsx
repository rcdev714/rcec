"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function UserAvatar() {
  const [userEmailInitial, setUserEmailInitial] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) {
        setUserEmailInitial(user.email.charAt(0).toUpperCase());
      }
    };
    fetchUser();
  }, []);

  return (
    <div
      className={cn(
        "w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-sm font-medium",
        "bg-white text-gray-800"
      )}
    >
      {userEmailInitial}
    </div>
  );
}
