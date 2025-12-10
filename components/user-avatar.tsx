"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { User } from "@supabase/supabase-js";

interface UserAvatarProps {
  showName?: boolean;
}

export default function UserAvatar({ showName = false }: UserAvatarProps) {
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
    <div className={`flex items-center gap-2 ${showName ? 'w-full' : ''}`}>
      <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center justify-center text-sm font-semibold flex-shrink-0">
        {firstLetter}
      </div>
      {showName && (
        <div className="flex flex-col min-w-0 overflow-hidden">
          <span className="text-sm font-medium text-gray-700 truncate">
            {user.email?.split('@')[0]}
          </span>
          <span className="text-[10px] text-gray-500 truncate">
            {user.email}
          </span>
        </div>
      )}
    </div>
  );
}
