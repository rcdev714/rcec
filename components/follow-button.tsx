"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus, Loader2, Clock } from "lucide-react";

interface FollowButtonProps {
  userId: string;
  initialIsFollowing: boolean;
  isPrivateProfile: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
}

export default function FollowButton({ 
  userId, 
  initialIsFollowing,
  isPrivateProfile,
  onFollowChange 
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [loading, setLoading] = useState(false);
  const [requestPending, setRequestPending] = useState(false);

  const handleToggleFollow = async () => {
    try {
      setLoading(true);
      
      if (isPrivateProfile && !isFollowing) {
        // Private profile - send follow request
        const response = await fetch("/api/follow-requests", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target_id: userId,
            action: "request",
          }),
        });

        if (response.ok) {
          setRequestPending(true);
        }
      } else {
        // Public profile or unfollowing - use direct follow
        const response = await fetch("/api/follows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            followed_id: userId,
            action: isFollowing ? "unfollow" : "follow",
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setIsFollowing(data.is_following);
          setRequestPending(false);
          onFollowChange?.(data.is_following);
        }
      }
    } catch (err) {
      console.error("Error toggling follow:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleToggleFollow}
      disabled={loading || requestPending}
      variant={isFollowing || requestPending ? "outline" : "default"}
      className={isFollowing || requestPending ? "" : "bg-black hover:bg-gray-800"}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
          {isFollowing ? "Dejando de seguir..." : "Siguiendo..."}
        </>
      ) : requestPending ? (
        <>
          <Clock className="h-4 w-4 mr-2" />
          Solicitado
        </>
      ) : isFollowing ? (
        <>
          <UserMinus className="h-4 w-4 mr-2" />
          Siguiendo
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4 mr-2" />
          Seguir
        </>
      )}
    </Button>
  );
}

