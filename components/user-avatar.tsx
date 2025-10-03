"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";

export default function UserAvatar() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const fetchUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) {
          console.error('Error fetching user:', error);
          return;
        }
        setUser(user);
      } catch (err) {
        console.error('Failed to fetch user:', err);
      }
    };

    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  if (!user) {
    return <div className="w-8 h-8 rounded-full bg-gray-300"></div>;
  }

  const firstLetter = user.email?.charAt(0).toUpperCase() || "U";

  return (
    <div className="w-8 h-8 rounded-full bg-white text-gray-800 border border-gray-200 flex items-center justify-center text-sm font-medium">
      {firstLetter}
    </div>
  );
}
