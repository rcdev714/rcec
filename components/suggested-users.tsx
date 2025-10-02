"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { UserPlus, Users } from "lucide-react";

interface SuggestedUser {
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  position: string | null;
  company_name: string | null;
  follower_count: number;
}

export default function SuggestedUsers() {
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchSuggestedUsers();
  }, []);

  const fetchSuggestedUsers = async () => {
    try {
      const response = await fetch("/api/users/suggested?limit=5");
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.error("Error fetching suggested users:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (userId: string) => {
    try {
      const response = await fetch("/api/follows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followed_id: userId,
          action: "follow",
        }),
      });

      if (response.ok) {
        setFollowingIds(new Set([...followingIds, userId]));
      }
    } catch (err) {
      console.error("Error following user:", err);
    }
  };

  const getDisplayName = (user: SuggestedUser) => {
    return user.display_name ||
      (user.first_name || user.last_name
        ? `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim()
        : "Usuario");
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Conecta con usuarios</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-full bg-gray-200"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (users.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5" />
          Conecta con usuarios
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {users.map((suggestedUser) => {
            const displayName = getDisplayName(suggestedUser);
            const avatarLetter = displayName.charAt(0).toUpperCase();
            const isFollowing = followingIds.has(suggestedUser.user_id);

            return (
              <div key={suggestedUser.user_id} className="flex items-start gap-3">
                <Link href={`/profile/${suggestedUser.user_id}`}>
                  <div className="w-10 h-10 rounded-full bg-black text-white flex items-center justify-center font-semibold cursor-pointer hover:opacity-80 flex-shrink-0">
                    {suggestedUser.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={suggestedUser.avatar_url}
                        alt={displayName}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      avatarLetter
                    )}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/profile/${suggestedUser.user_id}`}>
                    <p className="font-semibold text-sm hover:underline truncate">
                      {displayName}
                    </p>
                  </Link>
                  {suggestedUser.position && (
                    <p className="text-xs text-gray-600 truncate">
                      {suggestedUser.position}
                      {suggestedUser.company_name ? ` · ${suggestedUser.company_name}` : ""}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-gray-500">
                      {suggestedUser.follower_count} {suggestedUser.follower_count === 1 ? 'seguidor' : 'seguidores'}
                    </p>
                  </div>
                </div>
                {!isFollowing && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleFollow(suggestedUser.user_id)}
                    className="flex-shrink-0"
                  >
                    <UserPlus className="h-3 w-3" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

